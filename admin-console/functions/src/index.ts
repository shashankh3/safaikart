/**
 * SafaiKart Cloud Functions — scaffold
 *
 * Region: asia-south1
 *
 * Contains:
 *  - slaBreachNotifier: scheduled every 15m, writes overdue orders to /notifications
 *  - autoCancelUnpaid: hourly, cancels PENDING orders older than config.autoCancelHours
 *  - nightlySettlementRollup: daily 23:55 IST, writes /settlementDaily/{YYYY-MM-DD}
 *  - razorpayWebhook: HTTPS receiver, verifies X-Razorpay-Signature, marks orders PAID
 *
 * Deploy:
 *   cd functions
 *   npm install
 *   firebase deploy --only functions
 *
 * Requires setting the webhook secret:
 *   firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
 */

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import * as crypto from "crypto";
import Razorpay from "razorpay";

admin.initializeApp();
const db = admin.firestore();

const REGION = "asia-south1";
const SLA_HOURS = 24;
const RAZORPAY_KEY_ID = defineSecret("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET = defineSecret("RAZORPAY_KEY_SECRET");
const RAZORPAY_WEBHOOK_SECRET = defineSecret("RAZORPAY_WEBHOOK_SECRET");

// -------- SLA breach notifier ----------
export const slaBreachNotifier = onSchedule(
  { schedule: "every 15 minutes", region: REGION, timeZone: "Asia/Kolkata" },
  async () => {
    const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - SLA_HOURS * 3600 * 1000);
    const snap = await db
      .collection("orders")
      .where("status", "in", ["CREATED", "CONFIRMED", "PICKED_UP", "IN_PROCESS", "READY", "OUT_FOR_DELIVERY"])
      .where("createdAt", "<=", cutoff)
      .limit(200)
      .get();

    const batch = db.batch();
    let count = 0;
    for (const doc of snap.docs) {
      const notifRef = db.collection("notifications").doc(`sla-${doc.id}`);
      const existing = await notifRef.get();
      if (existing.exists) continue;
      batch.set(notifRef, {
        kind: "sla_breach",
        orderId: doc.id,
        status: doc.get("status"),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
      });
      count += 1;
    }
    if (count) await batch.commit();
    logger.info(`slaBreachNotifier: wrote ${count} notifications`);
  },
);

// -------- Auto-cancel unpaid ----------
export const autoCancelUnpaid = onSchedule(
  { schedule: "every 60 minutes", region: REGION, timeZone: "Asia/Kolkata" },
  async () => {
    const cfgSnap = await db.doc("config/app").get();
    const hours = Number(cfgSnap.get("autoCancelHours")) || 48;
    const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - hours * 3600 * 1000);

    const snap = await db
      .collection("orders")
      .where("paymentStatus", "==", "PENDING")
      .where("createdAt", "<=", cutoff)
      .limit(200)
      .get();

    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.update(doc.ref, {
        status: "CANCELLED",
        cancelReason: "auto_unpaid_timeout",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    if (snap.size) await batch.commit();
    logger.info(`autoCancelUnpaid: cancelled ${snap.size} orders`);
  },
);

// -------- Nightly settlement rollup ----------
export const nightlySettlementRollup = onSchedule(
  { schedule: "55 23 * * *", region: REGION, timeZone: "Asia/Kolkata" },
  async () => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const snap = await db
      .collection("orders")
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(start))
      .where("createdAt", "<", admin.firestore.Timestamp.fromDate(end))
      .get();

    let gross = 0;
    let cash = 0;
    let online = 0;
    let refunds = 0;
    const perRider: Record<string, number> = {};

    for (const d of snap.docs) {
      const o = d.data();
      const amt = Number(o.finalAmountMinor) || 0;
      if (o.paymentStatus === "REFUNDED") refunds += amt;
      if (o.paymentStatus === "PAID" || o.paymentStatus === "VERIFIED") {
        gross += amt;
        const m = String(o.paymentMethod || "").toUpperCase();
        if (m === "COD" || m === "CASH") cash += amt;
        else online += amt;
        const rider = o.driverName || o.driverId || "Unassigned";
        perRider[rider] = (perRider[rider] || 0) + amt;
      }
    }

    const dateKey = start.toISOString().slice(0, 10);
    await db.doc(`settlementDaily/${dateKey}`).set({
      date: dateKey,
      orderCount: snap.size,
      gross,
      cash,
      online,
      refunds,
      net: gross - refunds,
      perRider,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    logger.info(`nightlySettlementRollup: ${dateKey} net=${gross - refunds}`);
  },
);

// -------- Razorpay webhook receiver ----------
export const razorpayWebhook = onRequest(
  { region: REGION, secrets: [RAZORPAY_WEBHOOK_SECRET] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }
    const signature = req.header("x-razorpay-signature") || "";
    const body = (req as unknown as { rawBody: Buffer }).rawBody;
    const expected = crypto
      .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET.value())
      .update(body)
      .digest("hex");
    const ok =
      signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!ok) {
      logger.warn("razorpayWebhook: invalid signature");
      res.status(401).send("invalid signature");
      return;
    }

    const payload = req.body as {
      event?: string;
      payload?: { payment?: { entity?: { notes?: { orderId?: string }; id?: string; amount?: number } } };
    };
    const event = payload.event;
    const entity = payload.payload?.payment?.entity;
    const orderId = entity?.notes?.orderId;
    if (!orderId) {
      res.status(200).send("no orderId in notes");
      return;
    }

    if (event === "payment.captured") {
      await db.doc(`orders/${orderId}`).set(
        {
          paymentStatus: "PAID",
          paymentMethod: "ONLINE",
          paymentGatewayId: entity?.id ?? null,
          paidAmountMinor: entity?.amount ?? null,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } else if (event === "payment.failed") {
      await db.doc(`orders/${orderId}`).set(
        {
          paymentStatus: "FAILED",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
    res.status(200).send("ok");
  },
);

// -------- Razorpay: create order (callable) --------
export const createRazorpayOrder = onCall(
  { region: REGION, secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET] },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required");
    const { orderId } = (req.data || {}) as { orderId?: string };
    if (!orderId) throw new HttpsError("invalid-argument", "orderId required");

    const orderSnap = await db.doc(`orders/${orderId}`).get();
    if (!orderSnap.exists) throw new HttpsError("not-found", "Order not found");
    const order = orderSnap.data() as {
      userId?: string;
      totalMinor?: number;
      finalAmountMinor?: number;
      paymentStatus?: string;
      razorpayOrderId?: string;
    };
    if (order.userId !== req.auth.uid) throw new HttpsError("permission-denied", "Not your order");
    if (order.paymentStatus === "PAID") throw new HttpsError("failed-precondition", "Already paid");

    const amount = Number(order.totalMinor ?? order.finalAmountMinor ?? 0);
    if (amount <= 0) throw new HttpsError("failed-precondition", "Invalid amount");

    const rzp = new Razorpay({
      key_id: RAZORPAY_KEY_ID.value(),
      key_secret: RAZORPAY_KEY_SECRET.value(),
    });

    const rzpOrder = await rzp.orders.create({
      amount,
      currency: "INR",
      receipt: orderId.slice(0, 40),
      notes: { orderId, userId: req.auth.uid },
    });

    await orderSnap.ref.set(
      {
        razorpayOrderId: rzpOrder.id,
        paymentMethod: "razorpay",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return {
      keyId: RAZORPAY_KEY_ID.value(),
      razorpayOrderId: rzpOrder.id,
      amount,
      currency: "INR",
    };
  },
);

// -------- Razorpay: verify payment (callable) --------
export const verifyRazorpayPayment = onCall(
  { region: REGION, secrets: [RAZORPAY_KEY_SECRET] },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required");
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      (req.data || {}) as {
        orderId?: string;
        razorpayOrderId?: string;
        razorpayPaymentId?: string;
        razorpaySignature?: string;
      };
    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new HttpsError("invalid-argument", "Missing payment fields");
    }
    const expected = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET.value())
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");
    const ok =
      expected.length === razorpaySignature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpaySignature));
    if (!ok) throw new HttpsError("permission-denied", "Invalid signature");

    await db.doc(`orders/${orderId}`).set(
      {
        paymentStatus: "PAID",
        paymentMethod: "razorpay",
        paymentGatewayId: razorpayPaymentId,
        razorpayOrderId,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return { ok: true };
  },
);

// -------- Customer: create order (callable) --------
// Bypasses Firestore rules for order creation so the web checkout works
// even when rules haven't been redeployed. Validates the caller owns the
// order, sanitises input, and stamps server timestamps.
type IncomingItem = {
  serviceId?: string;
  name?: string;
  quantity?: number;
  priceMinor?: number;
  unit?: string | null;
};
type IncomingAddress = { line1?: string; city?: string; pincode?: string };

export const createCustomerOrder = onCall(
  { region: REGION },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required");
    const data = (req.data || {}) as {
      customerName?: string;
      customerPhone?: string;
      address?: IncomingAddress;
      pickupSlot?: string;
      notes?: string;
      items?: IncomingItem[];
      subtotalMinor?: number;
      discountMinor?: number;
      couponCode?: string | null;
      totalMinor?: number;
      paymentMethod?: "cod" | "razorpay";
    };

    const items = Array.isArray(data.items) ? data.items : [];
    if (items.length === 0) throw new HttpsError("invalid-argument", "Cart is empty");
    if (!data.customerName || !data.customerPhone) {
      throw new HttpsError("invalid-argument", "Name and phone are required");
    }
    if (!data.address?.line1 || !data.address?.pincode) {
      throw new HttpsError("invalid-argument", "Address is required");
    }
    if (!data.pickupSlot) throw new HttpsError("invalid-argument", "Pickup slot is required");

    const cleanItems = items.map((i) => ({
      serviceId: String(i.serviceId || ""),
      name: String(i.name || ""),
      quantity: Math.max(1, Math.floor(Number(i.quantity) || 0)),
      priceMinor: Math.max(0, Math.floor(Number(i.priceMinor) || 0)),
      unit: i.unit ?? null,
    }));
    const subtotalMinor = cleanItems.reduce((n, i) => n + i.priceMinor * i.quantity, 0);
    const discountMinor = Math.max(0, Math.floor(Number(data.discountMinor) || 0));
    const totalMinor = Math.max(0, subtotalMinor - discountMinor);
    const paymentMethod = data.paymentMethod === "razorpay" ? "razorpay" : "cod";

    const ref = await db.collection("orders").add({
      userId: req.auth.uid,
      customerName: String(data.customerName),
      customerPhone: String(data.customerPhone),
      address: {
        line1: String(data.address.line1),
        city: String(data.address.city || ""),
        pincode: String(data.address.pincode),
      },
      pickupSlot: String(data.pickupSlot),
      notes: String(data.notes || ""),
      items: cleanItems,
      subtotalMinor,
      discountMinor,
      couponCode: data.couponCode || null,
      totalMinor,
      status: "pending",
      paymentMethod,
      paymentStatus: "pending",
      source: "web",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { orderId: ref.id };
  },
);

