import React, { useEffect, useState } from 'react';
import { LanguageCode } from '../types';
import type { NotificationPreferences } from '../types/aiSystem';
import { getTranslation } from '../utils/i18n';
import {
  dispatchAppNotification,
  getBrowserNotificationPermission,
  getNotificationPrefs,
  requestBrowserNotificationPermission,
  saveNotificationPrefs,
} from '../utils/notifications';
import {
  Settings,
  Globe,
  Check,
  ShieldCheck,
  Bell,
  X,
  Sun,
  Moon,
  Laptop,
  Volume2,
  Send,
} from 'lucide-react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: LanguageCode;
  onSelectLanguage: (lang: LanguageCode) => void;
  theme?: ThemeMode;
  onSelectTheme?: (theme: ThemeMode) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentLanguage,
  onSelectLanguage,
  theme = 'light',
  onSelectTheme,
}) => {
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => getNotificationPrefs());
  const [browserPerm, setBrowserPerm] = useState<NotificationPermission | 'unsupported'>(() =>
    getBrowserNotificationPermission()
  );
  const [notifMessage, setNotifMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPrefs(getNotificationPrefs());
      setBrowserPerm(getBrowserNotificationPermission());
      setNotifMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const t = getTranslation(currentLanguage);

  const updatePrefs = (patch: Partial<NotificationPreferences>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    saveNotificationPrefs(next);
  };

  const handleEnableBrowserPush = async () => {
    const res = await requestBrowserNotificationPermission();
    setBrowserPerm(res.permission);
    setNotifMessage(res.message);
  };

  const handleSendTestAlert = async () => {
    await dispatchAppNotification({
      id: `settings_test_${Date.now()}`,
      title: 'Test Schedule Alert (IST)',
      body: `Pre-exam lead ${prefs.preExamMinutes}m before start. Live exam, key release, and daily topic notifications are active.`,
      targetTab: 'tests',
      soundEnabled: prefs.soundEnabled,
    });
    setNotifMessage('Test notification banner dispatched.');
  };

  const languages: { code: LanguageCode; label: string; native: string; desc: string }[] = [
    {
      code: 'en',
      label: 'English',
      native: 'English',
      desc: 'Standard competitive exam format with English UI and questions',
    },
    {
      code: 'te',
      label: 'Telugu',
      native: 'తెలుగు',
      desc: 'ఆంధ్రప్రదేశ్ మరియు తెలంగాణ పోటీ పరీక్షార్థుల కొరకు పూర్తి తెలుగు ఇంటర్‌ఫేస్',
    },
    {
      code: 'hi',
      label: 'Hindi',
      native: 'हिन्दी',
      desc: 'एसएससी, रेलवे और बैंकिंग परीक्षाओं हेतु संपूर्ण हिंदी इंटरफ़ेस',
    },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-smooth-in">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-5 text-slate-900 dark:text-slate-100 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t.settingsTitle}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.settingsSubtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Theme / Appearance Selection */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Theme & Appearance</span>
            </div>
            <span className="text-[11px] font-normal text-slate-400 capitalize">
              Current: {theme}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'light' as ThemeMode, label: 'Light', icon: Sun },
              { id: 'dark' as ThemeMode, label: 'Dark', icon: Moon },
              { id: 'system' as ThemeMode, label: 'System', icon: Laptop },
            ].map((item) => {
              const isSelected = theme === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTheme?.(item.id)}
                  className={`p-2.5 rounded-lg border text-center flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-slate-900 dark:border-emerald-500 bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-white font-bold ring-1 ring-slate-900 dark:ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-500 dark:text-emerald-400' : 'text-slate-500'}`} />
                  <span className="text-xs">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Language Selection Section */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>{t.languageLabel}</span>
          </div>

          <div className="space-y-2">
            {languages.map((lang) => {
              const isSelected = currentLanguage === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => onSelectLanguage(lang.code)}
                  className={`w-full p-3 rounded-lg border text-left flex items-start justify-between transition-colors ${
                    isSelected
                      ? 'border-slate-900 dark:border-slate-400 bg-slate-50 dark:bg-slate-800 text-slate-950 dark:text-white'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {lang.native}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">({lang.label})</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      {lang.desc}
                    </p>
                  </div>

                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shrink-0 ml-2">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications & Schedule Alerts */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Notifications &amp; Schedule Alerts (IST)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Browser push status: <span className="font-semibold capitalize">{browserPerm}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={prefs.enabled}
              aria-label="Enable Schedule Notifications"
              onClick={() => updatePrefs({ enabled: !prefs.enabled })}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                prefs.enabled
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
              }`}
            >
              {prefs.enabled ? 'Enabled' : 'Paused'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { key: 'notifyOnExamOpen' as const, label: 'Exam Window Open' },
              { key: 'notifyOnKeyRelease' as const, label: 'Answer Key Unlock' },
              { key: 'notifyOnDailyTopic' as const, label: 'Daily Exam Topic' },
              { key: 'soundEnabled' as const, label: 'Alert Chime Sound' },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer text-[11px] font-medium text-slate-700 dark:text-slate-300"
              >
                <input
                  type="checkbox"
                  checked={prefs[item.key]}
                  disabled={!prefs.enabled && item.key !== 'soundEnabled'}
                  onChange={(e) => updatePrefs({ [item.key]: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
            <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Pre-exam reminder lead</span>
            </span>
            <div className="flex items-center gap-1">
              {([10, 15, 30] as const).map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => updatePrefs({ preExamMinutes: mins })}
                  className={`px-2 py-1 rounded border text-[11px] font-semibold cursor-pointer tabular-nums ${
                    prefs.preExamMinutes === mins
                      ? 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-500'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => void handleEnableBrowserPush()}
              className="flex-1 min-w-[140px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              Enable Browser Push
            </button>
            <button
              type="button"
              onClick={() => void handleSendTestAlert()}
              className="flex-1 min-w-[140px] px-3 py-2 rounded-lg bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Test Notification</span>
            </button>
          </div>

          {notifMessage && (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
              {notifMessage}
            </p>
          )}
        </div>

        {/* DPDP Notice */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-start gap-2 text-xs">
          <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />
          <div className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
            <strong className="text-slate-900 dark:text-slate-100 block font-semibold mb-0.5">{t.dpdpNoticeTitle}</strong>
            {t.dpdpNoticeDesc}
          </div>
        </div>

        {/* Save & Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg text-xs transition-colors shadow-xs"
        >
          {t.saveSettings}
        </button>
      </div>
    </div>
  );
};
