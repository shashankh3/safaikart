import { normaliseRole, hasPermission, canAccessRoute } from './rbac';

describe('RBAC', () => {
  describe('normaliseRole', () => {
    it('should return the role if valid', () => {
      expect(normaliseRole('admin')).toBe('admin');
      expect(normaliseRole('ops')).toBe('ops');
    });

    it('should handle case insensitivity', () => {
      expect(normaliseRole('ADMIN')).toBe('admin');
      expect(normaliseRole('SuPeRaDmIn')).toBe('superadmin');
    });

    it('should return null for invalid roles', () => {
      expect(normaliseRole('fake_role')).toBeNull();
      expect(normaliseRole('')).toBeNull();
      expect(normaliseRole(null)).toBeNull();
      expect(normaliseRole(undefined)).toBeNull();
    });
  });

  describe('hasPermission', () => {
    it('superadmin has all permissions', () => {
      expect(hasPermission('superadmin', 'orders.update')).toBe(true);
      expect(hasPermission('superadmin', 'banners.write')).toBe(true);
    });

    it('admin has specific permissions', () => {
      expect(hasPermission('admin', 'orders.update')).toBe(true);
      expect(hasPermission('admin', 'users.write')).toBe(true);
    });

    it('viewer has no permissions', () => {
      expect(hasPermission('viewer', 'orders.update')).toBe(false);
      expect(hasPermission('viewer', 'users.write')).toBe(false);
    });

    it('null role has no permissions', () => {
      expect(hasPermission(null, 'orders.update')).toBe(false);
    });
  });

  describe('canAccessRoute', () => {
    it('everyone can access /dashboard and /settings', () => {
      expect(canAccessRoute('viewer', '/dashboard')).toBe(true);
      expect(canAccessRoute('ops', '/settings')).toBe(true);
      expect(canAccessRoute('admin', '/dashboard')).toBe(true);
      expect(canAccessRoute(null, '/dashboard')).toBe(false); // null role cannot access
    });

    it('superadmin and admin can access anything', () => {
      expect(canAccessRoute('superadmin', '/some-random-route')).toBe(true);
      expect(canAccessRoute('admin', '/another-route')).toBe(true);
    });

    it('ops can access /kanban but not /settlement', () => {
      expect(canAccessRoute('ops', '/kanban')).toBe(true);
      expect(canAccessRoute('ops', '/settlement')).toBe(false);
    });

    it('sub-routes are allowed', () => {
      expect(canAccessRoute('ops', '/orders/123')).toBe(true);
      expect(canAccessRoute('ops', '/orders/')).toBe(true);
    });
  });
});
