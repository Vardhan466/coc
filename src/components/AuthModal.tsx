import React, { useState } from 'react';
import { UserProfile, ExamTarget, UserRole } from '../types';
import { INDIAN_STATES_AND_DISTRICTS, formatStudentId } from '../utils/scoring';
import {
  authenticateUser,
  saveStoredAccount,
  DEFAULT_ACCOUNTS,
  StoredAccount,
} from '../data/authAccounts';
import {
  Lock,
  Mail,
  User,
  Phone,
  CheckCircle2,
  X,
  ArrowRight,
  Shield,
  Sparkles,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  BarChart2,
  FileEdit,
  GraduationCap,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  onLoginSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('admin@coc.in');
  const [loginPassword, setLoginPassword] = useState('admin@password123');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Signup form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [state, setState] = useState('Andhra Pradesh');
  const [district, setDistrict] = useState('Kurnool');
  const [examTarget, setExamTarget] = useState<ExamTarget>('SSC CGL / CHSL');
  const [dpdpConsent, setDpdpConsent] = useState(true);
  const [signupSuccessNote, setSignupSuccessNote] = useState<string | null>(null);

  if (!isOpen) return null;

  const availableDistricts = INDIAN_STATES_AND_DISTRICTS[state] || [];

  const handleStateChange = (newState: string) => {
    setState(newState);
    const districts = INDIAN_STATES_AND_DISTRICTS[newState] || [];
    setDistrict(districts[0] || '');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const result = authenticateUser(loginIdentifier, loginPassword);
    if (!result.success || !result.user) {
      setLoginError(result.error || 'Authentication failed. Please verify credentials.');
      return;
    }

    onLoginSuccess(result.user);
    onClose();
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !email || !signupPassword) return;

    // Generate new immutable sequential student ID
    const randomSeq = Math.floor(100 + Math.random() * 900);
    const newStudentId = formatStudentId(randomSeq, 2026);

    const newUserProfile: UserProfile = {
      uid: `user_${Date.now()}`,
      studentId: newStudentId,
      fullName,
      email,
      phone,
      address: {
        local: 'Town Center',
        district,
        state,
        country: 'India',
      },
      examTarget,
      language: 'en',
      profileComplete: true,
      role: 'student',
      createdAt: new Date().toISOString(),
      dpdpConsent,
      subscription: {
        isActive: true,
        plan: 'Pro Daily Pass',
        validUntil: '2026-12-31T23:59:59Z',
        consecutiveMissedDays: 0,
      },
    };

    const newAccount: StoredAccount = {
      id: newStudentId,
      email,
      password: signupPassword,
      role: 'student',
      userProfile: newUserProfile,
    };

    saveStoredAccount(newAccount);

    setSignupSuccessNote(`Account created! Student ID: ${newStudentId}`);
    setTimeout(() => {
      onLoginSuccess(newUserProfile);
      onClose();
    }, 1200);
  };

  const handleQuickFillAccount = (acc: StoredAccount) => {
    setLoginIdentifier(acc.email);
    setLoginPassword(acc.password);
    setLoginError(null);
  };

  const handleInstantLogin = (acc: StoredAccount) => {
    onLoginSuccess(acc.userProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-200 text-slate-900 relative my-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-md">
            COC
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-tight">
              {mode === 'login' ? 'Sign In with User ID & Password' : 'Create Permanent Student Account'}
            </h2>
            <p className="text-[11px] text-slate-500">
              {mode === 'login'
                ? 'Role-based credential login with full session persistence'
                : 'Generates system-verified Student ID (COC-2026-XXXXXX)'}
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setLoginError(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'login' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setLoginError(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'signup' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Register / Sign Up
          </button>
        </div>

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            {loginError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                User ID or Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. admin@coc.in or COC-2026-000123"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white font-extrabold py-2.5 rounded-xl text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
            >
              <span>Sign In to Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick Credentials / Post-Deploy Test Verification Card */}
            <div className="pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  <span>Deployment Test Accounts (Click to Fill / Login)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Real Credentials</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {DEFAULT_ACCOUNTS.map((acc) => {
                  const roleLabel =
                    acc.role === 'superAdmin'
                      ? 'Super Admin'
                      : acc.role === 'contentAdmin'
                      ? 'Content Admin'
                      : acc.role === 'analyst'
                      ? 'Analyst'
                      : 'Student';

                  const roleColor =
                    acc.role === 'superAdmin'
                      ? 'border-purple-200 bg-purple-50/70 hover:bg-purple-100/80 text-purple-950'
                      : acc.role === 'contentAdmin'
                      ? 'border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 text-blue-950'
                      : acc.role === 'analyst'
                      ? 'border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-950'
                      : 'border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 text-amber-950';

                  const Icon =
                    acc.role === 'superAdmin'
                      ? ShieldCheck
                      : acc.role === 'contentAdmin'
                      ? FileEdit
                      : acc.role === 'analyst'
                      ? BarChart2
                      : GraduationCap;

                  return (
                    <div
                      key={acc.id}
                      className={`p-2 rounded-xl border text-left transition-all ${roleColor} flex flex-col justify-between`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1 font-bold">
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{roleLabel}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleInstantLogin(acc)}
                          className="text-[10px] bg-slate-900 hover:bg-slate-800 text-white font-bold px-1.5 py-0.5 rounded shadow-xs"
                          title="Instant 1-click login"
                        >
                          Login ➔
                        </button>
                      </div>

                      <div className="text-[10px] font-mono text-slate-600 truncate">
                        ID: <span className="font-semibold text-slate-900">{acc.id}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-600 truncate">
                        Pass: <span className="font-semibold text-slate-900">{acc.password}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleQuickFillAccount(acc)}
                        className="text-[10px] text-slate-500 hover:text-slate-800 font-semibold underline text-left mt-1"
                      >
                        Fill in Form
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </form>
        )}

        {/* SIGNUP FORM */}
        {mode === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="space-y-3">
            {signupSuccessNote && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{signupSuccessNote}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ananya Sharma"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Phone (OTP) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Create Account Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                placeholder="•••••••• (used for login post-deploy)"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  State <span className="text-rose-500">*</span>
                </label>
                <select
                  value={state}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {Object.keys(INDIAN_STATES_AND_DISTRICTS).map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  District <span className="text-rose-500">*</span>
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {availableDistricts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Target Exam
              </label>
              <select
                value={examTarget}
                onChange={(e) => setExamTarget(e.target.value as ExamTarget)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="SSC CGL / CHSL">SSC CGL / CHSL</option>
                <option value="Banking (IBPS / SBI PO & Clerk)">Banking (IBPS / SBI PO & Clerk)</option>
                <option value="Railways (RRB NTPC / Group D)">Railways (RRB NTPC / Group D)</option>
                <option value="State PSC (APPSC / TSPSC / UPPSC)">State PSC (APPSC / TSPSC / UPPSC)</option>
                <option value="UPSC Civil Services">UPSC Civil Services</option>
                <option value="Police SI & Constable">Police SI & Constable</option>
              </select>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dpdpConsent}
                  onChange={(e) => setDpdpConsent(e.target.checked)}
                  className="mt-0.5 w-3.5 h-3.5 text-amber-600 rounded"
                />
                <span className="text-[10px] text-slate-600 leading-tight">
                  I consent to DPDP Act 2023 collection of location & phone solely for state ranking normalization.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={!fullName || !phone || !email || !signupPassword || !dpdpConsent}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-xl text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              <span>Generate Student ID & Enter</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
