import { FirestoreDataConverter, DocumentData, QueryDocumentSnapshot, Timestamp } from '@react-native-firebase/firestore';
import { Order, OrderSchema } from './order.model';

export const orderConverter: FirestoreDataConverter<Order> = {
  toFirestore(order: Order): DocumentData {
    return {
      userId: order.userId,
      status: order.status,
      finalAmountMinor: order.finalAmountMinor,
      createdAt: order.createdAt instanceof Date ? Timestamp.fromDate(order.createdAt) : order.createdAt,
      updatedAt: order.updatedAt ? (order.updatedAt instanceof Date ? Timestamp.fromDate(order.updatedAt) : order.updatedAt) : null,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Order {
    const data = snapshot.data();
    
    // Safely parse through Zod to guarantee runtime type correctness
    return OrderSchema.parse({
      id: snapshot.id,
      userId: data.userId,
      status: data.status,
      finalAmountMinor: data.finalAmountMinor,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || undefined,
    });
  }
};
