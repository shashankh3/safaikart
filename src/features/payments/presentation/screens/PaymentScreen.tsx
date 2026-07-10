import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Modal, SafeAreaView, ActivityIndicator } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import AnimatedPressable from '../../../../shared/ui/components/AnimatedPressable';
import { PaymentRepository } from '../../infrastructure/PaymentRepository';
import { StartUpiPaymentUseCase } from '../../application/startUpiPayment.usecase';
import { RazorpayPaymentProvider } from '../../infrastructure/RazorpayPaymentProvider';

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

  const handleNavigationStateChange = async (navState: WebViewNavigation) => {
    // Check if the URL is our callback/return URL
    if (RazorpayPaymentProvider.isCallbackUrl(navState.url)) {
      setCheckoutUrl(null); // Close WebView
      const paymentId = RazorpayPaymentProvider.extractPaymentIdFromUrl(navState.url);
      
      // We got a callback. Untrusted, but let's report it and move to pending.
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
            <AnimatedPressable onPress={() => setCheckoutUrl(null)}>
              <Text style={styles.cancelText}>Cancel Payment</Text>
            </AnimatedPressable>
          </View>
          {checkoutUrl && (
            <WebView
              source={{ uri: checkoutUrl }}
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
