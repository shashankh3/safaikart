import { setGlobalOptions } from 'firebase-functions/v2';

// All v2 functions deploy to asia-south1 (Mumbai)
setGlobalOptions({ region: 'asia-south1' });

export * from './checkout/createOrderDraft';
export * from './checkout/validateCoupon';

export { createPaymentOrder } from './payments/createPaymentOrder';
export { verifyPaymentStatus } from './payments/verifyPaymentStatus';
export { paymentWebhook } from './payments/paymentWebhook';

// Auth
export { onUserCreate } from './auth/onUserCreate';

// Orders & Notifications
export { cancelOrder } from './orders/cancelOrder';
export { editOrderItems } from './orders/editOrderItems';
export { saveFcmToken } from './notifications/saveFcmToken';
export { removeFcmToken } from './notifications/removeFcmToken';
export { sendOrderStatusNotification } from './notifications/sendOrderStatusNotification';
export { markNotificationRead } from './notifications/markNotificationRead';

// Admin
export { adminUpdateOrderStatus } from './admin/adminUpdateOrderStatus';
export { adminConfirmOrderPrice } from './admin/adminConfirmOrderPrice';
export { adminAssignDriver } from './admin/adminAssignDriver';
export { adminSetOrderPhotos } from './admin/adminSetOrderPhotos';
