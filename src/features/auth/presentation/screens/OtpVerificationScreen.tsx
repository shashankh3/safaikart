import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';

export default function OtpVerificationScreen() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { phoneNumber, verificationId } = route.params as { phoneNumber: string, verificationId: string };

  const handleVerifyOtp = async () => {
    const trimmedOtp = otp.trim();
    if (trimmedOtp.length !== 6 || !/^\d{6}$/.test(trimmedOtp)) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }
    
    setLoading(true);
    try {
      if (!verificationId) {
        throw new Error('Verification session is missing. Please try sending OTP again.');
      }
      
      const credential = auth.PhoneAuthProvider.credential(verificationId, trimmedOtp);
      await auth().signInWithCredential(credential);
      // RootNavigator will automatically redirect due to auth state change!
    } catch (e: any) {
      console.error(e);
      let errorMsg = 'Invalid OTP';
      if (e?.code === 'auth/invalid-verification-code') {
        errorMsg = 'The OTP entered is incorrect.';
      } else if (e?.code === 'auth/session-expired') {
        errorMsg = 'The OTP has expired. Please request a new one.';
      } else if (e?.message) {
        errorMsg = e.message;
      }
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>Sent to {phoneNumber}</Text>
      <TextInput
        style={styles.input}
        placeholder="6-digit OTP"
        keyboardType="number-pad"
        value={otp}
        onChangeText={setOtp}
        maxLength={6}
      />
      {loading ? <ActivityIndicator size="large" /> : <Button title="Verify" onPress={handleVerifyOtp} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 20, borderRadius: 5, textAlign: 'center', fontSize: 18 },
});
