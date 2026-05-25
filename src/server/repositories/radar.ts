import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  comments,
  postInterests,
  posts,
  projectSignalResponses,
  users,
} from "@/db/schema";
import type { ProjectSignalMetadata } from "@/lib/project-signals";

export type RadarBucket =
  | "under_discovered"
  | "needs_feedback"
  | "needs_contributors"
  | "active_interest";

export type RadarProject = {
  postId: string;
  title: string;
  body: string;
  authorName: string;
  tags: string[];
  createdAt: string;
  signal: ProjectSignalMetadata;
  interestCount: number;
  commentCount: number;
  responseCount: number;
  buckets: RadarBucket[];
  score: number;
};

function bucketsFor({
  signal,
  interestCount,
  commentCount,
  responseCount,
}: {
  signal: ProjectSignalMetadata;
  interestCount: number;
  commentCount: number;
  responseCount: number;
}): RadarBucket[] {
  const buckets: RadarBucket[] = [];
  const needs = signal.needs.map((need) => need.toLowerCase());
  const intent = signal.intent.toLowerCase();

  if (interestCount + commentCount + responseCount <= 2) {
    buckets.push("under_discovered");
  }

  if (
    intent.includes("feedback") ||
    needs.some((need) => need.includes("feedback") || need.includes("review"))
  ) {
    buckets.push("needs_feedback");
  }

  if (
    intent.includes("contributor") ||
    needs.some(
      (need) =>
        need.includes("contributor") ||
        need.includes("maintainer") ||
        need.includes("testing"),
    )
  ) {
    buckets.push("needs_contributors");
  }

  if (interestCount + responseCount >= 3) {
    buckets.push("active_interest");
  }

  return buckets.length ? buckets : ["under_discovered"];
}

function scoreProject(project: Omit<RadarProject, "buckets" | "score">) {
  const evidenceScore =
    Math.min(project.signal.evidence.stars, 500) / 25 +
    Math.min(project.signal.evidence.forks, 100) / 10;
  const engagementScore =
    project.interestCount * 4 +
    project.responseCount * 8 +
    project.commentCount * 2;
  const needBoost = project.signal.needs.length * 3;
  const underDiscoveredBoost =
    project.interestCount + project.responseCount <= 1 ? 12 : 0;

  return Math.round(
    evidenceScore + engagementScore + needBoost + underDiscoveredBoost,
  );
}

export async function listRadarProjects(filters?: {
  bucket?: RadarBucket;
  query?: string;
}) {
  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      body: posts.body,
      authorName: users.name,
      tags: posts.tags,
      projectSignal: posts.projectSignal,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(
      and(eq(posts.status, "active"), eq(posts.contentType, "project_signal")),
    )
    .orderBy(desc(posts.createdAt));

  const postIds = rows.map((row) => row.id);
  const [interestRows, commentRows, responseRows] = postIds.length
    ? await Promise.all([
        db
          .select({ postId: postInterests.postId })
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
          .select({ postId: projectSignalResponses.postId })
          .from(projectSignalResponses)
          .where(inArray(projectSignalResponses.postId, postIds)),
      ])
    : [[], [], []];

  const interestCounts = new Map<string, number>();
  const commentCounts = new Map<string, number>();
  const responseCounts = new Map<string, number>();

  for (const row of interestRows) {
    interestCounts.set(row.postId, (interestCounts.get(row.postId) ?? 0) + 1);
  }

  for (const row of commentRows) {
    commentCounts.set(row.postId, (commentCounts.get(row.postId) ?? 0) + 1);
  }

  for (const row of responseRows) {
    responseCounts.set(row.postId, (responseCounts.get(row.postId) ?? 0) + 1);
  }

  const query = filters?.query?.trim().toLowerCase();

  return rows
    .flatMap((row): RadarProject[] => {
      if (!row.projectSignal) {
        return [];
      }

      const base = {
        postId: row.id,
        title: row.title,
        body: row.body,
        authorName: row.authorName ?? "Unknown",
        tags: row.tags,
        createdAt: row.createdAt.toISOString(),
        signal: row.projectSignal,
        interestCount: interestCounts.get(row.id) ?? 0,
        commentCount: commentCounts.get(row.id) ?? 0,
        responseCount: responseCounts.get(row.id) ?? 0,
      };
      const buckets = bucketsFor(base);
      const project = {
        ...base,
        buckets,
        score: scoreProject(base),
      };

      if (filters?.bucket && !project.buckets.includes(filters.bucket)) {
        return [];
      }

      if (
        query &&
        ![
          project.title,
          project.body,
          project.authorName,
          project.signal.owner,
          project.signal.name,
          project.signal.description,
          ...project.tags,
          ...project.signal.stack,
          ...project.signal.domains,
          ...project.signal.needs,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      ) {
        return [];
      }

      return [project];
    })
    .toSorted(
      (a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt),
    );
}
