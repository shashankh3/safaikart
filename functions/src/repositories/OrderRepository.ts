import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export class OrderRepository {
  private collection = db.collection('orders');

  async findById(orderId: string, transaction?: admin.firestore.Transaction) {
    const docRef = this.collection.doc(orderId);
    const doc = transaction ? await transaction.get(docRef) : await docRef.get();
    
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as any;
  }

  async update(orderId: string, data: any, transaction?: admin.firestore.Transaction) {
    const docRef = this.collection.doc(orderId);
    if (transaction) {
      transaction.update(docRef, data);
    } else {
      await docRef.update(data);
    }
  }

  async findByUserIdAndIdempotencyKey(userId: string, idempotencyKey: string) {
    const snapshot = await this.collection
      .where('userId', '==', userId)
      .where('idempotencyKey', '==', idempotencyKey)
      .limit(1)
      .get();
      
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
  }
}
