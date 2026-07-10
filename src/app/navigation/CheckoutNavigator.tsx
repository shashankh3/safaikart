import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CheckoutScreen from '../../features/checkout/presentation/screens/CheckoutScreen';
import AddressListScreen from '../../features/addresses/presentation/screens/AddressListScreen';
import AddressFormScreen from '../../features/addresses/presentation/screens/AddressFormScreen';
import PickupSlotScreen from '../../features/checkout/presentation/screens/PickupSlotScreen';

const Stack = createNativeStackNavigator<any>();

export default function CheckoutNavigator() {
  return (
    <Stack.Navigator id="checkout-stack" screenOptions={{ headerShown: false }} initialRouteName="Checkout">
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="AddressList" component={AddressListScreen} />
      <Stack.Screen name="AddressForm" component={AddressFormScreen} />
      <Stack.Screen name="PickupSlot" component={PickupSlotScreen} />
    </Stack.Navigator>
  );
}
