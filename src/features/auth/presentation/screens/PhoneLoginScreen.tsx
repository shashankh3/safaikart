import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { sendPhoneOtp } from '../../../../core/firebase/auth';

export default function PhoneLoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('+91 ');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const handleSendOtp = async () => {
    let formattedNumber = phoneNumber.trim().replace(/[^\d+]/g, '');
    if (!formattedNumber.startsWith('+')) {
      if (formattedNumber.startsWith('91') && formattedNumber.length === 12) {
        formattedNumber = '+' + formattedNumber;
      } else {
        formattedNumber = '+91' + formattedNumber;
      }
    }

    if (!/^\+91[6-9]\d{9}$/.test(formattedNumber) && !/^\+91\d{10}$/.test(formattedNumber)) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit Indian mobile number (e.g. +91 98765 43210)');
      return;
    }

    setLoading(true);
    try {
      await sendPhoneOtp(formattedNumber);
      navigation.navigate('OtpVerification', {
        phoneNumber: formattedNumber,
      });
    } catch (e: any) {
      console.error('sendPhoneOtp error:', e);
      Alert.alert('Error', e?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to SafaiKart</Text>
      <Text style={styles.subtitle}>Enter your mobile number to sign in or register</Text>
      <TextInput
        style={styles.input}
        placeholder="+91 98765 43210"
        placeholderTextColor="#999"
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        autoFocus
      />
      {loading ? <ActivityIndicator size="large" color="#0F301F" /> : <Button title="Send OTP" color="#0F301F" onPress={handleSendOtp} />}
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
    fontSize: 16,
    color: '#111827',
  },
});
