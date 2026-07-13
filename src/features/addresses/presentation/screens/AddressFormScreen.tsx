import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, Switch, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { YStack, XStack, Text } from '../../../../shared/ui/primitives/Stacks';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import AnimatedPressable from '../../../../shared/ui/components/AnimatedPressable';
import { useAddresses } from '../hooks/useAddresses';

export default function AddressFormScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { mode, addressId, address } = route?.params || { mode: 'add' };
  
  const { addAddress, updateAddress } = useAddresses();

  const [label, setLabel] = useState(mode === 'edit' ? address?.label : 'Home');
  const [name, setName] = useState(mode === 'edit' ? address?.name : '');
  const [phoneNumber, setPhoneNumber] = useState(mode === 'edit' ? address?.phoneNumber?.replace('+91', '') : '');
  const [line1, setLine1] = useState(mode === 'edit' ? address?.line1 : '');
  const [line2, setLine2] = useState(mode === 'edit' ? address?.line2 : '');
  const [city, setCity] = useState(mode === 'edit' ? address?.city : '');
  const [state, setState] = useState(mode === 'edit' ? address?.state : 'Chhattisgarh');
  const [pincode, setPincode] = useState(mode === 'edit' ? address?.pincode : '');
  const [isDefault, setIsDefault] = useState(mode === 'edit' ? address?.isDefault : true);

  const [saving, setSaving] = useState(false);

  const isValidPhone = phoneNumber.length === 10;
  const isValidPincode = pincode.length === 6;
  const isFormValid = name.trim().length > 0 && isValidPhone && line1.trim().length > 0 && city.trim().length > 0 && isValidPincode;

  const handleSave = async () => {
    if (!isFormValid) return;
    setSaving(true);
    try {
      const draft = {
        label,
        name,
        phoneNumber: `+91${phoneNumber}`,
        line1,
        line2,
        city,
        state,
        pincode,
        isDefault
      };
      
      if (mode === 'edit') {
        await updateAddress(addressId, draft);
      } else {
        await addAddress(draft);
      }
      
      // Navigate back on success
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const renderLabelChip = (title: string) => (
    <TouchableOpacity onPress={() => setLabel(title)} style={{ flex: 1, marginRight: title === 'Other' ? 0 : 8 }}>
      <View style={{
        paddingVertical: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: label === title ? COLORS.darkGreen : '#E0E0E0',
        backgroundColor: label === title ? '#F0F9F4' : '#FFF',
        borderRadius: SIZES.radius
      }}>
        <Text color={label === title ? COLORS.darkGreen : COLORS.textSecondary} fontWeight={label === title ? 'bold' : 'normal'}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.primaryBg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <XStack paddingTop={insets.top} padding={SIZES.padding} alignItems="center" backgroundColor={COLORS.white} borderBottomWidth={1} borderBottomColor="#F0F0F0">
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text fontSize={18} fontWeight="bold">{mode === 'edit' ? 'Edit Address' : 'Add Address'}</Text>
      </XStack>

      <ScrollView contentContainerStyle={{ padding: SIZES.padding, paddingBottom: 100 }}>
        
        <Text fontWeight="600" marginBottom={8}>Save Address As</Text>
        <XStack marginBottom={20}>
          {renderLabelChip('Home')}
          {renderLabelChip('Work')}
          {renderLabelChip('Other')}
        </XStack>

        <YStack marginBottom={16}>
          <Text fontWeight="600" fontSize={13} color={COLORS.textSecondary} marginBottom={4}>Full Name *</Text>
          <TextInput
            style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: SIZES.radius, padding: 12, fontSize: 16 }}
            placeholder="Enter full name"
            value={name}
            onChangeText={setName}
          />
        </YStack>

        <YStack marginBottom={16}>
          <Text fontWeight="600" fontSize={13} color={COLORS.textSecondary} marginBottom={4}>Phone Number *</Text>
          <XStack alignItems="center">
            <View style={{ backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0', borderRightWidth: 0, borderTopLeftRadius: SIZES.radius, borderBottomLeftRadius: SIZES.radius, padding: 12, height: 50, justifyContent: 'center' }}>
              <Text fontSize={16} fontWeight="600">+91</Text>
            </View>
            <TextInput
              style={{ flex: 1, height: 50, backgroundColor: '#FFF', borderWidth: 1, borderColor: (!isValidPhone && phoneNumber.length > 0) ? '#E51A1A' : '#E0E0E0', borderTopRightRadius: SIZES.radius, borderBottomRightRadius: SIZES.radius, padding: 12, fontSize: 16 }}
              placeholder="XXXXXXXXXX"
              keyboardType="phone-pad"
              maxLength={10}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </XStack>
        </YStack>

        <YStack marginBottom={16}>
          <Text fontWeight="600" fontSize={13} color={COLORS.textSecondary} marginBottom={4}>Address Line 1 *</Text>
          <TextInput
            style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: SIZES.radius, padding: 12, fontSize: 16 }}
            placeholder="House/Flat no, Building name"
            value={line1}
            onChangeText={setLine1}
          />
        </YStack>

        <YStack marginBottom={16}>
          <Text fontWeight="600" fontSize={13} color={COLORS.textSecondary} marginBottom={4}>Address Line 2 (Optional)</Text>
          <TextInput
            style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: SIZES.radius, padding: 12, fontSize: 16 }}
            placeholder="Street, Area, Landmark"
            value={line2}
            onChangeText={setLine2}
          />
        </YStack>

        <XStack marginBottom={16}>
          <YStack flex={1} marginRight={8}>
            <Text fontWeight="600" fontSize={13} color={COLORS.textSecondary} marginBottom={4}>City *</Text>
            <TextInput
              style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: SIZES.radius, padding: 12, fontSize: 16 }}
              placeholder="City"
              value={city}
              onChangeText={setCity}
            />
          </YStack>
          <YStack flex={1}>
            <Text fontWeight="600" fontSize={13} color={COLORS.textSecondary} marginBottom={4}>Pincode *</Text>
            <TextInput
              style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: (!isValidPincode && pincode.length > 0) ? '#E51A1A' : '#E0E0E0', borderRadius: SIZES.radius, padding: 12, fontSize: 16 }}
              placeholder="6 digits"
              keyboardType="numeric"
              maxLength={6}
              value={pincode}
              onChangeText={setPincode}
            />
          </YStack>
        </XStack>

        <XStack alignItems="center" justifyContent="space-between" marginTop={8}>
          <Text fontWeight="600" fontSize={16}>Set as Default Address</Text>
          <Switch value={isDefault} onValueChange={setIsDefault} trackColor={{ true: COLORS.darkGreen, false: '#E0E0E0' }} />
        </XStack>

      </ScrollView>

      {/* Save Button */}
      <YStack padding={SIZES.padding} paddingBottom={insets.bottom || SIZES.padding} backgroundColor={COLORS.white} borderTopWidth={1} borderTopColor="#F0F0F0">
        <AnimatedPressable onPress={handleSave} disabled={!isFormValid || saving}>
          <YStack backgroundColor={isFormValid && !saving ? COLORS.darkGreen : '#A0A0A0'} padding={16} borderRadius={SIZES.radius} alignItems="center">
            <Text color={COLORS.white} fontSize={16} fontWeight="bold">{saving ? 'Saving...' : 'Save Address'}</Text>
          </YStack>
        </AnimatedPressable>
      </YStack>
    </KeyboardAvoidingView>
  );
}
