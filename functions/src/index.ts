import { setGlobalOptions } from 'firebase-functions/v2';

// All v2 functions deploy to asia-south1 (Mumbai)
setGlobalOptions({ region: 'asia-south1' });

export * from './checkout/createOrderDraft';
export * from './checkout/validateCoupon';

export { createPaymentOrder } from './payments/createPaymentOrder';
export { verifyPaymentStatus } from './payments/verifyPaymentStatus';
export { retryPayment } from './payments/retryPayment';
export { paymentWebhook } from './payments/paymentWebhook';

// Orders & Notifications
export { cancelOrder } from './orders/cancelOrder';
export { editOrderItems } from './orders/editOrderItems';
export { saveFcmToken } from './notifications/saveFcmToken';
export { sendOrderStatusNotification } from './notifications/sendOrderStatusNotification';
export { markNotificationRead } from './notifications/markNotificationRead';
