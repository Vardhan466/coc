import React, { useState, useEffect } from 'react';
import { Attempt, LanguageCode } from '../types';
import { getTranslation } from '../utils/i18n';
import {
  Star,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  Trophy,
  Users,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface FeedbackModalProps {
  attempt: Attempt;
  language: LanguageCode;
  onSubmitAndProceed: (feedback: { rating: number; tags: string[]; note: string }) => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  attempt,
  language,
  onSubmitAndProceed,
}) => {
  const t = getTranslation(language);
  const [rating, setRating] = useState(5);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [isComputingRanks, setIsComputingRanks] = useState(false);
  const [computeStep, setComputeStep] = useState(0);

  const chips = [
    t.chipBalanced,
    t.chipHighYield,
    t.chipTooFast,
    t.chipMathTough,
    t.chipGreatUi,
  ];

  const toggleChip = (chip: string) => {
    setSelectedChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  const handleSubmit = () => {
    setIsComputingRanks(true);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.5 },
      });
    } catch {
      // Ignore
    }

    // High-fidelity progress steps
    setTimeout(() => setComputeStep(1), 600);
    setTimeout(() => setComputeStep(2), 1200);
    setTimeout(() => {
      onSubmitAndProceed({
        rating,
        tags: selectedChips,
        note,
      });
    }, 1800);
  };

  if (isComputingRanks) {
    return (
      <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-8 text-center text-white shadow-2xl space-y-6">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="w-20 h-20 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin absolute" />
            <Trophy className="w-8 h-8 text-amber-400 animate-pulse" />
          </div>

          <div>
            <h3 className="text-xl font-black tracking-tight text-white mb-1">
              {t.calculatingRankTitle}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.calculatingRankDesc}
            </p>
          </div>

          {/* Step progression */}
          <div className="space-y-2 text-xs text-left max-w-xs mx-auto">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300">Vault validation complete (40 items)</span>
            </div>
            <div className="flex items-center gap-2">
              {computeStep >= 1 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
              )}
              <span className={computeStep >= 1 ? 'text-slate-300' : 'text-amber-400 font-semibold'}>
                Applying tie-breakers (Score &gt; Accuracy &gt; Time)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {computeStep >= 2 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
              )}
              <span className={computeStep >= 2 ? 'text-slate-300' : 'text-slate-500'}>
                Finalizing State & All-India Rank
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden my-auto">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-blue-500" />

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl mx-auto flex items-center justify-center mb-3">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {t.feedbackTitle}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {t.feedbackSubtitle}
          </p>
        </div>

        {/* 5-Star Rating */}
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 text-center mb-5">
          <div className="text-xs font-bold text-slate-300 mb-2">
            {t.rateDifficulty}
          </div>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1 text-2xl transition-transform hover:scale-125 active:scale-95"
              >
                <Star
                  className={`w-7 h-7 ${
                    star <= rating
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-600'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Quick Tag Chips */}
        <div className="space-y-2 mb-5">
          <div className="text-xs font-semibold text-slate-400">Quick Impressions</div>
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => {
              const isSelected = selectedChips.includes(chip);
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => toggleChip(chip)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSubmit}
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-98 flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          <span>{t.submitFeedbackAndResults}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
