import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CheckoutScreen from '../../features/checkout/presentation/screens/CheckoutScreen';
import AddressListScreen from '../../features/addresses/presentation/screens/AddressListScreen';
import AddressFormScreen from '../../features/addresses/presentation/screens/AddressFormScreen';
import PickupSlotScreen from '../../features/checkout/presentation/screens/PickupSlotScreen';
import PaymentScreen from '../../features/payments/presentation/screens/PaymentScreen';
import PaymentPendingScreen from '../../features/payments/presentation/screens/PaymentPendingScreen';
import PaymentResultScreen from '../../features/payments/presentation/screens/PaymentResultScreen';
import EditOrderScreen from '../../features/orders/presentation/screens/EditOrderScreen';

export type CheckoutStackParamList = {
  Checkout: undefined;
  AddressList: undefined;
  AddressForm: { addressId?: string };
  PickupSlot: undefined;
  Payment: { orderId: string; amount: number };
  PaymentPending: { orderId: string };
  PaymentResult: { orderId: string; success: boolean };
  EditOrder: { orderId: string };
};

const Stack = createNativeStackNavigator<CheckoutStackParamList>();

export default function CheckoutNavigator() {
  return (
    <Stack.Navigator id="checkout-stack" screenOptions={{ headerShown: false }} initialRouteName="Checkout">
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="AddressList" component={AddressListScreen} />
      <Stack.Screen name="AddressForm" component={AddressFormScreen} />
      <Stack.Screen name="PickupSlot" component={PickupSlotScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="PaymentPending" component={PaymentPendingScreen} />
      <Stack.Screen name="PaymentResult" component={PaymentResultScreen} />
      <Stack.Screen name="EditOrder" component={EditOrderScreen} />
    </Stack.Navigator>
  );
}
