"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOldNotifications = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.deleteOldNotifications = (0, scheduler_1.onSchedule)({ schedule: 'every 24 hours' }, async (event) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    try {
        const snapshot = await db.collection('notifications')
            .where('createdAt', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
            .limit(500)
            .get();
        if (snapshot.empty) {
            console.log('No old notifications to delete.');
            return;
        }
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Deleted ${snapshot.size} old notifications.`);
    }
    catch (error) {
        console.error('Error deleting old notifications:', error);
    }
});
//# sourceMappingURL=deleteOldNotifications.js.map