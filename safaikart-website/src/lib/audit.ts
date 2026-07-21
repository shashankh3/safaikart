import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase";

export async function logOrderChange(
  orderId: string,
  action: string,
  details?: Record<string, unknown>,
) {
  try {
    const db = getDb();
    const auth = getFirebaseAuth();
    const u = auth.currentUser;
    await addDoc(collection(db, "auditLogs"), {
      orderId,
      action,
      before: {},
      after: details ?? {},
      actorUid: u?.uid ?? null,
      actorEmail: u?.email ?? null,
      at: serverTimestamp(),
    });
  } catch (err) {
    // Non-blocking
    console.warn("audit log failed", err);
  }
}
