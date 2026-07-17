// Role-based access control for the SafaiKart admin console.
//
// Roles are stored in Firestore at `adminUsers/{uid}.role`. The `superadmin`
// role can do everything. All other roles are scoped to a set of route
// prefixes and named permissions.

export const ROLES = [
  "superadmin",
  "admin",
  "ops",
  "finance",
  "support",
  "viewer",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  ops: "Operations",
  finance: "Finance",
  support: "Support",
  viewer: "Viewer (read-only)",
};

// Named permissions used to gate UI actions (buttons, mutations).
export type Permission =
  | "orders.update"
  | "orders.assignDriver"
  | "orders.refund"
  | "orders.bulk"
  | "catalog.write"
  | "coupons.write"
  | "zones.write"
  | "banners.write"
  | "config.write"
  | "users.write"
  | "admins.write"
  | "finance.read"
  | "finance.write"
  | "broadcasts.send"
  | "complaints.resolve"
  | "inbox.reply";

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission> | "*"> = {
  superadmin: "*",
  admin: new Set<Permission>([
    "orders.update",
    "orders.assignDriver",
    "orders.refund",
    "orders.bulk",
    "catalog.write",
    "coupons.write",
    "zones.write",
    "banners.write",
    "config.write",
    "users.write",
    "finance.read",
    "finance.write",
    "broadcasts.send",
    "complaints.resolve",
    "inbox.reply",
  ]),
  ops: new Set<Permission>([
    "orders.update",
    "orders.assignDriver",
    "orders.bulk",
    "complaints.resolve",
  ]),
  finance: new Set<Permission>([
    "orders.refund",
    "finance.read",
    "finance.write",
  ]),
  support: new Set<Permission>([
    "complaints.resolve",
    "inbox.reply",
  ]),
  viewer: new Set<Permission>(),
};

// Route prefixes each role is allowed to visit. `superadmin` gets everything.
// Every role can always reach `/dashboard` and `/settings`.
const ALWAYS_ALLOWED = ["/dashboard", "/settings"];

const ROLE_ROUTES: Record<Role, readonly string[] | "*"> = {
  superadmin: "*",
  admin: "*",
  ops: [
    "/kanban",
    "/orders",
    "/reattempts",
    "/sla-breach",
    "/labels",
    "/scheduler",
    "/route-sheet",
    "/drivers",
    "/scorecards",
    "/complaints",
    "/crm",
    "/analytics",
    "/heatmap",
    "/audit",
  ],
  finance: [
    "/settlement",
    "/expenses",
    "/orders",
    "/analytics",
    "/heatmap",
    "/coupons",
    "/audit",
  ],
  support: [
    "/inbox",
    "/complaints",
    "/crm",
    "/orders",
    "/feedback",
    "/users",
  ],
  viewer: [
    "/orders",
    "/analytics",
    "/heatmap",
    "/crm",
    "/kanban",
  ],
};

export function normaliseRole(role: string | undefined | null): Role {
  const r = (role ?? "").toLowerCase();
  return (ROLES as readonly string[]).includes(r) ? (r as Role) : "viewer";
}

export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role];
  return perms === "*" ? true : perms.has(permission);
}

export function canAccessRoute(role: Role | null | undefined, pathname: string): boolean {
  if (!role) return false;
  if (ALWAYS_ALLOWED.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
  const allowed = ROLE_ROUTES[role];
  if (allowed === "*") return true;
  return allowed.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
