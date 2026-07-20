import React, { useState } from 'react';
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { YStack, XStack, Text } from '../../../../shared/ui/primitives/Stacks';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import AnimatedPressable from '../../../../shared/ui/components/AnimatedPressable';
import { addDoc, collection, serverTimestamp } from '@react-native-firebase/firestore';
import { db } from '../../../../app/config/firebase';
import { useAuth } from '../../../auth/application/useAuth';
import { useToast } from '../../../../core/providers/ToastContext';

export default function SupportScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const orderId = route.params?.orderId;
  
  const [subject, setSubject] = useState(orderId ? `Issue with order #${orderId.substring(0, 8).toUpperCase()}` : '');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      showToast('Please enter a message', 'error');
      return;
    }
    if (!subject.trim()) {
      showToast('Please enter a subject', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'supportTickets'), {
        userId: user?.uid,
        orderId: orderId || null,
        subject,
        message,
        status: 'OPEN',
        createdAt: serverTimestamp(),
      });
      showToast('Ticket submitted successfully. We will get back to you soon.', 'success');
      navigation.goBack();
    } catch (e: any) {
      showToast(e.message || 'Failed to submit ticket', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <XStack padding={SIZES.padding} alignItems="center" backgroundColor={COLORS.white} borderBottomWidth={1} borderBottomColor="#F0F0F0">
        <AnimatedPressable onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </AnimatedPressable>
        <Text fontSize={18} fontWeight="bold">Help & Support</Text>
      </XStack>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.infoText}>
            Experiencing an issue? Let us know the details and our support team will get back to you as soon as possible.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="Briefly describe the issue"
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Provide more details..."
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <AnimatedPressable 
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]} 
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitBtnText}>
              {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
            </Text>
          </AnimatedPressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryBg,
  },
  scrollContent: {
    padding: SIZES.padding,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SIZES.extraLarge,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: SIZES.padding,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: SIZES.radius,
    padding: 12,
    fontSize: 15,
  },
  textArea: {
    height: 120,
  },
  submitBtn: {
    backgroundColor: COLORS.darkGreen,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    marginTop: SIZES.large,
  },
  submitBtnDisabled: {
    backgroundColor: '#A0A0A0',
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  }
});
