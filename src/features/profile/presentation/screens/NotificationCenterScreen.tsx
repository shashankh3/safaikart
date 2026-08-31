import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {collection, query, where, orderBy, getDocs} from '@react-native-firebase/firestore';
import { httpsCallable } from '@react-native-firebase/functions';
import { db, auth, functions } from '../../../../app/config/firebase';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AnimatedPressable from '../../../../shared/ui/components/AnimatedPressable';

interface AppNotification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  type: string;
  orderId?: string;
  createdAt: any;
}

export default function NotificationCenterScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation<any>();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as AppNotification))
        .sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
          return timeB - timeA;
        });
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePress = async (item: AppNotification) => {
    if (!item.isRead) {
      try {
        const markReadFn = httpsCallable(functions, 'markNotificationRead');
        await markReadFn({ notificationId: item.id });
        setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
      } catch (e: any) {
        console.warn('Failed to mark notification as read:', e);
        Alert.alert('Notice', 'Could not update notification status right now. Please try again later.');
      }
    }

    if (item.orderId) {
      navigation.navigate('OrderTracking', { orderId: item.orderId });
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity 
      style={[styles.itemContainer, !item.isRead && styles.unreadContainer]} 
      onPress={() => handlePress(item)}
    >
      <View style={styles.iconContainer}>
        <Ionicons 
          name={item.type === 'order_cancelled' || item.type === 'payment_failed' ? 'alert-circle' : 'notifications'} 
          size={24} 
          color={item.type === 'order_cancelled' || item.type === 'payment_failed' ? '#FF3B30' : COLORS.darkGreen} 
        />
      </View>
      <View style={styles.contentContainer}>
        <Text style={[styles.title, !item.isRead && styles.unreadText]}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
        <Text style={styles.time}>
          {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : 'Just now'}
        </Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.darkGreen} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={64} color={COLORS.border} />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: SIZES.padding }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    marginRight: SIZES.padding,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: SIZES.padding,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  itemContainer: {
    flexDirection: 'row',
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.small,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  unreadContainer: {
    backgroundColor: '#F0F9F4',
  },
  iconContainer: {
    marginRight: SIZES.padding,
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: 'bold',
  },
  body: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  time: {
    fontSize: 12,
    color: COLORS.border,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.darkGreen,
    alignSelf: 'center',
    marginLeft: SIZES.small,
  }
});
