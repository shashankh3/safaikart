"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeEstimatedDelivery = computeEstimatedDelivery;
function computeEstimatedDelivery(slotDateStr, // e.g. "2024-05-20"
startTimeStr, // e.g. "10:00"
maxDurationHours) {
    try {
        // Parse the input strings
        const [year, month, day] = slotDateStr.split('-').map(Number);
        const [hours, minutes] = (startTimeStr || '10:00').split(':').map(Number);
        // Create a Date object in the local timezone of the server (which might be anything).
        // Instead of parsing as local, let's treat the inputs as IST, and create a UTC date.
        // IST is UTC+05:30
        // We can use Date.UTC to build the UTC equivalent
        // Date.UTC takes month 0-indexed.
        // E.g. 10:00 IST is 04:30 UTC.
        // Let's build the UTC timestamp for the given IST date/time.
        const dateAsUTC = Date.UTC(year, month - 1, day, hours, minutes, 0);
        const istOffsetMs = 5.5 * 60 * 60 * 1000;
        // This is the absolute time in milliseconds since epoch representing the slot start time
        const slotStartMs = dateAsUTC - istOffsetMs;
        // Add max duration + 4 hours buffer
        const deliveryMs = slotStartMs + ((maxDurationHours + 4) * 60 * 60 * 1000);
        return new Date(deliveryMs).toISOString();
    }
    catch (e) {
        console.warn(`Failed to parse delivery date, using fallback: ${e}`);
        // Fallback 48h
        return new Date(Date.now() + 48 * 3600000).toISOString();
    }
}
//# sourceMappingURL=deliveryLogic.js.map