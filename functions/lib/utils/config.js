"use strict";
/**
 * Shared configuration helpers for Cloud Functions.
 *
 * Centralises environment detection so we don't repeat
 * `process.env.FUNCTIONS_EMULATOR === 'true'` in every file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldEnforceAppCheck = exports.isEmulator = void 0;
exports.isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
/**
 * Returns `true` in production, `false` when running in the emulator.
 * Use this for `enforceAppCheck` so that App Check doesn't block
 * local development where debug tokens may not be configured.
 */
exports.shouldEnforceAppCheck = !exports.isEmulator;
//# sourceMappingURL=config.js.map