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
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black text-xl tracking-tighter">
            COC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base md:text-lg tracking-tight text-white">
                {t.brandName}
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {t.dailyBadge}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {t.brandTagline}
            </p>
          </div>
        </div>

        {/* Desktop Nav Links */}
        {!isAdmin && (
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            {[
              { id: 'tests', label: t.navTests },
              { id: 'results', label: t.navResults },
              { id: 'progress', label: t.navProgress },
              { id: 'practice', label: t.navPractice },
              { id: 'profile', label: t.navProfile },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        )}

        {/* User Badges & Settings Gear & Log Out */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Settings Modal Launcher Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 px-2.5 py-1.5 rounded-xl transition-all text-xs font-medium"
            title="Language & App Settings"
          >
            <Settings className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider text-slate-300">
              {user.language === 'te' ? 'సెట్టింగ్స్' : user.language === 'hi' ? 'सेटिंग्स' : 'Settings'}
            </span>
          </button>

          {/* Student Profile Pill */}
          {!isAdmin ? (
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 px-2.5 py-1 rounded-xl transition-all"
            >
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-amber-400 font-bold text-xs border border-amber-500/40">
                {user.fullName.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-white leading-tight flex items-center gap-1">
                  <span>{user.fullName.split(' ')[0]}</span>
                  {user.profileComplete && (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 fill-emerald-400/20" />
                  )}
                </div>
                <div className="text-[10px] font-mono text-amber-400/90 font-medium leading-none">
                  {user.studentId}
                </div>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl text-amber-400">
              <Shield className="w-4 h-4 text-amber-400" />
              <div className="text-xs font-bold capitalize">
                {currentRole.replace(/([A-Z])/g, ' $1')} Mode
              </div>
            </div>
          )}

          {/* Log Out Button */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 px-2.5 py-1.5 rounded-xl transition-colors text-xs font-semibold"
              title="Sign Out of Account"
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
