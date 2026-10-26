import React, { useState } from 'react';
import { Attempt, LanguageCode } from '../types';
import { getTranslation } from '../utils/i18n';
import {
  Star,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Trophy,
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

    setTimeout(() => setComputeStep(1), 500);
    setTimeout(() => setComputeStep(2), 1000);
    setTimeout(() => {
      onSubmitAndProceed({
        rating,
        tags: selectedChips,
        note,
      });
    }, 1500);
  };

  if (isComputingRanks) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
        <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-7 text-center text-slate-900 shadow-xl space-y-5">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-800">
            <Trophy className="w-8 h-8 text-amber-600" />
          </div>

          <div>
            <h3 className="text-lg font-bold tracking-tight text-slate-900">
              {t.calculatingRankTitle}
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {t.calculatingRankDesc}
            </p>
          </div>

          {/* Step progression */}
          <div className="space-y-2 text-xs text-left max-w-xs mx-auto border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-slate-700">Vault scoring verified (40 items)</span>
            </div>
            <div className="flex items-center gap-2">
              {computeStep >= 1 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" />
              )}
              <span className={computeStep >= 1 ? 'text-slate-700' : 'text-slate-500'}>
                Applying tie-breakers (Score &gt; Accuracy &gt; Time)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {computeStep >= 2 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
              )}
              <span className={computeStep >= 2 ? 'text-slate-700' : 'text-slate-400'}>
                Finalizing State & All-India Rankcard
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 sm:p-7 text-slate-900 shadow-xl relative my-auto">
        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl mx-auto flex items-center justify-center mb-2.5 border border-emerald-200">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {t.feedbackTitle}
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
            {t.feedbackSubtitle}
          </p>
        </div>

        {/* 5-Star Rating */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center mb-4">
          <div className="text-xs font-semibold text-slate-700 mb-2">
            {t.rateDifficulty}
          </div>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1 transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  className={`w-6 h-6 ${
                    star <= rating
                      ? 'text-amber-500 fill-amber-500'
                      : 'text-slate-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Quick Tag Chips */}
        <div className="space-y-2 mb-4">
          <div className="text-xs font-semibold text-slate-700">Quick Impressions</div>
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => {
              const isSelected = selectedChips.includes(chip);
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => toggleChip(chip)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Note */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {t.feedbackNotePlaceholder}
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any specific questions that felt tricky or ambiguous?"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-2"
        >
          <span>{t.submitFeedbackBtn}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
