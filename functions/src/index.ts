import { setGlobalOptions } from 'firebase-functions/v2';

// All v2 functions deploy to asia-south1 (Mumbai)
setGlobalOptions({ region: 'asia-south1' });

export * from './checkout/createOrderDraft';
export * from './checkout/validateCoupon';
export { checkServiceability } from './checkout/checkServiceability';

export { createPaymentOrder } from './payments/createPaymentOrder';
export { verifyPaymentStatus } from './payments/verifyPaymentStatus';
export { paymentWebhook } from './payments/paymentWebhook';
export { processRefunds } from './payments/processRefunds';

// Auth
export { onUserCreate } from './auth/onUserCreate';
export { syncAdminRoles } from './auth/syncAdminRoles';
export { deleteAccount, onUserDelete } from './auth/deleteAccount';

// Orders & Notifications
export { cancelOrder } from './orders/cancelOrder';
export { editOrderItems } from './orders/editOrderItems';
export { expirePendingOrders } from './orders/expirePendingOrders';
export { submitReview } from './orders/submitReview';
export { saveFcmToken } from './notifications/saveFcmToken';
export { removeFcmToken } from './notifications/removeFcmToken';
export { sendOrderStatusNotification } from './notifications/sendOrderStatusNotification';
export { markNotificationRead } from './notifications/markNotificationRead';
export { deleteOldNotifications } from './notifications/deleteOldNotifications';
export { onBroadcastCreated } from './broadcasts/onBroadcastCreated';

// Admin
export { adminUpdateOrderStatus } from './admin/adminUpdateOrderStatus';
export { adminConfirmOrderPrice } from './admin/adminConfirmOrderPrice';
export { adminAssignDriver } from './admin/adminAssignDriver';
export { adminSetOrderPhotos } from './admin/adminSetOrderPhotos';
