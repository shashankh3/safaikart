/**
 * Shared configuration helpers for Cloud Functions.
 * 
 * Centralises environment detection so we don't repeat
 * `process.env.FUNCTIONS_EMULATOR === 'true'` in every file.
 */

export const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

/**
 * Returns `true` only if ENFORCE_APP_CHECK is explicitly enabled.
 * Default to `false` so mobile clients in development and standard environments
 * are not blocked by unconfigured AppCheck tokens.
 */
export const shouldEnforceAppCheck = process.env.ENFORCE_APP_CHECK === 'true';
