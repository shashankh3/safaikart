import { getDb, getFirebaseAuth } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export type AuditAction = 
  | 'ORDER_STATUS_UPDATE'
  | 'DRIVER_ASSIGNED'
  | 'PRICE_CONFIRMED'
  | 'CATALOG_UPDATE'
  | 'USER_ROLE_CHANGE';

export interface AuditLogEntry {
  action: AuditAction;
  details: Record<string, any>;
  targetId?: string; // e.g. orderId, userId
}

/**
 * Pushes a structured audit log to Firestore.
 * Automatically captures the current admin's UID.
 */
export async function logAuditAction(entry: AuditLogEntry) {
  try {
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.warn("Attempted to write audit log without an authenticated user.");
      return;
    }

    const db = getDb();
    await addDoc(collection(db, "auditLogs"), {
      ...entry,
      actorUid: currentUser.uid,
      actorEmail: currentUser.email,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
    // We intentionally don't throw here to avoid breaking the main user flow
  }
}
