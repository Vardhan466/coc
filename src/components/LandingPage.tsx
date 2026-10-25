import React, { useState } from 'react';
import {
  Flame,
  Award,
  Clock,
  ShieldCheck,
  Zap,
  ArrowRight,
  Target,
  BarChart3,
  CheckCircle2,
  Lock,
  Users,
  Smartphone,
  ChevronRight,
  Sparkles,
  BookOpen,
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
  const [demoStep, setDemoStep] = useState<number | null>(null);
  const [demoSelected, setDemoSelected] = useState<number | null>(null);

  const sampleDemoQ = {
    text: 'Which Article of the Constitution of India guarantees the Right to Equality before Law?',
    options: ['Article 14', 'Article 19', 'Article 21', 'Article 32'],
    correct: 0,
    explanation: 'Article 14 ensures equality before law and equal protection of laws across India.',
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navigation Bar with Signup/Login in the upper right corner */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-500/20">
              COC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  Club Of Competition
                </span>
                <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/30 uppercase">
                  DAILY 7 PM
                </span>
              </div>
              <p className="text-[11px] text-slate-400">All-India High-Stakes Speed Exam Platform</p>
            </div>
          </div>

          {/* Right Upper Corner Auth Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onOpenAuth('login')}
              className="text-xs font-bold text-slate-300 hover:text-white px-3 py-2 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/60 transition-colors"
            >
              Sign In
            </button>

            <button
              onClick={() => onOpenAuth('signup')}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-95 flex items-center gap-1.5"
            >
              <span>Sign Up / Get ID</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-800/80">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider animate-in fade-in">
            <Flame className="w-4 h-4 fill-current text-amber-500" />
            <span>All-India Competitive Exam Protocol • 7:00 PM Daily</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto">
            The 12-Second High-Stakes Daily Exam That Trains Real Exam Instincts.
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Every evening at precisely 7:00 PM, over 4,000+ government-exam aspirants across India face the exact same 40 questions under a strict 12-second question clock. +1.0 for correct, -0.25 for incorrect. No second-guessing.
          </p>

          {/* Hero Call-To-Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <button
              onClick={() => onOpenAuth('signup')}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black px-7 py-4 rounded-2xl text-sm sm:text-base shadow-xl shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <span>Get Your Student ID & Join Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onEnterAsDemo}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold px-6 py-4 rounded-2xl text-sm sm:text-base transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Explore Live Platform as Demo</span>
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-8 max-w-4xl mx-auto text-left">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <div className="text-[11px] font-bold uppercase text-slate-400">Daily Entry Window</div>
              <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1">7:00 – 7:15 PM</div>
              <div className="text-[11px] text-slate-400">Full 5m 20s guaranteed</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <div className="text-[11px] font-bold uppercase text-slate-400">Timer Per Question</div>
              <div className="text-xl sm:text-2xl font-black text-white mt-1">12 Seconds</div>
              <div className="text-[11px] text-emerald-400">Strict auto-advance</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <div className="text-[11px] font-bold uppercase text-slate-400">Marking Penalty</div>
              <div className="text-xl sm:text-2xl font-black text-rose-400 mt-1">+1.0 / -0.25</div>
              <div className="text-[11px] text-slate-400">Negative leak diagnostic</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <div className="text-[11px] font-bold uppercase text-slate-400">Enrolled Aspirants</div>
              <div className="text-xl sm:text-2xl font-black text-blue-400 mt-1">4,850+ Active</div>
              <div className="text-[11px] text-slate-400">All-India & State rank</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive 12-Second Demo Simulator Section */}
      <section className="py-12 border-b border-slate-800 bg-slate-900/40">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-6">
            <span className="text-xs font-black uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
              Interactive Test Drive
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
              Feel the 12-Second Question Clock
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Test how quick reflex decision-making eliminates second-guessing.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                Sample Question • General Awareness
              </div>
              <div className="text-xs font-mono font-bold text-slate-300">
                12s Speed Timer
              </div>
            </div>

            <div className="text-base sm:text-lg font-bold text-white mb-5 leading-snug">
              {sampleDemoQ.text}
            </div>

            <div className="space-y-2.5">
              {sampleDemoQ.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setDemoSelected(i)}
                  className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm font-semibold transition-all flex items-center justify-between ${
                    demoSelected === i
                      ? i === sampleDemoQ.correct
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded bg-slate-950 text-slate-300 flex items-center justify-center font-bold text-xs">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span>{opt}</span>
                  </div>
                  {demoSelected === i && (
                    <span className="text-xs font-bold">
                      {i === sampleDemoQ.correct ? '✓ Correct (+1.0)' : '✗ Incorrect (-0.25)'}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {demoSelected !== null && (
              <div className="mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
                <span className="font-bold text-amber-400">Explanation: </span>
                {sampleDemoQ.explanation}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Feature Pillars Detailed Breakdown */}
      <section className="py-16 md:py-20 border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Why Club Of Competition Is Built Different
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
              Designed by competitive exam veterans and high-concurrency systems engineers to eradicate the flaws of generic mock test apps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base">7:00 PM Synchronized Entry</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Rather than testing alone in isolation, you enter the arena alongside thousands of candidates simultaneously. If you start between 7:00 and 7:15 PM, you get your guaranteed full 5m 20s.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base">Anti-Cheat & Tab Switch Guard</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Server-authoritative clocks detect and log tab-switching, app backgrounding, or screen-off. A gentle warning is shown on first violation; second violation terminates the exam.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base">8:15 PM Vault Key Release</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Correct answer keys remain securely encrypted in the server vault until 8:15 PM IST to prevent leaks before all attempts are finalized and ranked deterministically.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base">Permanent Student ID</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Receive an immutable system-assigned ID (e.g. COC-2026-000123) with state and district classification under DPDP Act 2023 privacy safeguards.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center font-bold">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base">Negative Mark Leak Diagnostic</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Calculates cumulative marks forfeited to wrong guesses (-0.25 penalty) and identifies impulsive mistakes made in under 2 seconds.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center font-bold">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base">AI Weakest 3 Topics</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automatically isolates your weakest 3 topics from recent test performance and links them to focused 12-second speed drill practice sets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to action footer */}
      <section className="py-14 bg-gradient-to-b from-slate-950 to-slate-900 text-center">
        <div className="max-w-3xl mx-auto px-4 space-y-5">
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Ready for Today's 7:00 PM Competition?
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            Create your permanent Student ID in under 60 seconds. Test your nerve, build speed, and track your all-India percentile.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onOpenAuth('signup')}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-8 py-4 rounded-2xl text-sm sm:text-base shadow-lg shadow-amber-500/20 active:scale-95 transition-all inline-flex items-center gap-2"
            >
              <span>Get Your Student ID & Register Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>© 2026 Club Of Competition. All rights reserved.</div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>DPDP Act 2023 Compliant</span>
            <span>Server-Authoritative Vault</span>
            <span>All-India Normalized Ranking</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
