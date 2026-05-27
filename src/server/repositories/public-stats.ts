import { and, count, eq, gte } from "drizzle-orm";

import { db } from "@/db";
import { courses, posts, rssSources, users } from "@/db/schema";

export type PublicStats = {
  members: number;
  projects: number;
  courses: number;
  rssSources: number;
  todayPosts: number;
};

export const emptyPublicStats: PublicStats = {
  members: 0,
  projects: 0,
  courses: 0,
  rssSources: 0,
  todayPosts: 0,
};

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

async function getCount<T extends number>(query: Promise<Array<{ value: T }>>) {
  const [row] = await query;
  return row?.value ?? 0;
}

export async function getPublicStats(now = new Date()): Promise<PublicStats> {
  const todayStart = startOfUtcDay(now);
  const [members, projects, courseCount, sourceCount, todayPosts] =
    await Promise.all([
      getCount(db.select({ value: count() }).from(users)),
      getCount(
        db
          .select({ value: count() })
          .from(posts)
          .where(
            and(eq(posts.status, "active"), eq(posts.category, "Project")),
          ),
      ),
      getCount(
        db
          .select({ value: count() })
          .from(courses)
          .where(eq(courses.status, "published")),
      ),
      getCount(
        db
          .select({ value: count() })
          .from(rssSources)
          .where(eq(rssSources.enabled, true)),
      ),
      getCount(
        db
          .select({ value: count() })
          .from(posts)
          .where(
            and(eq(posts.status, "active"), gte(posts.createdAt, todayStart)),
          ),
      ),
    ]);

  return {
    members,
    projects,
    courses: courseCount,
    rssSources: sourceCount,
    todayPosts,
  };
}
