import { and, desc, eq, isNotNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  badges,
  comments,
  courseProgress,
  courses,
  follows,
  posts,
  profiles,
  thanks,
  users,
} from "@/db/schema";
import type { FeedItem, Profile } from "@/lib/domain";
import { mapProfileRowsToProfile } from "./mappers";

export type ProfileMetrics = {
  reputation: number | null;
  followers: number | null;
  contributions: number;
  helpfulAnswers: number;
  mentions: number;
};

export type ProfileCourseCompletion = {
  id: string;
  slug: string;
  title: string;
  creatorName: string;
  completedAt: string;
};

export async function getProfileByHandle(
  handle: string,
): Promise<Profile | null> {
  const [row] = await db
    .select({
      id: users.id,
      handle: profiles.handle,
      name: users.name,
      image: users.image,
      bannerUrl: profiles.bannerUrl,
      palette: profiles.palette,
      bio: profiles.bio,
      location: profiles.location,
      email: users.email,
      workStatus: profiles.workStatus,
      stack: profiles.stack,
      interests: profiles.interests,
      contentPreferences: profiles.contentPreferences,
      participationIntents: profiles.participationIntents,
      links: profiles.links,
      visibility: profiles.visibility,
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .where(eq(profiles.handle, handle));

  if (!row) {
    return null;
  }

  const [followers, creatorCourses, userBadges] = await Promise.all([
    db
      .select({ followerId: follows.followerId })
      .from(follows)
      .where(eq(follows.followingId, row.id)),
    db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.creatorId, row.id)),
    db
      .select({ label: badges.label })
      .from(badges)
      .where(eq(badges.userId, row.id)),
  ]);

  const courseIds = new Set(creatorCourses.map((course) => course.id));
  const allThanks = await db.select({ courseId: thanks.courseId }).from(thanks);
  const thanksCount = allThanks.filter((item) =>
    courseIds.has(item.courseId),
  ).length;

  return mapProfileRowsToProfile({
    id: row.id,
    handle: row.handle,
    name: row.name ?? row.handle,
    image: row.image,
    bannerUrl: row.bannerUrl,
    palette: row.palette,
    bio: row.bio,
    location: row.location ?? undefined,
    email: row.email,
    workStatus: row.workStatus,
    stack: row.stack,
    interests: row.interests,
    contentPreferences: row.contentPreferences,
    participationIntents: row.participationIntents,
    followers: followers.length,
    thanks: thanksCount,
    badges: userBadges.map((badge) => badge.label),
    links: row.links,
    visibility: row.visibility as Profile["visibility"],
  });
}

export async function getProfileMetrics(
  profile: Profile,
): Promise<ProfileMetrics> {
  const [
    postRows,
    commentRows,
    helpfulRows,
    mentionRows,
    followerRows,
    creatorCourses,
  ] = await Promise.all([
    db
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.authorId, profile.id), eq(posts.status, "active"))),
    db
      .select({ id: comments.id })
      .from(comments)
      .where(
        and(eq(comments.authorId, profile.id), eq(comments.status, "active")),
      ),
    db
      .select({ id: comments.id })
      .from(comments)
      .innerJoin(posts, eq(comments.postId, posts.id))
      .where(
        and(
          eq(comments.authorId, profile.id),
          eq(comments.status, "active"),
          eq(posts.category, "Help"),
        ),
      ),
    db
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(
          eq(posts.status, "active"),
          sql`${posts.body} ilike ${`%@${profile.handle}%`}`,
        ),
      ),
    db
      .select({ followerId: follows.followerId })
      .from(follows)
      .where(eq(follows.followingId, profile.id)),
    db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.creatorId, profile.id)),
  ]);

  const courseIds = new Set(creatorCourses.map((course) => course.id));
  const allThanks = await db.select({ courseId: thanks.courseId }).from(thanks);
  const reputation = allThanks.filter((item) =>
    courseIds.has(item.courseId),
  ).length;

  return {
    reputation,
    followers: followerRows.length,
    contributions: postRows.length + commentRows.length + creatorCourses.length,
    helpfulAnswers: helpfulRows.length,
    mentions: mentionRows.length,
  };
}

export async function listProfilePosts(
  userId: string,
  contentType?: "project_signal" | "build_log",
): Promise<FeedItem[]> {
  const rows = await db
    .select({
      id: posts.id,
      type: sql<"post">`'post'`,
      contentType: posts.contentType,
      category: posts.category,
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
    .where(
      and(
        eq(posts.authorId, userId),
        eq(posts.status, "active"),
        contentType ? eq(posts.contentType, contentType) : undefined,
      ),
    )
    .orderBy(desc(posts.createdAt));

  return rows.map((row) => ({
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
    createdAt: row.createdAt.toISOString(),
    interests: 0,
    comments: 0,
    projectSignal: row.projectSignal ?? undefined,
  }));
}

export async function listCompletedCoursesForProfile(
  userId: string,
): Promise<ProfileCourseCompletion[]> {
  const rows = await db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      creatorName: users.name,
      completedAt: courseProgress.completedAt,
    })
    .from(courseProgress)
    .innerJoin(courses, eq(courseProgress.courseId, courses.id))
    .innerJoin(users, eq(courses.creatorId, users.id))
    .where(
      and(
        eq(courseProgress.userId, userId),
        isNotNull(courseProgress.completedAt),
      ),
    )
    .orderBy(desc(courseProgress.completedAt));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    creatorName: row.creatorName ?? "Unknown",
    completedAt: row.completedAt?.toISOString() ?? "",
  }));
}

export async function getProfileByUserId(
  userId: string,
): Promise<Profile | null> {
  const [row] = await db
    .select({ handle: profiles.handle })
    .from(profiles)
    .where(eq(profiles.userId, userId));

  return row ? getProfileByHandle(row.handle) : null;
}

export async function listSuggestedProfiles(
  currentUserId: string,
): Promise<Profile[]> {
  const rows = await db
    .select({ handle: profiles.handle })
    .from(profiles)
    .where(eq(profiles.userId, currentUserId));

  const ownHandle = rows[0]?.handle;
  const allProfiles = await db
    .select({ handle: profiles.handle })
    .from(profiles);
  const suggestions = await Promise.all(
    allProfiles
      .filter((profile) => profile.handle !== ownHandle)
      .map((profile) => getProfileByHandle(profile.handle)),
  );

  return suggestions
    .filter((profile): profile is Profile => Boolean(profile))
    .slice(0, 3);
}
