import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesContent = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
const blueprint = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'firebase-blueprint.json'), 'utf8'));

test('firestore.rules starts cleanly with rules_version = 2 and default deny catch-all', () => {
  assert.match(rulesContent, /rules_version\s*=\s*'2'/);
  assert.match(rulesContent, /match\s*\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;/);
});

test('all blueprint collections have explicit match blocks in firestore.rules', () => {
  const expectedMatches = [
    '/users/{userId}',
    '/attempts/{attemptId}',
    '/progress/{progressId}',
    '/daily_exams/{examDate}/leaderboard/{studentId}',
    '/scheduled_tests/{testId}',
    '/pqps/{pqpId}',
    '/key_sheets/{examDate}',
    '/audit_logs/{logId}',
    '/admins/{uid}',
    '/test/{docId}',
    '/speed_practice/{sessionId}',
    '/study_plan_overrides/{dayKey}',
    '/ai_question_vault/{questionId}',
    '/app_settings/{settingId}',
    '/ai_usage_logs/{logId}',
  ];

  for (const m of expectedMatches) {
    assert.ok(rulesContent.includes(`match ${m}`), `Missing match block for ${m}`);
  }

  assert.ok(blueprint.firestore['/users/{userId}']);
  assert.ok(blueprint.firestore['/key_sheets/{examDate}']);
  assert.ok(blueprint.firestore['/ai_question_vault/{questionId}']);
  assert.ok(blueprint.firestore['/study_plan_overrides/{dayKey}']);
});

test('Dirty Dozen #1 & #2: PII isolation on /users and verified email enforcement on SuperAdmin', () => {
  // Forbids blanket list by signed-in students
  assert.equal(/allow\s+list:\s*if\s*isSignedIn\(\)\s*;/.test(rulesContent), false);
  assert.match(rulesContent, /match\s*\/users\/\{userId\}[\s\S]*?allow\s+list:\s*if\s*isAdmin\(\)\s*;/);
  // SuperAdmin checks verified email strictly
  assert.match(rulesContent, /function\s+isSuperAdmin\(\)\s*\{\s*return\s+isVerifiedUser\(\)\s*&&\s*request\.auth\.token\.email\s*==\s*'ssuspect542@gmail\.com'/);
  assert.match(rulesContent, /function\s+isVerifiedUser\(\)\s*\{\s*return\s+isSignedIn\(\)\s*&&\s*request\.auth\.token\.email_verified\s*==\s*true/);
});

test('Dirty Dozen #3, #4, #5: strict hasAll/hasOnly, role escalation guard, and affectedKeys on update', () => {
  assert.match(rulesContent, /\(incoming\(\)\.role\s*==\s*'student'\s*\|\|\s*isSuperAdmin\(\)\)/);
  assert.match(rulesContent, /incoming\(\)\.role\s*==\s*existing\(\)\.role/);
  assert.match(rulesContent, /incoming\(\)\.studentId\s*==\s*existing\(\)\.studentId/);
  assert.match(rulesContent, /incoming\(\)\.diff\(existing\(\)\)\.affectedKeys\(\)\.hasOnly\(/);
  assert.match(rulesContent, /data\.keys\(\)\.hasOnly\(/);
});

test('Dirty Dozen #6-#12: immutable attempts & audit logs, request.time enforcement, pre-8 PM key sheet gate, no open reads', () => {
  // No allow read/write if true anywhere
  assert.equal(/allow\s+(read|write|get|list|create|update|delete):\s*if\s+true\s*;/.test(rulesContent), false);
  // Attempts and audit logs immutable
  assert.match(rulesContent, /match\s*\/attempts\/\{attemptId\}[\s\S]*?allow\s+update:\s*if\s+false;[\s\S]*?allow\s+delete:\s*if\s+false;/);
  assert.match(rulesContent, /match\s*\/audit_logs\/\{logId\}[\s\S]*?allow\s+update:\s*if\s+false;[\s\S]*?allow\s+delete:\s*if\s+false;/);
  // Server timestamps strictly checked
  assert.match(rulesContent, /incoming\(\)\.submittedAt\s*==\s*request\.time/);
  assert.match(rulesContent, /incoming\(\)\.createdAt\s*==\s*request\.time/);
  assert.match(rulesContent, /incoming\(\)\.updatedAt\s*==\s*request\.time/);
  // Time-gated key sheets
  assert.match(rulesContent, /match\s*\/key_sheets\/\{examDate\}[\s\S]*?request\.time\.toMillis\(\)\s*>=\s*resource\.data\.unlockTimestampMs/);
  // PQP and scheduled_tests restricted to isAdmin() writes
  assert.match(rulesContent, /match\s*\/pqps\/\{pqpId\}[\s\S]*?allow\s+create:\s*if[\s\S]*?isAdmin\(\)/);
  assert.match(rulesContent, /match\s*\/scheduled_tests\/\{testId\}[\s\S]*?allow\s+create:\s*if[\s\S]*?isAdmin\(\)/);
});
