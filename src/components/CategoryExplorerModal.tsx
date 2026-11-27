import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Check, Compass, Film, Flame, Lock, Search, Tv, Unlock, X } from 'lucide-react';
import {
  CATEGORIES,
  CATEGORY_GROUPS,
  getCategoryById,
  PREMIUM_UNLOCK_PLAYS,
  type CategoryGroup,
  type PuzzleCategory,
} from '../data/categories';
import {
  ENTERTAINMENT_SUBCOLLECTION_ORDER,
  getEntertainmentSpec,
  getEntertainmentSubCollection,
  type DailyEntertainmentSpotlight,
} from '../game/entertainmentLogic';
import {
  CATEGORY_UNLOCK_REQUIRED_ADS,
  getCategoryRemainingPlays,
  getCategoryUnlockAdProgress,
} from '../game/puzzleLogic';
import { useHorizontalSwitch, useScrollSelectedIntoView } from '../hooks/useHorizontalSwitch';

export type CategoryFilterTab = 'All' | 'Popular' | 'Unlocked' | CategoryGroup;

const CATEGORY_FILTER_TABS: readonly CategoryFilterTab[] = [
  'All',
  'Entertainment',
  'Popular',
  'Unlocked',
  ...CATEGORY_GROUPS.filter((g) => g !== 'Entertainment'),
];

interface CategoryExplorerModalProps {
  open: boolean;
  initialTab?: CategoryFilterTab;
  activeCategoryId: string;
  playsRemaining: Record<string, number>;
  unlockAdProgress?: Record<string, number>;
  solvedByCategory: Record<string, number>;
  exploredCategories: string[];
  spotlight: DailyEntertainmentSpotlight;
  onClose: () => void;
  onSelectCategory: (category: PuzzleCategory) => void;
}

export const CategoryExplorerModal: React.FC<CategoryExplorerModalProps> = React.memo(({
  open,
  initialTab = 'All',
  activeCategoryId,
  playsRemaining,
  unlockAdProgress = {},
  solvedByCategory,
  exploredCategories,
  spotlight,
  onClose,
  onSelectCategory,
}) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<CategoryFilterTab>(initialTab);
  const tabListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setQuery('');
    }
  }, [initialTab, open]);

  const tabSwitch = useHorizontalSwitch({
    items: CATEGORY_FILTER_TABS,
    activeItem: activeTab,
    onChange: setActiveTab,
    disabled: !open,
  });

  useScrollSelectedIntoView(
    tabListRef,
    '[aria-selected="true"]',
    [activeTab, open]
  );

  const entertainmentCount = useMemo(
    () => CATEGORIES.filter((c) => c.group === 'Entertainment').length,
    []
  );

  const featuredIdsSet = useMemo(
    () => new Set(spotlight.featuredCategoryIds),
    [spotlight.featuredCategoryIds]
  );

  const featuredEntertainment = useMemo(() => {
    return spotlight.featuredCategoryIds
      .map((id) => getCategoryById(id))
      .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i);
  }, [spotlight.featuredCategoryIds]);

  const topPopular = useMemo(
    () =>
      [...CATEGORIES]
        .filter((c) => c.isPremium && !featuredIdsSet.has(c.id))
        .sort((a, b) => b.popularityScore - a.popularityScore)
        .slice(0, 4),
    [featuredIdsSet]
  );

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATEGORIES.filter((cat) => {
      if (activeTab === 'Popular' && cat.popularityScore < 86) return false;
      if (
        activeTab === 'Unlocked' &&
        getCategoryRemainingPlays(cat, playsRemaining) <= 0
      ) {
        return false;
      }
      if (
        activeTab !== 'All' &&
        activeTab !== 'Popular' &&
        activeTab !== 'Unlocked' &&
        cat.group !== activeTab
      ) {
        return false;
      }
      if (!q) return true;
      const entSpec = getEntertainmentSpec(cat.id);
      return (
        cat.name.toLowerCase().includes(q) ||
        cat.tagline.toLowerCase().includes(q) ||
        cat.group.toLowerCase().includes(q) ||
        (entSpec?.subCollection.toLowerCase().includes(q) ?? false) ||
        (entSpec?.eventTag.toLowerCase().includes(q) ?? false)
      );
    }).sort((a, b) => {
      if (activeTab === 'Popular' || activeTab === 'Entertainment') {
        return b.popularityScore - a.popularityScore;
      }
      return 0;
    });
  }, [activeTab, playsRemaining, query]);

  const entertainmentShelves = useMemo(() => {
    return ENTERTAINMENT_SUBCOLLECTION_ORDER.map((shelf) => ({
      title: shelf,
      items: filteredCategories.filter(
        (cat) => getEntertainmentSubCollection(cat.id) === shelf
      ),
    })).filter((shelf) => shelf.items.length > 0);
  }, [filteredCategories]);

  if (!open) return null;

  const exploredCount = exploredCategories.length;
  const isSearching = query.trim() !== '';
  const showAllTabSpotlight = !isSearching && activeTab === 'All';
  const showEntBannerOnly = !isSearching && activeTab === 'Entertainment';
  const showPopularSpotlight = !isSearching && activeTab === 'All';
  const showEntertainmentShelves =
    !isSearching && activeTab === 'Entertainment' && entertainmentShelves.length > 0;

  const heroCategory = getCategoryById(spotlight.heroCategoryId);

  const renderCategoryCard = (cat: PuzzleCategory, dailyTag?: string) => {
    const isActive = cat.id === activeCategoryId;
    const plays = getCategoryRemainingPlays(cat, playsRemaining);
    const isLocked = cat.isPremium && plays <= 0;
    const adsWatched = getCategoryUnlockAdProgress(unlockAdProgress, cat.id);
    const solved = solvedByCategory[cat.id] || 0;
    const spec = getEntertainmentSpec(cat.id);
    const isHeroToday = cat.id === spotlight.heroCategoryId;
    const isFeaturedToday = featuredIdsSet.has(cat.id);
    const subLabel =
      dailyTag ||
      (isHeroToday
        ? `Today’s Lead · ${spec?.eventTag || 'Entertainment'}`
        : isFeaturedToday
        ? `Trending Today · ${spec?.eventTag || 'Entertainment'}`
        : spec?.subCollection || cat.group);

    return (
      <div
        key={cat.id}
        role="group"
        aria-label={cat.name}
        data-category-id={cat.id}
        className={`group flex flex-col justify-between rounded-xl border p-3.5 text-left transition-colors ${
          isActive
            ? 'wv-accent-pill'
            : isHeroToday
            ? 'border-[var(--wv-accent)]/60 wv-card-muted hover:border-[var(--wv-accent)]'
            : 'wv-border wv-card-muted hover:opacity-95'
        }`}
      >
        <button
          type="button"
          onClick={() => onSelectCategory(cat)}
          className="w-full text-left cursor-pointer"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="font-display text-sm sm:text-base font-bold wv-text leading-snug">
              {cat.name}
            </span>
            {isActive ? (
              <Check
                className="h-4 w-4 shrink-0 wv-accent-text"
                aria-hidden="true"
              />
            ) : isLocked ? (
              <Lock
                className="h-3.5 w-3.5 shrink-0 wv-accent-text"
                aria-hidden="true"
              />
            ) : cat.isPremium ? (
              <Unlock
                className="h-3.5 w-3.5 shrink-0 wv-accent-text"
                aria-hidden="true"
              />
            ) : null}
          </div>

          <p className="mt-1 text-xs sm:text-sm leading-relaxed wv-text-muted line-clamp-2">
            {cat.tagline}
          </p>
        </button>

        <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-xs font-medium">
          <span
            className={
              isHeroToday || isFeaturedToday
                ? 'wv-accent-text font-bold'
                : 'wv-text-muted'
            }
          >
            {subLabel}
          </span>
          <span aria-hidden="true" className="wv-text-muted opacity-60">
            ·
          </span>
          {cat.isPremium ? (
            isLocked ? (
              <div className="flex w-full flex-wrap items-center justify-between gap-1.5 pt-1">
                <button
                  type="button"
                  data-testid={`unlock-category-ads-${cat.id}`}
                  onClick={() => onSelectCategory(cat)}
                  className="rounded-md border wv-border wv-card px-2.5 py-1 text-[11px] font-bold wv-text hover:opacity-90 cursor-pointer"
                >
                  {adsWatched > 0 && CATEGORY_UNLOCK_REQUIRED_ADS > 1
                    ? `Continue (${adsWatched}/${CATEGORY_UNLOCK_REQUIRED_ADS} Ads · ${PREMIUM_UNLOCK_PLAYS} Plays)`
                    : `Watch ${CATEGORY_UNLOCK_REQUIRED_ADS} ${
                        CATEGORY_UNLOCK_REQUIRED_ADS === 1 ? 'Ad' : 'Ads'
                      } · ${PREMIUM_UNLOCK_PLAYS} Plays`}
                </button>
              </div>
            ) : (
              <span className="font-mono-tabular font-semibold wv-accent-text">
                Unlocked · {plays} {plays === 1 ? 'play' : 'plays'} left
              </span>
            )
          ) : (
            <span className="wv-text-muted">Free · Unlimited</span>
          )}
          {solved > 0 && (
            <>
              <span aria-hidden="true" className="wv-text-muted opacity-60">
                ·
              </span>
              <span className="font-mono-tabular wv-text-muted">
                {solved} solved
              </span>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      data-testid="category-explorer-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-explorer-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-3 sm:p-4"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border-2 wv-border wv-card shadow-lg">
        {/* Header + Completion Progress */}
        <div className="border-b wv-border px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold wv-accent-text">
                <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{CATEGORIES.length} Curated Word Worlds · Zero Repeat Vault</span>
              </div>
              <h2
                id="category-explorer-title"
                className="mt-0.5 font-display text-xl sm:text-2xl font-bold wv-text"
              >
                Choose a Puzzle Topic
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close topic explorer"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl wv-text-muted hover:opacity-80 cursor-pointer"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border wv-accent-pill px-3.5 py-2 text-xs font-bold">
            <span>
              Watch {CATEGORY_UNLOCK_REQUIRED_ADS}{' '}
              {CATEGORY_UNLOCK_REQUIRED_ADS === 1 ? 'ad' : 'ads'} to unlock {PREMIUM_UNLOCK_PLAYS}{' '}
              plays in any locked topic!
            </span>
            <div className="flex items-center gap-2 font-mono-tabular whitespace-nowrap">
              <span>
                {exploredCount}/{CATEGORIES.length} Explored
              </span>
            </div>
          </div>

          <div className="relative mt-3">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 wv-text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={`Search ${CATEGORIES.length} puzzle categories`}
              placeholder="Search topics (Awards, Streaming, K-Pop, Science, Bible, History...)"
              className="w-full rounded-xl border wv-border wv-card-muted py-2 pl-9 pr-3 text-sm wv-text focus:outline-none"
            />
          </div>

          <div
            ref={tabListRef}
            {...tabSwitch.containerProps}
            role="tablist"
            aria-label="Filter topics by collection"
            className="mt-3 flex items-center gap-1.5 overflow-x-auto snap-x no-scrollbar pb-0.5"
          >
            {CATEGORY_FILTER_TABS.map((tab) => {
              const selected = activeTab === tab;
              const label =
                tab === 'All'
                  ? `All (${CATEGORIES.length})`
                  : tab === 'Entertainment'
                  ? `Entertainment (${entertainmentCount})`
                  : tab;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  data-testid={`category-tab-${tab.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                  aria-selected={selected}
                  onClick={() => setActiveTab(tab)}
                  className={`snap-start rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    selected ? 'wv-accent-btn' : 'wv-card-muted wv-text-muted border wv-border'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Category Grid (Swipe horizontally anywhere to switch collection tabs) */}
        <div
          {...tabSwitch.containerProps}
          className="flex-1 overflow-y-auto p-4 sm:p-5"
        >
          {(showAllTabSpotlight || showEntBannerOnly) && (
            <div
              data-testid="explorer-daily-entertainment"
              className="mb-5 border-b wv-border pb-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold wv-accent-text">
                    {spotlight.source === 'live' ? (
                      <Tv className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    )}
                    <span>Daily Topic Spotlight · {spotlight.dateKey}</span>
                  </div>
                  <h3 className="mt-0.5 font-display text-base sm:text-lg font-bold wv-text">
                    {spotlight.eventTitle}
                  </h3>
                  <p className="mt-0.5 text-xs wv-text-muted">
                    {spotlight.eventSubtitle}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectCategory(heroCategory)}
                  className="shrink-0 rounded-xl wv-accent-btn px-3.5 py-2 text-xs font-bold whitespace-nowrap cursor-pointer"
                >
                  Play {heroCategory.name}
                </button>
              </div>

              {showAllTabSpotlight && (
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {featuredEntertainment.map((cat, idx) => {
                    const spec = getEntertainmentSpec(cat.id);
                    const tag =
                      idx === 0
                        ? `Today’s Lead · ${spec?.eventTag || 'Trending'}`
                        : `Daily Rotation · ${spec?.eventTag || 'Entertainment'}`;
                    return renderCategoryCard(cat, tag);
                  })}
                </div>
              )}
            </div>
          )}

          {showPopularSpotlight && (
            <div className="mb-5 border-b wv-border pb-5">
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-bold wv-text-muted">
                  <Flame className="h-3.5 w-3.5 wv-accent-text" aria-hidden="true" />
                  <span>
                    Most Popular Topics · Watch {CATEGORY_UNLOCK_REQUIRED_ADS}{' '}
                    {CATEGORY_UNLOCK_REQUIRED_ADS === 1 ? 'Ad' : 'Ads'} for{' '}
                    {PREMIUM_UNLOCK_PLAYS} Plays
                  </span>
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {topPopular.map((cat) => renderCategoryCard(cat))}
              </div>
            </div>
          )}

          {showEntertainmentShelves ? (
            <div data-testid="entertainment-shelves" className="space-y-5">
              {entertainmentShelves.map((shelf) => (
                <div key={shelf.title}>
                  <div className="mb-2.5 flex items-center justify-between border-b wv-border pb-1.5">
                    <h3 className="flex items-center gap-1.5 font-display text-sm font-bold wv-text">
                      <Film className="h-3.5 w-3.5 wv-accent-text" aria-hidden="true" />
                      <span>{shelf.title}</span>
                    </h3>
                    <span className="font-mono-tabular text-[11px] wv-text-muted">
                      {shelf.items.length} topics
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {shelf.items.map((cat) => renderCategoryCard(cat))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="text-xs font-bold wv-text-muted">
                  {activeTab === 'All' && !isSearching
                    ? `All ${CATEGORIES.length} Categories`
                    : `${filteredCategories.length} Matching Topic${filteredCategories.length === 1 ? '' : 's'}`}
                </h3>
                <span className="text-[11px] wv-text-muted">
                  Free unlimited · Watch {CATEGORY_UNLOCK_REQUIRED_ADS}{' '}
                  {CATEGORY_UNLOCK_REQUIRED_ADS === 1 ? 'ad' : 'ads'} for {PREMIUM_UNLOCK_PLAYS}{' '}
                  plays on locked
                </span>
              </div>

              {filteredCategories.length === 0 ? (
                <div className="rounded-xl border wv-border wv-card-muted p-8 text-center">
                  <p className="text-sm font-semibold wv-text">
                    No topics match &ldquo;{query}&rdquo;.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setActiveTab('All');
                    }}
                    className="mt-3 rounded-xl wv-accent-btn px-4 py-2 text-xs font-bold cursor-pointer"
                  >
                    Show All {CATEGORIES.length} Topics
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {filteredCategories.map((cat) => renderCategoryCard(cat))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});
