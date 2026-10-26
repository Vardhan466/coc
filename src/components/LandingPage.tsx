import React, { useState } from 'react';
import {
  Clock,
  ShieldCheck,
  Zap,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Lock,
  Award,
  Users,
} from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onEnterAsDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenAuth,
  onEnterAsDemo,
}) => {
  // Interactive mini-demo state
  const [demoSelected, setDemoSelected] = useState<number | null>(null);

  const sampleDemoQ = {
    text: 'Which Article of the Constitution of India guarantees the Right to Equality before Law?',
    options: ['Article 14', 'Article 19', 'Article 21', 'Article 32'],
    correct: 0,
    explanation: 'Article 14 ensures equality before law and equal protection of laws for all persons within the territory of India.',
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      {/* Top Navigation Bar with Signup/Login in the upper right corner */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-sm tracking-tight shadow-xs">
              COC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-slate-900">
                  Club Of Competition
                </span>
                <span className="hidden sm:inline-block text-[11px] font-semibold text-slate-500">
                  · Daily 7:00 PM Exam
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal">
                All-India 10-Second High-Stakes Speed Platform
              </p>
            </div>
          </div>

          {/* Right Upper Corner Auth Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
            >
              <span>Get Student ID</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-12 pb-14 md:pt-16 md:pb-20 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span>Official Daily Exam Protocol</span>
            <span aria-hidden="true">·</span>
            <span>7:00 PM to 7:15 PM IST</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            The 10-Second Daily Exam That Builds Real Exam Reflexes.
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Every evening at 7:00 PM, over 4,800+ competitive aspirants face 30 questions under a strict 10-second clock. +1.0 for correct, -0.25 for incorrect. No second-guessing.
          </p>

          {/* Call-To-Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <span>Get Student ID & Enter</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onEnterAsDemo}
              className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-semibold px-5 py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Explore Platform (Demo Mode)</span>
            </button>
          </div>

          {/* Clean Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-8 max-w-4xl mx-auto text-left">
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Entry Window</div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tabular-nums">7:00 – 7:15 PM</div>
              <div className="text-[11px] text-slate-500 mt-0.5">5m guaranteed test time</div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Time Per Question</div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tabular-nums">10 Seconds</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Auto-advances to next question</div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Marking Scheme</div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tabular-nums">+1.0 / -0.25</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Negative mark diagnostics</div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Aspirants Competing</div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tabular-nums">4,850+</div>
              <div className="text-[11px] text-slate-500 mt-0.5">All-India & State ranks</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive 12-Second Demo Simulator Section */}
      <section className="py-12 border-b border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-6">
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-md">
              Quick Preview
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
              Experience the 12-Second Question Clock
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select an option below to test instant reflex decision-making.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 text-xs">
              <div className="font-semibold text-slate-700">
                Sample Question · General Awareness
              </div>
              <div className="font-mono font-medium text-slate-500">
                12s / question
              </div>
            </div>

            <div className="text-base sm:text-lg font-semibold text-slate-900 mb-5 leading-snug">
              {sampleDemoQ.text}
            </div>

            <div className="space-y-2.5">
              {sampleDemoQ.options.map((opt, i) => {
                const isSelected = demoSelected === i;
                const isCorrect = i === sampleDemoQ.correct;

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDemoSelected(i)}
                    className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm font-medium transition-colors flex items-center justify-between ${
                      isSelected
                        ? isCorrect
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold'
                          : 'bg-rose-50 border-rose-500 text-rose-950 font-semibold'
                        : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-xs">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span>{opt}</span>
                    </div>
                    {isSelected && (
                      <span className="text-xs font-semibold">
                        {isCorrect ? '✓ Correct (+1.0)' : '✗ Incorrect (-0.25)'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {demoSelected !== null && (
              <div className="mt-4 p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 leading-relaxed">
                <span className="font-bold text-slate-900">Official Key Explanation: </span>
                {sampleDemoQ.explanation}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Feature Pillars Detailed Breakdown */}
      <section className="py-14 md:py-16 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 space-y-10">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Engineered for Fairness & Real Competition
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
              Designed from first principles to reflect actual competitive examination pressure and eliminate the flaws of unmoderated practice tests.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5 text-slate-700" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">7:00 PM Synchronized Window</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter the live exam alongside thousands of aspirants across India. If you start between 7:00 and 7:15 PM, you receive your full guaranteed 5m test duration.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5 text-slate-700" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Anti-Cheat Tab Switch Detection</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Detects tab-switching, app backgrounding, and screen-off events. Displays a gentle warning on first notice; automatically terminates attempt on second violation.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5 text-slate-700" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">8:15 PM Vault Key Release</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Official answer keys remain encrypted until 8:15 PM IST. Once released, candidates review complete question solutions and percentile rank cards.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                <Award className="w-5 h-5 text-slate-700" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Permanent Student ID</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Receive an immutable system-assigned student ID (e.g. COC-2026-000123) with state and district classification for regional benchmark ranking.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                <BarChart3 className="w-5 h-5 text-slate-700" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Negative Mark Leak Diagnostic</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Track cumulative marks forfeited to incorrect guesses (-0.25 penalty) and isolate impulsive misjudgments made in under 2 seconds.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5 text-slate-700" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Targeted Subject Sprints</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sharpen weak areas between daily tests with 10-question speed drills across Quantitative Aptitude, Reasoning, General Awareness, and English.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Call to Action */}
      <section className="py-12 bg-white text-center border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">
            Join Today's 7:00 PM Competition
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Create your permanent Student ID in under 60 seconds. Test under pressure, build speed, and track your All-India rankcard.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl text-xs sm:text-sm shadow-xs transition-colors inline-flex items-center gap-2"
            >
              <span>Get Your Student ID & Register</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-500 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>© 2026 Club Of Competition. All rights reserved.</div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span>DPDP Act 2023 Compliant</span>
            <span>·</span>
            <span>Server-Authoritative Vault</span>
            <span>·</span>
            <span>Deterministic Tie-Breaker Ranking</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
