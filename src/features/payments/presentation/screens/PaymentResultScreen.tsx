import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import AnimatedPressable from '../../../../shared/ui/components/AnimatedPressable';

type RouteParams = RouteProp<{ Result: { orderId: string; success: boolean } }, 'Result'>;

export default function PaymentResultScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteParams>();
  const { orderId, success } = route.params;

  const handleHome = () => {
    // Reset to Home
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }], // Assuming MainTabs is the root navigator
      })
    );
  };

  const handleRetry = () => {
    // Need amount for payment screen, but it's cleaner to let them go to Orders
    // and click "Pay Now" on the pending order.
    // For now, just go to Orders so they can see it.
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Orders' }],
      })
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {success ? (
          <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
             <Text style={styles.iconText}>✓</Text>
          </View>
        ) : (
          <View style={[styles.iconCircle, { backgroundColor: '#FFEBEE' }]}>
             <Text style={styles.iconText}>✕</Text>
          </View>
        )}

        <Text style={[styles.title, { color: success ? COLORS.success : '#FF3B30' }]}>
          {success ? 'Payment Successful!' : 'Payment Failed'}
        </Text>
        
        <Text style={styles.subtext}>
          {success 
            ? 'Your order is confirmed and pickup is scheduled.' 
            : 'Your UPI payment could not be processed.'}
        </Text>

        <Text style={styles.orderId}>Order #{orderId.substring(0, 8).toUpperCase()}</Text>

        <View style={styles.actions}>
          {success ? (
            <>
              <AnimatedPressable style={styles.primaryBtn} onPress={handleHome}>
                <Text style={styles.primaryBtnText}>Back to Home</Text>
              </AnimatedPressable>
              <AnimatedPressable style={styles.secondaryBtn} onPress={() => navigation.navigate('OrderTracking', { orderId })}>
                <Text style={styles.secondaryBtnText}>Track Order</Text>
              </AnimatedPressable>
            </>
          ) : (
            <>
              <AnimatedPressable style={[styles.primaryBtn, { backgroundColor: '#FF3B30' }]} onPress={handleRetry}>
                <Text style={styles.primaryBtnText}>View in Orders</Text>
              </AnimatedPressable>
              <AnimatedPressable style={styles.secondaryBtn} onPress={handleHome}>
                <Text style={styles.secondaryBtnText}>Back to Home</Text>
              </AnimatedPressable>
            </>
          )}
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.extraLarge,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.extraLarge,
  },
  iconText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: SIZES.padding,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SIZES.extraLarge,
    lineHeight: 24,
  },
  orderId: {
    fontSize: 14,
    color: COLORS.border,
    fontWeight: 'bold',
    marginBottom: SIZES.extraLarge * 2,
  },
  actions: {
    width: '100%',
  },
  primaryBtn: {
    backgroundColor: COLORS.darkGreen,
    paddingVertical: SIZES.padding,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: SIZES.padding,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryBtn: {
    backgroundColor: COLORS.primaryBg,
    paddingVertical: SIZES.padding,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: COLORS.darkGreen,
    fontWeight: '600',
    fontSize: 16,
  }
});
