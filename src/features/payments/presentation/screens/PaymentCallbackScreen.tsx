import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Text, YStack } from '../../../../shared/ui/primitives/Stacks';
import { COLORS } from '../../../../shared/theme/colors';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentCallbackScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { orderId, status } = route.params || {};
  
  const [isVerifying, setIsVerifying] = React.useState(true);
  const isSuccess = status === 'success';

  useEffect(() => {
    // Simulate verification delay
    const verificationTimer = setTimeout(() => {
      setIsVerifying(false);
      
      // Navigate away after showing result
      setTimeout(() => {
        navigation.replace('OrderTracking', { orderId });
      }, 2500);
      
    }, 2000);

    return () => clearTimeout(verificationTimer);
  }, [orderId, navigation]);

  return (
    <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor={COLORS.primaryBg}>
      {isVerifying ? (
        <>
          <ActivityIndicator size={64} color={COLORS.darkGreen} />
          <Text fontSize={20} fontWeight="bold" marginTop={24} color={COLORS.black}>
            Verifying Payment...
          </Text>
          <Text fontSize={14} color={COLORS.textSecondary} marginTop={8} textAlign="center" paddingHorizontal={32}>
            Please wait while we confirm your payment with the bank. Do not close this screen.
          </Text>
        </>
      ) : (
        <>
          <Ionicons 
            name={isSuccess ? "checkmark-circle" : "close-circle"} 
            size={80} 
            color={isSuccess ? COLORS.success : '#E51A1A'} 
          />
          <Text fontSize={24} fontWeight="bold" marginTop={16} color={COLORS.black}>
            {isSuccess ? 'Payment Successful' : 'Payment Failed'}
          </Text>
          <Text fontSize={16} color={COLORS.textSecondary} marginTop={8} textAlign="center" paddingHorizontal={32}>
            {isSuccess 
              ? 'Your order is confirmed. Redirecting to tracking...' 
              : 'There was an issue processing your payment. Redirecting...'}
          </Text>
        </>
      )}
    </YStack>
  );
}
