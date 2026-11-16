import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  User as FirebaseUser,
  UserCredential,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  collection,
  query,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  UserProfile,
  Attempt,
  UserRole,
  StudentProgressStats,
  TestPaper,
  PreviousYearPaper,
  DailyKeySheet,
  AuditLogEntry,
  SpeedPracticeSessionRecord,
} from '../types';
import { generateRandomStudentId } from './scoring';
import { toPublicLeaderboardEntry } from './dailyLeaderboard';
import {
  buildUserProfileFromGoogleAuth,
  formatGoogleAuthError,
  GoogleSignupContext,
  sanitizeCandidateName,
  sanitizeStudentIdForRules,
} from './googleAuthHelpers';

export interface FirebaseAuthResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
  errorCode?: string;
  isNewUser?: boolean;
  profileNeedsJurisdictionReview?: boolean;
  canRetryRedirect?: boolean;
  shouldSuggestNewTab?: boolean;
  shouldShowConsoleHint?: boolean;
  cloudSyncWarning?: string;
  isProviderDisabled?: boolean;
  requiresEmailVerification?: boolean;
}

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string' && val.length > 0) {
    return val;
  }
  return new Date().toISOString();
}

function canWriteCloud(): boolean {
  return Boolean(auth.currentUser && auth.currentUser.emailVerified);
}

/**
 * Sync user profile to Firestore (/users/{userId}) obeying strict schema,
 * request.time timestamps, and verified identity rules.
 */
export async function syncUserProfileToFirestore(
  profile: UserProfile,
  extraFields?: { dailyStreak?: number; streakFreezes?: number }
): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified || auth.currentUser.uid !== profile.uid) {
    return;
  }

  const path = `users/${profile.uid}`;
  try {
    const userRef = doc(db, 'users', profile.uid);
    const existingSnap = await getDoc(userRef);

    const safeName = sanitizeCandidateName(profile.fullName, profile.email || '');
    const safeState = (profile.address?.state || '').trim() || 'Andhra Pradesh';
    const safeDistrict = (profile.address?.district || '').trim() || 'Visakhapatnam';
    const safeStudentId = sanitizeStudentIdForRules(profile.studentId, profile.uid);
    const safeEmail = (profile.email || auth.currentUser.email || `${profile.uid}@google-user.local`).trim().toLowerCase().slice(0, 128);

    const mutableFields: Record<string, unknown> = {
      name: safeName,
      phone: (profile.phone || '').slice(0, 24),
      state: safeState.slice(0, 80),
      district: safeDistrict.slice(0, 80),
      targetExam: (profile.examTarget || 'SSC CGL / CHSL').slice(0, 80),
      batch: (profile.subscription?.plan || 'Pro Daily Pass').slice(0, 80),
      updatedAt: serverTimestamp(),
    };

    if (typeof extraFields?.dailyStreak === 'number') {
      mutableFields.dailyStreak = Math.max(0, Math.min(3650, extraFields.dailyStreak));
    }
    if (typeof extraFields?.streakFreezes === 'number') {
      mutableFields.streakFreezes = Math.max(0, Math.min(10, extraFields.streakFreezes));
    }
    if (profile.skillTier) {
      mutableFields.skillTier = profile.skillTier;
    }
    if (profile.referralCode) {
      mutableFields.referralCode = profile.referralCode.slice(0, 64);
    }
    if (profile.referredBy) {
      mutableFields.referredBy = profile.referredBy.slice(0, 64);
    }
    if (Array.isArray(profile.badges)) {
      mutableFields.badges = profile.badges
        .filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
        .slice(0, 25);
    }

    if (existingSnap.exists()) {
      await updateDoc(userRef, mutableFields);
    } else {
      const tokenEmail = (auth.currentUser.email || safeEmail).trim().toLowerCase();
      const normalizedRole =
        auth.currentUser.emailVerified && tokenEmail === 'ssuspect542@gmail.com'
          ? 'superAdmin'
          : 'student';
      await setDoc(userRef, {
        id: profile.uid,
        studentId: safeStudentId,
        email: safeEmail,
        role: normalizedRole,
        createdAt: serverTimestamp(),
        ...mutableFields,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetch user profile from Firestore
 */
export async function getUserProfileFromFirestore(userId: string): Promise<UserProfile | null> {
  if (!auth.currentUser) return null;
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return null;

    const data = snap.data();
    return {
      uid: data.id || userId,
      studentId: data.studentId || 'COC-2026-00001',
      fullName: data.name || 'Student Candidate',
      email: data.email || '',
      phone: data.phone || '',
      address: {
        local: `${data.district || ''}, ${data.state || ''}`,
        district: data.district || '',
        state: data.state || 'Andhra Pradesh',
        country: 'India',
      },
      examTarget: data.targetExam || 'SSC CGL / CHSL',
      language: 'en',
      profileComplete: true,
      role: (data.role as UserRole) || 'student',
      createdAt: toIsoString(data.createdAt),
      dpdpConsent: true,
      referralCode: data.referralCode,
      referredBy: data.referredBy,
      skillTier: data.skillTier,
      badges: Array.isArray(data.badges) ? data.badges : undefined,
      subscription: {
        isActive: true,
        plan: 'Pro Daily Pass',
        validUntil: '2026-12-31T23:59:59Z',
        consecutiveMissedDays: 0,
      },
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Sign up with Email and Password
 */
export async function signUpWithFirebase(
  email: string,
  pass: string,
  extra: {
    fullName: string;
    phone: string;
    state: string;
    district: string;
    examTarget: any;
  }
): Promise<FirebaseAuthResult> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const uid = cred.user.uid;
    const assignedStudentId = generateRandomStudentId(2026);

    const newProfile: UserProfile = {
      uid,
      studentId: assignedStudentId,
      fullName: extra.fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: extra.phone.trim(),
      address: {
        local: `${extra.district}, ${extra.state}`,
        district: extra.district,
        state: extra.state,
        country: 'India',
      },
      examTarget: extra.examTarget,
      language: 'en',
      profileComplete: true,
      role: 'student',
      createdAt: new Date().toISOString(),
      dpdpConsent: true,
      subscription: {
        isActive: true,
        plan: 'Pro Daily Pass',
        validUntil: '2026-12-31T23:59:59Z',
        consecutiveMissedDays: 0,
      },
    };

    if (!cred.user.emailVerified) {
      try {
        await sendEmailVerification(cred.user);
      } catch {
        // Non-fatal if mail rate-limited
      }
      return {
        success: true,
        user: newProfile,
        requiresEmailVerification: true,
      };
    }

    await syncUserProfileToFirestore(newProfile);

    return {
      success: true,
      user: newProfile,
      requiresEmailVerification: false,
    };
  } catch (err: any) {
    const code = err?.code || '';
    if (code === 'auth/operation-not-allowed') {
      return {
        success: false,
        isProviderDisabled: true,
        error:
          'Firebase Email/Password provider is not yet enabled in the Firebase Console. Use Google Sign-In below or enable Email/Password in Firebase Console.',
      };
    }
    if (code === 'auth/email-already-in-use') {
      return {
        success: false,
        error: 'An account with this email address already exists. Please sign in.',
      };
    }
    if (code === 'auth/weak-password') {
      return {
        success: false,
        error: 'Password should be at least 6 characters long.',
      };
    }
    return {
      success: false,
      error: err?.message || 'Firebase sign-up failed. Please check credentials.',
    };
  }
}

/**
 * Sign In with Email & Password
 */
export async function signInWithFirebase(email: string, pass: string): Promise<FirebaseAuthResult> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const uid = cred.user.uid;
    const isVerified = cred.user.emailVerified;

    let existingProfile: UserProfile | null = null;
    try {
      existingProfile = await getUserProfileFromFirestore(uid);
    } catch {
      existingProfile = null;
    }

    let profile: UserProfile;
    if (existingProfile) {
      profile = existingProfile;
    } else {
      const normalizedEmail = email.trim().toLowerCase();
      profile = {
        uid,
        studentId: generateRandomStudentId(2026),
        fullName: cred.user.displayName || email.split('@')[0],
        email: normalizedEmail,
        phone: '',
        address: {
          local: 'Visakhapatnam, Andhra Pradesh',
          district: 'Visakhapatnam',
          state: 'Andhra Pradesh',
          country: 'India',
        },
        examTarget: 'SSC CGL / CHSL',
        language: 'en',
        profileComplete: true,
        role: isVerified && normalizedEmail === 'ssuspect542@gmail.com' ? 'superAdmin' : 'student',
        createdAt: new Date().toISOString(),
        dpdpConsent: true,
        subscription: {
          isActive: true,
          plan: 'Pro Daily Pass',
          validUntil: '2026-12-31T23:59:59Z',
          consecutiveMissedDays: 0,
        },
      };
      if (isVerified) {
        await syncUserProfileToFirestore(profile);
      }
    }

    return {
      success: true,
      user: profile,
      requiresEmailVerification: !isVerified,
    };
  } catch (err: any) {
    const code = err?.code || '';
    if (code === 'auth/operation-not-allowed') {
      return {
        success: false,
        isProviderDisabled: true,
        error:
          'Firebase Email/Password provider is not enabled in Firebase Console. Please enable Email/Password or use Google Sign-In below.',
      };
    }
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return {
        success: false,
        error: 'Invalid email or password. Please verify and try again.',
      };
    }
    return {
      success: false,
      error: err?.message || 'Firebase sign-in failed.',
    };
  }
}

function isInEmbeddedIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function readCachedUserProfileForUid(uid: string): UserProfile | null {
  try {
    const raw = localStorage.getItem('coc_auth_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    return parsed?.uid === uid ? parsed : null;
  } catch {
    return null;
  }
}

function createGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

const PENDING_GOOGLE_SIGNUP_CONTEXT_KEY = 'coc_pending_google_signup_ctx';

export function savePendingGoogleSignupContext(ctx?: GoogleSignupContext): void {
  try {
    if (!ctx) {
      sessionStorage.removeItem(PENDING_GOOGLE_SIGNUP_CONTEXT_KEY);
      return;
    }
    sessionStorage.setItem(PENDING_GOOGLE_SIGNUP_CONTEXT_KEY, JSON.stringify(ctx));
  } catch {}
}

function consumePendingGoogleSignupContext(): GoogleSignupContext | undefined {
  try {
    const raw = sessionStorage.getItem(PENDING_GOOGLE_SIGNUP_CONTEXT_KEY);
    if (!raw) return undefined;
    sessionStorage.removeItem(PENDING_GOOGLE_SIGNUP_CONTEXT_KEY);
    return JSON.parse(raw) as GoogleSignupContext;
  } catch {
    return undefined;
  }
}

async function finalizeGoogleUser(
  fbUser: FirebaseUser,
  isProviderNewUser?: boolean,
  signupContext?: GoogleSignupContext
): Promise<FirebaseAuthResult> {
  const uid = fbUser.uid;
  let existingProfile: UserProfile | null = null;
  let cloudSyncWarning: string | undefined;

  try {
    existingProfile = await getUserProfileFromFirestore(uid);
  } catch (err) {
    console.warn('Firestore profile lookup fallback during Google auth:', err);
    existingProfile = null;
  }

  const cachedProfile = readCachedUserProfileForUid(uid);
  const { profile, isNewUser, profileNeedsJurisdictionReview } = buildUserProfileFromGoogleAuth({
    firebaseUser: {
      uid: fbUser.uid,
      email: fbUser.email,
      emailVerified: fbUser.emailVerified,
      displayName: fbUser.displayName,
      providerEmails: fbUser.providerData?.map((p) => p.email) || [],
      isNewUser: isProviderNewUser,
    },
    existingProfile,
    cachedProfile,
    signupContext,
    generatedStudentId: generateRandomStudentId(2026),
  });

  if (!existingProfile || isNewUser) {
    try {
      await syncUserProfileToFirestore(profile);
    } catch (syncErr) {
      cloudSyncWarning =
        syncErr instanceof Error
          ? 'Google account authenticated, but Firestore profile sync will retry shortly.'
          : undefined;
      console.warn('Google profile initial sync deferred:', syncErr);
    }
  }

  return {
    success: true,
    user: profile,
    isNewUser,
    profileNeedsJurisdictionReview,
    cloudSyncWarning,
    requiresEmailVerification: false,
  };
}

function buildGoogleAuthErrorResult(err: unknown): FirebaseAuthResult {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const formatted = formatGoogleAuthError(err, {
    isEmbeddedIframe: isInEmbeddedIframe(),
    hostname,
  });

  return {
    success: false,
    error: formatted.message,
    errorCode: formatted.code,
    canRetryRedirect: formatted.canRetryRedirect,
    shouldSuggestNewTab: formatted.shouldSuggestNewTab,
    shouldShowConsoleHint: formatted.shouldShowConsoleHint,
    isProviderDisabled: formatted.code === 'auth/operation-not-allowed',
  };
}

let interactiveAuthDepth = 0;
let interactiveAuthHold = false;

export function setInteractiveAuthHold(active: boolean): void {
  interactiveAuthHold = active;
}

export function isInteractiveFirebaseAuthActive(): boolean {
  return interactiveAuthDepth > 0 || interactiveAuthHold;
}

/**
 * Sign in or Sign up with Google via Firebase Auth Popup (primary flow for AI Studio & web browsers).
 */
export async function signInWithFirebaseGoogle(
  signupContext?: GoogleSignupContext
): Promise<FirebaseAuthResult> {
  interactiveAuthDepth += 1;
  try {
    const provider = createGoogleProvider();
    const cred: UserCredential = await signInWithPopup(auth, provider);
    const additionalInfo = getAdditionalUserInfo(cred);
    return await finalizeGoogleUser(cred.user, additionalInfo?.isNewUser, signupContext);
  } catch (err) {
    return buildGoogleAuthErrorResult(err);
  } finally {
    interactiveAuthDepth = Math.max(0, interactiveAuthDepth - 1);
  }
}

/**
 * Optional redirect initiation when top-level browser blocks popups.
 */
export async function signInWithFirebaseGoogleRedirect(
  signupContext?: GoogleSignupContext
): Promise<FirebaseAuthResult> {
  try {
    savePendingGoogleSignupContext(signupContext);
    const provider = createGoogleProvider();
    await signInWithRedirect(auth, provider);
    return { success: true };
  } catch (err) {
    savePendingGoogleSignupContext(undefined);
    return buildGoogleAuthErrorResult(err);
  }
}

/**
 * Resolves any completed Google OAuth redirect result on app boot.
 */
export async function completeGoogleRedirectSignIn(): Promise<FirebaseAuthResult | null> {
  interactiveAuthDepth += 1;
  try {
    const cred = await getRedirectResult(auth);
    if (!cred) return null;
    const savedContext = consumePendingGoogleSignupContext();
    const additionalInfo = getAdditionalUserInfo(cred);
    return await finalizeGoogleUser(cred.user, additionalInfo?.isNewUser, savedContext);
  } catch (err) {
    return buildGoogleAuthErrorResult(err);
  } finally {
    interactiveAuthDepth = Math.max(0, interactiveAuthDepth - 1);
  }
}

/**
 * Hydrates or recovers UserProfile for an active Firebase authenticated session on reload.
 */
export async function hydrateProfileForSignedInFirebaseUser(
  fbUser: FirebaseUser
): Promise<UserProfile | null> {
  const result = await finalizeGoogleUser(fbUser, false, undefined);
  return result.user || null;
}

/**
 * Save immutable exam attempt record to /users/{userId}/attempts/{attemptId}
 */
export async function saveAttemptToFirestore(userId: string, attempt: Attempt): Promise<void> {
  if (!canWriteCloud() || auth.currentUser?.uid !== userId) return;
  const rawId = attempt.id || attempt.attemptId || `att_${Date.now()}`;
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128) || `att_${Date.now()}`;
  const safeStudentId =
    (attempt.studentId || 'COC_STUDENT').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'COC_STUDENT';
  const safeTestId =
    (attempt.testId || 'daily_test').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'daily_test';
  const path = `users/${userId}/attempts/${safeId}`;
  try {
    await setDoc(doc(db, path), {
      id: safeId,
      userId,
      studentId: safeStudentId,
      studentName: (attempt.studentName || '').trim().slice(0, 120) || 'Student',
      studentState: (attempt.studentState || '').trim().slice(0, 80) || 'India',
      testId: safeTestId,
      score: attempt.score,
      correctCount: attempt.correctCount,
      incorrectCount: attempt.incorrectCount,
      unattemptedCount: attempt.unattemptedCount,
      timeTakenSeconds: Math.max(0, Math.min(7200, Math.round(attempt.timeTakenSeconds || 0))),
      submittedAt: serverTimestamp(),
      isDisqualified: !!attempt.isDisqualified,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Sync student dynamic progress summary (/users/{userId}/progress/summary)
 */
export async function syncUserProgressToFirestore(
  userId: string,
  progress: StudentProgressStats
): Promise<void> {
  if (!canWriteCloud() || auth.currentUser?.uid !== userId) return;
  const path = `users/${userId}/progress/summary`;
  try {
    const progressRef = doc(db, path);
    const snap = await getDoc(progressRef);
    const payload = {
      userId,
      testsTaken: progress.testsTaken,
      averageScore: progress.averageScore,
      highestScore: progress.highestScore,
      overallAccuracy: progress.overallAccuracy,
      bestRank: progress.bestRank,
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak ?? progress.currentStreak,
      streakFreezesAvailable: progress.streakFreezesAvailable ?? 1,
      streakFreezesUsed: progress.streakFreezesUsed ?? 0,
      frozenDates: (progress.frozenDates || []).slice(-90),
      claimedMilestones: (progress.claimedMilestones || []).slice(0, 20),
      ...(progress.lastActivityDate ? { lastActivityDate: progress.lastActivityDate.slice(0, 20) } : {}),
      ...(progress.lastFreezeConsumedDate
        ? { lastFreezeConsumedDate: progress.lastFreezeConsumedDate.slice(0, 20) }
        : {}),
      skillTier: progress.skillTier || 'Bronze',
      xpPoints: progress.xpPoints ?? 0,
      proAnalyticsUnlocked: !!progress.proAnalyticsUnlocked,
      referralsCount: progress.referralsCount ?? 0,
      badges: (progress.badges || []).slice(0, 30),
      marksLostToNegatives: progress.marksLostToNegatives ?? 0,
      rapidMistakesCount: progress.rapidMistakesCount ?? 0,
      subjectPerformance: (progress.subjectPerformance || []).slice(0, 10),
      weakestTopics: (progress.weakestTopics || []).slice(0, 20),
      recentAttempts: (progress.recentAttempts || []).slice(-35),
      rolling30DayHistory: (progress.rolling30DayHistory || []).slice(-35),
      updatedAt: serverTimestamp(),
    };

    if (snap.exists()) {
      const { userId: _uid, ...updatePayload } = payload;
      await updateDoc(progressRef, updatePayload);
    } else {
      await setDoc(progressRef, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getUserProgressFromFirestore(userId: string): Promise<StudentProgressStats | null> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return null;
  const path = `users/${userId}/progress/summary`;
  try {
    const snap = await getDoc(doc(db, path));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      testsTaken: Number(data.testsTaken || 0),
      averageScore: Number(data.averageScore || 0),
      highestScore: Number(data.highestScore || 0),
      overallAccuracy: Number(data.overallAccuracy || 0),
      bestRank: Number(data.bestRank || 0),
      currentStreak: Number(data.currentStreak || 0),
      longestStreak: Number(data.longestStreak || 0),
      streakFreezesAvailable: Number(data.streakFreezesAvailable ?? 1),
      streakFreezesUsed: Number(data.streakFreezesUsed ?? 0),
      frozenDates: Array.isArray(data.frozenDates) ? data.frozenDates : [],
      claimedMilestones: Array.isArray(data.claimedMilestones) ? data.claimedMilestones : [],
      lastActivityDate: data.lastActivityDate,
      lastFreezeConsumedDate: data.lastFreezeConsumedDate,
      skillTier: data.skillTier || 'Bronze',
      xpPoints: Number(data.xpPoints || 0),
      proAnalyticsUnlocked: Boolean(data.proAnalyticsUnlocked),
      referralsCount: Number(data.referralsCount || 0),
      badges: Array.isArray(data.badges) ? data.badges : [],
      marksLostToNegatives: Number(data.marksLostToNegatives || 0),
      rapidMistakesCount: Number(data.rapidMistakesCount || 0),
      subjectPerformance: Array.isArray(data.subjectPerformance) ? data.subjectPerformance : [],
      weakestTopics: Array.isArray(data.weakestTopics) ? data.weakestTopics : [],
      recentAttempts: Array.isArray(data.recentAttempts) ? data.recentAttempts : [],
      rolling30DayHistory: Array.isArray(data.rolling30DayHistory) ? data.rolling30DayHistory : [],
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Publish PII-free entry to /daily_exams/{examDate}/leaderboard/{studentId}
 */
export async function publishLeaderboardEntry(
  examDate: string,
  attempt: Attempt,
  skillTier?: string
): Promise<void> {
  if (!canWriteCloud() || !auth.currentUser) return;
  const safeStudentId = attempt.studentId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  const path = `daily_exams/${examDate}/leaderboard/${safeStudentId}`;
  const pub = toPublicLeaderboardEntry(attempt);
  try {
    const ref = doc(db, path);
    const snap = await getDoc(ref);
    const payload = {
      id: pub.id,
      userId: auth.currentUser.uid,
      studentId: safeStudentId,
      studentName: pub.studentName.slice(0, 120),
      studentState: (pub.studentState || 'India').slice(0, 80),
      testId: pub.testId.slice(0, 64),
      score: pub.score,
      correctCount: pub.correctCount,
      incorrectCount: pub.incorrectCount,
      unattemptedCount: pub.unattemptedCount,
      timeTakenSeconds: Math.max(0, Math.min(7200, Math.round(pub.timeTakenSeconds))),
      ...(skillTier ? { skillTier } : pub.skillTier ? { skillTier: pub.skillTier } : {}),
      isDisqualified: !!pub.isDisqualified,
      submittedAt: serverTimestamp(),
    };

    if (snap.exists()) {
      await updateDoc(ref, {
        studentName: payload.studentName,
        studentState: payload.studentState,
        score: payload.score,
        correctCount: payload.correctCount,
        incorrectCount: payload.incorrectCount,
        unattemptedCount: payload.unattemptedCount,
        timeTakenSeconds: payload.timeTakenSeconds,
        ...(payload.skillTier ? { skillTier: payload.skillTier } : {}),
        isDisqualified: payload.isDisqualified,
        submittedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Live listener on /daily_exams/{examDate}/leaderboard (signed-in only)
 */
export function subscribeToDailyLeaderboard(
  examDate: string,
  onData: (attempts: Attempt[]) => void,
  onError?: (err: unknown) => void
): () => void {
  if (!auth.currentUser) return () => {};
  const path = `daily_exams/${examDate}/leaderboard`;
  const q = query(collection(db, path), limit(250));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Attempt[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: data.id || d.id,
          studentId: data.studentId,
          studentName: data.studentName,
          studentState: data.studentState || 'India',
          testId: data.testId || `test-${examDate}`,
          score: Number(data.score || 0),
          correctCount: Number(data.correctCount || 0),
          incorrectCount: Number(data.incorrectCount || 0),
          unattemptedCount: Number(data.unattemptedCount || 0),
          timeTakenSeconds: Number(data.timeTakenSeconds || 0),
          submittedAt: toIsoString(data.submittedAt),
          isDisqualified: Boolean(data.isDisqualified),
          skillTier: data.skillTier,
          answers: [],
        };
      });
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      else handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

/**
 * Scheduled Tests Firestore Sync
 */
export function subscribeToScheduledTests(
  onData: (tests: TestPaper[]) => void,
  onError?: (err: unknown) => void
): () => void {
  if (!auth.currentUser) return () => {};
  const path = 'scheduled_tests';
  const q = query(collection(db, path), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: TestPaper[] = snapshot.docs.map((d) => {
        const data = d.data();
        const qs = Array.isArray(data.questions) ? data.questions : [];
        const rawStatus = String(data.status || 'scheduled');
        const mappedStatus = (rawStatus === 'published' ? 'results_published' : rawStatus) as TestPaper['status'];
        const isDaily = data.testType === 'daily';
        return {
          id: data.id || d.id,
          testCode: isDaily ? 'COC-DAILY-7PM' : `COC-SCHED-${String(data.id || d.id).slice(-4).toUpperCase()}`,
          title: data.title || 'Scheduled Test',
          description: data.description || '',
          date: data.scheduledDate || '2026-11-10',
          windowStart: data.scheduledStartTime || (isDaily ? '19:00' : '20:30'),
          windowEnd: data.scheduledEndTime || (isDaily ? '19:15' : '21:00'),
          answerKeyReleaseTime: '20:00',
          totalQuestions: qs.length > 0 ? qs.length : 30,
          totalDurationSeconds: Number(data.durationSeconds || Math.max(10, (qs.length || 30) * 10)),
          questionDurationSeconds: 10,
          status: mappedStatus,
          questions: qs,
          lockedForEditing: rawStatus === 'live' || rawStatus === 'closed' || rawStatus === 'published',
          totalSubscribers: 0,
          dataSource: 'firestore',
          isCustomScheduled: !isDaily,
          scheduledDate: data.scheduledDate,
          scheduledStartTime: data.scheduledStartTime,
          scheduledEndTime: data.scheduledEndTime,
          windowMinutes: 30,
        };
      });
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      else handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveScheduledTestToFirestore(test: TestPaper, actorUid: string): Promise<void> {
  if (!canWriteCloud()) return;
  const safeId = test.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || `sched_${Date.now()}`;
  const path = `scheduled_tests/${safeId}`;
  try {
    const ref = doc(db, path);
    const snap = await getDoc(ref);
    const ruleStatus = test.status === 'results_published' ? 'published' : test.status || 'scheduled';
    const mutablePayload = {
      title: (test.title || 'Scheduled Test').slice(0, 160),
      ...(test.description ? { description: test.description.slice(0, 500) } : {}),
      testType: test.isCustomScheduled === false ? 'daily' : 'custom',
      scheduledDate: test.scheduledDate || test.date,
      ...(test.scheduledStartTime || test.windowStart
        ? { scheduledStartTime: (test.scheduledStartTime || test.windowStart).slice(0, 12) }
        : {}),
      ...(test.scheduledEndTime || test.windowEnd
        ? { scheduledEndTime: (test.scheduledEndTime || test.windowEnd).slice(0, 12) }
        : {}),
      durationSeconds: Math.max(10, Math.min(7200, test.totalDurationSeconds || 300)),
      status: ruleStatus,
      questions: (test.questions || []).slice(0, 200),
      updatedAt: serverTimestamp(),
    };
    if (snap.exists()) {
      await updateDoc(ref, mutablePayload);
    } else {
      await setDoc(ref, {
        id: safeId,
        createdBy: actorUid.slice(0, 128),
        ...mutablePayload,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteScheduledTestFromFirestore(testId: string): Promise<void> {
  if (!canWriteCloud()) return;
  const safeId = testId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  const path = `scheduled_tests/${safeId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Previous Year Question Papers (PQP) Archive Firestore Sync
 */
export function subscribeToPQPs(
  onData: (pqps: PreviousYearPaper[]) => void,
  onError?: (err: unknown) => void
): () => void {
  if (!auth.currentUser) return () => {};
  const path = 'pqps';
  const q = query(collection(db, path), limit(100));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: PreviousYearPaper[] = snapshot.docs.map((d) => {
        const data = d.data();
        const qs = Array.isArray(data.questions) ? data.questions : [];
        return {
          id: data.id || d.id,
          title: data.title || 'Previous Year Paper',
          examBoard: data.examCategory || 'SSC CGL',
          year: Number(data.year || 2024),
          shiftLabel: data.shiftLabel,
          questions: qs,
          totalQuestions: qs.length,
          totalDurationSeconds: Number(data.durationSeconds || Math.max(10, qs.length * 10 || 300)),
          uploadedAt: toIsoString(data.uploadedAt),
          uploadedBy: data.uploadedBy,
        };
      });
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      else handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function savePQPToFirestore(pqp: PreviousYearPaper, actorUid: string): Promise<void> {
  if (!canWriteCloud() || !pqp.questions || pqp.questions.length === 0) return;
  const safeId = pqp.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || `pqp_${Date.now()}`;
  const path = `pqps/${safeId}`;
  try {
    const ref = doc(db, path);
    const snap = await getDoc(ref);
    const mutablePayload = {
      title: (pqp.title || 'Previous Year Paper').slice(0, 160),
      examCategory: (pqp.examBoard || 'SSC CGL').slice(0, 80),
      year: Math.max(1990, Math.min(2100, Number(pqp.year || 2024))),
      ...(pqp.shiftLabel ? { shiftLabel: pqp.shiftLabel.slice(0, 60) } : {}),
      durationSeconds: Math.max(
        10,
        Math.min(7200, pqp.totalDurationSeconds || pqp.questions.length * 10 || 300)
      ),
      questions: pqp.questions.slice(0, 200),
      uploadedAt: serverTimestamp(),
    };
    if (snap.exists()) {
      await updateDoc(ref, mutablePayload);
    } else {
      await setDoc(ref, {
        id: safeId,
        uploadedBy: actorUid.slice(0, 128),
        ...mutablePayload,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePQPFromFirestore(pqpId: string): Promise<void> {
  if (!canWriteCloud()) return;
  const safeId = pqpId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  const path = `pqps/${safeId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Post-8 PM Answer Key Sheet Firestore Sync (Gated by rule unlockTimestampMs)
 */
export async function saveKeySheetToFirestore(
  examDate: string,
  keySheet: DailyKeySheet,
  unlockTimestampMs: number,
  actorUid: string
): Promise<void> {
  if (!canWriteCloud()) return;
  const path = `key_sheets/${examDate}`;
  try {
    const ref = doc(db, path);
    const snap = await getDoc(ref);
    const mutablePayload = {
      title: (keySheet.title || `Daily Key Sheet ${examDate}`).slice(0, 160),
      unlockTimestampMs,
      items: (keySheet.entries || []).slice(0, 200),
      publishedBy: actorUid.slice(0, 128),
      updatedAt: serverTimestamp(),
    };
    if (snap.exists()) {
      await updateDoc(ref, mutablePayload);
    } else {
      await setDoc(ref, {
        examDate,
        ...mutablePayload,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getKeySheetFromFirestore(examDate: string): Promise<DailyKeySheet | null> {
  if (!auth.currentUser) return null;
  const path = `key_sheets/${examDate}`;
  try {
    const snap = await getDoc(doc(db, path));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: data.examDate || examDate,
      date: data.examDate || examDate,
      title: data.title,
      publishedAt: toIsoString(data.updatedAt),
      entries: Array.isArray(data.items) ? data.items : [],
      unlockTime: '20:00',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Immutable Audit Log Write
 */
export async function writeAuditLogToFirestore(log: AuditLogEntry): Promise<void> {
  if (!canWriteCloud() || !auth.currentUser) return;
  const safeId = (log.id || `log_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  const path = `audit_logs/${safeId}`;
  try {
    await setDoc(doc(db, path), {
      id: safeId,
      actorUid: auth.currentUser.uid,
      eventType: (log.adminRole || 'student').slice(0, 64),
      action: (log.action || 'EVENT').slice(0, 120),
      details: (log.details || '').slice(0, 500),
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Persist non-ranking Speed Practice session summary to /users/{userId}/speed_practice/{sessionId}
 * Strictly obeys firestore.rules allowlist (no questionIds or missedQuestionIds arrays).
 */
export async function saveSpeedPracticeSessionToFirestore(
  userId: string,
  session: SpeedPracticeSessionRecord
): Promise<void> {
  if (!canWriteCloud() || !auth.currentUser || auth.currentUser.uid !== userId) return;
  const rawId = session.id || `sp_${Date.now()}`;
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128) || `sp_${Date.now()}`;
  const path = `users/${userId}/speed_practice/${safeId}`;
  try {
    await setDoc(doc(db, path), {
      id: safeId,
      userId,
      examCategory: (session.examCategory || 'all').slice(0, 80),
      subject: (session.subject || 'all').slice(0, 80),
      difficulty: session.difficulty || 'all',
      poolFilter: session.poolFilter || 'all',
      totalQuestions: Math.max(1, Math.min(200, Math.round(session.totalQuestions))),
      correctCount: Math.max(0, Math.min(200, Math.round(session.correctCount))),
      incorrectCount: Math.max(0, Math.min(200, Math.round(session.incorrectCount))),
      accuracy: Math.max(0, Math.min(100, Number(session.accuracy || 0))),
      avgTimePerQuestionSec: Math.max(0, Math.min(600, Number(session.avgTimePerQuestionSec || 0))),
      completedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Sign out of Firebase
 */
export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (e) {
    console.error('Error signing out', e);
  }
}

/**
 * Listen to Auth State Changed
 */
export function subscribeToAuthChanges(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
