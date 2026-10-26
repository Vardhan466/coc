import React from 'react';
import { LanguageCode } from '../types';
import { getTranslation } from '../utils/i18n';
import { BookOpen, Trophy, TrendingUp, Zap, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isExamActive: boolean;
  language: LanguageCode;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  isExamActive,
  language,
}) => {
  if (isExamActive) return null;

  const t = getTranslation(language);

  const items = [
    { id: 'tests', label: t.navTests, icon: BookOpen },
    { id: 'results', label: t.navResults, icon: Trophy },
    { id: 'progress', label: t.navProgress, icon: TrendingUp },
    { id: 'practice', label: t.navPractice, icon: Zap },
    { id: 'profile', label: t.navProfile, icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 shadow-sm pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 h-14">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors relative min-h-[48px] px-1 ${
                isActive ? 'text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] tracking-tight truncate max-w-full text-center">
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 w-8 h-0.5 bg-slate-900 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
