import React, { useEffect, useState } from 'react';
import { SmartTriggerNotification, UserProfile, UserRole } from '../types';
import { getTranslation } from '../utils/i18n';
import {
  dispatchAppNotification,
  getNotificationPrefs,
  PREFS_UPDATED_EVENT,
} from '../utils/notifications';
import {
  Shield,
  CheckCircle2,
  Settings,
  LogOut,
  Flame,
  Sun,
  Moon,
  Bell,
  Snowflake,
  ArrowRight,
  X,
} from 'lucide-react';
import { getStreakMilestone } from '../utils/streakMilestones';

interface HeaderProps {
  user: UserProfile;
  currentRole: UserRole;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSettings: () => void;
  onLogout?: () => void;
  streak?: number;
  streakFreezes?: number;
  notifications?: SmartTriggerNotification[];
  onMarkNotificationsRead?: () => void;
  onMarkSingleNotificationRead?: (notifId: string) => void;
  onTriggerNotificationAction?: (notif: SmartTriggerNotification) => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentRole,
  activeTab,
  setActiveTab,
  onOpenSettings,
  onLogout,
  streak,
  streakFreezes = 1,
  notifications = [],
  onMarkNotificationsRead,
  onMarkSingleNotificationRead,
  onTriggerNotificationAction,
  isDark = false,
  onToggleTheme,
}) => {
  const isAdmin = currentRole !== 'student';
  const t = getTranslation(user.language);
  const streakCount = streak ?? 0;
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState<boolean>(() => getNotificationPrefs().enabled);

  useEffect(() => {
    const syncPrefs = () => setNotifEnabled(getNotificationPrefs().enabled);
    window.addEventListener(PREFS_UPDATED_EVENT, syncPrefs);
    return () => window.removeEventListener(PREFS_UPDATED_EVENT, syncPrefs);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 xl:gap-3">
        {/* Brand Zone */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center font-black text-xs sm:text-sm tracking-tight shadow-xs shrink-0">
            COC
          </div>
          <div className="shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs min-[420px]:text-sm sm:text-base tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                {t.brandName}
              </span>
              <span
                className={`${
                  isAdmin ? 'hidden sm:inline-block' : 'hidden 2xl:inline-block'
                } text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap`}
              >
                · {t.dailyBadge}
              </span>
            </div>
            <p
              className={`${
                isAdmin ? 'hidden sm:block' : 'hidden 2xl:block'
              } text-[11px] text-slate-500 dark:text-slate-400 font-normal whitespace-nowrap`}
            >
              {t.brandTagline}
            </p>
          </div>
        </div>

        {/* Desktop Nav Links - Clean Understated Typography */}
        {!isAdmin && (
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-0.5 lg:gap-1 min-w-0 overflow-x-auto no-scrollbar"
          >
            {[
              { id: 'tests', label: t.navTests },
              { id: 'results', label: t.navResults },
              { id: 'progress', label: t.navProgress },
              { id: 'practice', label: t.navPractice },
              { id: 'profile', label: t.navProfile },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        )}

        {/* Right Action Zone */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Daily Streak + Streak Freeze Shield */}
          {!isAdmin && (() => {
            const milestone = getStreakMilestone(streakCount);
            return (
              <div
                className="relative group flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border border-amber-300 dark:border-amber-500/40 bg-linear-to-r from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800 text-slate-800 dark:text-amber-300 shadow-2xs hover:border-orange-400 dark:hover:border-amber-400 transition-all cursor-pointer whitespace-nowrap shrink-0"
                onClick={() => setActiveTab('progress')}
                title={`${streakCount}-Day Streak · ${streakFreezes} Streak Freeze(s) · ${milestone.title}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setActiveTab('progress');
                  }
                }}
              >
                <Flame className="w-4 h-4 text-orange-600 dark:text-orange-400 fill-orange-500 dark:fill-orange-400 shrink-0" />
                <div className="flex items-baseline gap-1">
                  <span className="font-black text-xs sm:text-sm font-mono text-orange-950 dark:text-amber-300 tabular-nums">
                    {streakCount}
                  </span>
                  <span className="text-[10px] text-orange-700 dark:text-orange-400 font-semibold">
                    d
                  </span>
                  {streakFreezes > 0 && (
                    <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-sky-700 dark:text-sky-400 ml-1">
                      <Snowflake className="w-3 h-3" />
                      {streakFreezes}
                    </span>
                  )}
                </div>

                {/* Hover Tooltip Card */}
                <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50 w-64 p-3 bg-slate-900 dark:bg-slate-950 text-white rounded-xl shadow-xl text-xs pointer-events-none border border-slate-800 whitespace-normal">
                  <div className="font-bold text-amber-300 flex items-center justify-between pb-1 border-b border-slate-800">
                    <span>{milestone.title}</span>
                    <span className="text-[10px] font-mono text-amber-400">{streakCount} Days</span>
                  </div>
                  <div className="text-[11px] text-amber-200/90 font-medium mt-1">
                    {milestone.hindiTitle}
                  </div>
                  <p className="text-slate-300 mt-1 text-[11px] leading-snug">
                    {milestone.description}
                  </p>
                  <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between font-mono">
                    <span className="flex items-center gap-1 text-sky-300">
                      <Snowflake className="w-3 h-3" />
                      <span>{streakFreezes} Streak Freeze</span>
                    </span>
                    <span className="text-amber-300 font-bold">Goal: {milestone.nextMilestoneStreak}d</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Smart Trigger Notifications Bell + Drawer */}
          {!isAdmin && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotifOpen((prev) => !prev)}
                aria-label="Smart Notifications"
                aria-expanded={isNotifOpen}
                className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center leading-none tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:right-0 top-14 sm:top-full mt-0 sm:mt-2 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 p-4 space-y-3 text-slate-900 dark:text-slate-100">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Smart Alerts &amp; Triggers
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {unreadCount > 0 ? `${unreadCount} active alerts` : 'All alerts caught up'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && onMarkNotificationsRead && (
                        <button
                          type="button"
                          onClick={onMarkNotificationsRead}
                          className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer whitespace-nowrap"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsNotifOpen(false)}
                        aria-label="Close notifications"
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="py-5 text-center text-xs text-slate-500 dark:text-slate-400">
                      No active triggers right now. Stay consistent at 7:00 PM IST!
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            if (!notif.read) {
                              onMarkSingleNotificationRead?.(notif.id);
                            }
                          }}
                          className={`p-3 rounded-lg border text-xs space-y-2 transition-colors ${
                            notif.read
                              ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                              : 'bg-amber-50/60 dark:bg-slate-800/90 border-amber-200 dark:border-amber-700/60 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {notif.title}
                            </div>
                            {!notif.read ? (
                              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1" title="Unread" />
                            ) : (
                              <span className="text-[10px] font-semibold text-slate-400 shrink-0">Read</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                            {notif.message}
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsNotifOpen(false);
                                if (onTriggerNotificationAction) {
                                  onTriggerNotificationAction(notif);
                                } else {
                                  setActiveTab(notif.targetTab);
                                }
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-900 dark:text-emerald-400 hover:underline cursor-pointer"
                            >
                              <span>{notif.actionLabel}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                            {!notif.read && onMarkSingleNotificationRead && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMarkSingleNotificationRead(notif.id);
                                }}
                                className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      {notifEnabled ? 'Alerts Enabled' : 'Alerts Muted'}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const prefs = getNotificationPrefs();
                          void dispatchAppNotification({
                            id: `header_test_${Date.now()}`,
                            title: 'Schedule Alert Test (IST)',
                            body: 'Live exam entry, answer key release, and daily 100-week topic alerts are working.',
                            targetTab: 'tests',
                            soundEnabled: prefs.soundEnabled,
                          });
                          setIsNotifOpen(false);
                        }}
                        className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer whitespace-nowrap"
                      >
                        Send Test Alert
                      </button>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsNotifOpen(false);
                          onOpenSettings();
                        }}
                        className="font-semibold text-slate-700 dark:text-slate-300 hover:underline cursor-pointer whitespace-nowrap"
                      >
                        Notification Settings
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Theme Toggle */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-1.5 sm:p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer shrink-0"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark mode"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              )}
            </button>
          )}

          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Settings"
            className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg transition-colors text-xs font-medium cursor-pointer whitespace-nowrap shrink-0"
            title="Language & App Settings"
          >
            <Settings className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden 2xl:inline">
              {user.language === 'te' ? 'సెట్టింగ్స్' : user.language === 'hi' ? 'सेटिंग्स' : 'Settings'}
            </span>
          </button>

          {/* User Profile Info (hidden on mobile where BottomNav already shows Profile tab) */}
          {!isAdmin ? (
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="hidden md:flex items-center gap-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center font-semibold text-[11px] shrink-0">
                {user.fullName.charAt(0)}
              </div>
              <div className="hidden xl:block text-left">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight flex items-center gap-1">
                  <span>{user.fullName.split(' ')[0]}</span>
                  {user.profileComplete && (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 leading-none">
                  {user.studentId}
                </div>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-1 sm:gap-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-slate-700 dark:text-slate-200 text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0">
              <Shield className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0" />
              <span className="sm:hidden">Admin</span>
              <span className="hidden sm:inline capitalize">{currentRole.replace(/([A-Z])/g, ' $1')}</span>
            </div>
          )}

          {/* Sign Out Button */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              aria-label="Sign Out"
              className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg transition-colors text-xs font-medium cursor-pointer whitespace-nowrap shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="hidden 2xl:inline">Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
