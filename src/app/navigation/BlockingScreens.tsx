import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../../shared/theme/colors';
import { SIZES } from '../../../shared/theme/spacing';
import { Ionicons } from '@expo/vector-icons';
import AnimatedPressable from '../../../shared/ui/components/AnimatedPressable';
import * as Linking from 'expo-linking';

export const MaintenanceScreen = () => (
  <View style={styles.container}>
    <Ionicons name="construct" size={64} color={COLORS.darkGreen} />
    <Text style={styles.title}>Under Maintenance</Text>
    <Text style={styles.message}>We're currently performing some scheduled maintenance. Please check back later.</Text>
  </View>
);

export const ForceUpdateScreen = () => (
  <View style={styles.container}>
    <Ionicons name="cloud-download" size={64} color={COLORS.darkGreen} />
    <Text style={styles.title}>Update Required</Text>
    <Text style={styles.message}>A new version of SafaiKart is available. Please update to continue using the app.</Text>
    <AnimatedPressable style={styles.btn} onPress={() => Linking.openURL('market://details?id=com.safaikart.app')}>
      <Text style={styles.btnText}>Update Now</Text>
    </AnimatedPressable>
  </View>
);

export const BlockedUserScreen = () => (
  <View style={styles.container}>
    <Ionicons name="lock-closed" size={64} color="#FF3B30" />
    <Text style={styles.title}>Account Blocked</Text>
    <Text style={styles.message}>Your account has been blocked. Please contact support for assistance.</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryBg,
    padding: SIZES.extraLarge * 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: SIZES.large,
    marginBottom: SIZES.small,
    color: COLORS.black,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SIZES.extraLarge,
  },
  btn: {
    backgroundColor: COLORS.darkGreen,
    paddingVertical: SIZES.padding,
    paddingHorizontal: SIZES.extraLarge,
    borderRadius: SIZES.radius,
  },
  btnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  }
});
