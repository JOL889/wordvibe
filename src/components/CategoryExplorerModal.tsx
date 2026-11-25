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
            ? 'wv-accent-pill'
            : isHeroToday
            ? 'border-amber-500/60 wv-card-muted hover:border-amber-500'
            : 'wv-border wv-card-muted hover:opacity-90'
        }`}
      >
        <div>
          <div className="flex items-start justify-between gap-2">
            <span className="font-display text-sm font-bold wv-text leading-snug">
              {cat.name}
            </span>
            {isActive ? (
              <Check
                className="h-4 w-4 shrink-0 wv-accent-text"
                aria-hidden="true"
              />
            ) : isLocked ? (
              <Lock
                className="h-3.5 w-3.5 shrink-0 text-amber-500"
                aria-hidden="true"
              />
            ) : cat.isPremium ? (
              <Unlock
                className="h-3.5 w-3.5 shrink-0 wv-accent-text"
                aria-hidden="true"
              />
            ) : null}
          </div>

          <p className="mt-1 text-xs leading-relaxed wv-text-muted line-clamp-2">
            {cat.tagline}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-medium">
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
              <span className="font-semibold text-amber-500">
                Premium · Watch Ad for {PREMIUM_UNLOCK_PLAYS} Plays
              </span>
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
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border-2 wv-border wv-card shadow-2xl">
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

          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/15 dark:bg-white/15">
              <div
                className="h-full wv-accent-btn transition-[width] duration-300"
                style={{ width: `${Math.max(4, exploredPct)}%` }}
              />
            </div>
            <span className="font-mono-tabular text-xs font-semibold wv-text-muted whitespace-nowrap">
              {exploredCount} / {CATEGORIES.length} Explored
            </span>
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
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    selected ? 'wv-accent-btn' : 'wv-card-muted wv-text-muted border wv-border'
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
                  <Flame className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                  <span>Most Popular Topics · Watch Ad for 5 Plays</span>
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
                  Free topics unlimited · Premium unlocks 5 plays per video
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
};
