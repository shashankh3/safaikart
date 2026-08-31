import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, Switch, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { YStack, XStack, Text } from '../../../../shared/ui/primitives/Stacks';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import AnimatedPressable from '../../../../shared/ui/components/AnimatedPressable';
import { useAddresses } from '../hooks/useAddresses';
import { addressSchema } from '../../../../shared/validation';
import * as Location from 'expo-location';

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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const detectLocationFromGps = async () => {
    setIsDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location permission to auto-fill address.');
        return;
      }

      let loc = await Location.getLastKnownPositionAsync({});
      if (!loc) {
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      }

      if (loc) {
        const reverse = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (reverse && reverse.length > 0) {
          const p = reverse[0];
          if (p.street || p.name) setLine1(p.street || p.name || line1);
          if (p.district || p.subregion) setLine2(p.district || p.subregion || line2);
          if (p.city || p.subregion || p.region) setCity(p.city || p.subregion || p.region || city);
          if (p.region) setState(p.region);
          if (p.postalCode) setPincode(p.postalCode);
        }
      }
    } catch (e: any) {
      Alert.alert('GPS Notice', 'Could not fetch current GPS location. Please fill manually.');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleSave = async () => {
    const draft = {
      label,
      name,
      phoneNumber,
      line1,
      line2,
      city,
      state,
      pincode,
      isDefault
    };

    const validation = addressSchema.safeParse(draft);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach(issue => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const validDraft = {
        ...validation.data,
        line2: validation.data.line2 || '',
        phoneNumber: `+91${validation.data.phoneNumber}`
      };
      
      if (mode === 'edit') {
        await updateAddress(addressId, validDraft);
      } else {
        await addAddress(validDraft);
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
        <XStack marginBottom={16}>
          {renderLabelChip('Home')}
          {renderLabelChip('Work')}
          {renderLabelChip('Other')}
        </XStack>

        {/* Use Current Location Button */}
        <TouchableOpacity
          onPress={detectLocationFromGps}
          disabled={isDetectingLocation}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ECFDF5',
            borderWidth: 1,
            borderColor: '#A7F3D0',
            paddingVertical: 12,
            borderRadius: SIZES.radius,
            marginBottom: 20,
          }}
          activeOpacity={0.8}
        >
          {isDetectingLocation ? (
            <ActivityIndicator size="small" color={COLORS.darkGreen} style={{ marginRight: 8 }} />
          ) : (
            <Ionicons name="navigate-circle" size={20} color={COLORS.darkGreen} style={{ marginRight: 6 }} />
          )}
          <Text color={COLORS.darkGreen} fontWeight="700" fontSize={14}>
            {isDetectingLocation ? 'Detecting Your Location...' : 'Use Current GPS Location'}
          </Text>
        </TouchableOpacity>

        <YStack marginBottom={16}>
          <Text fontWeight="600" fontSize={13} color={COLORS.textSecondary} marginBottom={4}>Full Name *</Text>
          <TextInput
            style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: errors.name ? '#E51A1A' : '#E0E0E0', borderRadius: SIZES.radius, padding: 12, fontSize: 16 }}
            placeholder="Enter full name"
            value={name}
            onChangeText={setName}
          />
          {errors.name && <Text color="#E51A1A" fontSize={12} marginTop={4}>{errors.name}</Text>}
        </YStack>

        <YStack marginBottom={16}>
          <Text fontWeight="600" fontSize={13} color={COLORS.textSecondary} marginBottom={4}>Phone Number *</Text>
          <XStack alignItems="center">
            <View style={{ backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: errors.phoneNumber ? '#E51A1A' : '#E0E0E0', borderRightWidth: 0, borderTopLeftRadius: SIZES.radius, borderBottomLeftRadius: SIZES.radius, padding: 12, height: 50, justifyContent: 'center' }}>
              <Text fontSize={16} fontWeight="600">+91</Text>
            </View>
            <TextInput
              style={{ flex: 1, height: 50, backgroundColor: '#FFF', borderWidth: 1, borderColor: errors.phoneNumber ? '#E51A1A' : '#E0E0E0', borderTopRightRadius: SIZES.radius, borderBottomRightRadius: SIZES.radius, padding: 12, fontSize: 16 }}
              placeholder="XXXXXXXXXX"
              keyboardType="phone-pad"
              maxLength={10}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </XStack>
          {errors.phoneNumber && <Text color="#E51A1A" fontSize={12} marginTop={4}>{errors.phoneNumber}</Text>}
        </YStack>

        <YStack marginBottom={16}>
          <Text fontWeight="600" fontSize={13} color={COLORS.textSecondary} marginBottom={4}>Address Line 1 *</Text>
          <TextInput
            style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: errors.line1 ? '#E51A1A' : '#E0E0E0', borderRadius: SIZES.radius, padding: 12, fontSize: 16 }}
            placeholder="House/Flat no, Building name"
            value={line1}
            onChangeText={setLine1}
          />
          {errors.line1 && <Text color="#E51A1A" fontSize={12} marginTop={4}>{errors.line1}</Text>}
        </YStack>

        <YStack marginBottom={16}>
          <Text fontWeight="600" fontSize={13} color={COLORS.textSecondary} marginBottom={4}>Address Line 2 (Optional)</Text>
          <TextInput
            style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: errors.line2 ? '#E51A1A' : '#E0E0E0', borderRadius: SIZES.radius, padding: 12, fontSize: 16 }}
            placeholder="Street, Area, Landmark"
            value={line2}
            onChangeText={setLine2}
          />
          {errors.line2 && <Text color="#E51A1A" fontSize={12} marginTop={4}>{errors.line2}</Text>}
        </YStack>

        <XStack marginBottom={16}>
          <YStack flex={1} marginRight={8}>
            <Text fontWeight="600" fontSize={13} color={COLORS.textSecondary} marginBottom={4}>City *</Text>
            <TextInput
              style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: errors.city ? '#E51A1A' : '#E0E0E0', borderRadius: SIZES.radius, padding: 12, fontSize: 16 }}
              placeholder="City"
              value={city}
              onChangeText={setCity}
            />
            {errors.city && <Text color="#E51A1A" fontSize={12} marginTop={4}>{errors.city}</Text>}
          </YStack>
          <YStack flex={1}>
            <Text fontWeight="600" fontSize={13} color={COLORS.textSecondary} marginBottom={4}>Pincode *</Text>
            <TextInput
              style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: errors.pincode ? '#E51A1A' : '#E0E0E0', borderRadius: SIZES.radius, padding: 12, fontSize: 16 }}
              placeholder="6 digits"
              keyboardType="numeric"
              maxLength={6}
              value={pincode}
              onChangeText={setPincode}
            />
            {errors.pincode && <Text color="#E51A1A" fontSize={12} marginTop={4}>{errors.pincode}</Text>}
          </YStack>
        </XStack>

        <XStack alignItems="center" justifyContent="space-between" marginTop={8}>
          <Text fontWeight="600" fontSize={16}>Set as Default Address</Text>
          <Switch value={isDefault} onValueChange={setIsDefault} trackColor={{ true: COLORS.darkGreen, false: '#E0E0E0' }} />
        </XStack>

      </ScrollView>

      {/* Save Button */}
      <YStack padding={SIZES.padding} paddingBottom={insets.bottom || SIZES.padding} backgroundColor={COLORS.white} borderTopWidth={1} borderTopColor="#F0F0F0">
        <AnimatedPressable onPress={handleSave} disabled={saving}>
          <YStack backgroundColor={!saving ? COLORS.darkGreen : '#A0A0A0'} padding={16} borderRadius={SIZES.radius} alignItems="center">
            <Text color={COLORS.white} fontSize={16} fontWeight="bold">{saving ? 'Saving...' : 'Save Address'}</Text>
          </YStack>
        </AnimatedPressable>
      </YStack>
    </KeyboardAvoidingView>
  );
}
