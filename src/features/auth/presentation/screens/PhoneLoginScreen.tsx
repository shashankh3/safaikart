import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { sendPhoneOtp } from '../../../../core/firebase/auth';
import { auth } from '../../../../app/config/firebase';
import { signInAnonymously } from 'firebase/auth';

export default function PhoneLoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const handleSendOtp = async () => {
    if (phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    
    setLoading(true);
    try {
      // In a real Expo Native app, you need expo-firebase-recaptcha. 
      // For web, RecaptchaVerifier from firebase/auth works.
      // Since this might fail on native without a verifier, we fallback to anonymous auth for testing.
      // const confirmation = await sendPhoneOtp('+91' + phoneNumber, appVerifier);
      // navigation.navigate('OtpVerification', { phoneNumber, confirmation });
      
      // MOCK: bypass to OtpVerification
      navigation.navigate('OtpVerification', { phoneNumber, confirmation: null });
    } catch (e) {
      Alert.alert('Error', 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />
      {loading ? <ActivityIndicator size="large" /> : <Button title="Send OTP" onPress={handleSendOtp} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 20, borderRadius: 5 },
});
