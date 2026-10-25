import React from 'react';
import { LanguageCode } from '../types';
import { getTranslation } from '../utils/i18n';
import {
  Settings,
  Globe,
  Check,
  ShieldCheck,
  Bell,
  X,
  Sparkles,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: LanguageCode;
  onSelectLanguage: (lang: LanguageCode) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentLanguage,
  onSelectLanguage,
}) => {
  if (!isOpen) return null;

  const t = getTranslation(currentLanguage);

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
    <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 text-slate-900 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-900">
                {t.settingsTitle}
              </h2>
              <p className="text-[11px] text-slate-500">{t.settingsSubtitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language Selection Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Globe className="w-4 h-4 text-amber-600" />
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
                  className={`w-full p-3.5 rounded-2xl border text-left flex items-start justify-between transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/40'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">
                        {lang.native}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">({lang.label})</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {lang.desc}
                    </p>
                  </div>

                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 ml-2">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Timer Alert Settings */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-slate-500 shrink-0" />
            <div>
              <div className="text-xs font-bold text-slate-800">{t.hapticsLabel}</div>
              <div className="text-[10px] text-slate-500">{t.hapticsDesc}</div>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Active
          </span>
        </div>

        {/* DPDP Notice */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-slate-600 text-[11px] leading-relaxed">
            <strong className="text-slate-900 block font-bold mb-0.5">{t.dpdpNoticeTitle}</strong>
            {t.dpdpNoticeDesc}
          </div>
        </div>

        {/* Save & Close Button */}
        <button
          onClick={onClose}
          className="w-full bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md active:scale-98"
        >
          {t.saveSettings}
        </button>
      </div>
    </div>
  );
};
