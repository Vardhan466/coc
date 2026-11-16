import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildUserProfileFromGoogleAuth,
  deriveDeterministicStudentId,
  extractGoogleEmail,
  formatGoogleAuthError,
  isBuiltInLocalAccountUid,
  resolveFirebaseRoleFromEmail,
  sanitizeCandidateName,
  sanitizeStudentIdForRules,
} from './googleAuthHelpers';
import { UserProfile } from '../types';

test('deriveDeterministicStudentId generates stable COC-2026-XXXXXX format matching rules regex', () => {
  const id1 = deriveDeterministicStudentId('google_uid_abc123');
  const id2 = deriveDeterministicStudentId('google_uid_abc123');
  const idOther = deriveDeterministicStudentId('google_uid_xyz999');

  assert.equal(id1, id2);
  assert.notEqual(id1, idOther);
  assert.match(id1, /^COC-2026-\d{6}$/);
  assert.match(id1, /^[a-zA-Z0-9_-]+$/);
});

test('extractGoogleEmail falls back cleanly to providerData email', () => {
  assert.equal(
    extractGoogleEmail({ email: '  Student@Gmail.COM ', providerEmails: [] }),
    'student@gmail.com'
  );
  assert.equal(
    extractGoogleEmail({ email: null, providerEmails: [null, 'backup.user@gmail.com'] }),
    'backup.user@gmail.com'
  );
  assert.equal(extractGoogleEmail({ email: null, providerEmails: [] }), '');
});

test('resolveFirebaseRoleFromEmail grants superAdmin only when verified email matches', () => {
  assert.equal(resolveFirebaseRoleFromEmail('ssuspect542@gmail.com', true), 'superAdmin');
  assert.equal(resolveFirebaseRoleFromEmail('SSUSPECT542@GMAIL.COM', true), 'superAdmin');
  assert.equal(resolveFirebaseRoleFromEmail('ssuspect542@gmail.com', false), 'student');
  assert.equal(resolveFirebaseRoleFromEmail('candidate@gmail.com', true), 'student');
  assert.equal(resolveFirebaseRoleFromEmail('candidate@gmail.com', true, 'contentAdmin'), 'contentAdmin');
});

test('sanitizeCandidateName guarantees minimum 2 chars and <= 120 chars for Firestore rules', () => {
  assert.equal(sanitizeCandidateName('A', 'rahul.sharma@gmail.com'), 'rahul sharma');
  assert.equal(sanitizeCandidateName('', 'x@gmail.com'), 'Student Candidate');
  assert.equal(sanitizeCandidateName('  Priya Nair  ', 'p@gmail.com'), 'Priya Nair');
  assert.equal(sanitizeCandidateName('N'.repeat(200), 'n@gmail.com').length, 120);
});

test('buildUserProfileFromGoogleAuth creates new user profile with signup context and Student ID', () => {
  const { profile, isNewUser, profileNeedsJurisdictionReview } = buildUserProfileFromGoogleAuth({
    firebaseUser: {
      uid: 'uid_google_new_1',
      email: 'ananya.rao@gmail.com',
      emailVerified: true,
      displayName: 'Ananya Rao',
      isNewUser: true,
    },
    signupContext: {
      state: 'Telangana',
      district: 'Hyderabad',
      examTarget: 'State PSC (APPSC / TSPSC / UPPSC)',
      phone: '+91 98480 11223',
      referralCode: 'COC-2026-000123',
      skillTier: 'Silver',
    },
    generatedStudentId: 'COC-2026-774411',
  });

  assert.equal(isNewUser, true);
  assert.equal(profileNeedsJurisdictionReview, false);
  assert.equal(profile.uid, 'uid_google_new_1');
  assert.equal(profile.studentId, 'COC-2026-774411');
  assert.equal(profile.fullName, 'Ananya Rao');
  assert.equal(profile.address.state, 'Telangana');
  assert.equal(profile.address.district, 'Hyderabad');
  assert.equal(profile.examTarget, 'State PSC (APPSC / TSPSC / UPPSC)');
  assert.equal(profile.phone, '+91 98480 11223');
  assert.equal(profile.referredBy, 'COC-2026-000123');
  assert.equal(profile.skillTier, 'Silver');
  assert.equal(profile.role, 'student');
});

test('buildUserProfileFromGoogleAuth preserves existing Firestore user profile without overwriting studentId', () => {
  const existingProfile: UserProfile = {
    uid: 'uid_google_existing_2',
    studentId: 'COC-2026-445566',
    fullName: 'Vikram Singh',
    email: 'vikram@gmail.com',
    phone: '+91 99999 88888',
    address: {
      local: 'Jaipur, Rajasthan',
      district: 'Jaipur',
      state: 'Rajasthan',
      country: 'India',
    },
    examTarget: 'SSC CGL / CHSL',
    language: 'hi',
    profileComplete: true,
    role: 'student',
    createdAt: '2026-01-01T00:00:00.000Z',
    dpdpConsent: true,
    subscription: {
      isActive: true,
      plan: 'Pro Daily Pass',
      validUntil: '2026-12-31T23:59:59Z',
      consecutiveMissedDays: 0,
    },
  };

  const { profile, isNewUser } = buildUserProfileFromGoogleAuth({
    firebaseUser: {
      uid: 'uid_google_existing_2',
      email: 'vikram@gmail.com',
      emailVerified: true,
      displayName: 'Vikram S',
      isNewUser: false,
    },
    existingProfile,
    signupContext: {
      state: 'Maharashtra',
      district: 'Pune',
    },
    generatedStudentId: 'COC-2026-999999',
  });

  assert.equal(isNewUser, false);
  assert.equal(profile.studentId, 'COC-2026-445566');
  assert.equal(profile.address.state, 'Rajasthan');
  assert.equal(profile.address.district, 'Jaipur');
  assert.equal(profile.language, 'hi');
});

test('formatGoogleAuthError differentiates iframe popup-blocked, top-level popup-blocked, closed popup, and unauthorized-domain', () => {
  const iframeBlocked = formatGoogleAuthError(
    { code: 'auth/popup-blocked', message: 'Popup blocked' },
    { isEmbeddedIframe: true, hostname: 'example.run.app' }
  );
  assert.equal(iframeBlocked.shouldSuggestNewTab, true);
  assert.equal(iframeBlocked.canRetryRedirect, false);

  const topBlocked = formatGoogleAuthError(
    { code: 'auth/popup-blocked', message: 'Popup blocked' },
    { isEmbeddedIframe: false, hostname: 'example.run.app' }
  );
  assert.equal(topBlocked.canRetryRedirect, true);
  assert.equal(topBlocked.shouldSuggestNewTab, false);

  const domainErr = formatGoogleAuthError(
    { code: 'auth/unauthorized-domain', message: 'auth/unauthorized-domain' },
    { hostname: 'ais-dev-test.run.app' }
  );
  assert.equal(domainErr.shouldShowConsoleHint, true);
  assert.match(domainErr.message, /ais-dev-test\.run\.app/);

  const closedErr = formatGoogleAuthError({ code: 'auth/popup-closed-by-user' });
  assert.match(closedErr.message, /closed before completing/i);
});

test('isBuiltInLocalAccountUid and sanitizeStudentIdForRules handle IDs safely', () => {
  assert.equal(isBuiltInLocalAccountUid('demo_user_001'), true);
  assert.equal(isBuiltInLocalAccountUid('user_super_admin_01'), true);
  assert.equal(isBuiltInLocalAccountUid('abcFirebaseUid987'), false);
  assert.equal(sanitizeStudentIdForRules('COC 2026!@#', 'uid1'), 'COC_2026___');
  assert.match(sanitizeStudentIdForRules('', 'uid1'), /^COC-2026-\d{6}$/);
});
