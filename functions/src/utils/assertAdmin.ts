import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';

export function assertAdmin(request: CallableRequest, allowedRoles?: string[]) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in to call this function.');
  }
  if (request.auth.token.admin !== true) {
    throw new HttpsError('permission-denied', 'You do not have permission to perform this action. Admin claim required.');
  }
  
  if (allowedRoles && allowedRoles.length > 0) {
    const role = request.auth.token.role as string;
    if (role !== 'superadmin' && !allowedRoles.includes(role)) {
      throw new HttpsError('permission-denied', `Your role (${role || 'none'}) is not authorized for this action.`);
    }
  }
}
