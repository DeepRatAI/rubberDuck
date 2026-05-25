import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  comments,
  courses,
  feedFeedback,
  feedImpressions,
  follows,
  postInterests,
  projectSignalResponses,
  posts,
  profiles,
  reports,
  rssItems,
  rssSources,
  saves,
  tags,
  userInterests,
  users,
} from "@/db/schema";
import type { BinnacleCategory, FeedItem, Viewer } from "@/lib/domain";
import { buildHomeFeed } from "@/lib/domain";
import { applyFeedControls } from "@/lib/feed-controls";
import {
  uniqueProjectSignalResponses,
  type ProjectSignalResponseIntent,
} from "@/lib/project-signal-actions";
import type { FeedRankingMode } from "@/lib/ranking";
import { mapPostRowsToFeedItems, type PersistedPostFeedRow } from "./mappers";

export async function getViewer(userId: string): Promise<Viewer> {
  const [[profile], followRows, interestRows] = await Promise.all([
    db
      .select({
        interests: profiles.interests,
        stack: profiles.stack,
        contentPreferences: profiles.contentPreferences,
        participationIntents: profiles.participationIntents,
      })
      .from(profiles)
      .where(eq(profiles.userId, userId)),
    db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId)),
    db
      .select({ label: tags.label })
      .from(userInterests)
      .innerJoin(tags, eq(userInterests.tagId, tags.id))
      .where(eq(userInterests.userId, userId)),
  ]);
  const interests = Array.from(
    new Set([
      ...(profile?.interests ?? []),
      ...(profile?.stack ?? []),
      ...(profile?.contentPreferences ?? []),
      ...(profile?.participationIntents ?? []),
      ...interestRows.map((row) => row.label),
    ]),
  );

  return {
    id: userId,
    follows: followRows.map((follow) => follow.followingId),
    interests,
  };
}

export async function listFeedItems(filters: {
  viewerId: string;
  category?: BinnacleCategory;
  query?: string;
  hashtag?: string;
  mode?: FeedRankingMode;
}): Promise<FeedItem[]> {
  const postRows = await db
    .select({
      id: posts.id,
      category: posts.category,
      contentType: posts.contentType,
      title: posts.title,
      body: posts.body,
      authorId: posts.authorId,
      authorName: users.name,
      tags: posts.tags,
      media: posts.media,
      projectSignal: posts.projectSignal,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.status, "active"))
    .orderBy(desc(posts.createdAt));

  const postIds = postRows.map((row) => row.id);
  const [interestRows, commentRows, saveRows, reportRows, responseRows] =
    postIds.length > 0
      ? await Promise.all([
          db
            .select({
              postId: postInterests.postId,
              userId: postInterests.userId,
            })
            .from(postInterests)
            .where(inArray(postInterests.postId, postIds)),
          db
            .select({ postId: comments.postId })
            .from(comments)
            .where(
              and(
                inArray(comments.postId, postIds),
                eq(comments.status, "active"),
              ),
            ),
          db
            .select({ entityId: saves.entityId })
            .from(saves)
            .where(
              and(
                eq(saves.userId, filters.viewerId),
                eq(saves.entityType, "post"),
                inArray(saves.entityId, postIds),
              ),
            ),
          db
            .select({ entityId: reports.entityId })
            .from(reports)
            .where(
              and(
                eq(reports.reporterId, filters.viewerId),
                eq(reports.entityType, "post"),
                inArray(reports.entityId, postIds),
              ),
            ),
          db
            .select({
              postId: projectSignalResponses.postId,
              intent: projectSignalResponses.intent,
            })
            .from(projectSignalResponses)
            .where(
              and(
                eq(projectSignalResponses.userId, filters.viewerId),
                inArray(projectSignalResponses.postId, postIds),
              ),
            ),
        ])
      : [[], [], [], [], []];

  const interestCounts = new Map<string, number>();
  const commentCounts = new Map<string, number>();
  const interestedPostIds = new Set<string>();
  const savedPostIds = new Set(saveRows.map((row) => row.entityId));
  const reportedPostIds = new Set(reportRows.map((row) => row.entityId));
  const projectResponseIntentsByPost = new Map<
    string,
    ProjectSignalResponseIntent[]
  >();

  for (const row of interestRows) {
    interestCounts.set(row.postId, (interestCounts.get(row.postId) ?? 0) + 1);
    if (row.userId === filters.viewerId) {
      interestedPostIds.add(row.postId);
    }
  }

  for (const row of commentRows) {
    commentCounts.set(row.postId, (commentCounts.get(row.postId) ?? 0) + 1);
  }

  for (const row of responseRows) {
    projectResponseIntentsByPost.set(row.postId, [
      ...(projectResponseIntentsByPost.get(row.postId) ?? []),
      row.intent,
    ]);
  }

  const persistedPostRows: PersistedPostFeedRow[] = postRows.map((row) => ({
    id: row.id,
    type: "post",
    contentType: row.contentType,
    category: row.category,
    title: row.title,
    body: row.body,
    authorId: row.authorId,
    authorName: row.authorName ?? "Unknown",
    tags: row.tags,
    media: row.media,
    projectSignal: row.projectSignal,
    projectSignalViewerResponses: uniqueProjectSignalResponses(
      projectResponseIntentsByPost.get(row.id) ?? [],
    ),
    createdAt: row.createdAt,
    interests: interestCounts.get(row.id) ?? 0,
    comments: commentCounts.get(row.id) ?? 0,
    viewerState: {
      interested: interestedPostIds.has(row.id),
      saved: savedPostIds.has(row.id),
      reported: reportedPostIds.has(row.id),
      canDelete: row.authorId === filters.viewerId,
    },
  }));

  const rssRows = await db
    .select({
      id: rssItems.id,
      title: rssItems.title,
      body: rssItems.summary,
      tags: rssItems.tags,
      createdAt: rssItems.publishedAt,
      sourceName: rssSources.name,
      sourceUrl: rssItems.url,
      imageUrl: rssItems.imageUrl,
    })
    .from(rssItems)
    .innerJoin(rssSources, eq(rssItems.sourceId, rssSources.id))
    .where(eq(rssSources.enabled, true))
    .orderBy(desc(rssItems.publishedAt));

  const rssFeedRows: PersistedPostFeedRow[] = rssRows.map((row) => ({
    id: row.id,
    type: "rss",
    category: "News",
    title: row.title,
    body: row.body,
    authorId: "rss",
    authorName: `RSS: ${row.sourceName}`,
    tags: row.tags,
    media: [],
    createdAt: row.createdAt,
    interests: 0,
    comments: 0,
    sourceUrl: row.sourceUrl,
    imageUrl: row.imageUrl ?? undefined,
  }));

  const courseRows = await db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      body: courses.description,
      creatorId: courses.creatorId,
      creatorName: users.name,
      tags: courses.tags,
      completionCount: courses.completionCount,
      coverUrl: courses.coverUrl,
      updatedAt: courses.updatedAt,
    })
    .from(courses)
    .innerJoin(users, eq(courses.creatorId, users.id))
    .where(eq(courses.status, "published"))
    .orderBy(desc(courses.updatedAt));

  const courseFeedRows: PersistedPostFeedRow[] = courseRows.map((row) => ({
    id: row.slug,
    type: "course",
    category: "Help",
    title: row.title,
    body: row.body,
    authorId: row.creatorId,
    authorName: row.creatorName ?? "RubberDuck creator",
    tags: row.tags,
    media: [],
    createdAt: row.updatedAt,
    interests: row.completionCount,
    comments: 0,
    sourceUrl: `/courses/${row.slug}`,
    imageUrl: row.coverUrl ?? undefined,
  }));

  const [viewer, feedbackRows, impressionRows] = await Promise.all([
    getViewer(filters.viewerId),
    db
      .select({
        entityType: feedFeedback.entityType,
        entityId: feedFeedback.entityId,
        signal: feedFeedback.signal,
        value: feedFeedback.value,
      })
      .from(feedFeedback)
      .where(eq(feedFeedback.userId, filters.viewerId)),
    db
      .select({
        entityType: feedImpressions.entityType,
        entityId: feedImpressions.entityId,
        seenCount: feedImpressions.seenCount,
      })
      .from(feedImpressions)
      .where(eq(feedImpressions.userId, filters.viewerId)),
  ]);
  const ranked = buildHomeFeed(
    mapPostRowsToFeedItems([
      ...persistedPostRows,
      ...rssFeedRows,
      ...courseFeedRows,
    ]),
    {
      viewer,
      category: filters.category,
      query: filters.query,
      hashtag: filters.hashtag,
      mode: filters.mode,
    },
  );

  return applyFeedControls(ranked, {
    feedback: feedbackRows,
    impressions: impressionRows,
  });
}

export type FeedPage = {
  items: FeedItem[];
  nextCursor: number | null;
  total: number;
};

export async function listFeedPage(filters: {
  viewerId: string;
  category?: BinnacleCategory;
  query?: string;
  hashtag?: string;
  mode?: FeedRankingMode;
  cursor?: number;
  pageSize?: number;
}): Promise<FeedPage> {
  const cursor = Math.max(0, filters.cursor ?? 0);
  const pageSize = Math.min(30, Math.max(1, filters.pageSize ?? 10));
  const items = await listFeedItems(filters);
  const pageItems = items.slice(cursor, cursor + pageSize);
  const nextCursor =
    cursor + pageItems.length < items.length ? cursor + pageItems.length : null;

  return {
    items: pageItems,
    nextCursor,
    total: items.length,
  };
}

export async function getFeedItemById(
  postId: string,
  viewerId: string | null = null,
): Promise<FeedItem | null> {
  const [row] = await db
    .select({
      id: posts.id,
      category: posts.category,
      contentType: posts.contentType,
      title: posts.title,
      body: posts.body,
      authorId: posts.authorId,
      authorName: users.name,
      tags: posts.tags,
      media: posts.media,
      projectSignal: posts.projectSignal,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(and(eq(posts.id, postId), eq(posts.status, "active")));

  if (!row) {
    return null;
  }

  const [interestRows, commentRows, saveRows, reportRows, responseRows] =
    await Promise.all([
      db
        .select({
          postId: postInterests.postId,
          userId: postInterests.userId,
        })
        .from(postInterests)
        .where(eq(postInterests.postId, postId)),
      db
        .select({ postId: comments.postId })
        .from(comments)
        .where(and(eq(comments.postId, postId), eq(comments.status, "active"))),
      viewerId
        ? db
            .select({ entityId: saves.entityId })
            .from(saves)
            .where(
              and(
                eq(saves.userId, viewerId),
                eq(saves.entityType, "post"),
                eq(saves.entityId, postId),
              ),
            )
        : Promise.resolve([]),
      viewerId
        ? db
            .select({ entityId: reports.entityId })
            .from(reports)
            .where(
              and(
                eq(reports.reporterId, viewerId),
                eq(reports.entityType, "post"),
                eq(reports.entityId, postId),
              ),
            )
        : Promise.resolve([]),
      viewerId
        ? db
            .select({
              intent: projectSignalResponses.intent,
            })
            .from(projectSignalResponses)
            .where(
              and(
                eq(projectSignalResponses.userId, viewerId),
                eq(projectSignalResponses.postId, postId),
              ),
            )
        : Promise.resolve([]),
    ]);

  const [item] = mapPostRowsToFeedItems([
    {
      id: row.id,
      type: "post",
      contentType: row.contentType,
      category: row.category,
      title: row.title,
      body: row.body,
      authorId: row.authorId,
      authorName: row.authorName ?? "Unknown",
      tags: row.tags,
      media: row.media,
      projectSignal: row.projectSignal,
      projectSignalViewerResponses: uniqueProjectSignalResponses(
        responseRows.map((response) => response.intent),
      ),
      createdAt: row.createdAt,
      interests: interestRows.length,
      comments: commentRows.length,
      viewerState: {
        interested:
          Boolean(viewerId) &&
          interestRows.some((interest) => interest.userId === viewerId),
        saved: saveRows.length > 0,
        reported: reportRows.length > 0,
        canDelete: Boolean(viewerId) && row.authorId === viewerId,
      },
    },
  ]);

  return item ?? null;
}
