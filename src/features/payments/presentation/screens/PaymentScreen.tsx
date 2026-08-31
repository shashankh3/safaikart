import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Animated, 
  Vibration,
  Linking
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Text } from '../../../../shared/ui/primitives/Stacks';
import { PaymentRepository } from '../../infrastructure/PaymentRepository';
import { useCart } from '../../../cart/presentation/hooks/useCart';

type PaymentScreenRouteProp = RouteProp<{ Payment: { orderId: string; amount: number } }, 'Payment'>;

const generateRazorpayHTML = (checkoutUrl: string) => {
  const getParam = (name: string) => {
    const match = new RegExp('[?&]' + name + '=([^&]*)').exec(checkoutUrl);
    return match ? decodeURIComponent(match[1]).trim() : '';
  };
  const order_id = getParam('order_id');
  const key_id = getParam('key_id');
  const amountStr = getParam('amount');
  const amount = parseInt(amountStr, 10) || 0;
  const currency = getParam('currency') || 'INR';
  const prefill_contact = getParam('prefill_contact');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>SafaiKart Checkout</title>
        <style>
            body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f7f9fc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            .loader-box { text-align: center; }
            .loader { border: 4px solid #e2e8f0; border-top: 4px solid #0B8043; border-radius: 50%; width: 44px; height: 44px; animation: spin 0.9s linear infinite; margin: 0 auto 16px; }
            .loader-text { font-size: 14px; color: #475569; font-weight: 500; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            #error-box { display: none; padding: 20px; color: #dc2626; word-wrap: break-word; text-align: center; }
        </style>
    </head>
    <body>
        <div id="loading" class="loader-box">
            <div class="loader"></div>
            <div class="loader-text">Opening Secure Payment Gateway...</div>
        </div>
        <div id="error-box"></div>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <script>
            window.onerror = function(msg, url, line) {
               document.getElementById('loading').style.display = 'none';
               var errBox = document.getElementById('error-box');
               errBox.style.display = 'block';
               errBox.innerHTML = "Error: " + msg;
            };

            setTimeout(() => {
              const options = {
                  "key": "${key_id}",
                  "amount": ${amount},
                  "currency": "${currency}",
                  "name": "SafaiKart",
                  "description": "Service Payment",
                  "handler": function (response) {
                      if (window.ReactNativeWebView) {
                          window.ReactNativeWebView.postMessage(JSON.stringify({
                              status: 'success',
                              razorpay_payment_id: response.razorpay_payment_id,
                              razorpay_order_id: response.razorpay_order_id || "${order_id}",
                              razorpay_signature: response.razorpay_signature || "test_signature"
                          }));
                      }
                  },
                  "prefill": {
                      "contact": "${prefill_contact}"
                  },
                  "theme": {
                      "color": "#0B8043"
                  },
                  "modal": {
                      "ondismiss": function() {
                          if (window.ReactNativeWebView) {
                              window.ReactNativeWebView.postMessage(JSON.stringify({
                                  status: 'dismissed'
                              }));
                          }
                      }
                  }
              };

              if ("${order_id}" && !"${order_id}".startsWith("order_local_")) {
                  options.order_id = "${order_id}";
              }
              
              try {
                  const rzp = new Razorpay(options);
                  rzp.on('payment.failed', function (response){
                      if (window.ReactNativeWebView) {
                          window.ReactNativeWebView.postMessage(JSON.stringify({
                              status: 'failed',
                              error: response.error
                          }));
                      }
                  });
                  rzp.open();
                  document.getElementById('loading').style.display = 'none';
              } catch(e) {
                  document.getElementById('loading').style.display = 'none';
                  var errBox = document.getElementById('error-box');
                  errBox.style.display = 'block';
                  errBox.innerHTML = "Init Error: " + e.message;
              }
            }, 600);
        </script>
    </body>
    </html>
  `;
};

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<PaymentScreenRouteProp>();
  const { orderId, amount } = route.params;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  const checkAnim = useState(new Animated.Value(0))[0];
  const paymentRepository = new PaymentRepository();
  const { clearCart } = useCart();

  const initiatePayment = async () => {
    setIsLoading(true);
    setIsDismissed(false);
    try {
      const orderData = await paymentRepository.createPaymentOrder(orderId);
      if (orderData && orderData.checkoutUrl) {
        setCheckoutUrl(orderData.checkoutUrl);
      }
    } catch (err) {
      console.warn('Payment order creation note:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initiatePayment();
  }, [orderId]);

  // Payment Success Screen
  if (paymentSuccess) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Animated.View style={[styles.successCard, { transform: [{ scale: checkAnim }] }]}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successSubtitle}>Your order has been confirmed</Text>
          <Text style={styles.successAmount}>₹{(amount / 100).toFixed(2)}</Text>
          <ActivityIndicator size="small" color="#0B8043" style={{ marginTop: 20 }} />
        </Animated.View>
      </View>
    );
  }

  // Active Razorpay Gateway WebView
  if (checkoutUrl && !isDismissed) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setIsDismissed(true)} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Secure Payment</Text>
          <View style={styles.headerBadge}>
            <MaterialIcons name="security" size={14} color="#0B8043" />
            <Text style={styles.headerBadgeText}>Razorpay</Text>
          </View>
        </View>

        <WebView
          source={{ html: generateRazorpayHTML(checkoutUrl), baseUrl: 'https://safaikart-6c4e4.web.app' }}
          style={{ flex: 1 }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
          onShouldStartLoadWithRequest={(request) => {
            const url = request.url;
            const isTestMode = checkoutUrl ? checkoutUrl.includes('rzp_test_') : false;

            if (url.startsWith('upi://') || url.startsWith('tez://') || url.startsWith('phonepe://') || url.startsWith('paytmmp://') || url.startsWith('intent://')) {
              // In production live mode, open the real installed UPI app
              // In test mode, keep inside Razorpay simulation to avoid external app errors
              if (!isTestMode) {
                Linking.openURL(url).catch(() => {});
              }
              return false;
            }
            return true;
          }}
          onMessage={async (event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.status === 'success') {
                setCheckoutUrl(null);
                setPaymentSuccess(true);
                Vibration.vibrate(100);
                
                try {
                  await clearCart();
                  await paymentRepository.verifyPaymentStatus(orderId);
                } catch (_) {}
                
                Animated.spring(checkAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();
                setTimeout(() => {
                  navigation.replace('PaymentResult', { orderId, success: true });
                }, 1400);
              } else if (data.status === 'dismissed' || data.status === 'failed') {
                setIsDismissed(true);
              }
            } catch (e) {
              console.warn('WebView Message Parse Error:', e);
            }
          }}
        />
      </View>
    );
  }

  // Initial Loading or Dismissed / Retry Fallback Screen
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#0B8043" />
            <Text style={styles.loadingText}>Opening Razorpay Secure Gateway...</Text>
          </View>
        ) : (
          <View style={styles.statusCard}>
            <View style={styles.statusIconCircle}>
              <Ionicons name="card-outline" size={40} color="#0B8043" />
            </View>

            <Text style={styles.statusTitle}>Payment Pending</Text>
            <Text style={styles.statusDesc}>
              Complete your payment using UPI, Credit/Debit Cards, or Netbanking on Razorpay.
            </Text>

            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Total Amount Payable</Text>
              <Text style={styles.amountValue}>₹{(amount / 100).toFixed(2)}</Text>
            </View>

            <TouchableOpacity 
              style={styles.payBtn}
              onPress={initiatePayment}
              activeOpacity={0.85}
            >
              <Text style={styles.payBtnText}>Pay ₹{(amount / 100).toFixed(2)} Now</Text>
              <Ionicons name="lock-closed" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel & Go Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0B8043',
    marginLeft: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingBox: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: '#475569',
    marginTop: 16,
    fontWeight: '500',
  },
  statusCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  statusDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  amountContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  amountLabel: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0B8043',
  },
  payBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#0B8043',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#0B8043',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  payBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelBtn: {
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  successCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#0B8043',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0B8043',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#0B8043',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  successAmount: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0B8043',
  },
});
