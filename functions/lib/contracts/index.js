"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkServiceabilityRequest = exports.submitReviewRequest = exports.editOrderItemsRequest = exports.createOrderDraftRequest = exports.orderItemSchema = exports.addressSchema = void 0;
const zod_1 = require("zod");
exports.addressSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    name: zod_1.z.string().min(1),
    street: zod_1.z.string().min(1),
    city: zod_1.z.string().min(1),
    state: zod_1.z.string().min(1),
    pincode: zod_1.z.string().min(5).max(10),
    location: zod_1.z.object({
        lat: zod_1.z.number(),
        lng: zod_1.z.number()
    }).optional()
});
exports.orderItemSchema = zod_1.z.object({
    serviceId: zod_1.z.string(),
    categoryId: zod_1.z.string().optional(),
    name: zod_1.z.string().optional(),
    priceMinor: zod_1.z.number().int().min(0).optional(),
    quantity: zod_1.z.number().int().min(1).max(99),
    image: zod_1.z.string().optional()
});
exports.createOrderDraftRequest = zod_1.z.object({
    addressId: zod_1.z.string().min(1),
    pickupSlotId: zod_1.z.string().min(1),
    directItems: zod_1.z.array(exports.orderItemSchema).optional().nullable(),
    couponCode: zod_1.z.string().optional().nullable(),
    idempotencyKey: zod_1.z.string().optional()
});
exports.editOrderItemsRequest = zod_1.z.object({
    orderId: zod_1.z.string().min(1),
    items: zod_1.z.array(exports.orderItemSchema).min(1)
});
exports.submitReviewRequest = zod_1.z.object({
    orderId: zod_1.z.string().min(1),
    rating: zod_1.z.number().int().min(1).max(5),
    comment: zod_1.z.string().max(1000).optional()
});
exports.checkServiceabilityRequest = zod_1.z.object({
    pincode: zod_1.z.string().min(5).max(10)
});
//# sourceMappingURL=index.js.map