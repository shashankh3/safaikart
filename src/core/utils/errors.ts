export const getErrorMessage = (error: any): string => {
  if (!error) return 'An unknown error occurred.';

  const code = error?.code || '';
  const message = error?.message || '';

  if (code.includes('network-request-failed')) return 'Network error. Please check your internet connection.';
  if (code.includes('user-not-found')) return 'User not found.';
  if (code.includes('wrong-password')) return 'Incorrect password.';
  if (code.includes('email-already-in-use')) return 'This email is already in use.';
  if (code.includes('weak-password')) return 'Password is too weak.';
  if (code.includes('invalid-email')) return 'Invalid email address.';
  if (code.includes('permission-denied')) return 'You do not have permission to perform this action.';
  if (code.includes('failed-precondition')) return 'Action not allowed at this time.';
  if (code.includes('unavailable')) return 'Service temporarily unavailable. Please try again later.';
  if (code.includes('unauthenticated')) return 'Please log in to continue.';
  if (code.includes('too-many-requests')) return 'Too many requests. Please try again later.';
  if (code.includes('timeout')) return 'Request timed out. Please try again.';

  if (typeof message === 'string' && message.length > 0) return message.replace(/^\[.*?\]\s*/, '');

  return 'An unexpected error occurred.';
};
