import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation, WebViewMessageEvent } from 'react-native-webview';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import AnimatedPressable from '../../../../shared/ui/components/AnimatedPressable';
import { PaymentRepository } from '../../infrastructure/PaymentRepository';
import { StartUpiPaymentUseCase } from '../../application/startUpiPayment.usecase';

type PaymentScreenRouteProp = RouteProp<{ Payment: { orderId: string; amount: number } }, 'Payment'>;

export default function PaymentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<PaymentScreenRouteProp>();
  const { orderId, amount } = route.params;

  const [isLoading, setIsLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [razorpayOrderId, setRazorpayOrderId] = useState<string | null>(null);
  
  const paymentRepository = new PaymentRepository();
  const startUpiPaymentUseCase = new StartUpiPaymentUseCase(paymentRepository);

  const handlePay = async () => {
    setIsLoading(true);
    try {
      const data = await startUpiPaymentUseCase.execute(orderId);
      setRazorpayOrderId(data.razorpayOrderId);
      setCheckoutUrl(data.checkoutUrl || null);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Payment Error', error.message || 'Failed to initiate payment.');
      setIsLoading(false);
    }
  };

  // Handle messages sent from the checkout WebView via postMessage
  const handleWebViewMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.status === 'success') {
        setCheckoutUrl(null); // Close WebView
        
        // Report to backend for immediate verification
        if (razorpayOrderId && data.razorpay_payment_id) {
          await paymentRepository.reportClientCallback(razorpayOrderId, data.razorpay_payment_id);
        }
        
        navigation.navigate('PaymentPending', { orderId });
      } else if (data.status === 'failed') {
        setCheckoutUrl(null);
        Alert.alert(
          'Payment Failed', 
          data.error?.description || 'Your payment could not be processed. Please try again.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
      } else if (data.status === 'dismissed') {
        setCheckoutUrl(null);
        setIsLoading(false);
      }
    } catch (e) {
      console.error('Failed to parse WebView message:', e);
    }
  };

  // Fallback: also watch URL changes for redirect-based callbacks
  const handleNavigationStateChange = async (navState: WebViewNavigation) => {
    if (navState.url.includes('razorpay_payment_id=')) {
      setCheckoutUrl(null);
      const match = navState.url.match(/[?&]razorpay_payment_id=([^&]+)/);
      const paymentId = match?.[1] || null;
      
      if (razorpayOrderId && paymentId) {
        await paymentRepository.reportClientCallback(razorpayOrderId, paymentId);
      }
      
      navigation.navigate('PaymentPending', { orderId });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.amount}>₹{(amount / 100).toFixed(2)}</Text>
          <Text style={styles.orderId}>Order #{orderId.substring(0, 8).toUpperCase()}</Text>
        </View>

        <AnimatedPressable style={styles.payButton} onPress={handlePay} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.payButtonText}>Pay via UPI</Text>
          )}
        </AnimatedPressable>
        <Text style={styles.securedText}>Secured by Razorpay</Text>
      </View>

      <Modal visible={!!checkoutUrl} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
          <View style={styles.modalHeader}>
            <AnimatedPressable onPress={() => { setCheckoutUrl(null); setIsLoading(false); }}>
              <Text style={styles.cancelText}>Cancel Payment</Text>
            </AnimatedPressable>
          </View>
          {checkoutUrl && (
            <WebView
              source={{ uri: checkoutUrl }}
              onMessage={handleWebViewMessage}
              onNavigationStateChange={handleNavigationStateChange}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
                  <ActivityIndicator size="large" color={COLORS.darkGreen} />
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryBg,
  },
  header: {
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  content: {
    flex: 1,
    padding: SIZES.large,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    alignItems: 'center',
    marginBottom: SIZES.extraLarge * 2,
  },
  amount: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.black,
    marginBottom: SIZES.small,
  },
  orderId: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  payButton: {
    backgroundColor: COLORS.darkGreen,
    paddingVertical: SIZES.padding,
    paddingHorizontal: SIZES.extraLarge * 2,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    marginBottom: SIZES.base,
  },
  payButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  securedText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  modalHeader: {
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'flex-start',
  },
  cancelText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  }
});
