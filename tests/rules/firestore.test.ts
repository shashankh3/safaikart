import { describe, it, beforeEach, beforeAll, afterAll } from '@jest/globals';
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const rules = readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8');
  testEnv = await initializeTestEnvironment({
    projectId: 'safaikart-emulator-tests',
    firestore: { rules },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('SafaiKart Firestore Security Rules', () => {
  let alice: any, bob: any, unauth: any;

  beforeEach(() => {
    alice = testEnv.authenticatedContext('alice_uid');
    bob = testEnv.authenticatedContext('bob_uid');
    unauth = testEnv.unauthenticatedContext();
  });

  // ===== USERS =====
  describe('users', () => {
    it('allows users to read their own document', async () => {
      await assertSucceeds(alice.firestore().collection('users').doc('alice_uid').get());
    });
    it('denies users from reading other users documents', async () => {
      await assertFails(alice.firestore().collection('users').doc('bob_uid').get());
    });
    it('denies unauthenticated read', async () => {
      await assertFails(unauth.firestore().collection('users').doc('alice_uid').get());
    });
    it('denies all writes', async () => {
      await assertFails(alice.firestore().collection('users').doc('alice_uid').set({}));
    });
  });

  // ===== PROFILES =====
  describe('profiles', () => {
    const validProfile = {
      userId: 'alice_uid',
      phoneNumber: '1234567890',
      email: 'a@a.com',
      role: 'customer',
      isBlocked: false,
      createdAt: '2026',
      displayName: 'Alice',
      photoURL: 'url',
      defaultAddressId: 'addr1',
      fcmTokens: [],
      updatedAt: '2026'
    };

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('profiles').doc('alice_uid').set(validProfile);
      });
    });

    it('allows read own profile', async () => {
      await assertSucceeds(alice.firestore().collection('profiles').doc('alice_uid').get());
    });
    it('denies read other profile', async () => {
      await assertFails(bob.firestore().collection('profiles').doc('alice_uid').get());
    });
    it('denies create', async () => {
      await assertFails(bob.firestore().collection('profiles').doc('bob_uid').set({ userId: 'bob_uid' }));
    });
    it('allows update of allowed fields', async () => {
      await assertSucceeds(alice.firestore().collection('profiles').doc('alice_uid').update({
        displayName: 'Alice 2',
        updatedAt: '2027'
      }));
    });
    it('denies update of restricted fields (e.g. role)', async () => {
      await assertFails(alice.firestore().collection('profiles').doc('alice_uid').update({
        role: 'admin'
      }));
    });
    it('denies update of unmentioned fields', async () => {
      await assertFails(alice.firestore().collection('profiles').doc('alice_uid').update({
        someRandomField: 'hack'
      }));
    });
    it('denies delete', async () => {
      await assertFails(alice.firestore().collection('profiles').doc('alice_uid').delete());
    });
  });

  // ===== ADDRESSES =====
  describe('addresses', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('addresses').doc('addr1').set({ userId: 'alice_uid' });
      });
    });

    it('allows read own address', async () => {
      await assertSucceeds(alice.firestore().collection('addresses').doc('addr1').get());
    });
    it('denies read other address', async () => {
      await assertFails(bob.firestore().collection('addresses').doc('addr1').get());
    });
    it('allows create own address', async () => {
      await assertSucceeds(alice.firestore().collection('addresses').doc('addr2').set({ userId: 'alice_uid' }));
    });
    it('denies create address for other user', async () => {
      await assertFails(alice.firestore().collection('addresses').doc('addr3').set({ userId: 'bob_uid' }));
    });
    it('allows update own address', async () => {
      await assertSucceeds(alice.firestore().collection('addresses').doc('addr1').update({ line1: 'New line' }));
    });
    it('denies update changing ownership', async () => {
      await assertFails(alice.firestore().collection('addresses').doc('addr1').update({ userId: 'bob_uid' }));
    });
    it('allows delete own address', async () => {
      await assertSucceeds(alice.firestore().collection('addresses').doc('addr1').delete());
    });
  });

  // ===== PUBLIC READ ONLY COLLECTIONS =====
  describe('categories, services, coupons, pickupSlots', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('categories').doc('active_cat').set({ isActive: true });
        await context.firestore().collection('categories').doc('inactive_cat').set({ isActive: false });
      });
    });

    it('allows auth user to read active category', async () => {
      await assertSucceeds(alice.firestore().collection('categories').doc('active_cat').get());
    });
    it('denies auth user to read inactive category', async () => {
      await assertFails(alice.firestore().collection('categories').doc('inactive_cat').get());
    });
    it('denies unauth user to read active category', async () => {
      await assertFails(unauth.firestore().collection('categories').doc('active_cat').get());
    });
    it('denies any write', async () => {
      await assertFails(alice.firestore().collection('categories').doc('new_cat').set({ isActive: true }));
    });
  });

  // ===== CARTS =====
  describe('carts', () => {
    it('allows read/write own cart', async () => {
      await assertSucceeds(alice.firestore().collection('carts').doc('alice_uid').set({ items: [] }));
      await assertSucceeds(alice.firestore().collection('carts').doc('alice_uid').get());
    });
    it('denies read/write other cart', async () => {
      await assertFails(bob.firestore().collection('carts').doc('alice_uid').set({ items: [] }));
      await assertFails(bob.firestore().collection('carts').doc('alice_uid').get());
    });
  });

  // ===== ORDERS & PAYMENTS (Read Only for client) =====
  describe('orders & payments', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('orders').doc('order1').set({ userId: 'alice_uid' });
        await context.firestore().collection('payments').doc('pay1').set({ userId: 'alice_uid' });
      });
    });

    it('allows read own order', async () => {
      await assertSucceeds(alice.firestore().collection('orders').doc('order1').get());
    });
    it('denies read other order', async () => {
      await assertFails(bob.firestore().collection('orders').doc('order1').get());
    });
    it('denies create order', async () => {
      await assertFails(alice.firestore().collection('orders').doc('order2').set({ userId: 'alice_uid' }));
    });
    it('denies update order', async () => {
      await assertFails(alice.firestore().collection('orders').doc('order1').update({ status: 'DELIVERED' }));
    });
  });

  // ===== NOTIFICATIONS =====
  describe('notifications', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('notifications').doc('n1').set({ userId: 'alice_uid' });
      });
    });

    it('allows read own notification', async () => {
      await assertSucceeds(alice.firestore().collection('notifications').doc('n1').get());
    });
    it('denies write notification', async () => {
      await assertFails(alice.firestore().collection('notifications').doc('n1').update({ isRead: true }));
    });
  });

  // ===== REVIEWS & ISSUES =====
  describe('reviews & issues', () => {
    it('allows any auth user to read reviews', async () => {
      await assertSucceeds(alice.firestore().collection('reviews').doc('rev1').get());
    });
    it('allows creating a review for oneself with valid fields', async () => {
      await assertSucceeds(alice.firestore().collection('reviews').doc('rev2').set({
        userId: 'alice_uid',
        rating: 5,
        comment: 'Great',
        serviceId: 's1',
        createdAt: '2026'
      }));
    });
    it('denies creating a review with invalid rating', async () => {
      await assertFails(alice.firestore().collection('reviews').doc('rev_inv_rating').set({
        userId: 'alice_uid',
        rating: 6, // max is 5
        comment: 'Great',
        serviceId: 's1',
        createdAt: '2026'
      }));
    });
    it('denies creating a review with injected fields', async () => {
      await assertFails(alice.firestore().collection('reviews').doc('rev_injected').set({
        userId: 'alice_uid',
        rating: 5,
        comment: 'Great',
        serviceId: 's1',
        createdAt: '2026',
        isAdmin: true
      }));
    });
    it('denies creating a review for another user', async () => {
      await assertFails(alice.firestore().collection('reviews').doc('rev3').set({
        userId: 'bob_uid',
        rating: 5,
        comment: 'Great',
        serviceId: 's1',
        createdAt: '2026'
      }));
    });
    it('allows creating an issue with valid fields', async () => {
      await assertSucceeds(alice.firestore().collection('issues').doc('iss1').set({
        userId: 'alice_uid',
        orderId: 'o1',
        subject: 'Delay',
        description: 'Where is my order?',
        status: 'OPEN',
        createdAt: '2026'
      }));
    });
    it('denies creating an issue with injected admin fields', async () => {
      await assertFails(alice.firestore().collection('issues').doc('iss_inj').set({
        userId: 'alice_uid',
        orderId: 'o1',
        subject: 'Delay',
        description: 'Where is my order?',
        status: 'OPEN',
        createdAt: '2026',
        resolvedAt: '2026'
      }));
    });
    it('denies creating an issue with status != OPEN', async () => {
      await assertFails(alice.firestore().collection('issues').doc('iss_status').set({
        userId: 'alice_uid',
        orderId: 'o1',
        subject: 'Delay',
        description: 'Where is my order?',
        status: 'RESOLVED',
        createdAt: '2026'
      }));
    });
    it('denies update/delete reviews', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('reviews').doc('rev_to_del').set({ userId: 'alice_uid' });
      });
      await assertFails(alice.firestore().collection('reviews').doc('rev_to_del').update({ rating: 5 }));
      await assertFails(alice.firestore().collection('reviews').doc('rev_to_del').delete());
    });
  });

  // ===== APP CONFIG =====
  describe('appConfig', () => {
    it('allows auth user to read', async () => {
      await assertSucceeds(alice.firestore().collection('appConfig').doc('public').get());
    });
    it('denies unauth user to read', async () => {
      await assertFails(unauth.firestore().collection('appConfig').doc('public').get());
    });
    it('denies write', async () => {
      await assertFails(alice.firestore().collection('appConfig').doc('public').set({ v: 1 }));
    });
  });

  // ===== HIDDEN COLLECTIONS =====
  describe('rateLimits, adminUsers, auditLogs', () => {
    it('denies read/write completely', async () => {
      await assertFails(alice.firestore().collection('rateLimits').doc('r1').get());
      await assertFails(alice.firestore().collection('adminUsers').doc('a1').set({ admin: true }));
      await assertFails(alice.firestore().collection('auditLogs').doc('log1').get());
    });
  });
});
