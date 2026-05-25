import type { FeedItem } from "./domain";

export type FeedFeedbackSignal =
  | "more_like_this"
  | "less_like_this"
  | "mute_source"
  | "mute_tag";

export type FeedControlFeedback = {
  entityType: string;
  entityId: string;
  signal: FeedFeedbackSignal;
  value?: string | null;
};

export type FeedControlImpression = {
  entityType: string;
  entityId: string;
  seenCount: number;
};

export type FeedControlOptions = {
  feedback: FeedControlFeedback[];
  impressions?: FeedControlImpression[];
};

function keyFor(entityType: string, entityId: string) {
  return `${entityType}:${entityId}`;
}

function itemKey(item: FeedItem) {
  return keyFor(item.type, item.id);
}

function normalized(value: string) {
  return value.trim().toLowerCase();
}

function sourceKey(item: FeedItem) {
  if (item.type === "rss") {
    return normalized(item.authorName.replace(/^RSS:\s*/i, ""));
  }

  return normalized(item.authorId);
}

function impressionPenalty(item: FeedItem, seenCount: number) {
  if (seenCount <= 1) {
    return 0;
  }

  const maxPenalty = item.type === "rss" ? 1.7 : 1.35;
  return Math.min(
    maxPenalty,
    (Math.log1p(seenCount - 1) / Math.log1p(12)) * maxPenalty,
  );
}

export function applyFeedControls(
  rankedItems: FeedItem[],
  options: FeedControlOptions,
) {
  const lessItems = new Set(
    options.feedback
      .filter((row) => row.signal === "less_like_this")
      .map((row) => keyFor(row.entityType, row.entityId)),
  );
  const moreItems = new Set(
    options.feedback
      .filter((row) => row.signal === "more_like_this")
      .map((row) => keyFor(row.entityType, row.entityId)),
  );
  const mutedTags = new Set(
    options.feedback
      .filter((row) => row.signal === "mute_tag" && row.value)
      .map((row) => normalized(row.value ?? "")),
  );
  const mutedSources = new Set(
    options.feedback
      .filter((row) => row.signal === "mute_source" && row.value)
      .map((row) => normalized(row.value ?? "")),
  );
  const seenCounts = new Map(
    (options.impressions ?? []).map((row) => [
      keyFor(row.entityType, row.entityId),
      row.seenCount,
    ]),
  );

  return rankedItems
    .filter((item) => {
      if (lessItems.has(itemKey(item))) {
        return false;
      }

      if (item.tags.some((tag) => mutedTags.has(normalized(tag)))) {
        return false;
      }

      return !mutedSources.has(sourceKey(item));
    })
    .map((item, index) => {
      const seenCount = seenCounts.get(itemKey(item)) ?? 0;
      const preferenceBoost = moreItems.has(itemKey(item)) ? 2 : 0;
      const seenPenalty = impressionPenalty(item, seenCount);

      return {
        item,
        score: rankedItems.length - index + preferenceBoost - seenPenalty,
      };
    })
    .toSorted((a, b) => b.score - a.score)
    .map(({ item }) => item);
}
