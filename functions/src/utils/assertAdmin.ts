import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';

export function assertAdmin(request: CallableRequest) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in to call this function.');
  }
  if (request.auth.token.admin !== true) {
    throw new HttpsError('permission-denied', 'You do not have permission to perform this action. Admin claim required.');
  }
}
