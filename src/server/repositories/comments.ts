import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { comments, posts, profiles, users } from "@/db/schema";
import type { CommentNode } from "@/lib/product-types";

export async function getCommentsForPost(
  postId: string,
  viewerId: string | null,
): Promise<CommentNode[]> {
  const rows = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      parentId: comments.parentId,
      authorId: comments.authorId,
      body: comments.body,
      status: comments.status,
      helpfulByAuthor: comments.helpfulByAuthor,
      createdAt: comments.createdAt,
      postAuthorId: posts.authorId,
      postContentType: posts.contentType,
      postCategory: posts.category,
      authorName: users.name,
      authorHandle: profiles.handle,
    })
    .from(comments)
    .innerJoin(posts, eq(comments.postId, posts.id))
    .innerJoin(users, eq(comments.authorId, users.id))
    .innerJoin(profiles, eq(comments.authorId, profiles.userId))
    .where(eq(comments.postId, postId))
    .orderBy(asc(comments.createdAt));

  const byParent = new Map<string | null, typeof rows>();
  for (const row of rows) {
    const parentId = row.parentId ?? null;
    byParent.set(parentId, [...(byParent.get(parentId) ?? []), row]);
  }

  function build(parentId: string | null): CommentNode[] {
    return (byParent.get(parentId) ?? []).map((row) => ({
      id: row.id,
      postId: row.postId,
      authorName: row.authorName ?? "Unknown",
      authorHandle: row.authorHandle,
      body: row.status === "active" ? row.body : "_Comment removed by author._",
      status: row.status as "active" | "deleted" | "hidden",
      canDelete:
        Boolean(viewerId) &&
        row.status === "active" &&
        row.authorId === viewerId,
      canMarkHelpful:
        Boolean(viewerId) &&
        row.status === "active" &&
        row.postAuthorId === viewerId &&
        (row.postContentType === "question" || row.postCategory === "Help"),
      helpfulByAuthor: row.helpfulByAuthor,
      createdAt: row.createdAt.toISOString(),
      replies: build(row.id),
    }));
  }

  return build(null);
}
