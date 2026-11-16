import { ExamTarget, SkillTier, UserProfile, UserRole } from '../types';

export interface GoogleAuthUserSeed {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  providerEmails?: Array<string | null | undefined>;
  isNewUser?: boolean;
}

export interface GoogleSignupContext {
  fullName?: string;
  phone?: string;
  state?: string;
  district?: string;
  examTarget?: ExamTarget;
  referralCode?: string | null;
  skillTier?: SkillTier;
}

export interface FormattedGoogleAuthError {
  code: string;
  message: string;
  canRetryRedirect: boolean;
  shouldSuggestNewTab: boolean;
  shouldShowConsoleHint: boolean;
}

export const BUILT_IN_LOCAL_ACCOUNT_UIDS = new Set<string>([
  'demo_user_001',
  'user_super_admin_01',
  'user_content_admin_02',
  'user_analyst_03',
  'user_ravi_01',
  'guest',
]);

export function isBuiltInLocalAccountUid(uid?: string | null): boolean {
  if (!uid) return true;
  return BUILT_IN_LOCAL_ACCOUNT_UIDS.has(uid);
}

/**
 * Generates a stable, deterministic 6-digit Student ID suffix from Firebase UID
 * as a collision-resistant fallback when a fresh random ID isn't persisted yet.
 */
export function deriveDeterministicStudentId(uid: string, year = 2026): string {
  const cleanUid = (uid || 'student').trim();
  let hash = 2166136261;
  for (let i = 0; i < cleanUid.length; i++) {
    hash ^= cleanUid.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const sixDigits = 100000 + (Math.abs(hash) % 900000);
  return `COC-${year}-${sixDigits}`;
}

export function extractGoogleEmail(seed: Pick<GoogleAuthUserSeed, 'email' | 'providerEmails'>): string {
  const primary = (seed.email || '').trim().toLowerCase();
  if (primary && primary.includes('@')) return primary;

  if (Array.isArray(seed.providerEmails)) {
    for (const candidate of seed.providerEmails) {
      const cleaned = (candidate || '').trim().toLowerCase();
      if (cleaned && cleaned.includes('@')) return cleaned;
    }
  }
  return '';
}

export function resolveFirebaseRoleFromEmail(
  email: string,
  emailVerified: boolean,
  existingRole?: UserRole
): UserRole {
  const normalized = email.trim().toLowerCase();
  if (emailVerified && normalized === 'ssuspect542@gmail.com') {
    return 'superAdmin';
  }
  if (existingRole && ['student', 'contentAdmin', 'analyst', 'superAdmin'].includes(existingRole)) {
    return existingRole;
  }
  return 'student';
}

export function sanitizeCandidateName(rawName: string | null | undefined, email: string): string {
  const candidate = (rawName || '').trim();
  if (candidate.length >= 2) {
    return candidate.slice(0, 120);
  }
  const emailPrefix = (email.split('@')[0] || '').replace(/[._-]+/g, ' ').trim();
  if (emailPrefix.length >= 2) {
    return emailPrefix.slice(0, 120);
  }
  return 'Student Candidate';
}

export function sanitizeStudentIdForRules(rawId: string | undefined, fallbackUid: string): string {
  const cleaned = (rawId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  if (cleaned.length > 0 && /^[a-zA-Z0-9_-]+$/.test(cleaned)) {
    return cleaned;
  }
  return deriveDeterministicStudentId(fallbackUid);
}

export function buildUserProfileFromGoogleAuth(params: {
  firebaseUser: GoogleAuthUserSeed;
  existingProfile?: UserProfile | null;
  cachedProfile?: UserProfile | null;
  signupContext?: GoogleSignupContext;
  generatedStudentId?: string;
}): {
  profile: UserProfile;
  isNewUser: boolean;
  profileNeedsJurisdictionReview: boolean;
} {
  const { firebaseUser, existingProfile, cachedProfile, signupContext, generatedStudentId } = params;
  const email = extractGoogleEmail(firebaseUser);
  const role = resolveFirebaseRoleFromEmail(email, firebaseUser.emailVerified, existingProfile?.role);

  if (existingProfile) {
    const updatedName = sanitizeCandidateName(existingProfile.fullName || firebaseUser.displayName, email);
    const mergedProfile: UserProfile = {
      ...existingProfile,
      uid: firebaseUser.uid,
      email: existingProfile.email || email,
      fullName: updatedName,
      role,
      referralCode: existingProfile.referralCode || existingProfile.studentId,
    };
    return {
      profile: mergedProfile,
      isNewUser: false,
      profileNeedsJurisdictionReview: !existingProfile.address?.district || !existingProfile.address?.state,
    };
  }

  const sameUidCache = cachedProfile && cachedProfile.uid === firebaseUser.uid ? cachedProfile : null;
  const stableStudentId = sanitizeStudentIdForRules(
    sameUidCache?.studentId || generatedStudentId || deriveDeterministicStudentId(firebaseUser.uid),
    firebaseUser.uid
  );

  const chosenState = (signupContext?.state || sameUidCache?.address?.state || 'Andhra Pradesh').trim() || 'Andhra Pradesh';
  const chosenDistrict = (signupContext?.district || sameUidCache?.address?.district || 'Visakhapatnam').trim() || 'Visakhapatnam';
  const chosenExam = signupContext?.examTarget || sameUidCache?.examTarget || 'SSC CGL / CHSL';
  const chosenPhone = (signupContext?.phone || sameUidCache?.phone || '').trim().slice(0, 24);
  const chosenName = sanitizeCandidateName(signupContext?.fullName || firebaseUser.displayName || sameUidCache?.fullName, email);
  const referredBy = (signupContext?.referralCode || sameUidCache?.referredBy || '').trim().slice(0, 64) || undefined;

  const isBrandNew = firebaseUser.isNewUser ?? !sameUidCache;

  const newProfile: UserProfile = {
    uid: firebaseUser.uid,
    studentId: stableStudentId,
    fullName: chosenName,
    email: email || `${firebaseUser.uid}@google-user.local`,
    phone: chosenPhone,
    address: {
      local: `${chosenDistrict}, ${chosenState}`,
      district: chosenDistrict,
      state: chosenState,
      country: 'India',
    },
    examTarget: chosenExam,
    language: sameUidCache?.language || 'en',
    profileComplete: true,
    role,
    createdAt: sameUidCache?.createdAt || new Date().toISOString(),
    dpdpConsent: true,
    referralCode: stableStudentId,
    referredBy,
    skillTier: signupContext?.skillTier || sameUidCache?.skillTier || 'Bronze',
    badges: sameUidCache?.badges,
    subscription: sameUidCache?.subscription || {
      isActive: true,
      plan: 'Pro Daily Pass',
      validUntil: '2026-12-31T23:59:59Z',
      consecutiveMissedDays: 0,
    },
  };

  return {
    profile: newProfile,
    isNewUser: isBrandNew,
    profileNeedsJurisdictionReview: !signupContext?.state && !sameUidCache,
  };
}

export function formatGoogleAuthError(
  err: unknown,
  context: { isEmbeddedIframe?: boolean; hostname?: string } = {}
): FormattedGoogleAuthError {
  const errObj = (err && typeof err === 'object' ? err : {}) as { code?: string; message?: string };
  const code = String(errObj.code || '');
  const rawMessage = err instanceof Error ? err.message : String(errObj.message || '');
  const isIframe = Boolean(context.isEmbeddedIframe);
  const hostname = context.hostname || 'this domain';

  switch (code) {
    case 'auth/popup-closed-by-user':
      return {
        code,
        message: 'Google sign-in popup was closed before completing. Click the Google button again when ready.',
        canRetryRedirect: false,
        shouldSuggestNewTab: false,
        shouldShowConsoleHint: false,
      };
    case 'auth/cancelled-popup-request':
      return {
        code,
        message: 'Previous Google sign-in popup request was cancelled. Please click again once to continue.',
        canRetryRedirect: false,
        shouldSuggestNewTab: false,
        shouldShowConsoleHint: false,
      };
    case 'auth/popup-blocked':
      return {
        code,
        message: isIframe
          ? 'Your browser blocked the Google sign-in popup inside the embedded preview. Allow popups for this site or open the app in a new tab to sign in with Google.'
          : 'Your browser blocked the Google sign-in popup. Allow popups for this site or use Redirect Sign-In below.',
        canRetryRedirect: !isIframe,
        shouldSuggestNewTab: isIframe,
        shouldShowConsoleHint: false,
      };
    case 'auth/unauthorized-domain':
      return {
        code,
        message: `Domain "${hostname}" is not yet authorized in Firebase Authentication. Add "${hostname}" under Firebase Console -> Authentication -> Settings -> Authorized domains.`,
        canRetryRedirect: false,
        shouldSuggestNewTab: false,
        shouldShowConsoleHint: true,
      };
    case 'auth/operation-not-allowed':
      return {
        code,
        message: 'Google Sign-In is disabled in the Firebase project. Enable the Google provider in Firebase Console -> Authentication -> Sign-in method.',
        canRetryRedirect: false,
        shouldSuggestNewTab: false,
        shouldShowConsoleHint: true,
      };
    case 'auth/account-exists-with-different-credential':
      return {
        code,
        message: 'An account already exists for this email using Email/Password login. Please sign in with your password below.',
        canRetryRedirect: false,
        shouldSuggestNewTab: false,
        shouldShowConsoleHint: false,
      };
    case 'auth/network-request-failed':
      return {
        code,
        message: 'Network error reaching Google Authentication. Check internet connectivity or disable strict popup/tracker blockers.',
        canRetryRedirect: false,
        shouldSuggestNewTab: false,
        shouldShowConsoleHint: false,
      };
    case 'auth/internal-error':
    case 'auth/web-storage-unsupported':
      return {
        code,
        message: isIframe
          ? 'Browser privacy settings restricted storage or popups inside the embedded preview. Open the app in a new tab to sign in with Google.'
          : 'Google sign-in encountered a browser storage or popup error. Please enable cookies/storage and retry.',
        canRetryRedirect: !isIframe,
        shouldSuggestNewTab: isIframe,
        shouldShowConsoleHint: false,
      };
    default:
      return {
        code: code || 'auth/unknown',
        message: rawMessage || 'Google sign-in failed. Please retry or sign in with Student ID / Email.',
        canRetryRedirect: false,
        shouldSuggestNewTab: false,
        shouldShowConsoleHint: false,
      };
  }
}
