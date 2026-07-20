import * as admin from 'firebase-admin';

export interface StatusHistoryEntry {
  status: string;
  at: admin.firestore.Timestamp;
}

export interface StatusUpdatePayload {
  status: string;
  updatedAt: admin.firestore.FieldValue | admin.firestore.Timestamp;
  statusHistory: any;
  [key: string]: any;
}

export function buildStatusHistoryUpdate(
  orderData: any,
  newStatus: string,
  timestamp: admin.firestore.Timestamp = admin.firestore.Timestamp.now()
): StatusUpdatePayload {
  const newStatusHistoryEntry: StatusHistoryEntry = {
    status: newStatus,
    at: timestamp
  };

  const updatePayload: StatusUpdatePayload = {
    status: newStatus,
    updatedAt: timestamp,
    statusHistory: null
  };

  if (orderData.statusHistory && Array.isArray(orderData.statusHistory)) {
    updatePayload.statusHistory = admin.firestore.FieldValue.arrayUnion(newStatusHistoryEntry);
  } else {
    // Retroactively add the creation status if history doesn't exist
    let createdAt = orderData.createdAt;
    if (!createdAt) {
       createdAt = admin.firestore.Timestamp.now();
    }
    updatePayload.statusHistory = [
      { status: orderData.status || 'PAYMENT_PENDING', at: createdAt },
      newStatusHistoryEntry
    ];
  }

  return updatePayload;
}
