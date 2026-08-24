import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { verifyPhoneOtp, sendPhoneOtp } from '../../../../core/firebase/auth';

export default function OtpVerificationScreen() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const route = useRoute<any>();
  const { phoneNumber } = route.params as { phoneNumber: string };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  const handleVerifyOtp = async () => {
    const trimmedOtp = otp.trim();
    if (trimmedOtp.length !== 6 || !/^\d{6}$/.test(trimmedOtp)) {
      Alert.alert('Invalid OTP', 'Please enter a valid 6-digit OTP code');
      return;
    }

    setLoading(true);
    try {
      await verifyPhoneOtp(phoneNumber, trimmedOtp);
      // Firebase auth state listener in RootNavigator handles screen transition automatically!
    } catch (e: any) {
      console.error('verifyPhoneOtp error:', e);
      let errorMsg = 'Invalid OTP code. Please try again.';
      if (e?.message) {
        errorMsg = e.message;
      }
      Alert.alert('Verification Failed', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || resending) return;
    setResending(true);
    try {
      await sendPhoneOtp(phoneNumber);
      Alert.alert('OTP Sent', `A fresh OTP was sent to ${phoneNumber}`);
      setResendTimer(30);
    } catch (e: any) {
      console.error('Resend OTP error:', e);
      Alert.alert('Resend Failed', e?.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Phone Number</Text>
      <Text style={styles.subtitle}>Enter the 6-digit OTP code sent to {phoneNumber}</Text>

      <TextInput
        style={styles.input}
        placeholder="••••••"
        placeholderTextColor="#999"
        keyboardType="number-pad"
        value={otp}
        onChangeText={setOtp}
        maxLength={6}
        autoFocus
      />

      {loading ? (
        <ActivityIndicator size="large" color="#0F301F" style={{ marginBottom: 20 }} />
      ) : (
        <Button title="Verify & Continue" color="#0F301F" onPress={handleVerifyOtp} />
      )}

      <View style={styles.resendContainer}>
        {resendTimer > 0 ? (
          <Text style={styles.timerText}>Resend OTP in {resendTimer}s</Text>
        ) : (
          <TouchableOpacity onPress={handleResend} disabled={resending}>
            <Text style={styles.resendText}>{resending ? 'Sending...' : 'Resend OTP'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#FFFFFF' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 20,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
    fontWeight: 'bold',
    color: '#111827',
  },
  resendContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  resendText: {
    fontSize: 14,
    color: '#0F301F',
    fontWeight: 'bold',
  },
});
