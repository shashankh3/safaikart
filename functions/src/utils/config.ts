/**
 * Shared configuration helpers for Cloud Functions.
 * 
 * Centralises environment detection so we don't repeat
 * `process.env.FUNCTIONS_EMULATOR === 'true'` in every file.
 */

export const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

/**
 * Returns `true` in production, `false` when running in the emulator.
 * Use this for `enforceAppCheck` so that App Check doesn't block
 * local development where debug tokens may not be configured.
 */
export const shouldEnforceAppCheck = !isEmulator;
