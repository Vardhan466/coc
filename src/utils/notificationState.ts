export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

const READ_NOTIFICATIONS_PREFIX = 'coc_read_notifications_v1_';
const MAX_STORED_READ_IDS = 200;

function getDefaultStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function normalizeNotificationUserKey(userKey?: string | null): string {
  const cleaned = (userKey || '').trim().replace(/[^a-zA-Z0-9_.-]/g, '_');
  return cleaned || 'guest';
}

export function getReadNotificationsStorageKey(userKey?: string | null): string {
  return `${READ_NOTIFICATIONS_PREFIX}${normalizeNotificationUserKey(userKey)}`;
}

export function loadReadNotificationIds(
  userKey?: string | null,
  storage: StorageLike | null = getDefaultStorage()
): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(getReadNotificationsStorageKey(userKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (typeof item === 'string' && item.trim().length > 0 && !seen.has(item)) {
        seen.add(item);
        unique.push(item);
      }
    }
    return unique.slice(-MAX_STORED_READ_IDS);
  } catch {
    return [];
  }
}

export function saveReadNotificationIds(
  userKey: string | null | undefined,
  ids: string[],
  storage: StorageLike | null = getDefaultStorage()
): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (typeof id === 'string' && id.trim().length > 0 && !seen.has(id)) {
      seen.add(id);
      unique.push(id);
    }
  }
  const bounded = unique.slice(-MAX_STORED_READ_IDS);
  if (storage) {
    try {
      storage.setItem(getReadNotificationsStorageKey(userKey), JSON.stringify(bounded));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }
  return bounded;
}

export function markNotificationIdsRead(
  userKey: string | null | undefined,
  existingIds: string[],
  idsToMark: string[],
  storage: StorageLike | null = getDefaultStorage()
): string[] {
  return saveReadNotificationIds(userKey, [...existingIds, ...idsToMark], storage);
}

export function applyReadStateToNotifications<T extends { id: string; read: boolean }>(
  notifications: T[],
  readIds: string[]
): T[] {
  if (readIds.length === 0) return notifications;
  const readSet = new Set(readIds);
  return notifications.map((item) =>
    readSet.has(item.id) && !item.read ? { ...item, read: true } : item
  );
}
