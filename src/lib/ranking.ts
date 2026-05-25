import type { Course, FeedItem, Viewer } from "./domain";
import { explainProjectSignalMatch } from "./project-signals";

export type FeedRankingMode = "for-you" | "latest" | "following" | "top";

export type CourseRankingMode = "recommended" | "latest" | "popular";

type RankableCourse = Course & {
  difficulty?: "beginner" | "intermediate" | "advanced";
  completionCount?: number;
  thanksCount?: number;
  updatedAt?: string;
  ipynbMetadata?: {
    cellCount?: number;
    outline?: string[];
  } | null;
  exercises?: unknown[];
};

type RankOptions = {
  mode?: FeedRankingMode;
  now?: Date | string;
};

type CourseRankOptions = {
  mode?: CourseRankingMode;
  now?: Date | string;
};

function normalizedSet(values: string[]) {
  return new Set(values.map((value) => value.trim().toLowerCase()));
}

function tagAffinity(tags: string[], viewer: Viewer) {
  const interests = normalizedSet(viewer.interests);
  if (interests.size === 0 || tags.length === 0) {
    return 0;
  }

  const matches = tags.filter((tag) => interests.has(tag.toLowerCase()));
  return Math.min(1, matches.length / Math.min(tags.length, interests.size));
}

function hoursSince(dateValue: string | undefined, now: Date) {
  if (!dateValue) {
    return 720;
  }

  const timestamp = Date.parse(dateValue);
  if (Number.isNaN(timestamp)) {
    return 720;
  }

  return Math.max(0, (now.getTime() - timestamp) / 36e5);
}

function freshnessScore(dateValue: string | undefined, now: Date, halfLifeHours: number) {
  return Math.pow(0.5, hoursSince(dateValue, now) / halfLifeHours);
}

function deterministicNoise(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return ((hash >>> 0) % 1000) / 1000;
}

function engagementQuality(item: FeedItem) {
  const weighted = item.interests + item.comments * 1.35;
  return Math.min(1, Math.log1p(weighted) / Math.log1p(30));
}

function projectSignalQuality(item: FeedItem, viewer: Viewer) {
  if (item.contentType !== "project_signal" || !item.projectSignal) {
    return 0;
  }

  const viewerSignals = normalizedSet(viewer.interests);
  const sharedDomains = item.projectSignal.domains.filter((domain) =>
    viewerSignals.has(domain.toLowerCase()),
  ).length;
  const sharedStack = item.projectSignal.stack.filter((stack) =>
    viewerSignals.has(stack.toLowerCase()),
  ).length;
  const sharedNeeds = item.projectSignal.needs.filter((need) =>
    viewerSignals.has(need.toLowerCase()),
  ).length;
  const evidenceDepth = Math.min(
    1,
    (item.projectSignal.evidence.rootFiles.length +
      item.projectSignal.evidence.readmeHeadings.length +
      item.projectSignal.evidence.topics.length) /
      18,
  );
  const lowQualityPenalty =
    item.projectSignal.description.length < 24 ||
    item.projectSignal.needs.length === 0
      ? 0.35
      : 0;

  return (
    sharedDomains * 0.34 +
    sharedStack * 0.24 +
    sharedNeeds * 0.28 +
    evidenceDepth * 0.16 -
    lowQualityPenalty
  );
}

function feedScore(item: FeedItem, viewer: Viewer, mode: FeedRankingMode, now: Date) {
  // RubberDuck ranks for useful return visits: relevance, freshness, follows,
  // diversity, and positive contribution signals. It intentionally avoids
  // streak pressure, autoplay loops, negative public counters, and hidden
  // penalties for users who choose not to engage.
  const affinity = tagAffinity(item.tags, viewer);
  const followsAuthor = viewer.follows.includes(item.authorId);
  const ownContent = item.authorId === viewer.id;
  const freshness = freshnessScore(
    item.createdAt,
    now,
    item.type === "rss" ? 28 : item.type === "course" ? 96 : 42,
  );
  const engagement = engagementQuality(item);
  const projectSignal = projectSignalQuality(item, viewer);
  const visualSignal = item.imageUrl || item.media.length > 0 ? 0.08 : 0;
  const exploration = deterministicNoise(`${viewer.id}:${item.id}`) * 0.08;

  if (mode === "latest") {
    return freshness * 5 + exploration * 0.05;
  }

  if (mode === "top") {
    return engagement * 2.3 + freshness * 0.9 + affinity * 0.55 + visualSignal;
  }

  if (mode === "following") {
    const followSignal = followsAuthor || ownContent ? 2.4 : 0;
    const rssInterestBridge = item.type === "rss" && affinity > 0 ? 0.85 : 0;
    return followSignal + rssInterestBridge + freshness * 0.9 + engagement * 0.45;
  }

  const followSignal = followsAuthor ? 0.9 : ownContent ? 0.35 : 0;
  const typeBalance = item.type === "rss" ? 0.22 : item.type === "course" ? 0.35 : 0.28;

  return (
    affinity * 1.45 +
    freshness * 1.05 +
    engagement * 0.85 +
    projectSignal +
    followSignal +
    typeBalance +
    visualSignal +
    exploration
  );
}

export function explainFeedItemForViewer(item: FeedItem, viewer: Viewer) {
  if (item.contentType === "project_signal" && item.projectSignal) {
    return explainProjectSignalMatch(item.projectSignal, {
      interests: viewer.interests,
    }).slice(0, 3);
  }

  const interests = normalizedSet(viewer.interests);
  const matchingTags = item.tags.filter((tag) => interests.has(tag.toLowerCase()));
  const reasons = [
    matchingTags[0] ? `Matches your interest in ${matchingTags[0]}` : undefined,
    viewer.follows.includes(item.authorId)
      ? `From someone you follow`
      : undefined,
    item.type === "rss" ? `From your developer reading mix` : undefined,
    item.type === "course" ? `Recommended learning path` : undefined,
  ].filter(Boolean);

  return reasons.slice(0, 3) as string[];
}

function isVisibleInMode(item: FeedItem, viewer: Viewer, mode: FeedRankingMode) {
  if (item.viewerState?.reported) {
    return false;
  }

  if (mode !== "following") {
    return true;
  }

  return (
    item.authorId === viewer.id ||
    viewer.follows.includes(item.authorId) ||
    (item.type === "rss" && tagAffinity(item.tags, viewer) > 0)
  );
}

function diversityPenalty(candidate: FeedItem, selected: FeedItem[]) {
  const recent = selected.slice(-3);
  let penalty = 0;

  if (recent.some((item) => item.authorId === candidate.authorId)) {
    penalty += candidate.type === "rss" ? 0.3 : 0.42;
  }

  if (recent.slice(-2).some((item) => item.type === candidate.type)) {
    penalty += 0.18;
  }

  if (recent.slice(-2).some((item) => item.category === candidate.category)) {
    penalty += 0.1;
  }

  return penalty;
}

function rerankWithDiversity(scored: Array<{ item: FeedItem; score: number }>) {
  const remaining = [...scored].sort((a, b) => b.score - a.score);
  const selected: FeedItem[] = [];

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const adjustedScore = candidate.score - diversityPenalty(candidate.item, selected);
      if (adjustedScore > bestScore) {
        bestIndex = index;
        bestScore = adjustedScore;
      }
    }

    const [next] = remaining.splice(bestIndex, 1);
    selected.push(next.item);
  }

  return selected;
}

function resolveNow(value: Date | string | undefined) {
  return value instanceof Date ? value : new Date(value ?? Date.now());
}

export function rankFeedItems(
  items: FeedItem[],
  viewer: Viewer,
  options: RankOptions = {},
) {
  const mode = options.mode ?? "for-you";
  const now = resolveNow(options.now);
  const visible = items.filter((item) => isVisibleInMode(item, viewer, mode));

  if (mode === "latest") {
    return visible.toSorted(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  }

  const scored = visible.map((item) => ({
    item,
    score: feedScore(item, viewer, mode, now),
  }));

  return rerankWithDiversity(scored);
}

function courseRichness(course: RankableCourse) {
  const notebookCells = course.ipynbMetadata?.cellCount ?? 0;
  const outlineItems = course.ipynbMetadata?.outline?.length ?? 0;
  const exercises = course.exercises?.length ?? 0;

  return Math.min(1, (course.sections.length + exercises * 1.2 + notebookCells * 0.12 + outlineItems * 0.18) / 16);
}

function courseScore<T extends RankableCourse>(
  course: T,
  viewer: Viewer,
  mode: CourseRankingMode,
  now: Date,
) {
  const affinity = tagAffinity(course.tags, viewer);
  const freshness = freshnessScore(course.updatedAt, now, 168);
  const completionSignal = Math.min(1, Math.log1p(course.completionCount ?? 0) / Math.log1p(250));
  const thanksSignal = Math.min(1, Math.log1p(course.thanksCount ?? 0) / Math.log1p(150));
  const richness = courseRichness(course);

  if (mode === "latest") {
    return freshness * 3 + affinity * 0.35;
  }

  if (mode === "popular") {
    return completionSignal * 1.4 + thanksSignal * 1.2 + freshness * 0.4 + richness * 0.35;
  }

  return (
    affinity * 1.55 +
    freshness * 0.8 +
    completionSignal * 0.62 +
    thanksSignal * 0.72 +
    richness * 0.58 +
    deterministicNoise(`${viewer.id}:${course.id}`) * 0.05
  );
}

export function rankCourses<T extends RankableCourse>(
  courses: T[],
  viewer: Viewer,
  options: CourseRankOptions = {},
) {
  const mode = options.mode ?? "recommended";
  const now = resolveNow(options.now);

  return courses
    .map((course) => ({ course, score: courseScore(course, viewer, mode, now) }))
    .toSorted((a, b) => b.score - a.score)
    .map(({ course }) => course);
}
