import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, ExamTarget, DiagnosticResult } from '../types';
import { INDIAN_STATES_AND_DISTRICTS } from '../utils/scoring';
import { authenticateUser, DEFAULT_ACCOUNTS } from '../data/authAccounts';
import {
  signUpWithFirebase,
  signInWithFirebase,
  signInWithFirebaseGoogle,
  signInWithFirebaseGoogleRedirect,
  setInteractiveAuthHold,
  FirebaseAuthResult,
} from '../utils/firebaseAuth';
import { GoogleSignupContext } from '../utils/googleAuthHelpers';
import {
  Lock,
  Mail,
  User,
  Phone,
  CheckCircle2,
  X,
  ArrowRight,
  AlertCircle,
  MapPin,
  Building,
  Loader2,
  Database,
  ExternalLink,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  onLoginSuccess: (user: UserProfile) => void;
  pendingDiagnostic?: DiagnosticResult | null;
  referralCode?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onLoginSuccess,
  pendingDiagnostic,
  referralCode,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const signupCloseTimerRef = useRef<number | null>(null);
  useEffect(() => {
    setMode(initialMode);
    if (isOpen) {
      setLoginError(null);
      setSignupError(null);
      setSignupSuccessNote(null);
      setGoogleError(null);
      setGoogleErrorMeta(null);
      setGoogleSuccessNote(null);
      setShowFirebaseGuide(false);
      setIsGoogleLoading(false);
    }
  }, [initialMode, isOpen]);
  useEffect(() => {
    return () => {
      setInteractiveAuthHold(false);
      if (signupCloseTimerRef.current !== null) {
        window.clearTimeout(signupCloseTimerRef.current);
      }
    };
  }, []);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleErrorMeta, setGoogleErrorMeta] = useState<{
    canRetryRedirect?: boolean;
    shouldSuggestNewTab?: boolean;
    shouldShowConsoleHint?: boolean;
  } | null>(null);
  const [googleSuccessNote, setGoogleSuccessNote] = useState<string | null>(null);

  // Login form state - strictly empty, NO hardcoded or prefilled credentials
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Signup form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [state, setState] = useState('Andhra Pradesh');
  const [district, setDistrict] = useState('Visakhapatnam');
  const [examTarget, setExamTarget] = useState<ExamTarget>('SSC CGL / CHSL');
  const [dpdpConsent, setDpdpConsent] = useState(true);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccessNote, setSignupSuccessNote] = useState<string | null>(null);
  const [showFirebaseGuide, setShowFirebaseGuide] = useState<boolean>(false);

  if (!isOpen) return null;

  const statesList = Object.keys(INDIAN_STATES_AND_DISTRICTS).sort();
  const availableDistricts = INDIAN_STATES_AND_DISTRICTS[state] || [];

  const handleStateChange = (newState: string) => {
    setState(newState);
    const districts = INDIAN_STATES_AND_DISTRICTS[newState] || [];
    setDistrict(districts[0] || '');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const iden = loginIdentifier.trim();
    const pass = loginPassword.trim();

    if (!iden || !pass) {
      setLoginError('Please enter your Student ID or Email and Password.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. If it's a built-in demo/admin account, authenticate locally first without noisy 400 probes
      const isBuiltInEmail = DEFAULT_ACCOUNTS.some(
        (acc) => acc.email.toLowerCase() === iden.toLowerCase()
      );
      if (isBuiltInEmail) {
        const builtInRes = authenticateUser(iden, pass);
        if (builtInRes.success && builtInRes.user) {
          setIsLoading(false);
          onLoginSuccess(builtInRes.user);
          onClose();
          return;
        }
        setIsLoading(false);
        setLoginError(builtInRes.error || 'Invalid credentials for this account.');
        return;
      }

      // 2. If it's any other email address, try Firebase Email Authentication first
      if (iden.includes('@')) {
        const fbRes = await signInWithFirebase(iden, pass);
        if (fbRes.success && fbRes.user) {
          setIsLoading(false);
          onLoginSuccess(fbRes.user);
          onClose();
          return;
        }

        // If email/password provider is not enabled in Firebase Console, guide the user
        if (fbRes.isProviderDisabled) {
          setShowFirebaseGuide(true);
          // Check local fallback
          const localRes = authenticateUser(iden, pass);
          if (localRes.success && localRes.user) {
            setIsLoading(false);
            onLoginSuccess(localRes.user);
            onClose();
            return;
          }
          setIsLoading(false);
          setLoginError(fbRes.error || 'Firebase Email provider disabled.');
          return;
        }

        // Try local accounts fallback as well
        const localRes = authenticateUser(iden, pass);
        if (localRes.success && localRes.user) {
          setIsLoading(false);
          onLoginSuccess(localRes.user);
          onClose();
          return;
        }

        setIsLoading(false);
        setLoginError(fbRes.error || 'Invalid email or password.');
        return;
      }

      // 2. If it's a Student ID (COC-2026-XXXXX), check local stored accounts
      const localResult = authenticateUser(iden, pass);
      if (localResult.success && localResult.user) {
        setIsLoading(false);
        onLoginSuccess(localResult.user);
        onClose();
        return;
      }

      setIsLoading(false);
      setLoginError(localResult.error || 'No matching student record found for this ID/password.');
    } catch (err: any) {
      setIsLoading(false);
      setLoginError(err?.message || 'Authentication error.');
    }
  };

  const buildGoogleContext = (): GoogleSignupContext => {
    if (mode === 'signup') {
      return {
        fullName: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
        state,
        district,
        examTarget,
        referralCode: referralCode || undefined,
        skillTier: pendingDiagnostic?.assignedTier,
      };
    }
    return {
      referralCode: referralCode || undefined,
      skillTier: pendingDiagnostic?.assignedTier,
    };
  };

  const completeGoogleAuthResult = (res: FirebaseAuthResult) => {
    if (!res.success || !res.user) {
      setGoogleError(res.error || 'Google authentication was cancelled or failed.');
      setGoogleErrorMeta({
        canRetryRedirect: res.canRetryRedirect,
        shouldSuggestNewTab: res.shouldSuggestNewTab,
        shouldShowConsoleHint: res.shouldShowConsoleHint,
      });
      if (res.shouldShowConsoleHint) {
        setShowFirebaseGuide(true);
      }
      return;
    }

    const enrichedUser: UserProfile = {
      ...res.user,
      referredBy: referralCode || res.user.referredBy,
      skillTier: pendingDiagnostic?.assignedTier || res.user.skillTier || 'Bronze',
      referralCode: res.user.referralCode || res.user.studentId,
    };

    const statusMsg = res.isNewUser
      ? `Google account registered! Assigned Student ID: ${enrichedUser.studentId}. Opening dashboard...`
      : `Signed in via Google (${enrichedUser.studentId})! Opening dashboard...`;

    setGoogleSuccessNote(statusMsg);

    if (signupCloseTimerRef.current !== null) {
      window.clearTimeout(signupCloseTimerRef.current);
    }

    if (res.isNewUser || mode === 'signup') {
      setInteractiveAuthHold(true);
      signupCloseTimerRef.current = window.setTimeout(() => {
        setInteractiveAuthHold(false);
        onLoginSuccess(enrichedUser);
        onClose();
      }, 650);
    } else {
      onLoginSuccess(enrichedUser);
      onClose();
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setGoogleError(null);
    setGoogleErrorMeta(null);
    setGoogleSuccessNote(null);
    setLoginError(null);
    setSignupError(null);

    try {
      const res = await signInWithFirebaseGoogle(buildGoogleContext());
      setIsGoogleLoading(false);
      completeGoogleAuthResult(res);
    } catch (err: any) {
      setIsGoogleLoading(false);
      setGoogleError(err?.message || 'Google authentication failed.');
    }
  };

  const handleGoogleRedirectRetry = async () => {
    setIsGoogleLoading(true);
    setGoogleError(null);
    try {
      const res = await signInWithFirebaseGoogleRedirect(buildGoogleContext());
      if (!res.success) {
        setIsGoogleLoading(false);
        completeGoogleAuthResult(res);
      }
    } catch (err: any) {
      setIsGoogleLoading(false);
      setGoogleError(err?.message || 'Unable to launch redirect sign-in.');
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    const fName = fullName.trim();
    const ph = phone.trim();
    const em = email.trim().toLowerCase();
    const pw = signupPassword.trim();

    if (!fName || !ph || !em || !pw) {
      setSignupError('Please fill in all required fields.');
      return;
    }

    if (pw.length < 6) {
      setSignupError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Attempt Firebase Signup + Firestore profile creation
      const fbRes = await signUpWithFirebase(em, pw, {
        fullName: fName,
        phone: ph,
        state,
        district,
        examTarget,
      });

      if (fbRes.success && fbRes.user) {
        const enrichedUser: UserProfile = {
          ...fbRes.user,
          referredBy: referralCode || fbRes.user.referredBy,
          skillTier: pendingDiagnostic?.assignedTier || fbRes.user.skillTier || 'Bronze',
          referralCode: fbRes.user.studentId,
        };

        setIsLoading(false);
        setSignupSuccessNote(
          fbRes.requiresEmailVerification
            ? `Account created! Student ID: ${enrichedUser.studentId}. Verification email sent — verify your email to sync leaderboard scores.`
            : `Firebase Account created & synced to Firestore! Your unique Student ID is ${enrichedUser.studentId}.`
        );

        if (signupCloseTimerRef.current !== null) {
          window.clearTimeout(signupCloseTimerRef.current);
        }
        signupCloseTimerRef.current = window.setTimeout(() => {
          onLoginSuccess(enrichedUser);
          onClose();
        }, 1400);
        return;
      }

      // If Email/Password provider is disabled in Firebase Console
      if (fbRes.isProviderDisabled) {
        setShowFirebaseGuide(true);
        setIsLoading(false);
        setSignupError(
          'Email/Password auth is not enabled yet in Firebase Console. Please use "Continue with Google" above or enable Email/Password sign-in.'
        );
        return;
      }

      setIsLoading(false);
      setSignupError(fbRes.error || 'Registration failed.');
    } catch (err: any) {
      setIsLoading(false);
      setSignupError(err?.message || 'Registration error.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative text-slate-900 dark:text-slate-100 animate-smooth-in max-h-[90vh] overflow-y-auto transition-colors">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close authentication modal"
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center space-y-1 mb-5">
          <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center font-black text-sm mx-auto shadow-xs">
            COC
          </div>
          <h3 id="auth-modal-title" className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {mode === 'login' ? 'Sign In to Your Account' : 'Create Student Account'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {mode === 'login'
              ? 'Enter your Student ID or Email to access the 7:00 PM examination'
              : 'Register your unique Student ID to compete in All-India exams'}
          </p>

          {/* Account Storage Meta */}
          <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 mt-2">
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span>Cloud-synced with Firestore</span>
          </div>
        </div>

        {(pendingDiagnostic || referralCode) && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
            {pendingDiagnostic && (
              <div className="font-semibold">
                Diagnostic Ready to Save: {pendingDiagnostic.score.toFixed(2)}/{pendingDiagnostic.maxScore} ({pendingDiagnostic.assignedTier} Tier)
              </div>
            )}
            {referralCode && (
              <div className="text-[11px]">
                Friend Invite Applied ({referralCode}) — Challenger Badge + 1 Streak Freeze on activation.
              </div>
            )}
          </div>
        )}

        {/* Mode Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4 text-xs font-semibold border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setLoginError(null);
              setGoogleError(null);
              setGoogleErrorMeta(null);
              setGoogleSuccessNote(null);
              setShowFirebaseGuide(false);
            }}
            className={`flex-1 py-2 rounded-lg cursor-pointer ${
              mode === 'login'
                ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setSignupError(null);
              setGoogleError(null);
              setGoogleErrorMeta(null);
              setGoogleSuccessNote(null);
              setShowFirebaseGuide(false);
            }}
            className={`flex-1 py-2 rounded-lg cursor-pointer ${
              mode === 'signup'
                ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            New Student Registration
          </button>
        </div>

        {/* Firebase Console Setup Guide if Email or Google Provider needs attention */}
        {showFirebaseGuide && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-amber-950 dark:text-amber-100">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Firebase Authentication Provider &amp; Domain Setup:</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed">
              <li>Open Firebase Console Authentication -&gt; <strong>Sign-in method</strong> and verify <strong>Google</strong> (and Email/Password) are enabled.</li>
              <li>
                Under <strong>Settings -&gt; Authorized domains</strong>, ensure{' '}
                <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900 font-mono text-[10px]">
                  {typeof window !== 'undefined' ? window.location.hostname : 'localhost'}
                </code>{' '}
                is listed.
              </li>
            </ol>
            <div className="flex flex-wrap gap-3 pt-0.5">
              <a
                href="https://console.firebase.google.com/project/dazzling-chimera-qcb1c/authentication/providers"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 dark:text-amber-300 underline hover:text-amber-950 dark:hover:text-amber-200"
              >
                <span>Sign-in Providers</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://console.firebase.google.com/project/dazzling-chimera-qcb1c/authentication/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 dark:text-amber-300 underline hover:text-amber-950 dark:hover:text-amber-200"
              >
                <span>Authorized Domains</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* 1-Click Google Authentication (Shared across Sign In & New Student Registration) */}
        <div className="mb-4 space-y-2.5">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
            aria-label={mode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
            className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>
                  {mode === 'login'
                    ? 'Sign in with Google'
                    : 'Sign up with Google (Instant Student ID)'}
                </span>
              </>
            )}
          </button>

          {googleSuccessNote && (
            <div
              role="status"
              className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>{googleSuccessNote}</span>
            </div>
          )}

          {googleError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 space-y-2"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{googleError}</span>
              </div>
              {googleErrorMeta?.canRetryRedirect && (
                <button
                  type="button"
                  onClick={handleGoogleRedirectRetry}
                  disabled={isGoogleLoading}
                  className="text-[11px] font-bold text-rose-800 dark:text-rose-200 underline hover:opacity-80 cursor-pointer"
                >
                  Retry via Full-Page Google Redirect
                </button>
              )}
              {googleErrorMeta?.shouldSuggestNewTab && typeof window !== 'undefined' && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 dark:text-rose-200 underline hover:opacity-80"
                >
                  <span>Open App in New Tab for Google Sign-In</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 my-3">
            <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
              Or with email / ID
            </span>
            <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
          </div>
        </div>

        {/* 1. LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            {loginError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Student ID / Registered Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. COC-2026-123456 or name@gmail.com"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:bg-slate-400 dark:disabled:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting to Firebase...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* 2. SIGNUP FORM */}
        {mode === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="space-y-3">
            {signupError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{signupError}</span>
              </div>
            )}

            {signupSuccessNote && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>{signupSuccessNote}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name (As on official ID)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="student@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Create a password (min 6 characters)"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>
            </div>

            {/* Comprehensive State & District Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  State / Union Territory
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={state}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 cursor-pointer"
                  >
                    {statesList.map((st) => (
                      <option key={st} value={st} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  District
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 cursor-pointer"
                  >
                    {availableDistricts.map((dist) => (
                      <option key={dist} value={dist} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Competitive Examination
              </label>
              <select
                value={examTarget}
                onChange={(e) => setExamTarget(e.target.value as ExamTarget)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 cursor-pointer"
              >
                <option value="SSC CGL / CHSL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">SSC CGL / CHSL</option>
                <option value="Banking (IBPS / SBI PO & Clerk)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Banking (IBPS / SBI PO & Clerk)</option>
                <option value="Railways (RRB NTPC / Group D)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Railways (RRB NTPC / Group D)</option>
                <option value="State PSC (APPSC / TSPSC / UPPSC)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">State PSC (APPSC / TSPSC / UPPSC)</option>
                <option value="UPSC Civil Services" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">UPSC Civil Services</option>
                <option value="Police SI & Constable" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Police SI & Constable</option>
              </select>
            </div>

            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="dpdp"
                checked={dpdpConsent}
                onChange={(e) => setDpdpConsent(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 dark:border-slate-600 text-slate-900 dark:text-emerald-500 focus:ring-0"
              />
              <label htmlFor="dpdp" className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                I agree to DPDP 2023 compliance. My unique random Student ID will represent me on the All-India Leaderboard.
              </label>
            </div>

            <button
              type="submit"
              disabled={!dpdpConsent || isLoading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering with Firebase...</span>
                </>
              ) : (
                <>
                  <span>Register & Generate Random Student ID</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
