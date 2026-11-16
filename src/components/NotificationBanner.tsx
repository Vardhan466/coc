import React, { useEffect, useState } from 'react';
import { ArrowRight, BellRing, X } from 'lucide-react';
import {
  IN_APP_NOTIFICATION_EVENT,
  type InAppNotificationPayload,
} from '../utils/notifications';
import { getISTNowParts } from '../utils/istTime';

interface NotificationBannerProps {
  onNavigate?: (targetTab: 'tests' | 'results' | 'practice') => void;
}

const TARGET_CTA_LABELS: Record<'tests' | 'results' | 'practice', string> = {
  tests: 'Open Daily Tests',
  results: 'Open Results',
  practice: 'Open Speed Practice',
};

export const NotificationBanner: React.FC<NotificationBannerProps> = ({ onNavigate }) => {
  const [items, setItems] = useState<Array<InAppNotificationPayload & { istLabel: string }>>([]);

  useEffect(() => {
    const timers = new Map<string, number>();

    const handleNotification = (event: Event) => {
      const custom = event as CustomEvent<InAppNotificationPayload>;
      const detail = custom.detail;
      if (!detail || !detail.title) return;

      const istLabel = `${getISTNowParts().hhmm} IST`;
      setItems((prev) => {
        const filtered = prev.filter((item) => item.id !== detail.id);
        return [{ ...detail, istLabel }, ...filtered].slice(0, 3);
      });

      const existingTimer = timers.get(detail.id);
      if (existingTimer) window.clearTimeout(existingTimer);

      const dismissTimer = window.setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== detail.id));
        timers.delete(detail.id);
      }, 9000);
      timers.set(detail.id, dismissTimer);
    };

    window.addEventListener(IN_APP_NOTIFICATION_EVENT, handleNotification);
    return () => {
      window.removeEventListener(IN_APP_NOTIFICATION_EVENT, handleNotification);
      timers.forEach((timerId) => window.clearTimeout(timerId));
      timers.clear();
    };
  }, []);

  if (items.length === 0) return null;

  const dismiss = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div
      aria-live="polite"
      aria-label="Live Schedule Notifications"
      className="fixed top-[72px] right-4 z-40 w-[calc(100vw-2rem)] max-w-sm space-y-2.5 pointer-events-none"
    >
      {items.map((item) => {
        const ctaLabel = item.targetTab ? TARGET_CTA_LABELS[item.targetTab] : null;
        return (
          <div
            key={item.id}
            role="status"
            className="pointer-events-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xl text-slate-900 dark:text-slate-100 animate-smooth-in"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <BellRing className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                    Schedule Alert · {item.istLabel}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug mt-0.5">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label={`Dismiss alert: ${item.title}`}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {ctaLabel && item.targetTab && onNavigate && (
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate(item.targetTab!);
                    dismiss(item.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>{ctaLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
