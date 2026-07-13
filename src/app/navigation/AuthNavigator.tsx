import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EntryScreen from '../../features/auth/presentation/screens/EntryScreen';
import PhoneLoginScreen from '../../features/auth/presentation/screens/PhoneLoginScreen';
import OtpVerificationScreen from '../../features/auth/presentation/screens/OtpVerificationScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }} initialRouteName="Entry">
      <Stack.Screen name="Entry" component={EntryScreen} />
      <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
    </Stack.Navigator>
  );
}
