import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  Flame,
  Gift,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Medal,
  MessageCircle,
  Pencil,
  RefreshCw,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import {
  getPlayerLeaderboardSummary,
  type LeaderboardEntry,
  type LeaderboardScope,
} from '../game/leaderboardLogic';
import type { LocalUserAccount } from '../game/userAccountLogic';
import {
  type ClaimConfirmationReceipt,
  getSyncCooldownRemainingMs,
  MAX_XP_PER_24H,
  REWARD_MILESTONE_NAIRA,
  REWARD_MILESTONE_XP,
  type RewardClaimInput,
  type VerifiedRewardLocalState,
  WEEKLY_PRIZE_POOL_LABEL,
  type WeeklyLeaderboardCache,
} from '../game/verifiedRewardsLogic';
import {
  ACHIEVEMENTS,
  computeWeeklyGrade,
  WEEKLY_GRADES,
  type WeeklyActivityState,
  type WeeklyRolloverSummary,
} from '../game/weeklyLogic';
import { useHorizontalSwitch } from '../hooks/useHorizontalSwitch';
import { UserAvatar } from './UserAvatar';

type WeeklyRankModalTab = 'leaderboard' | 'rewards' | 'tiers';
const WEEKLY_MODAL_TABS: readonly WeeklyRankModalTab[] = ['leaderboard', 'rewards', 'tiers'];
const LEADERBOARD_SCOPES: readonly LeaderboardScope[] = ['weekly', 'all_time'];

interface WeeklyRankModalProps {
  open: boolean;
  initialTab?: 'leaderboard' | 'rewards' | 'tiers';
  weeklyProgress: WeeklyActivityState;
  weeklyCountdown: string;
  playerId?: string;
  playerName?: string;
  userAccount?: LocalUserAccount | null;
  playerPuzzlesSolved?: number;
  playerTriviaCorrect?: number;
  playerStreak?: number;
  remoteLeaderboardEntries?: LeaderboardEntry[];
  verifiedState: VerifiedRewardLocalState;
  leaderboardCache: WeeklyLeaderboardCache | null;
  isOnline: boolean;
  firebaseSignedIn: boolean;
  firebaseUserEmail?: string | null;
  isSyncingScore?: boolean;
  syncStatusMessage?: string | null;
  authBusy?: boolean;
  authNotice?: string | null;
  lastClaimReceipt?: ClaimConfirmationReceipt | null;
  onManualSyncScore?: () => Promise<void> | void;
  onRefreshLeaderboardCache?: () => Promise<void> | void;
  onSignOutFirebase?: () => Promise<void> | void;
  onSubmitRewardClaim?: (input: RewardClaimInput) => Promise<void>;
  onUpdatePlayerName?: (nextName: string) => void;
  onOpenEditProfile?: () => void;
  onOpenUnifiedAuth?: () => void;
  onShareProgress?: (rank: number, activeThisWeekCount: number, gradeLabel: string) => Promise<string | void> | void;
  onInviteFriends?: (rank: number, activeThisWeekCount: number) => Promise<string | void> | void;
  onClose: () => void;
}

function formatShortCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export const WeeklyRankModal: React.FC<WeeklyRankModalProps> = ({
  open,
  initialTab = 'leaderboard',
  weeklyProgress,
  weeklyCountdown,
  playerId = 'local-player',
  playerName = 'You',
  userAccount = null,
  playerPuzzlesSolved,
  playerTriviaCorrect,
  playerStreak,
  remoteLeaderboardEntries = [],
  verifiedState,
  leaderboardCache,
  isOnline,
  firebaseSignedIn,
  firebaseUserEmail = null,
  isSyncingScore = false,
  syncStatusMessage = null,
  authBusy = false,
  authNotice = null,
  lastClaimReceipt = null,
  onManualSyncScore,
  onRefreshLeaderboardCache,
  onSignOutFirebase,
  onSubmitRewardClaim,
  onUpdatePlayerName,
  onOpenEditProfile,
  onOpenUnifiedAuth,
  onShareProgress,
  onInviteFriends,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'rewards' | 'tiers'>(initialTab);
  const [scope, setScope] = useState<LeaderboardScope>('weekly');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(playerName);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const [claimFullName, setClaimFullName] = useState('');
  const [claimBankName, setClaimBankName] = useState('');
  const [claimAccountNumber, setClaimAccountNumber] = useState('');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSubmitting, setClaimSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setNowTick(Date.now());
    } else {
      setShareFeedback(null);
      setEditingName(false);
      setClaimError(null);
    }
  }, [initialTab, open]);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  const effectiveName = userAccount?.username || verifiedState.displayName || playerName;

  // Map cached Firestore weekly_current summary into LeaderboardEntry rows (zero offline XP leaks)
  const mergedRemoteEntries: LeaderboardEntry[] = useMemo(() => {
    const cachedList: LeaderboardEntry[] = (leaderboardCache?.topEntries || []).map((entry) => ({
      id: entry.uid,
      name: entry.name,
      weeklyXp: entry.weeklyRewardXp,
      totalXp: entry.verifiedRewardXp,
      puzzlesSolved: entry.puzzlesSolved,
      triviaCorrect: entry.triviaCorrect,
      streak: entry.streak,
      weekKey: entry.weekKey,
      isActiveThisWeek: entry.weeklyRewardXp > 0,
    }));
    const seen = new Set(cachedList.map((e) => e.id));
    for (const r of remoteLeaderboardEntries) {
      if (!seen.has(r.id)) cachedList.push(r);
    }
    return cachedList;
  }, [leaderboardCache?.topEntries, remoteLeaderboardEntries]);

  // Verified Online XP strictly excludes offline Practice XP
  const verifiedWeeklyPlayerXp = firebaseSignedIn ? verifiedState.weeklyRewardXp : 0;
  const verifiedTotalPlayerXp = firebaseSignedIn ? verifiedState.verifiedRewardXp : 0;

  const solvedCount =
    scope === 'weekly'
      ? verifiedState.puzzlesSolved
      : playerPuzzlesSolved ?? verifiedState.puzzlesSolved;
  const triviaCount =
    scope === 'weekly'
      ? verifiedState.triviaCorrect
      : playerTriviaCorrect ?? verifiedState.triviaCorrect;
  const streakCount = playerStreak ?? verifiedState.streak ?? weeklyProgress.bestTriviaStreak;

  const leaderboard = useMemo(
    () =>
      getPlayerLeaderboardSummary({
        playerId: verifiedState.uid || playerId,
        playerName: effectiveName,
        playerWeeklyXp: verifiedWeeklyPlayerXp,
        playerTotalXp: verifiedTotalPlayerXp,
        playerPuzzlesSolved: solvedCount,
        playerTriviaCorrect: triviaCount,
        playerStreak: streakCount,
        scope,
        weekKey: verifiedState.weekKey || weeklyProgress.weekKey,
        remoteEntries: mergedRemoteEntries,
      }),
    [
      effectiveName,
      mergedRemoteEntries,
      playerId,
      scope,
      solvedCount,
      streakCount,
      triviaCount,
      verifiedState.uid,
      verifiedState.weekKey,
      verifiedTotalPlayerXp,
      verifiedWeeklyPlayerXp,
      weeklyProgress.weekKey,
    ]
  );

  const modalTabSwitch = useHorizontalSwitch({
    items: WEEKLY_MODAL_TABS,
    activeItem: activeTab,
    onChange: setActiveTab,
    disabled: !open,
  });

  const scopeSwitch = useHorizontalSwitch({
    items: LEADERBOARD_SCOPES,
    activeItem: scope,
    onChange: setScope,
    disabled: !open,
  });

  if (!open) return null;

  const gradeInfo = computeWeeklyGrade(
    weeklyProgress.weeklyXp,
    weeklyProgress.unlockedAchievements.length
  );
  const gradeLabel = `Rank ${gradeInfo.current.id} (${gradeInfo.current.tierName})`;

  const cooldownLeftMs = getSyncCooldownRemainingMs(verifiedState.lastSyncAtMs, nowTick);
  const pendingXp = verifiedState.pendingBuffer.pendingXp;
  const milestonePct = Math.min(
    100,
    Math.round((verifiedState.verifiedRewardXp / REWARD_MILESTONE_XP) * 100)
  );
  const canSubmitClaim =
    firebaseSignedIn &&
    isOnline &&
    !verifiedState.suspiciousActivity &&
    verifiedState.verifiedRewardXp >= REWARD_MILESTONE_XP;

  const cacheAgeMin =
    leaderboardCache && leaderboardCache.fetchedAtMs > 0
      ? Math.max(0, Math.floor((nowTick - leaderboardCache.fetchedAtMs) / 60_000))
      : null;

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = nameDraft.trim().replace(/\s+/g, ' ').slice(0, 24);
    if (cleaned && onUpdatePlayerName) {
      onUpdatePlayerName(cleaned);
    }
    setEditingName(false);
  };

  const handleShareClick = async () => {
    if (!onShareProgress) return;
    const result = await onShareProgress(
      leaderboard.rank,
      leaderboard.activeThisWeekCount,
      gradeLabel
    );
    if (result === 'copied') {
      setShareFeedback('Rank summary copied to clipboard — ready to paste!');
    } else if (result === 'shared') {
      setShareFeedback('Shared weekly progress!');
    } else if (result === 'failed') {
      setShareFeedback('Clipboard blocked in this browser — share manually.');
    }
  };

  const handleInviteClick = async () => {
    if (!onInviteFriends) return;
    const result = await onInviteFriends(
      leaderboard.rank,
      leaderboard.activeThisWeekCount
    );
    if (result === 'copied') {
      setShareFeedback('Invite link & message copied to clipboard!');
    } else if (result === 'shared') {
      setShareFeedback('Invite sent!');
    } else if (result === 'failed') {
      setShareFeedback('Clipboard blocked in this browser — copy page URL to invite.');
    }
  };

  const handleClaimFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmitRewardClaim) return;
    setClaimError(null);
    setClaimSubmitting(true);
    try {
      await onSubmitRewardClaim({
        fullName: claimFullName,
        bankName: claimBankName,
        accountNumber: claimAccountNumber,
      });
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Unable to submit reward claim.');
    } finally {
      setClaimSubmitting(false);
    }
  };

  return (
    <div
      data-testid="weekly-rank-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weekly-rank-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 overflow-y-auto"
    >
      <div className="my-auto flex max-h-[92vh] w-full max-w-lg flex-col rounded-2xl border-2 wv-border wv-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b wv-border px-5 py-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider wv-accent-text">
              <Trophy className="h-4 w-4" aria-hidden="true" />
              <span>Leaderboard &amp; Rewards</span>
            </div>
            <h2
              id="weekly-rank-title"
              className="mt-0.5 font-display text-xl sm:text-2xl font-bold wv-text"
            >
              Verified Standings
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close leaderboard and weekly grading modal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl wv-text-muted hover:opacity-80 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Sub-Tabs: Leaderboard | ₦10,000 Rewards | Tiers & Badges */}
        <div className="border-b wv-border px-4 sm:px-5 pt-3 pb-3">
          <div
            {...modalTabSwitch.containerProps}
            role="tablist"
            aria-label="Leaderboard sections"
            className="grid grid-cols-3 rounded-xl border wv-border wv-card-muted p-1 text-xs font-bold gap-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'leaderboard'}
              data-testid="tab-leaderboard"
              onClick={() => setActiveTab('leaderboard')}
              className={`inline-flex min-h-10 items-center justify-center gap-1 rounded-lg py-1.5 px-1 transition-colors cursor-pointer ${
                activeTab === 'leaderboard' ? 'wv-accent-btn' : 'wv-text-muted hover:opacity-90'
              }`}
            >
              <Users className="hidden sm:inline h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">Leaderboard</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'rewards'}
              data-testid="tab-cash-rewards"
              onClick={() => setActiveTab('rewards')}
              className={`inline-flex min-h-10 items-center justify-center gap-1 rounded-lg py-1.5 px-1 transition-colors cursor-pointer ${
                activeTab === 'rewards' ? 'wv-accent-btn' : 'wv-text-muted hover:opacity-90'
              }`}
            >
              <Gift className="hidden sm:inline h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">₦10k Rewards</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'tiers'}
              data-testid="tab-tiers-badges"
              onClick={() => setActiveTab('tiers')}
              className={`inline-flex min-h-10 items-center justify-center gap-1 rounded-lg py-1.5 px-1 transition-colors cursor-pointer ${
                activeTab === 'tiers' ? 'wv-accent-btn' : 'wv-text-muted hover:opacity-90'
              }`}
            >
              <Trophy className="hidden sm:inline h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">Tiers &amp; Badges</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          {...modalTabSwitch.containerProps}
          className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4"
        >
          {activeTab === 'leaderboard' ? (
            <div data-testid="xp-leaderboard-panel" className="space-y-4">
              {/* Weekly #1 Prize Pool Banner */}
              <div
                data-testid="weekly-prize-pool-banner"
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border wv-gold-pill px-3.5 py-2.5 text-xs"
              >
                <div className="flex items-center gap-2 font-extrabold">
                  <Trophy className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{leaderboardCache?.prizePoolLabel || WEEKLY_PRIZE_POOL_LABEL}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('rewards')}
                  className="underline font-bold cursor-pointer"
                >
                  ₦10,000 Milestone →
                </button>
              </div>

              {/* Unified Profile, Standing, XP & Sign-In Card */}
              <div
                data-testid="dual-xp-sync-card"
                className="rounded-xl border wv-border wv-card-muted p-4 space-y-3"
              >
                {/* Top Identity + Rank Row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {userAccount && (
                      <UserAvatar
                        avatarType={userAccount.avatarType}
                        builtinAvatarId={userAccount.builtinAvatarId}
                        avatarDataUrl={userAccount.avatarDataUrl}
                        alt={userAccount.username}
                        size="md"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          data-testid="leaderboard-user-rank"
                          className="font-display text-base sm:text-lg font-black wv-text"
                        >
                          Rank #{leaderboard.rank}
                        </span>
                        <span className="text-xs font-semibold wv-text-muted">
                          of {scope === 'weekly' ? `${leaderboard.activeThisWeekCount} weekly` : `${leaderboard.totalPlayers} total`}
                        </span>
                      </div>
                      <p className="text-xs font-medium wv-text-muted truncate">
                        {leaderboard.nextRivalName
                          ? `${leaderboard.xpToOvertake.toLocaleString()} XP to pass ${leaderboard.nextRivalName}`
                          : 'Top #1 spot on the weekly race!'}
                      </p>
                    </div>
                  </div>

                  {onOpenEditProfile ? (
                    <button
                      type="button"
                      data-testid="leaderboard-edit-profile-btn"
                      onClick={onOpenEditProfile}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border wv-border wv-card px-2.5 py-1.5 text-xs font-bold wv-accent-text hover:opacity-85 cursor-pointer"
                    >
                      <Pencil className="h-3 w-3" aria-hidden="true" />
                      <span>@{effectiveName}</span>
                    </button>
                  ) : (
                    onUpdatePlayerName &&
                    (editingName ? (
                      <form onSubmit={handleSaveName} className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="text"
                          value={nameDraft}
                          maxLength={24}
                          onChange={(e) => setNameDraft(e.target.value)}
                          aria-label="Display name"
                          className="w-24 rounded-lg border wv-border wv-card px-2 py-1 text-xs font-bold wv-text focus:outline-none"
                        />
                        <button
                          type="submit"
                          aria-label="Save name"
                          className="inline-flex h-7 items-center gap-1 rounded-lg wv-accent-btn px-2 text-xs font-bold cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        data-testid="leaderboard-edit-name-btn"
                        onClick={() => {
                          setNameDraft(effectiveName);
                          setEditingName(true);
                        }}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border wv-border wv-card px-2.5 py-1.5 text-xs font-bold wv-accent-text hover:opacity-85 cursor-pointer"
                      >
                        <Pencil className="h-3 w-3" aria-hidden="true" />
                        <span>{effectiveName}</span>
                      </button>
                    ))
                  )}
                </div>

                {/* Single-Source Verified vs Practice XP Split */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border wv-border wv-card p-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold wv-text-muted">
                      <span>Verified Online XP</span>
                      {isOnline ? (
                        <Wifi className="h-3 w-3 wv-accent-text" aria-hidden="true" />
                      ) : (
                        <WifiOff className="h-3 w-3" aria-hidden="true" />
                      )}
                    </div>
                    <div
                      data-testid="verified-xp-balance"
                      className="mt-0.5 font-mono-tabular text-base font-black wv-accent-text"
                    >
                      {verifiedState.verifiedRewardXp.toLocaleString()} XP
                    </div>
                    {pendingXp > 0 && (
                      <div className="text-xs wv-text-muted font-mono-tabular">
                        +{pendingXp} ready to sync
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border wv-border wv-card p-2.5">
                    <div className="text-xs font-bold wv-text-muted">
                      Practice XP
                    </div>
                    <div
                      data-testid="practice-xp-balance"
                      className="mt-0.5 font-mono-tabular text-base font-black wv-text"
                    >
                      {weeklyProgress.weeklyXp.toLocaleString()} XP
                    </div>
                    <div className="text-xs wv-text-muted">
                      For hints &amp; unlocks
                    </div>
                  </div>
                </div>

                {/* Anti-Cheat Status / Tamper Banner */}
                {verifiedState.suspiciousActivity && (
                  <div
                    data-testid="suspicious-activity-banner"
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300 font-semibold"
                  >
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      Account notice: {verifiedState.suspiciousReason || 'Unusual score activity'}.
                    </span>
                  </div>
                )}

                {/* Unified Auth Status + Sync Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t wv-border pt-2.5">
                  <div className="flex items-center gap-1.5 text-sm">
                    {firebaseSignedIn ? (
                      <ShieldCheck className="h-4 w-4 wv-accent-text shrink-0" aria-hidden="true" />
                    ) : (
                      <Lock className="h-4 w-4 wv-text-muted shrink-0" aria-hidden="true" />
                    )}
                    <span data-testid="firebase-auth-status" className="font-semibold wv-text">
                      {firebaseSignedIn
                        ? firebaseUserEmail || userAccount?.email || 'Cloud Account Synced'
                        : isOnline
                        ? userAccount?.email || 'Ready for Cloud Sync'
                        : 'Offline Mode'}
                    </span>
                  </div>

                  {onManualSyncScore && (
                    <button
                      type="button"
                      data-testid="sync-verified-score-btn"
                      disabled={!isOnline || isSyncingScore || cooldownLeftMs > 0}
                      onClick={() => void onManualSyncScore()}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg wv-accent-btn px-3 py-1.5 text-xs sm:text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${isSyncingScore ? 'animate-spin' : ''}`}
                        aria-hidden="true"
                      />
                      <span>
                        {isSyncingScore
                          ? 'Syncing...'
                          : cooldownLeftMs > 0
                          ? `Wait ${formatShortCountdown(cooldownLeftMs)}`
                          : 'Sync Progress'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Single Unified Account Action Row */}
                <div className="flex flex-wrap items-center gap-2">
                  {onOpenUnifiedAuth && (
                    <button
                      type="button"
                      data-testid="leaderboard-unified-auth-btn"
                      disabled={authBusy}
                      onClick={onOpenUnifiedAuth}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border wv-border wv-card px-3 py-1.5 text-xs sm:text-sm font-bold wv-text hover:opacity-85 disabled:opacity-50 cursor-pointer"
                    >
                      <LogIn className="h-3.5 w-3.5 wv-accent-text" aria-hidden="true" />
                      <span>{firebaseSignedIn || userAccount ? 'Switch Account' : 'Sign In'}</span>
                    </button>
                  )}
                  {firebaseSignedIn && onSignOutFirebase && (
                    <button
                      type="button"
                      data-testid="firebase-signout-btn"
                      disabled={authBusy}
                      onClick={() => void onSignOutFirebase()}
                      className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-lg border wv-border wv-card px-2.5 py-1 text-xs font-semibold wv-text-muted hover:opacity-85 cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>

                {(syncStatusMessage || authNotice) && (
                  <p
                    data-testid="sync-status-message"
                    role="status"
                    className="rounded-lg border wv-border wv-card px-2.5 py-1.5 text-xs font-semibold wv-text-muted"
                  >
                    {syncStatusMessage || authNotice}
                  </p>
                )}

                {/* Share Progress & Invite Friends */}
                {(onShareProgress || onInviteFriends) && (
                  <div className="space-y-1.5 border-t wv-border pt-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      {onShareProgress && (
                        <button
                          type="button"
                          data-testid="leaderboard-share-progress-btn"
                          onClick={handleShareClick}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl wv-accent-btn px-3 py-2 text-xs font-bold cursor-pointer"
                        >
                          <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Share Progress</span>
                        </button>
                      )}
                      {onInviteFriends && (
                        <button
                          type="button"
                          data-testid="leaderboard-invite-friends-btn"
                          onClick={handleInviteClick}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border wv-border wv-card px-3 py-2 text-xs font-bold wv-text hover:opacity-90 cursor-pointer"
                        >
                          <UserPlus className="h-3.5 w-3.5 wv-accent-text" aria-hidden="true" />
                          <span>Invite Friends</span>
                        </button>
                      )}
                    </div>
                    {shareFeedback && (
                      <p
                        data-testid="leaderboard-share-feedback"
                        role="status"
                        className="flex items-center justify-center gap-1 text-center text-xs font-semibold wv-accent-text"
                      >
                        <Copy className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span>{shareFeedback}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Weekly vs All-Time Scope Toggle + 30-min Cache Info */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div
                  {...scopeSwitch.containerProps}
                  role="group"
                  aria-label="Leaderboard timeframe"
                  className="inline-flex rounded-xl border wv-border wv-card-muted p-0.5 text-xs font-bold"
                >
                  <button
                    type="button"
                    data-testid="leaderboard-scope-weekly"
                    onClick={() => setScope('weekly')}
                    className={`rounded-lg px-3 py-1.5 cursor-pointer ${
                      scope === 'weekly' ? 'wv-accent-btn' : 'wv-text-muted'
                    }`}
                  >
                    Weekly Prize ({leaderboard.activeThisWeekCount})
                  </button>
                  <button
                    type="button"
                    data-testid="leaderboard-scope-alltime"
                    onClick={() => setScope('all_time')}
                    className={`rounded-lg px-3 py-1.5 cursor-pointer ${
                      scope === 'all_time' ? 'wv-accent-btn' : 'wv-text-muted'
                    }`}
                  >
                    Verified All-Time
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs wv-text-muted">
                  <span className="inline-flex items-center gap-1 font-mono-tabular">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{weeklyCountdown}</span>
                  </span>
                  {onRefreshLeaderboardCache && (
                    <button
                      type="button"
                      data-testid="leaderboard-cache-indicator"
                      onClick={() => void onRefreshLeaderboardCache()}
                      title="Refresh standings"
                      className="rounded-lg border wv-border wv-card-muted px-2.5 py-1 text-xs font-semibold hover:opacity-85 cursor-pointer"
                    >
                      {cacheAgeMin !== null
                        ? `Updated ${cacheAgeMin}m ago`
                        : 'Refresh Ranks'}
                    </button>
                  )}
                </div>
              </div>

              {/* Ranked Players List */}
              <div data-testid="leaderboard-entries-list" className="space-y-2">
                {leaderboard.entries.slice(0, 30).map((entry) => {
                  const xpVal = scope === 'all_time' ? entry.totalXp : entry.weeklyXp;
                  const isTopThree = (entry.rank || 99) <= 3;
                  return (
                    <div
                      key={entry.id}
                      data-testid={entry.isCurrentUser ? 'leaderboard-row-you' : `leaderboard-row-${entry.rank}`}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${
                        entry.isCurrentUser
                          ? 'wv-accent-pill border-2'
                          : 'wv-border wv-card-muted'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono-tabular text-xs font-extrabold ${
                            entry.isCurrentUser || isTopThree
                              ? 'wv-accent-btn'
                              : 'border wv-border wv-card wv-text-muted'
                          }`}
                        >
                          {entry.rank === 1 ? (
                            <Medal className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            `#${entry.rank}`
                          )}
                        </span>
                        {entry.isCurrentUser && userAccount && (
                          <UserAvatar
                            avatarType={userAccount.avatarType}
                            builtinAvatarId={userAccount.builtinAvatarId}
                            avatarDataUrl={userAccount.avatarDataUrl}
                            alt={entry.name}
                            size="xs"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-extrabold wv-text">
                              {entry.name}
                            </span>
                            {entry.isCurrentUser && (
                              <span className="rounded-md wv-gold-pill px-1.5 py-0.5 text-[10px] font-extrabold uppercase">
                                You
                              </span>
                            )}
                          </div>
                          <p className="font-mono-tabular text-[11px] wv-text-muted">
                            {entry.puzzlesSolved} puzzles · {entry.triviaCorrect} trivia ·{' '}
                            {entry.streak} streak
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="font-mono-tabular text-sm font-extrabold wv-accent-text">
                          {xpVal.toLocaleString()} XP
                        </div>
                        <div className="font-mono-tabular text-[11px] wv-text-muted">
                          Rank {entry.gradeId}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : activeTab === 'rewards' ? (
            <div data-testid="cash-rewards-panel" className="space-y-4">
              {/* Dual Prize Structure Summary */}
              <div className="rounded-xl border-2 wv-border wv-card-muted p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-md wv-gold-pill px-2 py-0.5 text-[10px] font-extrabold uppercase">
                      <Gift className="h-3 w-3" aria-hidden="true" />
                      <span>600,000 Verified XP Milestone</span>
                    </span>
                    <h3 className="mt-1.5 font-display text-xl font-black wv-text">
                      ₦{REWARD_MILESTONE_NAIRA.toLocaleString()} Promotional Reward
                    </h3>
                  </div>
                  <div className="text-right font-mono-tabular">
                    <div
                      data-testid="milestone-xp-progress-text"
                      className="text-sm font-black wv-accent-text"
                    >
                      {verifiedState.verifiedRewardXp.toLocaleString()} /{' '}
                      {REWARD_MILESTONE_XP.toLocaleString()} XP
                    </div>
                    <div className="text-[11px] wv-text-muted">{milestonePct}% complete</div>
                  </div>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/15 dark:bg-white/15">
                  <div
                    className="h-full rounded-full wv-accent-btn transition-all duration-300"
                    style={{ width: `${milestonePct}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border wv-border wv-card p-2.5">
                    <div className="font-bold wv-text">1. Weekly #1 Champion</div>
                    <p className="mt-0.5 wv-text-muted">
                      ₦5,000 / ₦10,000 Pool awarded to #1 Verified Weekly player every Monday UTC.
                    </p>
                  </div>
                  <div className="rounded-lg border wv-border wv-card p-2.5">
                    <div className="font-bold wv-text">2. Fair-Play Caps</div>
                    <p className="mt-0.5 font-mono-tabular wv-text-muted">
                      Today: {verifiedState.dailyVerifiedXp.toLocaleString()} /{' '}
                      {MAX_XP_PER_24H.toLocaleString()} XP daily cap
                    </p>
                  </div>
                </div>
              </div>

              {/* Claim Receipt Card (shown after valid submission) */}
              {lastClaimReceipt && (
                <div
                  data-testid="claim-confirmation-card"
                  className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3"
                >
                  <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>Claim Logged · Code {lastClaimReceipt.claimCode}</span>
                  </div>
                  <p className="text-xs wv-text">
                    600,000 Verified XP deducted. Send your Claim ID below via WhatsApp or Email for
                    manual verification before payout:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <a
                      href={lastClaimReceipt.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="claim-whatsapp-link"
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-white px-3 py-2 text-xs font-bold hover:opacity-90"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                      <span>Verify on WhatsApp</span>
                    </a>
                    <a
                      href={lastClaimReceipt.emailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="claim-email-link"
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl wv-accent-btn px-3 py-2 text-xs font-bold hover:opacity-90"
                    >
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      <span>Verify via Email</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Payout Claim Form */}
              <form
                onSubmit={handleClaimFormSubmit}
                data-testid="reward-claim-form"
                className="rounded-xl border wv-border wv-card-muted p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-display text-base font-bold wv-text">
                    Submit ₦10,000 Payout Claim
                  </h4>
                  {!canSubmitClaim && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold wv-text-muted">
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      <span>Locked</span>
                    </span>
                  )}
                </div>

                {!firebaseSignedIn ? (
                  <p className="text-xs font-semibold wv-text-muted">
                    Sign in online via the Leaderboard tab before submitting a milestone claim.
                  </p>
                ) : verifiedState.suspiciousActivity ? (
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                    Ineligible: account flagged for suspicious activity.
                  </p>
                ) : verifiedState.verifiedRewardXp < REWARD_MILESTONE_XP ? (
                  <p className="text-xs font-semibold wv-text-muted">
                    Need{' '}
                    {(REWARD_MILESTONE_XP - verifiedState.verifiedRewardXp).toLocaleString()} more
                    Verified Online XP to unlock this form.
                  </p>
                ) : null}

                <div className="space-y-2.5">
                  <div>
                    <label
                      htmlFor="claim-full-name"
                      className="block text-xs font-bold wv-text mb-1"
                    >
                      Full Name
                    </label>
                    <input
                      id="claim-full-name"
                      data-testid="claim-fullname-input"
                      type="text"
                      required
                      maxLength={80}
                      value={claimFullName}
                      onChange={(e) => setClaimFullName(e.target.value)}
                      placeholder="Account Holder Full Name"
                      className="w-full rounded-xl border wv-border wv-card px-3 py-2 text-sm wv-text"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="claim-bank-name"
                      className="block text-xs font-bold wv-text mb-1"
                    >
                      Bank Name
                    </label>
                    <input
                      id="claim-bank-name"
                      data-testid="claim-bankname-input"
                      type="text"
                      required
                      maxLength={60}
                      value={claimBankName}
                      onChange={(e) => setClaimBankName(e.target.value)}
                      placeholder="e.g. Access Bank, GTBank, Kuda"
                      className="w-full rounded-xl border wv-border wv-card px-3 py-2 text-sm wv-text"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="claim-account-number"
                      className="block text-xs font-bold wv-text mb-1"
                    >
                      10-Digit Account Number
                    </label>
                    <input
                      id="claim-account-number"
                      data-testid="claim-account-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      required
                      value={claimAccountNumber}
                      onChange={(e) => setClaimAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="0123456789"
                      className="w-full rounded-xl border wv-border wv-card px-3 py-2 font-mono-tabular text-sm wv-text"
                    />
                  </div>
                </div>

                {claimError && (
                  <p
                    role="alert"
                    className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{claimError}</span>
                  </p>
                )}

                <button
                  type="submit"
                  data-testid="submit-reward-claim-btn"
                  disabled={!canSubmitClaim || claimSubmitting}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl wv-accent-btn px-4 py-2.5 text-sm font-bold disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Gift className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {claimSubmitting
                      ? 'Submitting Claim...'
                      : 'Claim ₦10,000 (Deduct 600,000 Verified XP)'}
                  </span>
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Active Practice Grade Progress Card */}
              <div className="rounded-xl border wv-border wv-card-muted p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium wv-text-muted">Weekly Practice XP (Spendable)</p>
                    <p
                      data-testid="modal-weekly-xp"
                      className="font-mono-tabular text-2xl font-bold wv-text"
                    >
                      {weeklyProgress.weeklyXp.toLocaleString()} XP
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="inline-flex items-center gap-1 text-xs font-medium wv-text-muted">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Resets Mon 00:00 UTC</span>
                    </p>
                    <p
                      data-testid="weekly-reset-countdown"
                      className="mt-0.5 font-mono-tabular text-sm font-semibold wv-text"
                    >
                      {weeklyCountdown}
                    </p>
                  </div>
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/15 dark:bg-white/15">
                  <div
                    className="h-full rounded-full wv-accent-btn transition-all duration-300"
                    style={{ width: `${gradeInfo.progressPercent}%` }}
                  />
                </div>

                <p className="mt-2 text-xs sm:text-sm font-medium wv-text-muted">
                  {gradeInfo.statusHint}
                </p>

                {/* Tier Ladder strip */}
                <div className="mt-4 grid grid-cols-5 gap-1.5 border-t wv-border pt-3 text-center">
                  {WEEKLY_GRADES.map((g) => {
                    const isActive = g.id === gradeInfo.current.id;
                    return (
                      <div
                        key={g.id}
                        className={`rounded-lg border px-1 py-1.5 ${
                          isActive ? 'wv-accent-pill' : 'wv-border wv-card'
                        }`}
                      >
                        <div
                          className={`font-display text-sm font-bold ${
                            isActive ? 'wv-accent-text' : 'wv-text'
                          }`}
                        >
                          {g.id}
                        </div>
                        <div className="text-xs font-semibold wv-text-muted">{g.tierName}</div>
                        <div className="font-mono-tabular text-[11px] wv-text-muted">
                          {g.minXp === 0 ? '0+' : `${g.minXp}+`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weekly Activity Breakdown */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-xl border wv-border wv-card-muted px-2 py-2.5">
                  <div className="font-mono-tabular text-lg font-bold wv-text">
                    {weeklyProgress.puzzlesSolved}
                  </div>
                  <div className="text-xs wv-text-muted">Puzzles</div>
                </div>
                <div className="rounded-xl border wv-border wv-card-muted px-2 py-2.5">
                  <div className="font-mono-tabular text-lg font-bold wv-text">
                    {weeklyProgress.triviaCorrect}
                  </div>
                  <div className="text-xs wv-text-muted">Trivia</div>
                </div>
                <div className="rounded-xl border wv-border wv-card-muted px-2 py-2.5">
                  <div className="font-mono-tabular text-lg font-bold wv-accent-text">
                    {weeklyProgress.bestTriviaStreak}
                  </div>
                  <div className="text-xs wv-text-muted">Top Streak</div>
                </div>
                <div className="rounded-xl border wv-border wv-card-muted px-2 py-2.5">
                  <div className="font-mono-tabular text-lg font-bold wv-accent-text">
                    {weeklyProgress.bonusCoins}
                  </div>
                  <div className="text-xs wv-text-muted">Coins</div>
                </div>
              </div>

              {/* 12 Trackable Achievements */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="inline-flex items-center gap-1.5 font-display text-base font-bold wv-text">
                    <Trophy className="h-4 w-4 wv-accent-text" aria-hidden="true" />
                    <span>Achievements</span>
                  </h3>
                  <span className="font-mono-tabular text-xs font-semibold wv-text-muted">
                    {weeklyProgress.unlockedAchievements.length} / {ACHIEVEMENTS.length} Unlocked
                  </span>
                </div>

                <div data-testid="achievements-list" className="space-y-2">
                  {ACHIEVEMENTS.map((ach) => {
                    const unlocked = weeklyProgress.unlockedAchievements.includes(ach.id);
                    return (
                      <div
                        key={ach.id}
                        data-achievement-id={ach.id}
                        data-unlocked={unlocked ? 'true' : 'false'}
                        className={`flex items-start justify-between gap-3 rounded-xl border p-3 ${
                          unlocked ? 'wv-accent-pill' : 'wv-border wv-card-muted'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {unlocked ? (
                              <CheckCircle2
                                className="h-4 w-4 shrink-0 wv-accent-text"
                                aria-hidden="true"
                              />
                            ) : (
                              <Lock
                                className="h-3.5 w-3.5 shrink-0 wv-text-muted"
                                aria-hidden="true"
                              />
                            )}
                            <span className="text-sm font-semibold wv-text">{ach.title}</span>
                          </div>
                          <p className="mt-0.5 text-xs wv-text-muted">{ach.description}</p>
                          <p className="mt-1 font-mono-tabular text-xs wv-text-muted">
                            Reward: +{ach.xpReward} XP · +{ach.coinReward} Coins
                          </p>
                        </div>
                        <span
                          className={`shrink-0 font-mono-tabular text-xs font-semibold ${
                            unlocked ? 'wv-accent-text' : 'wv-text-muted'
                          }`}
                        >
                          {unlocked ? 'Earned' : ach.metricLabel(weeklyProgress)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface WeeklyRolloverModalProps {
  summary: WeeklyRolloverSummary | null;
  onDismiss: () => void;
}

export const WeeklyRolloverModal: React.FC<WeeklyRolloverModalProps> = ({
  summary,
  onDismiss,
}) => {
  if (!summary) return null;

  return (
    <div
      data-testid="weekly-rollover-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weekly-rollover-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-md rounded-2xl border-2 wv-border wv-card p-6 shadow-2xl">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider wv-accent-text">
          <Award className="h-4 w-4" aria-hidden="true" />
          <span>Weekly Reset · Final Grade Report</span>
        </div>

        <h2
          id="weekly-rollover-title"
          className="mt-1 font-display text-2xl font-bold wv-text"
        >
          Last Week: Rank {summary.finalGrade} ({summary.tierName})
        </h2>
        <p className="mt-1 text-xs sm:text-sm wv-text-muted">
          Title earned: <strong className="wv-text">{summary.badgeTitle}</strong> · Week of{' '}
          {summary.weekKey}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border wv-border wv-card-muted p-2.5">
            <div className="font-mono-tabular text-lg font-bold wv-text">{summary.finalXp}</div>
            <div className="text-xs wv-text-muted">Weekly XP</div>
          </div>
          <div className="rounded-xl border wv-border wv-card-muted p-2.5">
            <div className="font-mono-tabular text-lg font-bold wv-text">
              {summary.puzzlesSolved + summary.triviaCorrect}
            </div>
            <div className="text-xs wv-text-muted">Solves</div>
          </div>
          <div className="rounded-xl border wv-border wv-card-muted p-2.5">
            <div className="font-mono-tabular text-lg font-bold wv-accent-text">
              {summary.achievementsCount}
            </div>
            <div className="text-xs wv-text-muted">Badges</div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border wv-accent-pill p-3.5 text-sm">
          <div className="flex items-center justify-between font-bold">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              New Week Kickoff Bonus
            </span>
            <span className="inline-flex items-center gap-2 font-mono-tabular">
              <span className="inline-flex items-center gap-1">
                <Coins className="h-3.5 w-3.5" aria-hidden="true" />+{summary.bonusCoinsAwarded}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Flame className="h-3.5 w-3.5" aria-hidden="true" />+{summary.bonusXpAwarded} XP
              </span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-5 w-full min-h-12 rounded-xl wv-accent-btn py-3 text-sm font-bold cursor-pointer"
        >
          Start New Weekly Climb
        </button>
      </div>
    </div>
  );
};
