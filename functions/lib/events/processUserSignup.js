"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processUserSignup = void 0;
const pubsub_1 = require("firebase-functions/v2/pubsub");
const logger_1 = require("../utils/logger");
exports.processUserSignup = (0, pubsub_1.onMessagePublished)('user-signup-events', async (event) => {
    const data = event.data.message.json;
    if (!data || !data.uid) {
        (0, logger_1.logError)('Received malformed user-signup-events message', data);
        return;
    }
    (0, logger_1.logInfo)(`Processing async tasks for new user: ${data.uid}`);
    try {
        // Mock: Send Welcome Email
        // await sendGrid.send({ to: data.email, templateId: 'welcome_template' });
        // Mock: Create CRM Entry
        // await hubspot.contacts.create({ email: data.email, firstname: data.displayName });
        (0, logger_1.logInfo)(`Successfully processed signup background tasks for ${data.uid}`);
    }
    catch (error) {
        (0, logger_1.logError)(`Failed to process async tasks for ${data.uid}`, error);
        // Throwing ensures Pub/Sub retries the message according to subscription settings
        throw error;
    }
});
//# sourceMappingURL=processUserSignup.js.map