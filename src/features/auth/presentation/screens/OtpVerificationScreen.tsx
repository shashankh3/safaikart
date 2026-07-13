import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../../../../app/config/firebase';

export default function OtpVerificationScreen() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { phoneNumber, confirmation } = route.params || {};

  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      Alert.alert('Error', 'Please enter a 6-digit OTP');
      return;
    }
    
    setLoading(true);
    try {
      if (confirmation) {
        await confirmation.confirm(otp);
      } else {
        // Mock success with anonymous login to bypass auth screen and test MainTabs
        await signInAnonymously(auth);
      }
      // RootNavigator will automatically redirect due to auth state change!
    } catch (e) {
      Alert.alert('Error', 'Invalid OTP');
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
