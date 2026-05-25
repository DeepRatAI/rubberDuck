import { desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { courses, posts, saves, users } from "@/db/schema";

export type SavedItem = {
  id: string;
  entityType: "post" | "course";
  entityId: string;
  title: string;
  description: string;
  href: string;
  tags: string[];
  authorName: string;
  savedAt: string;
};

export async function listSavedItems(userId: string): Promise<SavedItem[]> {
  const saveRows = await db
    .select({
      entityType: saves.entityType,
      entityId: saves.entityId,
      savedAt: saves.createdAt,
    })
    .from(saves)
    .where(eq(saves.userId, userId))
    .orderBy(desc(saves.createdAt));

  const postIds = saveRows
    .filter((row) => row.entityType === "post")
    .map((row) => row.entityId);
  const courseIds = saveRows
    .filter((row) => row.entityType === "course")
    .map((row) => row.entityId);

  const [postRows, courseRows] = await Promise.all([
    postIds.length
      ? db
          .select({
            id: posts.id,
            title: posts.title,
            body: posts.body,
            tags: posts.tags,
            authorName: users.name,
          })
          .from(posts)
          .innerJoin(users, eq(posts.authorId, users.id))
          .where(inArray(posts.id, postIds))
      : Promise.resolve([]),
    courseIds.length
      ? db
          .select({
            id: courses.id,
            slug: courses.slug,
            title: courses.title,
            description: courses.description,
            tags: courses.tags,
            authorName: users.name,
          })
          .from(courses)
          .innerJoin(users, eq(courses.creatorId, users.id))
          .where(inArray(courses.id, courseIds))
      : Promise.resolve([]),
  ]);

  const postById = new Map(postRows.map((row) => [row.id, row]));
  const courseById = new Map(courseRows.map((row) => [row.id, row]));

  return saveRows.flatMap((row): SavedItem[] => {
    if (row.entityType === "post") {
      const post = postById.get(row.entityId);
      if (!post) {
        return [];
      }
      return [
        {
          id: `${row.entityType}-${row.entityId}`,
          entityType: "post",
          entityId: row.entityId,
          title: post.title,
          description: post.body,
          href: `/binnacle/${post.id}`,
          tags: post.tags,
          authorName: post.authorName ?? "Unknown",
          savedAt: row.savedAt.toISOString(),
        },
      ];
    }

    if (row.entityType === "course") {
      const course = courseById.get(row.entityId);
      if (!course) {
        return [];
      }
      return [
        {
          id: `${row.entityType}-${row.entityId}`,
          entityType: "course",
          entityId: row.entityId,
          title: course.title,
          description: course.description,
          href: `/courses/${course.slug}`,
          tags: course.tags,
          authorName: course.authorName ?? "Unknown",
          savedAt: row.savedAt.toISOString(),
        },
      ];
    }

    return [];
  });
}
