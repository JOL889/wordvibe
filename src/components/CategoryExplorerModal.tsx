import React, { useEffect, useMemo, useState } from 'react';
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
import { getCategoryRemainingPlays } from '../game/puzzleLogic';

export type CategoryFilterTab = 'All' | 'Popular' | 'Unlocked' | CategoryGroup;

interface CategoryExplorerModalProps {
  open: boolean;
  initialTab?: CategoryFilterTab;
  activeCategoryId: string;
  playsRemaining: Record<string, number>;
  solvedByCategory: Record<string, number>;
  exploredCategories: string[];
  spotlight: DailyEntertainmentSpotlight;
  onClose: () => void;
  onSelectCategory: (category: PuzzleCategory) => void;
}

export const CategoryExplorerModal: React.FC<CategoryExplorerModalProps> = ({
  open,
  initialTab = 'All',
  activeCategoryId,
  playsRemaining,
  solvedByCategory,
  exploredCategories,
  spotlight,
  onClose,
  onSelectCategory,
}) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<CategoryFilterTab>(initialTab);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setQuery('');
    }
  }, [initialTab, open]);

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
      if (activeTab === 'Unlocked' && getCategoryRemainingPlays(cat, playsRemaining) <= 0) {
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
  const exploredPct = Math.min(100, Math.round((exploredCount / CATEGORIES.length) * 100));
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
      <button
        key={cat.id}
        type="button"
        data-category-id={cat.id}
        onClick={() => onSelectCategory(cat)}
        className={`group flex flex-col justify-between rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
          isActive
            ? 'border-emerald-700 bg-emerald-50/70 dark:border-emerald-500 dark:bg-emerald-950/30'
            : isHeroToday
            ? 'border-amber-600/45 bg-white hover:border-amber-600 dark:border-amber-500/40 dark:bg-zinc-950 dark:hover:border-amber-400'
            : isLocked
            ? 'border-stone-200 bg-white hover:border-amber-500/70 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-amber-500/60'
            : 'border-stone-200 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600'
        }`}
      >
        <div>
          <div className="flex items-start justify-between gap-2">
            <span className="font-display text-sm font-bold text-zinc-900 dark:text-zinc-50 leading-snug">
              {cat.name}
            </span>
            {isActive ? (
              <Check
                className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400"
                aria-hidden="true"
              />
            ) : isLocked ? (
              <Lock
                className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
            ) : cat.isPremium ? (
              <Unlock
                className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-400"
                aria-hidden="true"
              />
            ) : null}
          </div>

          <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-2">
            {cat.tagline}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-medium">
          <span
            className={
              isHeroToday || isFeaturedToday
                ? 'text-emerald-800 dark:text-emerald-400 font-semibold'
                : 'text-zinc-500 dark:text-zinc-400'
            }
          >
            {subLabel}
          </span>
          <span aria-hidden="true" className="text-zinc-400 dark:text-zinc-600">
            ·
          </span>
          {cat.isPremium ? (
            isLocked ? (
              <span className="font-semibold text-amber-700 dark:text-amber-400">
                Premium · Watch Ad for {PREMIUM_UNLOCK_PLAYS} Plays
              </span>
            ) : (
              <span className="font-mono-tabular font-semibold text-emerald-700 dark:text-emerald-400">
                Unlocked · {plays} {plays === 1 ? 'play' : 'plays'} left
              </span>
            )
          ) : (
            <span className="text-zinc-700 dark:text-zinc-300">Free · Unlimited</span>
          )}
          {solved > 0 && (
            <>
              <span aria-hidden="true" className="text-zinc-400 dark:text-zinc-600">
                ·
              </span>
              <span className="font-mono-tabular text-zinc-600 dark:text-zinc-400">
                {solved} solved
              </span>
            </>
          )}
        </div>
      </button>
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
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-stone-200 dark:border-zinc-800 bg-[#FAF9F6] dark:bg-zinc-900 shadow-2xl">
        {/* Header + Completion Progress */}
        <div className="border-b border-stone-200 dark:border-zinc-800 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{CATEGORIES.length} Curated Word Worlds · Daily Entertainment Updates</span>
              </div>
              <h2
                id="category-explorer-title"
                className="mt-0.5 font-display text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50"
              >
                Choose a Puzzle Topic
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close topic explorer"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-stone-200/70 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Subtle Endowed Mastery Bar */}
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-zinc-800">
              <div
                className="h-full bg-emerald-700 dark:bg-emerald-500 transition-[width] duration-300"
                style={{ width: `${Math.max(4, exploredPct)}%` }}
              />
            </div>
            <span className="font-mono-tabular text-xs font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
              {exploredCount} / {CATEGORIES.length} Explored
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative mt-3">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={`Search ${CATEGORIES.length} puzzle categories`}
              placeholder="Search topics (Awards, Streaming, K-Pop, Box Office, Astrology, True Crime...)"
              className="w-full rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 py-2 pl-9 pr-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-emerald-700 dark:focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Filter Tabs — Entertainment placed prominently near front */}
          <div
            role="tablist"
            aria-label="Filter topics by collection"
            className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-0.5"
          >
            {(
              [
                'All',
                'Entertainment',
                'Popular',
                'Unlocked',
                ...CATEGORY_GROUPS.filter((g) => g !== 'Entertainment'),
              ] as CategoryFilterTab[]
            ).map((tab) => {
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
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    selected
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-stone-200/75 text-zinc-700 hover:bg-stone-300/75 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Category Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {(showAllTabSpotlight || showEntBannerOnly) && (
            <div
              data-testid="explorer-daily-entertainment"
              className="mb-5 border-b border-stone-200 dark:border-zinc-800 pb-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {spotlight.source === 'live' ? (
                      <Tv className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    )}
                    <span>
                      {spotlight.source === 'live'
                        ? `Today’s News Spotlight · ${spotlight.dateKey}`
                        : `Daily Calendar Event · ${spotlight.dateKey}`}
                    </span>
                  </div>
                  <h3 className="mt-0.5 font-display text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    {spotlight.eventTitle}
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                    {spotlight.matchedHeadline
                      ? `In today’s news: “${spotlight.matchedHeadline}”`
                      : spotlight.eventSubtitle}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectCategory(heroCategory)}
                  className="shrink-0 rounded-lg bg-zinc-900 dark:bg-zinc-100 px-3 py-2 text-xs font-semibold text-white dark:text-zinc-900 transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-200 whitespace-nowrap cursor-pointer"
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
            <div className="mb-5 border-b border-stone-200 dark:border-zinc-800 pb-5">
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  <Flame className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  <span>Most Popular Topics · Watch 5s Ad for 5 Plays</span>
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
                  <div className="mb-2.5 flex items-center justify-between border-b border-stone-200/80 dark:border-zinc-800 pb-1.5">
                    <h3 className="flex items-center gap-1.5 font-display text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      <Film className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                      <span>{shelf.title}</span>
                    </h3>
                    <span className="font-mono-tabular text-[11px] text-zinc-500 dark:text-zinc-400">
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
                <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  {activeTab === 'All' && !isSearching
                    ? `All ${CATEGORIES.length} Categories`
                    : `${filteredCategories.length} Matching Topic${filteredCategories.length === 1 ? '' : 's'}`}
                </h3>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Free topics unlimited · Premium unlocks 5 plays per video
                </span>
              </div>

              {filteredCategories.length === 0 ? (
                <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 text-center">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    No topics match &ldquo;{query}&rdquo;.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setActiveTab('All');
                    }}
                    className="mt-3 rounded-lg bg-zinc-900 dark:bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-white dark:text-zinc-900 cursor-pointer"
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
};
