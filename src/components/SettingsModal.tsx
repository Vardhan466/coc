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
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-5 text-slate-900 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {t.settingsTitle}
              </h2>
              <p className="text-[11px] text-slate-500">{t.settingsSubtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Language Selection Section */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
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
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:bg-slate-50 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {lang.native}
                      </span>
                      <span className="text-xs text-slate-500 font-normal">({lang.label})</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {lang.desc}
                    </p>
                  </div>

                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 ml-2">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Timer Alert Settings */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-500 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-slate-800">{t.hapticsLabel}</div>
              <div className="text-[10px] text-slate-500">{t.hapticsDesc}</div>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
            Active
          </span>
        </div>

        {/* DPDP Notice */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2 text-xs">
          <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
          <div className="text-slate-600 text-[11px] leading-relaxed">
            <strong className="text-slate-900 block font-semibold mb-0.5">{t.dpdpNoticeTitle}</strong>
            {t.dpdpNoticeDesc}
          </div>
        </div>

        {/* Save & Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-lg text-xs transition-colors shadow-xs"
        >
          {t.saveSettings}
        </button>
      </div>
    </div>
  );
};
