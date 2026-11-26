import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve('firestore.rules');
const blueprintPath = path.resolve('firebase-blueprint.json');
const rulesText = fs.readFileSync(rulesPath, 'utf8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));

test('firestore.rules enforces rules_version 2 and default-deny safety net first', () => {
  assert.match(rulesText, /^rules_version\s*=\s*'2';/);
  const docMatchIdx = rulesText.indexOf('match /databases/{database}/documents');
  const catchAllIdx = rulesText.indexOf('match /{document=**}');
  assert.ok(docMatchIdx >= 0 && catchAllIdx > docMatchIdx);
  assert.match(rulesText, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/);
});

test('blueprint collections have explicit match blocks and synchronized field guards', () => {
  const paths = Object.keys(blueprint.firestore || {});
  assert.deepEqual(paths.sort(), [
    '/leaderboards/{boardId}',
    '/rewardClaims/{claimId}',
    '/users/{userId}',
  ]);

  assert.match(rulesText, /match \/users\/\{userId\}/);
  assert.match(rulesText, /match \/leaderboards\/\{boardId\}/);
  assert.match(rulesText, /match \/rewardClaims\/\{claimId\}/);
  assert.match(rulesText, /match \/admins\/\{adminUid\}/);
  assert.match(rulesText, /match \/test\/\{docId\}/);

  const userRequired: string[] = blueprint.entities.UserVerifiedProfile.required;
  for (const field of userRequired) {
    assert.ok(rulesText.includes(`'${field}'`), `Missing user blueprint field ${field} in rules`);
  }

  const claimRequired: string[] = blueprint.entities.RewardClaim.required;
  for (const field of claimRequired) {
    assert.ok(rulesText.includes(`'${field}'`), `Missing claim blueprint field ${field} in rules`);
  }
});

test('Dirty Dozen security invariants are enforced inside firestore.rules', () => {
  // 1 & 2. Auth + owner/admin isolation, no blanket list on users
  const usersStart = rulesText.indexOf('match /users/{userId}');
  const usersEnd = rulesText.indexOf('match /leaderboards/{boardId}');
  const usersBlock = rulesText.slice(usersStart, usersEnd);
  assert.doesNotMatch(usersBlock, /allow list:/);
  assert.match(usersBlock, /allow get: if isValidId\(userId\) && \(isOwner\(userId\) \|\| isAdmin\(\)\);/);

  // 3. Verified email gate for admin override (prevents email spoofing)
  assert.match(rulesText, /request\.auth\.token\.email == 'omosemoje20@gmail\.com'\s*&&\s*request\.auth\.token\.email_verified == true/);

  // 4. Path variable hardening & strict keys
  assert.match(rulesText, /function isValidId\(id\)/);
  assert.match(rulesText, /data\.keys\(\)\.hasAll/);
  assert.match(rulesText, /data\.keys\(\)\.hasOnly/);

  // 5 & 6. Server timestamps + 5-min cooldown + 1500 batch cap + 15000 24h cap + 3s/round pacing + 40 XP/round max
  assert.match(rulesText, /duration\.value\(5,\s*'m'\)/);
  assert.match(rulesText, /lastBatchXpDelta <= 1500/);
  assert.match(rulesText, /dailyVerifiedXp <= 15000/);
  assert.match(rulesText, /roundsCompletedInBatch \* 3000/);
  assert.match(rulesText, /roundsCompletedInBatch \* 40/);
  assert.match(rulesText, /incoming\(\)\.lastSyncAt == request\.time/);

  // 7. Suspicious activity lock cannot be self-cleared
  assert.match(rulesText, /existing\(\)\.suspiciousActivity == false/);

  // 8. Leaderboard strictly single-doc weekly_current & <= 25 non-PII entries
  assert.match(rulesText, /boardId == 'weekly_current'/);
  assert.match(rulesText, /topEntries\.size\(\) <= 25/);

  // 9. Atomic 600,000 XP deduction + write-once rewardClaims using existsAfter & getAfter
  assert.match(rulesText, /verifiedRewardXp >= 600000/);
  assert.match(rulesText, /verifiedRewardXp == existing\(\)\.verifiedRewardXp - 600000/);
  assert.match(rulesText, /existsAfter\(\/databases\/\$\(database\)\/documents\/rewardClaims\/\$\(incoming\(\)\.lastClaimId\)\)/);
  assert.match(rulesText, /getAfter\(\/databases\/\$\(database\)\/documents\/users\/\$\(request\.auth\.uid\)\)\.data\.lastClaimId == claimId/);
  assert.match(rulesText, /resource\.data\.uid == request\.auth\.uid \|\| isAdmin\(\)/);
});
