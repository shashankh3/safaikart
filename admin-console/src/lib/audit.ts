import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase";

export async function logOrderChange(
  orderId: string,
  action: string,
  details?: Record<string, unknown>,
) {
  // No-op: Audit logging has been moved server-side to Cloud Functions
  // to ensure transactional integrity and comply with strict firestore rules.
}
