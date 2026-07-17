"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminSetOrderPhotos = exports.adminAssignDriver = exports.adminConfirmOrderPrice = exports.adminUpdateOrderStatus = exports.markNotificationRead = exports.sendOrderStatusNotification = exports.removeFcmToken = exports.saveFcmToken = exports.editOrderItems = exports.cancelOrder = exports.onUserCreate = exports.paymentWebhook = exports.verifyPaymentStatus = exports.createPaymentOrder = void 0;
const v2_1 = require("firebase-functions/v2");
// All v2 functions deploy to asia-south1 (Mumbai)
(0, v2_1.setGlobalOptions)({ region: 'asia-south1' });
__exportStar(require("./checkout/createOrderDraft"), exports);
__exportStar(require("./checkout/validateCoupon"), exports);
var createPaymentOrder_1 = require("./payments/createPaymentOrder");
Object.defineProperty(exports, "createPaymentOrder", { enumerable: true, get: function () { return createPaymentOrder_1.createPaymentOrder; } });
var verifyPaymentStatus_1 = require("./payments/verifyPaymentStatus");
Object.defineProperty(exports, "verifyPaymentStatus", { enumerable: true, get: function () { return verifyPaymentStatus_1.verifyPaymentStatus; } });
var paymentWebhook_1 = require("./payments/paymentWebhook");
Object.defineProperty(exports, "paymentWebhook", { enumerable: true, get: function () { return paymentWebhook_1.paymentWebhook; } });
// Auth
var onUserCreate_1 = require("./auth/onUserCreate");
Object.defineProperty(exports, "onUserCreate", { enumerable: true, get: function () { return onUserCreate_1.onUserCreate; } });
// Orders & Notifications
var cancelOrder_1 = require("./orders/cancelOrder");
Object.defineProperty(exports, "cancelOrder", { enumerable: true, get: function () { return cancelOrder_1.cancelOrder; } });
var editOrderItems_1 = require("./orders/editOrderItems");
Object.defineProperty(exports, "editOrderItems", { enumerable: true, get: function () { return editOrderItems_1.editOrderItems; } });
var saveFcmToken_1 = require("./notifications/saveFcmToken");
Object.defineProperty(exports, "saveFcmToken", { enumerable: true, get: function () { return saveFcmToken_1.saveFcmToken; } });
var removeFcmToken_1 = require("./notifications/removeFcmToken");
Object.defineProperty(exports, "removeFcmToken", { enumerable: true, get: function () { return removeFcmToken_1.removeFcmToken; } });
var sendOrderStatusNotification_1 = require("./notifications/sendOrderStatusNotification");
Object.defineProperty(exports, "sendOrderStatusNotification", { enumerable: true, get: function () { return sendOrderStatusNotification_1.sendOrderStatusNotification; } });
var markNotificationRead_1 = require("./notifications/markNotificationRead");
Object.defineProperty(exports, "markNotificationRead", { enumerable: true, get: function () { return markNotificationRead_1.markNotificationRead; } });
// Admin
var adminUpdateOrderStatus_1 = require("./admin/adminUpdateOrderStatus");
Object.defineProperty(exports, "adminUpdateOrderStatus", { enumerable: true, get: function () { return adminUpdateOrderStatus_1.adminUpdateOrderStatus; } });
var adminConfirmOrderPrice_1 = require("./admin/adminConfirmOrderPrice");
Object.defineProperty(exports, "adminConfirmOrderPrice", { enumerable: true, get: function () { return adminConfirmOrderPrice_1.adminConfirmOrderPrice; } });
var adminAssignDriver_1 = require("./admin/adminAssignDriver");
Object.defineProperty(exports, "adminAssignDriver", { enumerable: true, get: function () { return adminAssignDriver_1.adminAssignDriver; } });
var adminSetOrderPhotos_1 = require("./admin/adminSetOrderPhotos");
Object.defineProperty(exports, "adminSetOrderPhotos", { enumerable: true, get: function () { return adminSetOrderPhotos_1.adminSetOrderPhotos; } });
//# sourceMappingURL=index.js.map