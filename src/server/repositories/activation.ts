import { and, eq, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import {
  comments,
  courseProgress,
  follows,
  posts,
  profiles,
  saves,
  users,
} from "@/db/schema";

export type ActivationTaskId =
  | "profile"
  | "project_signal"
  | "helpful_answer"
  | "course"
  | "follow"
  | "save";

export type ActivationTask = {
  id: ActivationTaskId;
  completed: boolean;
  href: string;
  weight: number;
};

export type ActivationSnapshot = {
  completionPercent: number;
  tasks: ActivationTask[];
};

function hasStrongProfile(profile: {
  bio: string;
  stack: string[];
  interests: string[];
  contentPreferences: string[];
  participationIntents: string[];
  image: string | null;
}) {
  return (
    profile.bio.trim().length >= 40 &&
    profile.stack.length >= 3 &&
    profile.interests.length >= 3 &&
    profile.contentPreferences.length >= 2 &&
    profile.participationIntents.length >= 2 &&
    Boolean(profile.image)
  );
}

export async function getActivationSnapshot(
  userId: string,
): Promise<ActivationSnapshot> {
  const [
    profileRows,
    projectSignalRows,
    helpfulRows,
    completedCourseRows,
    followRows,
    saveRows,
  ] = await Promise.all([
    db
      .select({
        handle: profiles.handle,
        bio: profiles.bio,
        stack: profiles.stack,
        interests: profiles.interests,
        contentPreferences: profiles.contentPreferences,
        participationIntents: profiles.participationIntents,
        image: users.image,
      })
      .from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .where(eq(profiles.userId, userId)),
    db
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(
          eq(posts.authorId, userId),
          eq(posts.contentType, "project_signal"),
          eq(posts.status, "active"),
        ),
      ),
    db
      .select({ id: comments.id })
      .from(comments)
      .where(
        and(
          eq(comments.authorId, userId),
          eq(comments.helpfulByAuthor, true),
          eq(comments.status, "active"),
        ),
      ),
    db
      .select({ courseId: courseProgress.courseId })
      .from(courseProgress)
      .where(
        and(
          eq(courseProgress.userId, userId),
          isNotNull(courseProgress.completedAt),
        ),
      ),
    db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId)),
    db
      .select({ entityId: saves.entityId })
      .from(saves)
      .where(eq(saves.userId, userId)),
  ]);
  const profile = profileRows[0] ?? null;
  const handle = profile?.handle ?? "";
  const tasks: ActivationTask[] = [
    {
      id: "profile",
      completed: profile ? hasStrongProfile(profile) : false,
      href: `/settings/profile`,
      weight: 20,
    },
    {
      id: "project_signal",
      completed: projectSignalRows.length > 0,
      href: `/binnacle`,
      weight: 20,
    },
    {
      id: "helpful_answer",
      completed: helpfulRows.length > 0,
      href: `/binnacle?category=Help`,
      weight: 15,
    },
    {
      id: "course",
      completed: completedCourseRows.length > 0,
      href: `/courses`,
      weight: 15,
    },
    {
      id: "follow",
      completed: followRows.length >= 3,
      href: `/people`,
      weight: 15,
    },
    {
      id: "save",
      completed: saveRows.length >= 3,
      href: handle ? `/u/${handle}` : `/saved`,
      weight: 15,
    },
  ];
  const earned = tasks.reduce(
    (total, task) => total + (task.completed ? task.weight : 0),
    0,
  );
  const possible = tasks.reduce((total, task) => total + task.weight, 0);

  return {
    completionPercent: Math.round((earned / possible) * 100),
    tasks,
  };
}
