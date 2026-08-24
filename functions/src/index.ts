import { setGlobalOptions } from 'firebase-functions/v2';
import * as Sentry from '@sentry/node';

// Initialize Sentry if configured
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    environment: process.env.FUNCTIONS_EMULATOR === 'true' ? 'local' : (process.env.GCLOUD_PROJECT ? 'production' : 'development')
  });
}

// All v2 functions deploy to asia-south1 (Mumbai) with optimized CPU/memory quotas
setGlobalOptions({
  region: 'asia-south1',
  cpu: 0.167,
  memory: '256MiB',
  maxInstances: 10,
});

export * from './checkout/createOrderDraft';
export * from './checkout/validateCoupon';
export { checkServiceability } from './checkout/checkServiceability';

export { createPaymentOrder } from './payments/createPaymentOrder';
export { verifyPaymentStatus } from './payments/verifyPaymentStatus';
export { paymentWebhook } from './payments/paymentWebhook';
export { processRazorpayWebhook } from './payments/processRazorpayWebhook';
export { processRefunds } from './payments/processRefunds';

// Auth
export { onUserCreate } from './auth/onUserCreate';
export { syncAdminRoles } from './auth/syncAdminRoles';
export { deleteAccount, onUserDelete } from './auth/deleteAccount';
export { sendCustomOtp } from './auth/sendCustomOtp';
export { verifyCustomOtp } from './auth/verifyCustomOtp';

// Orders & Notifications
export { cancelOrder } from './orders/cancelOrder';
export { editOrderItems } from './orders/editOrderItems';
export { expirePendingOrders } from './orders/expirePendingOrders';
export { deactivateExpiredSlots } from './orders/deactivateExpiredSlots';
export { submitReview } from './orders/submitReview';
export { saveFcmToken } from './notifications/saveFcmToken';
export { removeFcmToken } from './notifications/removeFcmToken';
export { sendOrderStatusNotification } from './notifications/sendOrderStatusNotification';
export { markNotificationRead } from './notifications/markNotificationRead';
export { markAllNotificationsRead } from './notifications/markAllNotificationsRead';
export { deleteOldNotifications } from './notifications/deleteOldNotifications';
export { onBroadcastCreated } from './broadcasts/onBroadcastCreated';
export { processUserSignup } from './events/processUserSignup';

// Admin
export { adminUpdateOrderStatus } from './admin/adminUpdateOrderStatus';
export { adminConfirmOrderPrice } from './admin/adminConfirmOrderPrice';
export { adminAssignDriver } from './admin/adminAssignDriver';
export { adminSetOrderPhotos } from './admin/adminSetOrderPhotos';
export { healthCheck } from './admin/healthCheck';
export { generateInvoice } from './admin/generateInvoice';

// Utilities
export { processDeadLetters } from './utils/dlqHandler';
