"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertAdmin = assertAdmin;
const https_1 = require("firebase-functions/v2/https");
function assertAdmin(request, allowedRoles) {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in to call this function.');
    }
    if (request.auth.token.admin !== true) {
        throw new https_1.HttpsError('permission-denied', 'You do not have permission to perform this action. Admin claim required.');
    }
    if (allowedRoles && allowedRoles.length > 0) {
        const role = request.auth.token.role;
        if (role !== 'superadmin' && !allowedRoles.includes(role)) {
            throw new https_1.HttpsError('permission-denied', `Your role (${role || 'none'}) is not authorized for this action.`);
        }
    }
}
//# sourceMappingURL=assertAdmin.js.map