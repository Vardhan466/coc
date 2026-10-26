import React from 'react';
import { UserProfile, UserRole } from '../types';
import { getTranslation } from '../utils/i18n';
import { Shield, CheckCircle2, Settings, LogOut } from 'lucide-react';

interface HeaderProps {
  user: UserProfile;
  currentRole: UserRole;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSettings: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentRole,
  activeTab,
  setActiveTab,
  onOpenSettings,
  onLogout,
}) => {
  const isAdmin = currentRole !== 'student';
  const t = getTranslation(user.language);

  return (
    <header className="bg-white text-slate-900 border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-sm tracking-tight shadow-xs">
            COC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-slate-900">
                {t.brandName}
              </span>
              <span className="hidden sm:inline-block text-[11px] font-semibold text-slate-500">
                · {t.dailyBadge}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-normal">
              {t.brandTagline}
            </p>
          </div>
        </div>

        {/* Desktop Nav Links - Clean Understated Typography */}
        {!isAdmin && (
          <nav className="hidden md:flex items-center gap-1">
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        )}

        {/* Right Action Zone: Settings, Profile & Sign Out */}
        <div className="flex items-center gap-2">
          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-medium"
            title="Language & App Settings"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">
              {user.language === 'te' ? 'సెట్టింగ్స్' : user.language === 'hi' ? 'सेटिंग्स' : 'Settings'}
            </span>
          </button>

          {/* User Profile Info */}
          {!isAdmin ? (
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 px-2.5 py-1 rounded-lg transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold text-[11px]">
                {user.fullName.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-900 leading-tight flex items-center gap-1">
                  <span>{user.fullName.split(' ')[0]}</span>
                  {user.profileComplete && (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  )}
                </div>
                <div className="text-[10px] font-mono text-slate-500 leading-none">
                  {user.studentId}
                </div>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 border border-slate-200 bg-slate-50 px-2.5 py-1.5 rounded-lg text-slate-700 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5 text-slate-700" />
              <span className="capitalize">{currentRole.replace(/([A-Z])/g, ' $1')}</span>
            </div>
          )}

          {/* Sign Out Button */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1 text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-medium"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
