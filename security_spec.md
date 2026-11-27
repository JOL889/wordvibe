# Security Specification — Wordvibe Firestore Rules

## 1. Data Invariants
1. **Owner-Only Profile & PII Isolation (`/users/{userId}`)**: A player can only read or write their own `/users/{userId}` document (`request.auth.uid == userId`). No list queries on `/users` are permitted.
2. **Server-Time & Cooldown Enforcement**: Initial `accountCreatedAt` and every `lastSyncAt` must equal `request.time`. Normal batch XP syncs require `request.time >= existing().lastSyncAt + duration.value(5, 'm')`, cap `lastBatchXpDelta <= 1500`, cap `dailyVerifiedXp <= 15000`, and enforce `>= 3000ms` per `roundsCompletedInBatch`.
3. **Immutable Tamper Flag (`suspiciousActivity`)**: A non-admin user cannot clear `suspiciousActivity` once set to `true` (`existing().suspiciousActivity == false`), and cannot earn positive XP deltas once flagged.
4. **Single-Document Leaderboard (`/leaderboards/weekly_current`)**: Strictly bounded to `<= 25` public entries with zero PII (no emails, bank accounts, or real names). Only non-suspicious signed-in players can read (`get`) or refresh `weekly_current`.
5. **Atomic Write-Once Reward Claims (`/rewardClaims/{claimId}`)**: Creating a claim requires `suspiciousActivity == false`, `verifiedRewardXp >= 600000`, `status == 'pending'`, valid 10-digit bank account, and atomic `-600000` deduction on `/users/{uid}` verified with `getAfter` + `existsAfter`. Non-admins cannot update or delete claims.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated read/write** to `/users/uid1`, `/leaderboards/weekly_current`, or `/rewardClaims/claim1`.
2. **Cross-user read (`get`)** of `/users/otherUid` or `/rewardClaims/otherClaim`.
3. **Cross-user `list` query** on `/users` or `/rewardClaims` without `uid == request.auth.uid`.
4. **ID Poisoning**: Creating `/users/<129-char-id>` or `/rewardClaims/invalid$id`.
5. **Shadow / Ghost Field Injection**: Creating `/users/{uid}` with `isAdmin: true` or `bonusOverride: 999999`.
6. **Client Timestamp Spoofing**: Sending `lastSyncAt` or `createdAt` different from `request.time`.
7. **Batch XP Limit Bypass**: Updating `/users/{uid}` with `+1501 XP` or `lastBatchXpDelta: 2000`.
8. **24-Hour Cap Bypass**: Updating `/users/{uid}` with `dailyVerifiedXp: 15001`.
9. **5-Minute Sync Cooldown Bypass**: Updating `/users/{uid}` XP before 5 minutes elapsed since `lastSyncAt`.
10. **Speed-Hack / Bot Pacing Bypass**: Updating `/users/{uid}` claiming `roundsCompletedInBatch: 200` within 5 minutes (`200 * 3s = 600s > 300s`).
11. **Suspicious Flag Self-Clearing or Claiming**: Flagged user (`suspiciousActivity: true`) attempting to set `suspiciousActivity: false` or submit `/rewardClaims/{claimId}`.
12. **Unpaired / Under-Balance Claim**: Submitting `/rewardClaims/{claimId}` when `verifiedRewardXp < 600000`, with `status: 'paid'`, or without deducting `600000` XP atomically from `/users/{uid}`.
