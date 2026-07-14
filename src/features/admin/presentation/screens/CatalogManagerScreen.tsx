import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { YStack, XStack, Text } from '../../../../shared/ui/primitives/Stacks';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCatalogV2Query } from '../../../catalog/application/useServicesQuery';
import { db, doc, updateDoc } from '../../../../core/firebase/firestore';

export default function CatalogManagerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: catalogV2, isLoading, refetch } = useCatalogV2Query();
  
  const [selectedServiceIdx, setSelectedServiceIdx] = useState(0);
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState(0);
  const [selectedSubcategoryIdx, setSelectedSubcategoryIdx] = useState(0);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editPrice, setEditPrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const currentService = catalogV2?.services?.[selectedServiceIdx];
  const currentCategory = currentService?.categories?.[selectedCategoryIdx];
  const currentSubcategory = currentCategory?.subcategories?.[selectedSubcategoryIdx];
  const items = currentSubcategory?.items || [];

  const handleServiceChange = (idx: number) => {
    setSelectedServiceIdx(idx);
    setSelectedCategoryIdx(0);
    setSelectedSubcategoryIdx(0);
    setEditingItem(null);
  };

  const handleCategoryChange = (idx: number) => {
    setSelectedCategoryIdx(idx);
    setSelectedSubcategoryIdx(0);
    setEditingItem(null);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setEditPrice((item.price || item.priceMinor/100 || 0).toString());
  };

  const handleSave = async () => {
    if (!catalogV2 || !editingItem) return;
    
    setIsSaving(true);
    try {
      // Deep clone to avoid mutating React Query cache directly before success
      const newCatalog = JSON.parse(JSON.stringify(catalogV2));
      
      const service = newCatalog.services[selectedServiceIdx];
      const category = service.categories[selectedCategoryIdx];
      const subcat = category.subcategories[selectedSubcategoryIdx];
      
      const itemIndex = subcat.items.findIndex((i: any) => i.id === editingItem.id);
      if (itemIndex >= 0) {
        subcat.items[itemIndex].price = parseInt(editPrice, 10);
        // Also update priceMinor for backwards compatibility if needed
        subcat.items[itemIndex].priceMinor = parseInt(editPrice, 10) * 100;
        
        const docRef = doc(db, 'appConfig', 'catalog_v2');
        await updateDoc(docRef, newCatalog);
        
        Alert.alert("Success", "Price updated successfully!");
        setEditingItem(null);
        refetch();
      }
    } catch (error) {
      console.error("Failed to update catalog:", error);
      Alert.alert("Error", "Failed to update price.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <YStack flex={1} backgroundColor={COLORS.primaryBg}>
      <XStack paddingHorizontal={SIZES.padding} paddingTop={insets.top + 10} paddingBottom={20} alignItems="center" backgroundColor={COLORS.white} elevation={4}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginLeft: -8 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text fontSize={20} fontWeight="900" color={COLORS.black} marginLeft={12}>Catalog Manager</Text>
      </XStack>

      {isLoading ? (
        <YStack flex={1} justifyContent="center" alignItems="center">
          <ActivityIndicator size="large" color={COLORS.darkGreen} />
        </YStack>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
          <YStack backgroundColor={COLORS.primaryBg} zIndex={10}>
            {/* Services */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 20, paddingTop: 15, paddingBottom: 10 }}>
              <XStack>
                {catalogV2?.services?.map((svc: any, idx: number) => (
                  <TouchableOpacity key={svc.id} onPress={() => handleServiceChange(idx)}>
                    <YStack 
                      paddingVertical={10} 
                      paddingHorizontal={20} 
                      marginRight={12}
                      borderRadius={24}
                      backgroundColor={selectedServiceIdx === idx ? '#1976D2' : COLORS.white}
                      borderWidth={1}
                      borderColor={selectedServiceIdx === idx ? '#1976D2' : '#E0E0E0'}
                    >
                      <Text color={selectedServiceIdx === idx ? COLORS.white : COLORS.black} fontWeight={selectedServiceIdx === idx ? 'bold' : '500'}>
                        {svc.name}
                      </Text>
                    </YStack>
                  </TouchableOpacity>
                ))}
              </XStack>
            </ScrollView>

            {/* Categories */}
            {currentService?.categories && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
                <XStack>
                  {currentService.categories.map((cat: any, idx: number) => (
                    <TouchableOpacity key={cat.id} onPress={() => handleCategoryChange(idx)}>
                      <YStack 
                        paddingVertical={8} 
                        paddingHorizontal={16} 
                        marginRight={10}
                        borderRadius={20}
                        backgroundColor={selectedCategoryIdx === idx ? '#E3F2FD' : '#F5F5F5'}
                        borderWidth={1}
                        borderColor={selectedCategoryIdx === idx ? '#90CAF9' : 'transparent'}
                      >
                        <Text color={selectedCategoryIdx === idx ? '#1565C0' : '#666'} fontWeight={selectedCategoryIdx === idx ? 'bold' : 'normal'}>
                          {cat.name}
                        </Text>
                      </YStack>
                    </TouchableOpacity>
                  ))}
                </XStack>
              </ScrollView>
            )}

            {/* Subcategories */}
            {currentCategory?.subcategories && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 20, paddingBottom: 15 }}>
                <XStack>
                  {currentCategory.subcategories.map((subcat: any, idx: number) => (
                    <TouchableOpacity key={subcat.id} onPress={() => setSelectedSubcategoryIdx(idx)}>
                      <YStack 
                        paddingVertical={6} 
                        paddingHorizontal={14} 
                        marginRight={10}
                        borderRadius={16}
                        backgroundColor={selectedSubcategoryIdx === idx ? '#FFF8E1' : 'transparent'}
                        borderWidth={1}
                        borderColor={selectedSubcategoryIdx === idx ? '#FFE082' : 'transparent'}
                      >
                        <Text color={selectedSubcategoryIdx === idx ? '#F57F17' : '#999'} fontWeight={selectedSubcategoryIdx === idx ? 'bold' : 'normal'}>
                          {subcat.name}
                        </Text>
                      </YStack>
                    </TouchableOpacity>
                  ))}
                </XStack>
              </ScrollView>
            )}
          </YStack>

          {/* Items List */}
          <YStack padding={20} paddingTop={5}>
            {items.map((item: any) => {
              const isEditing = editingItem?.id === item.id;
              const price = item.price || item.priceMinor/100 || 0;
              
              return (
                <YStack key={item.id} backgroundColor={COLORS.white} padding={16} borderRadius={12} marginBottom={12} elevation={2} shadowColor="#000" shadowOpacity={0.05} shadowRadius={8} shadowOffset={{ width: 0, height: 2 }}>
                  <XStack justifyContent="space-between" alignItems="center">
                    <YStack flex={1} paddingRight={10}>
                      <Text fontSize={15} fontWeight="bold" marginBottom={4}>{item.name}</Text>
                      {!isEditing && (
                        <Text fontSize={14} color="#666">Rs {price} / {item.unit || 'piece'}</Text>
                      )}
                    </YStack>
                    
                    {!isEditing ? (
                      <TouchableOpacity onPress={() => handleEdit(item)}>
                        <YStack padding={8} backgroundColor="#E3F2FD" borderRadius={8}>
                          <Ionicons name="pencil" size={16} color="#1976D2" />
                        </YStack>
                      </TouchableOpacity>
                    ) : (
                      <XStack alignItems="center">
                        <Text fontSize={14} fontWeight="bold" marginRight={8}>Rs</Text>
                        <TextInput 
                          value={editPrice}
                          onChangeText={setEditPrice}
                          keyboardType="numeric"
                          style={{ borderWidth: 1, borderColor: '#1976D2', borderRadius: 8, padding: 8, width: 60, textAlign: 'center', marginRight: 10, fontSize: 16 }}
                          autoFocus
                        />
                        <TouchableOpacity onPress={handleSave} disabled={isSaving}>
                          <YStack padding={8} backgroundColor={isSaving ? '#CCC' : COLORS.darkGreen} borderRadius={8}>
                            {isSaving ? <ActivityIndicator size="small" color={COLORS.white} /> : <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                          </YStack>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditingItem(null)}>
                          <YStack padding={8} backgroundColor="#FFEBEE" borderRadius={8} marginLeft={8}>
                            <Ionicons name="close" size={16} color="#D32F2F" />
                          </YStack>
                        </TouchableOpacity>
                      </XStack>
                    )}
                  </XStack>
                </YStack>
              );
            })}
          </YStack>
        </ScrollView>
      )}
    </YStack>
  );
}
