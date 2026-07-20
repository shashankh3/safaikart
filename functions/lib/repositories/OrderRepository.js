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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderRepository = void 0;
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
class OrderRepository {
    constructor() {
        this.collection = db.collection('orders');
    }
    async findById(orderId, transaction) {
        const docRef = this.collection.doc(orderId);
        const doc = transaction ? await transaction.get(docRef) : await docRef.get();
        if (!doc.exists)
            return null;
        return Object.assign({ id: doc.id }, doc.data());
    }
    async update(orderId, data, transaction) {
        const docRef = this.collection.doc(orderId);
        if (transaction) {
            transaction.update(docRef, data);
        }
        else {
            await docRef.update(data);
        }
    }
    async findByUserIdAndIdempotencyKey(userId, idempotencyKey) {
        const snapshot = await this.collection
            .where('userId', '==', userId)
            .where('idempotencyKey', '==', idempotencyKey)
            .limit(1)
            .get();
        if (snapshot.empty)
            return null;
        return Object.assign({ id: snapshot.docs[0].id }, snapshot.docs[0].data());
    }
}
exports.OrderRepository = OrderRepository;
//# sourceMappingURL=OrderRepository.js.map