import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyReadStateToNotifications,
  getReadNotificationsStorageKey,
  loadReadNotificationIds,
  markNotificationIdsRead,
  saveReadNotificationIds,
  type StorageLike,
} from './notificationState.ts';

function createMemoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

test('loadReadNotificationIds and saveReadNotificationIds persist read IDs across reload simulation', () => {
  const storage = createMemoryStorage();
  const userKey = 'uid_student_123';

  assert.deepEqual(loadReadNotificationIds(userKey, storage), []);

  const afterSingle = markNotificationIdsRead(
    userKey,
    [],
    ['trig_entry_waiting'],
    storage
  );
  assert.deepEqual(afterSingle, ['trig_entry_waiting']);

  // Simulate page reload reading fresh from storage
  const reloaded = loadReadNotificationIds(userKey, storage);
  assert.deepEqual(reloaded, ['trig_entry_waiting']);

  const merged = applyReadStateToNotifications(
    [
      { id: 'trig_entry_waiting', read: false },
      { id: 'trig_streak_risk_2026-11-13', read: false },
    ],
    reloaded
  );
  assert.equal(merged[0].read, true);
  assert.equal(merged[1].read, false);
});

test('markNotificationIdsRead deduplicates IDs and scopes per user', () => {
  const storage = createMemoryStorage();

  const u1 = markNotificationIdsRead(
    'student_A',
    ['trig_entry_waiting'],
    ['trig_entry_waiting', 'trig_mistake_leak'],
    storage
  );
  assert.deepEqual(u1, ['trig_entry_waiting', 'trig_mistake_leak']);

  // Another user remains unaffected
  assert.deepEqual(loadReadNotificationIds('student_B', storage), []);
  assert.notEqual(
    getReadNotificationsStorageKey('student_A'),
    getReadNotificationsStorageKey('student_B')
  );
});

test('saveReadNotificationIds bounds stored history and handles malformed JSON gracefully', () => {
  const storage = createMemoryStorage();
  storage.setItem(getReadNotificationsStorageKey('broken'), '{not-json');
  assert.deepEqual(loadReadNotificationIds('broken', storage), []);

  const manyIds = Array.from({ length: 250 }, (_, i) => `notif_${i}`);
  const saved = saveReadNotificationIds('heavy_user', manyIds, storage);
  assert.equal(saved.length, 200);
  assert.equal(saved[0], 'notif_50');
  assert.equal(saved[199], 'notif_249');
});
