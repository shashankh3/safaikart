import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { sendPhoneOtp } from '../../../../core/firebase/auth';
export default function PhoneLoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const handleSendOtp = async () => {
    let formattedNumber = phoneNumber.trim();
    if (!formattedNumber.startsWith('+')) {
      formattedNumber = '+91' + formattedNumber;
    }

    if (!/^\+[1-9]\d{1,14}$/.test(formattedNumber)) {
      Alert.alert('Error', 'Please enter a valid phone number in E.164 format (e.g. +919876543210)');
      return;
    }
    
    setLoading(true);
    try {
      const confirmation = await sendPhoneOtp(formattedNumber);
      navigation.navigate('OtpVerification', { 
        phoneNumber: formattedNumber, 
        verificationId: confirmation.verificationId 
      });
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e?.message || 'Failed to send OTP');
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
