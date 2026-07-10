import React, { useEffect, useState, useMemo } from 'react';
import { ScrollView, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { YStack, XStack, Text } from '../../../../shared/ui/primitives/Stacks';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import AnimatedPressable from '../../../../shared/ui/components/AnimatedPressable';
import { CheckoutRepository } from '../../infrastructure/CheckoutRepository';
import { PickupSlot } from '../../domain/PickupSlot';

const repository = new CheckoutRepository();

export default function PickupSlotScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [slots, setSlots] = useState<PickupSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const data = await repository.getPickupSlots();
        setSlots(data);
        if (data.length > 0) {
          // Select the first available date by default
          setSelectedDate(data[0].date);
        }
      } catch (e) {
        console.error('Failed to load slots', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSlots();
  }, []);

  // Group slots by date
  const groupedSlots = useMemo(() => {
    const groups: { [key: string]: PickupSlot[] } = {};
    slots.forEach(slot => {
      if (!groups[slot.date]) groups[slot.date] = [];
      groups[slot.date].push(slot);
    });
    return groups;
  }, [slots]);

  const availableDates = Object.keys(groupedSlots);

  const handleConfirm = () => {
    if (selectedSlotId) {
      const slot = slots.find(s => s.id === selectedSlotId);
      navigation.navigate('Checkout', { selectedSlot: slot });
    }
  };

  return (
    <YStack flex={1} backgroundColor={COLORS.primaryBg} paddingTop={insets.top}>
      {/* Header */}
      <XStack padding={SIZES.padding} alignItems="center" backgroundColor={COLORS.white} borderBottomWidth={1} borderBottomColor="#F0F0F0">
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text fontSize={18} fontWeight="bold">Select Pickup Slot</Text>
      </XStack>

      {loading ? (
        <YStack flex={1} justifyContent="center" alignItems="center">
          <ActivityIndicator size="large" color={COLORS.darkGreen} />
        </YStack>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Date Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: SIZES.padding }}>
            {availableDates.map((dateStr) => {
              const isSelected = dateStr === selectedDate;
              // Simple formatting for date chips
              const d = new Date(dateStr);
              const dayName = d.toLocaleDateString('en-GB', { weekday: 'short' });
              const dayNum = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

              return (
                <TouchableOpacity key={dateStr} onPress={() => setSelectedDate(dateStr)}>
                  <YStack 
                    alignItems="center" 
                    paddingVertical={12} 
                    paddingHorizontal={16} 
                    marginRight={12}
                    borderRadius={SIZES.radius}
                    borderWidth={1}
                    borderColor={isSelected ? COLORS.darkGreen : '#E0E0E0'}
                    backgroundColor={isSelected ? '#F0F9F4' : '#FFF'}
                  >
                    <Text fontSize={13} color={isSelected ? COLORS.darkGreen : COLORS.textSecondary} fontWeight={isSelected ? 'bold' : 'normal'}>{dayName}</Text>
                    <Text fontSize={15} color={isSelected ? COLORS.darkGreen : COLORS.black} fontWeight="bold" marginTop={4}>{dayNum}</Text>
                  </YStack>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Time Slots */}
          <YStack paddingHorizontal={SIZES.padding}>
            {selectedDate && groupedSlots[selectedDate] ? (
              groupedSlots[selectedDate].map((slot) => {
                const isSelected = selectedSlotId === slot.id;
                
                return (
                  <AnimatedPressable 
                    key={slot.id} 
                    onPress={() => slot.available && setSelectedSlotId(slot.id)}
                    disabled={!slot.available}
                  >
                    <XStack 
                      alignItems="center" 
                      justifyContent="space-between"
                      padding={16}
                      marginBottom={12}
                      borderRadius={SIZES.radius}
                      borderWidth={2}
                      borderColor={isSelected ? COLORS.darkGreen : '#F0F0F0'}
                      backgroundColor={slot.available ? COLORS.white : '#F9F9F9'}
                      opacity={slot.available ? 1 : 0.6}
                    >
                      <YStack>
                        <Text fontSize={16} fontWeight="bold" color={slot.available ? COLORS.black : COLORS.textSecondary}>
                          {slot.displayLabel}
                        </Text>
                        <Text 
                          fontSize={13} 
                          marginTop={4} 
                          fontWeight="600"
                          color={!slot.available ? COLORS.textSecondary : slot.spotsLeft <= 5 ? '#E51A1A' : '#0F301F'}
                        >
                          {!slot.available ? 'Fully Booked' : `${slot.spotsLeft} spots left`}
                        </Text>
                      </YStack>
                      {isSelected && (
                        <View style={{ backgroundColor: COLORS.darkGreen, borderRadius: 20, padding: 4 }}>
                          <Ionicons name="checkmark" size={16} color={COLORS.white} />
                        </View>
                      )}
                    </XStack>
                  </AnimatedPressable>
                );
              })
            ) : (
              <Text textAlign="center" marginTop={20} color={COLORS.textSecondary}>No slots available for this date.</Text>
            )}
          </YStack>
        </ScrollView>
      )}

      {/* Confirm Button */}
      <YStack position="absolute" bottom={0} left={0} right={0} padding={SIZES.padding} paddingBottom={insets.bottom || SIZES.padding} backgroundColor={COLORS.white} borderTopWidth={1} borderTopColor="#F0F0F0">
        <AnimatedPressable onPress={handleConfirm} disabled={!selectedSlotId}>
          <YStack backgroundColor={selectedSlotId ? COLORS.darkGreen : '#A0A0A0'} padding={16} borderRadius={SIZES.radius} alignItems="center">
            <Text color={COLORS.white} fontSize={16} fontWeight="bold">Confirm Slot</Text>
          </YStack>
        </AnimatedPressable>
      </YStack>
    </YStack>
  );
}
