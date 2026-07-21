# SafaiKart Admin Console — Security

## 1. Admin gate

- `src/context/auth-context.tsx` has `DEV_BYPASS_ADMIN_CHECK = false`. Every
  signed-in user must have a document at `adminUsers/{uid}` in Firestore or
  they are signed out immediately.
- Add the first admin manually from the Firebase Console:
  Firestore → `adminUsers` → new document, ID = the user's Firebase Auth UID,
  fields `{ email, name, role: "superadmin" }`.

## 2. Roles (RBAC)

Roles live at `adminUsers/{uid}.role`. See `src/lib/rbac.ts`.

| Role         | Access                                                                 |
| ------------ | ---------------------------------------------------------------------- |
| `superadmin` | Everything, including managing other admins.                           |
| `admin`      | All ops/growth/catalog/finance surfaces except granting admin access.  |
| `ops`        | Live ops, orders, scheduler, runners, SLA, complaints, CRM (read).     |
| `finance`    | Settlements, expenses, orders (read), refunds, coupon analytics.       |
| `support`    | Inbox, complaints, CRM, users, feedback, orders (read).                |
| `viewer`     | Read-only: orders, analytics, heatmap, CRM, live ops.                  |

Route access is enforced in `src/routes/_authenticated.tsx`; the sidebar in
`src/components/app-sidebar.tsx` hides items the current role can't reach; UI
actions use `hasPermission()` from `src/lib/rbac.ts`.

## 3. Firestore & Storage rules

- `firestore.rules` — deploy with `firebase deploy --only firestore:rules`.
  - Direct client writes to `orders` and `payments` are **blocked**; all
    order state changes MUST go through the `adminUpdateOrderStatus`
    callable (region `asia-south1`).
  - Admin-only collections are gated by `exists(adminUsers/{uid})`.
  - `superadmin` is the only role allowed to write `adminUsers`.
- `storage.rules` — deploy with `firebase deploy --only storage`. Image
  uploads are size- and MIME-restricted.

## 4. App Check (turn on before public launch)

The console works today because App Check enforcement is off. When you flip
it on in the Firebase Console, register a **web** provider first:

```ts
// src/lib/firebase.ts (add once App Check is enforced)
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
  isTokenAutoRefreshEnabled: true,
});
```

Add the site key as `VITE_RECAPTCHA_SITE_KEY` in your `.env`.

## 5. Deploy checklist

1. Create at least one `superadmin` document in `adminUsers`.
2. `firebase deploy --only firestore:rules,storage,functions`.
3. Verify a non-admin sign-in is rejected.
4. Verify a non-superadmin cannot grant admin access from `/admins`.
5. Turn on App Check enforcement and confirm the console still loads.
