import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { posts, profiles, projectSignalResponses, users } from "@/db/schema";
import type { ProjectSignalResponseSummary } from "@/lib/product-types";

export async function listProjectSignalResponsesForAuthor(
  postId: string,
  viewerId: string | null,
): Promise<ProjectSignalResponseSummary[]> {
  if (!viewerId) {
    return [];
  }

  const [post] = await db
    .select({
      id: posts.id,
      authorId: posts.authorId,
      contentType: posts.contentType,
      status: posts.status,
    })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.status, "active")));

  if (
    !post ||
    post.authorId !== viewerId ||
    post.contentType !== "project_signal"
  ) {
    return [];
  }

  const rows = await db
    .select({
      postId: projectSignalResponses.postId,
      userId: projectSignalResponses.userId,
      userName: users.name,
      userHandle: profiles.handle,
      intent: projectSignalResponses.intent,
      note: projectSignalResponses.note,
      createdAt: projectSignalResponses.createdAt,
    })
    .from(projectSignalResponses)
    .innerJoin(users, eq(projectSignalResponses.userId, users.id))
    .innerJoin(profiles, eq(projectSignalResponses.userId, profiles.userId))
    .where(eq(projectSignalResponses.postId, postId))
    .orderBy(desc(projectSignalResponses.createdAt));

  return rows.map((row) => ({
    postId: row.postId,
    userId: row.userId,
    userName: row.userName ?? "RubberDuck user",
    userHandle: row.userHandle,
    intent: row.intent,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  }));
}
