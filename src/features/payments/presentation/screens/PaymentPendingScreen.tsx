import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView, Animated } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import AnimatedPressable from '../../../../shared/ui/components/AnimatedPressable';
import { CheckPaymentStatusUseCase } from '../../application/checkPaymentStatus.usecase';
import { PaymentRepository } from '../../infrastructure/PaymentRepository';

type RouteParams = RouteProp<{ Pending: { orderId: string } }, 'Pending'>;

export default function PaymentPendingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteParams>();
  const { orderId } = route.params;

  const [isTakingLong, setIsTakingLong] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const checkUseCase = new CheckPaymentStatusUseCase(new PaymentRepository());

  useEffect(() => {
    // 1. Listen to real-time updates
    const unsubscribe = checkUseCase.listenToOrder(orderId, (status) => {
      if (status === 'success') {
        navigation.replace('PaymentResult', { orderId, success: true });
      } else if (status === 'failed') {
        navigation.replace('PaymentResult', { orderId, success: false });
      }
    });

    // 2. Timeout for "taking long" UI
    const timerId = setTimeout(() => {
      setIsTakingLong(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 15000); // 15 seconds

    // 3. Fallback check after 60 seconds (in case webhook is fully lost)
    const fallbackId = setTimeout(async () => {
      const status = await checkUseCase.verifyFallback(orderId);
      if (status === 'success') {
        navigation.replace('PaymentResult', { orderId, success: true });
      } else if (status === 'failed') {
        navigation.replace('PaymentResult', { orderId, success: false });
      }
    }, 60000);

    return () => {
      unsubscribe();
      clearTimeout(timerId);
      clearTimeout(fallbackId);
    };
  }, [orderId]);

  const handleManualCheck = async () => {
    const status = await checkUseCase.verifyFallback(orderId);
    if (status === 'success') {
      navigation.replace('PaymentResult', { orderId, success: true });
    } else if (status === 'failed') {
      navigation.replace('PaymentResult', { orderId, success: false });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={COLORS.darkGreen} style={styles.spinner} />
        
        <Text style={styles.title}>Verifying your payment...</Text>
        <Text style={styles.subtext}>This usually takes a few seconds. Please don't close the app.</Text>
        
        <Text style={styles.orderId}>Order #{orderId.substring(0, 8).toUpperCase()}</Text>

        <Animated.View style={[styles.fallbackContainer, { opacity: fadeAnim }]}>
          {isTakingLong && (
            <>
              <Text style={styles.takingLongText}>Taking longer than usual?</Text>
              <AnimatedPressable style={styles.checkBtn} onPress={handleManualCheck}>
                <Text style={styles.checkBtnText}>Check Status Now</Text>
              </AnimatedPressable>
              
              <AnimatedPressable style={styles.laterBtn} onPress={() => navigation.navigate('Orders')}>
                <Text style={styles.laterBtnText}>I'll check later</Text>
              </AnimatedPressable>
            </>
          )}
        </Animated.View>
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
  spinner: {
    marginBottom: SIZES.large,
    transform: [{ scale: 1.5 }],
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: SIZES.base,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SIZES.extraLarge * 2,
    lineHeight: 20,
  },
  orderId: {
    fontSize: 14,
    color: COLORS.border,
    fontWeight: '500',
    marginBottom: SIZES.extraLarge,
  },
  fallbackContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: SIZES.extraLarge,
  },
  takingLongText: {
    color: COLORS.textSecondary,
    marginBottom: SIZES.padding,
  },
  checkBtn: {
    backgroundColor: COLORS.primaryBg,
    paddingVertical: SIZES.padding,
    paddingHorizontal: SIZES.large,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: SIZES.padding,
    borderWidth: 1,
    borderColor: COLORS.darkGreen,
  },
  checkBtnText: {
    color: COLORS.darkGreen,
    fontWeight: '600',
  },
  laterBtn: {
    paddingVertical: SIZES.padding,
  },
  laterBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '500',
  }
});
