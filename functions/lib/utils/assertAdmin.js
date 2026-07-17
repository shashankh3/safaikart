"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertAdmin = void 0;
const https_1 = require("firebase-functions/v2/https");
function assertAdmin(request) {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in to call this function.');
    }
    if (request.auth.token.admin !== true) {
        throw new https_1.HttpsError('permission-denied', 'You do not have permission to perform this action. Admin claim required.');
    }
}
exports.assertAdmin = assertAdmin;
//# sourceMappingURL=assertAdmin.js.map