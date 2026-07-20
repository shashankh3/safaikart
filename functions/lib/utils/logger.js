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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logError = exports.logWarn = exports.logInfo = exports.createLogger = exports.ContextLogger = exports.pinoLogger = void 0;
const pino_1 = __importDefault(require("pino"));
const Sentry = __importStar(require("@sentry/node"));
// Configure Pino with PII redaction
exports.pinoLogger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
        level: (label) => {
            const severityMap = {
                trace: 'DEBUG',
                debug: 'DEBUG',
                info: 'INFO',
                warn: 'WARNING',
                error: 'ERROR',
                fatal: 'CRITICAL',
            };
            return { severity: severityMap[label] || 'INFO' };
        }
    },
    messageKey: 'message', // GCP Cloud Logging compatibility
    redact: {
        paths: [
            '*.phone', '*.phoneNumber', 'phone', 'phoneNumber',
            '*.email', 'email',
            '*.address', 'address',
            '*.pincode', 'pincode',
            '*.pan', 'pan'
        ],
        censor: '[REDACTED]'
    }
});
class ContextLogger {
    constructor(context) {
        this.context = context;
    }
    info(message, data) {
        exports.pinoLogger.info(Object.assign(Object.assign({}, this.context), data), message);
    }
    warn(message, data) {
        exports.pinoLogger.warn(Object.assign(Object.assign({}, this.context), data), message);
    }
    error(message, error, data) {
        const logData = Object.assign(Object.assign({}, this.context), data);
        if (error instanceof Error) {
            logData.error = { message: error.message, stack: error.stack };
        }
        else if (error) {
            logData.error = error;
        }
        exports.pinoLogger.error(logData, message);
        Sentry.withScope((scope) => {
            scope.setExtras(logData);
            if (this.context.userId) {
                scope.setUser({ id: this.context.userId });
            }
            if (error instanceof Error) {
                Sentry.captureException(error);
            }
            else if (error) {
                Sentry.captureException(new Error(typeof error === 'string' ? error : JSON.stringify(error)));
            }
            else {
                Sentry.captureMessage(message, 'error');
            }
        });
    }
}
exports.ContextLogger = ContextLogger;
const createLogger = (context = {}) => {
    return new ContextLogger(context);
};
exports.createLogger = createLogger;
// Legacy exports for compatibility
const logInfo = (message, data) => (0, exports.createLogger)().info(message, data);
exports.logInfo = logInfo;
const logWarn = (message, data) => (0, exports.createLogger)().warn(message, data);
exports.logWarn = logWarn;
const logError = (message, error, data) => (0, exports.createLogger)().error(message, error, data);
exports.logError = logError;
//# sourceMappingURL=logger.js.map