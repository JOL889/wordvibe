import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  Crown,
  Flame,
  Lock,
  Medal,
  Pencil,
  Share2,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  getPlayerLeaderboardSummary,
  type LeaderboardEntry,
  type LeaderboardScope,
} from '../game/leaderboardLogic';
import type { LocalUserAccount } from '../game/userAccountLogic';
import {
  ACHIEVEMENTS,
  computeWeeklyGrade,
  WEEKLY_GRADES,
  type WeeklyActivityState,
  type WeeklyRolloverSummary,
} from '../game/weeklyLogic';
import { UserAvatar } from './UserAvatar';

interface WeeklyRankModalProps {
  open: boolean;
  weeklyProgress: WeeklyActivityState;
  weeklyCountdown: string;
  playerId?: string;
  playerName?: string;
  userAccount?: LocalUserAccount | null;
  playerPuzzlesSolved?: number;
  playerTriviaCorrect?: number;
  playerStreak?: number;
  remoteLeaderboardEntries?: LeaderboardEntry[];
  onUpdatePlayerName?: (nextName: string) => void;
  onOpenEditProfile?: () => void;
  onShareProgress?: (rank: number, activeThisWeekCount: number, gradeLabel: string) => Promise<string | void> | void;
  onInviteFriends?: (rank: number, activeThisWeekCount: number) => Promise<string | void> | void;
  onClose: () => void;
}

export const WeeklyRankModal: React.FC<WeeklyRankModalProps> = ({
  open,
  weeklyProgress,
  weeklyCountdown,
  playerId = 'local-player',
  playerName = 'You',
  userAccount = null,
  playerPuzzlesSolved,
  playerTriviaCorrect,
  playerStreak,
  remoteLeaderboardEntries = [],
  onUpdatePlayerName,
  onOpenEditProfile,
  onShareProgress,
  onInviteFriends,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'tiers'>('leaderboard');
  const [scope, setScope] = useState<LeaderboardScope>('weekly');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(playerName);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setShareFeedback(null);
      setEditingName(false);
    }
  }, [open]);

  const solvedCount =
    scope === 'weekly'
      ? weeklyProgress.puzzlesSolved
      : playerPuzzlesSolved ?? weeklyProgress.puzzlesSolved;
  const triviaCount =
    scope === 'weekly'
      ? weeklyProgress.triviaCorrect
      : playerTriviaCorrect ?? weeklyProgress.triviaCorrect;
  const streakCount = playerStreak ?? weeklyProgress.bestTriviaStreak;
  const effectiveName = userAccount?.username || playerName;

  const leaderboard = useMemo(
    () =>
      getPlayerLeaderboardSummary({
        playerId,
        playerName: effectiveName,
        playerWeeklyXp: weeklyProgress.weeklyXp,
        playerTotalXp: Math.max(weeklyProgress.totalXp ?? 0, weeklyProgress.weeklyXp),
        playerPuzzlesSolved: solvedCount,
        playerTriviaCorrect: triviaCount,
        playerStreak: streakCount,
        scope,
        weekKey: weeklyProgress.weekKey,
        remoteEntries: remoteLeaderboardEntries,
      }),
    [
      playerId,
      effectiveName,
      weeklyProgress.weeklyXp,
      weeklyProgress.totalXp,
      weeklyProgress.weekKey,
      solvedCount,
      triviaCount,
      streakCount,
      scope,
      remoteLeaderboardEntries,
    ]
  );

  if (!open) return null;

  const gradeInfo = computeWeeklyGrade(
    weeklyProgress.weeklyXp,
    weeklyProgress.unlockedAchievements.length
  );
  const gradeLabel = `Rank ${gradeInfo.current.id} (${gradeInfo.current.tierName})`;

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

  return (
    <div
      data-testid="weekly-rank-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weekly-rank-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 overflow-y-auto"
    >
      <div className="my-auto flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border-2 wv-border wv-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b wv-border px-5 py-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider wv-accent-text">
              <Crown className="h-4 w-4" aria-hidden="true" />
              <span>XP Leaderboard &amp; Weekly Rank</span>
            </div>
            <h2
              id="weekly-rank-title"
              className="mt-1 font-display text-2xl font-bold wv-text"
            >
              #{leaderboard.rank} · {gradeLabel}
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

        {/* Sub-Tabs: Leaderboard vs Tiers & Badges */}
        <div className="border-b wv-border px-5 pt-3 pb-3">
          <div
            role="tablist"
            aria-label="Leaderboard sections"
            className="grid grid-cols-2 rounded-xl border wv-border wv-card-muted p-1 text-xs sm:text-sm font-bold"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'leaderboard'}
              data-testid="tab-leaderboard"
              onClick={() => setActiveTab('leaderboard')}
              className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg py-1.5 transition-colors cursor-pointer ${
                activeTab === 'leaderboard' ? 'wv-accent-btn' : 'wv-text-muted hover:opacity-90'
              }`}
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              <span>XP Leaderboard</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'tiers'}
              data-testid="tab-tiers-badges"
              onClick={() => setActiveTab('tiers')}
              className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg py-1.5 transition-colors cursor-pointer ${
                activeTab === 'tiers' ? 'wv-accent-btn' : 'wv-text-muted hover:opacity-90'
              }`}
            >
              <Trophy className="h-4 w-4" aria-hidden="true" />
              <span>Tiers &amp; Badges</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {activeTab === 'leaderboard' ? (
            <div data-testid="xp-leaderboard-panel" className="space-y-4">
              {/* Player Rank Hero Card */}
              <div className="rounded-xl border wv-border wv-card-muted p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
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
                      <span className="text-xs font-bold uppercase tracking-wider wv-accent-text">
                        Your Standing ({scope === 'weekly' ? 'Active Weekly' : 'All-Time XP'})
                      </span>
                      <div
                        data-testid="leaderboard-user-rank"
                        className="mt-0.5 font-display text-lg sm:text-xl font-black wv-text"
                      >
                        {scope === 'weekly'
                          ? `Rank #${leaderboard.rank} of ${leaderboard.activeThisWeekCount} active players this week`
                          : `Rank #${leaderboard.rank} of ${leaderboard.totalPlayers} total players`}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-xs font-medium wv-text-muted">Your XP</span>
                    <div
                      data-testid="leaderboard-user-xp"
                      className="font-mono-tabular text-lg sm:text-xl font-extrabold wv-accent-text"
                    >
                      {leaderboard.playerXp.toLocaleString()} XP
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t wv-border pt-2.5 text-xs">
                  <span className="font-semibold wv-text-muted">
                    {leaderboard.nextRivalName
                      ? `${leaderboard.xpToOvertake.toLocaleString()} XP to pass ${leaderboard.nextRivalName}`
                      : 'Top #1 spot on the leaderboard!'}
                  </span>

                  {onOpenEditProfile ? (
                    <button
                      type="button"
                      data-testid="leaderboard-edit-profile-btn"
                      onClick={onOpenEditProfile}
                      className="inline-flex items-center gap-1 font-bold wv-accent-text hover:underline cursor-pointer"
                    >
                      <Pencil className="h-3 w-3" aria-hidden="true" />
                      <span>@{effectiveName} · Edit</span>
                    </button>
                  ) : (
                    onUpdatePlayerName &&
                    (editingName ? (
                      <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={nameDraft}
                          maxLength={24}
                          onChange={(e) => setNameDraft(e.target.value)}
                          aria-label="Display name"
                          className="w-28 rounded-lg border wv-border wv-card px-2 py-1 text-xs font-bold wv-text focus:outline-none"
                        />
                        <button
                          type="submit"
                          aria-label="Save name"
                          className="inline-flex h-7 items-center gap-1 rounded-lg wv-accent-btn px-2 text-xs font-bold cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Save</span>
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
                        className="inline-flex items-center gap-1 font-bold wv-accent-text hover:underline cursor-pointer"
                      >
                        <Pencil className="h-3 w-3" aria-hidden="true" />
                        <span>Name: {effectiveName}</span>
                      </button>
                    ))
                  )}
                </div>

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

              {/* Weekly vs All-Time Scope Toggle */}
              <div className="flex items-center justify-between gap-2">
                <div
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
                    Weekly Active ({leaderboard.activeThisWeekCount})
                  </button>
                  <button
                    type="button"
                    data-testid="leaderboard-scope-alltime"
                    onClick={() => setScope('all_time')}
                    className={`rounded-lg px-3 py-1.5 cursor-pointer ${
                      scope === 'all_time' ? 'wv-accent-btn' : 'wv-text-muted'
                    }`}
                  >
                    All-Time XP
                  </button>
                </div>

                <span className="inline-flex items-center gap-1 font-mono-tabular text-xs wv-text-muted">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{weeklyCountdown}</span>
                </span>
              </div>

              {/* Ranked Players List */}
              <div data-testid="leaderboard-entries-list" className="space-y-2">
                {leaderboard.entries.map((entry) => {
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
          ) : (
            <div className="space-y-5">
              {/* Active Grade Progress Card */}
              <div className="rounded-xl border wv-border wv-card-muted p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium wv-text-muted">Current Weekly XP</p>
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
