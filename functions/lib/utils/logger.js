"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logError = exports.logWarn = exports.logInfo = void 0;
const logger = require("firebase-functions/logger");
const logInfo = (message, data) => {
    logger.info(message, Object.assign({ structuredData: true }, data));
};
exports.logInfo = logInfo;
const logWarn = (message, data) => {
    logger.warn(message, Object.assign({ structuredData: true }, data));
};
exports.logWarn = logWarn;
const logError = (message, error, data) => {
    logger.error(message, Object.assign({ structuredData: true, error: (error === null || error === void 0 ? void 0 : error.message) || error, stack: error === null || error === void 0 ? void 0 : error.stack }, data));
};
exports.logError = logError;
//# sourceMappingURL=logger.js.map