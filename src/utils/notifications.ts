import type { NotificationPreferences } from '../types/aiSystem.ts';
import {
  DEFAULT_NOTIFICATION_PREFS,
  type SentNotificationLog,
} from './notificationScheduler.ts';

const PREFS_STORAGE_KEY = 'coc_notification_prefs_v1';
const SENT_LOG_STORAGE_KEY = 'coc_notification_sent_log_v1';
const LEGACY_REMINDER_KEY = 'coc_7pm_reminder_set';

export interface InAppNotificationPayload {
  id: string;
  title: string;
  body: string;
  targetTab?: 'tests' | 'results' | 'practice';
  timestamp: string;
}

export const IN_APP_NOTIFICATION_EVENT = 'coc:inapp-notification';
export const PREFS_UPDATED_EVENT = 'coc:notification-prefs-updated';

export function getNotificationPrefs(): NotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_REMINDER_KEY);
      if (legacy === 'true') {
        return { ...DEFAULT_NOTIFICATION_PREFS, enabled: true };
      }
      return DEFAULT_NOTIFICATION_PREFS;
    }
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      ...DEFAULT_NOTIFICATION_PREFS,
      ...parsed,
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

export function saveNotificationPrefs(next: NotificationPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
    localStorage.setItem(LEGACY_REMINDER_KEY, next.enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent(PREFS_UPDATED_EVENT, { detail: next }));
  } catch (err) {
    console.warn('Could not persist notification preferences', err);
  }
}

export function getSentNotificationLog(): SentNotificationLog {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SENT_LOG_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function markNotificationSent(istDate: string, triggerId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const log = getSentNotificationLog();
    const current = Array.isArray(log[istDate]) ? log[istDate] : [];
    if (!current.includes(triggerId)) {
      const pruned: SentNotificationLog = {};
      // Keep only recent 10 IST dates to avoid unbounded growth
      const recentDates = Object.keys(log).sort().slice(-9);
      for (const dateKey of recentDates) {
        pruned[dateKey] = log[dateKey];
      }
      pruned[istDate] = [...current, triggerId];
      localStorage.setItem(SENT_LOG_STORAGE_KEY, JSON.stringify(pruned));
    }
  } catch {
    // Non-fatal
  }
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<{
  permission: NotificationPermission | 'unsupported';
  message: string;
}> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return {
      permission: 'unsupported',
      message: 'OS push notifications are unavailable here; in-app banner & audio alerts remain active.',
    };
  }

  if (Notification.permission === 'granted') {
    return {
      permission: 'granted',
      message: 'Browser & in-app notifications are enabled.',
    };
  }

  if (Notification.permission === 'denied') {
    return {
      permission: 'denied',
      message: 'Browser push is blocked in site settings. In-app live alert banners are still active.',
    };
  }

  try {
    const result = await Notification.requestPermission();
    return {
      permission: result,
      message:
        result === 'granted'
          ? 'Browser notifications enabled for daily exams and key releases.'
          : 'OS push declined. In-app live banner alerts will still notify you while studying.',
    };
  } catch {
    return {
      permission: Notification.permission,
      message: 'In-app live banner notifications enabled.',
    };
  }
}

export function playAlertTone(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playNote = (freq: number, startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.08, now + startOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.02);
    };

    playNote(660, 0, 0.16);
    playNote(880, 0.12, 0.22);

    setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 600);
  } catch {
    // Ignore autoplay / AudioContext restrictions cleanly
  }
}

export async function dispatchAppNotification(params: {
  id?: string;
  title: string;
  body: string;
  targetTab?: 'tests' | 'results' | 'practice';
  soundEnabled?: boolean;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  const payload: InAppNotificationPayload = {
    id: params.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: params.title,
    body: params.body,
    targetTab: params.targetTab,
    timestamp: new Date().toISOString(),
  };

  window.dispatchEvent(new CustomEvent(IN_APP_NOTIFICATION_EVENT, { detail: payload }));

  if (params.soundEnabled !== false) {
    playAlertTone();
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    const options: NotificationOptions = {
      body: params.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: params.id || 'coc-alert',
    };

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(params.title, options);
          return;
        }
      }
      new Notification(params.title, options);
    } catch {
      // Fallback already shown via IN_APP_NOTIFICATION_EVENT toast banner
    }
  }
}
