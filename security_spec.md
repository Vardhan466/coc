# Security Specification — Club Of Competition

## 1. Data Invariants
1. **Strict PII Isolation on `/users/{userId}`**: User documents contain `email`, `phone`, `state`, and `district`. No student may `get` or `list` another student's `/users/{userId}` document. Only the authenticated owner (`request.auth.uid == userId`) or a verified administrator (`isAdmin()`) may read a user profile.
2. **Verified Identity Mandate**: Standard writes and all elevated/admin checks require `request.auth != null && request.auth.token.email_verified == true`. Matching `ssuspect542@gmail.com` without `email_verified == true` is rejected.
3. **Immutable Audit & Exam Submissions**: Once an `/users/{userId}/attempts/{attemptId}` or `/audit_logs/{logId}` document is written with `request.time` timestamp enforcement, updates and deletes by students are strictly denied (`allow update: if false; allow delete: if false;` or SuperAdmin-only where stated).
4. **Role & Privilege Escalation Lock**: A student creating `/users/{userId}` may only set `role == 'student'` unless they hold verified SuperAdmin email (`ssuspect542@gmail.com`) or verified `/admins/{uid}`. On `update`, `id`, `studentId`, `role`, and `createdAt` are immutable for non-admins.
5. **PII-Free Public Leaderboards**: `/daily_exams/{examDate}/leaderboard/{studentId}` contains zero private keys (`email`, `phone`, `answers` are strictly excluded by `keys().hasOnly(...)`).
6. **Time-Gated Answer Key Release**: `/key_sheets/{examDate}` cannot be read by non-admin students before `resource.data.unlockTimestampMs` (`request.time.toMillis() >= resource.data.unlockTimestampMs`).
7. **Key Allowlists & Type/Size Bounds**: Every `create` uses `hasAll` + `hasOnly`, every `update` validates `isValid[Entity](incoming())` AND restricts modified keys via `affectedKeys().hasOnly(...)`, and every string enforces `.size()` limits to prevent storage exhaustion.
8. **Connection Probe Containment**: `/test/{docId}` permits `get` only on `docId == 'connection'` for authenticated users or server checks without opening `list` or `write`.

## 2. The "Dirty Dozen" Attack Payloads (All MUST fail with `PERMISSION_DENIED`)

1. **Cross-User Profile Enumeration (PII Scrape)**: Student B sends `list /users` or `get /users/studentA`.
2. **Unverified Admin Email Spoof**: User with `email: "ssuspect542@gmail.com"` and `email_verified: false` tries reading `/audit_logs` or writing `/scheduled_tests/hack`.
3. **Role Self-Escalation on Create**: Student sets `"role": "superAdmin"` when creating `/users/{ownUid}`.
4. **Role Escalation on Update**: Student updates their `/users/{ownUid}` payload with `"role": "admin"` or alters immutable `studentId`.
5. **Shadow / Ghost Field Injection**: Student creates or updates `/users/{ownUid}/progress/summary` including `"ghostVerified": true` outside `hasOnly` allowlist.
6. **Leaderboard Score Forgery / Out-of-Range Poisoning**: Student posts `/daily_exams/2026-04-10/leaderboard/{studentId}` with `"score": 9999` or includes `"email": "leak@test.com"`.
7. **Post-Submit Attempt Tampering**: Student attempts `update` or `delete` on `/users/{ownUid}/attempts/att-1` to erase `isDisqualified: true`.
8. **Backdated Timestamp Forgery**: Student writes `/users/{ownUid}/attempts/att-2` with client timestamp `submittedAt: "2020-01-01T00:00:00Z"` instead of `request.time`.
9. **Oversized String ID Poisoning**: Attacker targets `/users/{ownUid}/attempts/${"a".repeat(200)}` or injects 100KB name string.
10. **Pre-8:00 PM Key Sheet Leak**: Non-admin student reads `/key_sheets/2026-04-10` when `request.time.toMillis() < resource.data.unlockTimestampMs`.
11. **Unauthorized Test/PQP Overwrite**: Student tries to `create` or `update` `/pqps/pqp-fake` or `/scheduled_tests/daily-hijack`.
12. **Audit Log Deletion / Spoofed Actor**: Student tries to `delete` `/audit_logs/log-1` or `create` an audit log pretending `actorUid == "someoneElse"`.
