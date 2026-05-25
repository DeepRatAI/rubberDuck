import { eq, inArray, or } from "drizzle-orm";

import { db } from "@/db";
import {
  accounts,
  auditEvents,
  badges,
  comments,
  courseMediaAssets,
  courseProgress,
  courseRevisions,
  courseSections,
  courses,
  exercises,
  follows,
  notifications,
  postInterests,
  posts,
  projectSignalResponses,
  reports,
  saves,
  thanks,
  userInterests,
  users,
  profiles,
} from "@/db/schema";

function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function exportAccountData(userId: string) {
  const [
    userRows,
    profileRows,
    providerRows,
    followerRows,
    interestRows,
    postRows,
    commentRows,
    postInterestRows,
    projectResponseRows,
    courseRows,
    courseProgressRows,
    thanksRows,
    saveRows,
    reportRows,
    notificationRows,
    badgeRows,
    mediaRows,
    auditRows,
  ] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)),
    db.select().from(profiles).where(eq(profiles.userId, userId)),
    db
      .select({
        type: accounts.type,
        provider: accounts.provider,
        providerAccountId: accounts.providerAccountId,
      })
      .from(accounts)
      .where(eq(accounts.userId, userId)),
    db
      .select()
      .from(follows)
      .where(
        or(eq(follows.followerId, userId), eq(follows.followingId, userId)),
      ),
    db.select().from(userInterests).where(eq(userInterests.userId, userId)),
    db.select().from(posts).where(eq(posts.authorId, userId)),
    db.select().from(comments).where(eq(comments.authorId, userId)),
    db.select().from(postInterests).where(eq(postInterests.userId, userId)),
    db
      .select()
      .from(projectSignalResponses)
      .where(eq(projectSignalResponses.userId, userId)),
    db.select().from(courses).where(eq(courses.creatorId, userId)),
    db.select().from(courseProgress).where(eq(courseProgress.userId, userId)),
    db.select().from(thanks).where(eq(thanks.userId, userId)),
    db.select().from(saves).where(eq(saves.userId, userId)),
    db.select().from(reports).where(eq(reports.reporterId, userId)),
    db
      .select()
      .from(notifications)
      .where(
        or(
          eq(notifications.recipientId, userId),
          eq(notifications.actorId, userId),
        ),
      ),
    db.select().from(badges).where(eq(badges.userId, userId)),
    db
      .select()
      .from(courseMediaAssets)
      .where(eq(courseMediaAssets.ownerId, userId)),
    db.select().from(auditEvents).where(eq(auditEvents.actorId, userId)),
  ]);

  const courseIds = courseRows.map((course) => course.id);
  const [sectionRows, exerciseRows, revisionRows] = courseIds.length
    ? await Promise.all([
        db
          .select()
          .from(courseSections)
          .where(inArray(courseSections.courseId, courseIds)),
        db
          .select()
          .from(exercises)
          .where(inArray(exercises.courseId, courseIds)),
        db
          .select()
          .from(courseRevisions)
          .where(inArray(courseRevisions.courseId, courseIds)),
      ])
    : [[], [], []];

  return serialize({
    schema: "rubberduck.account-export.v1",
    exportedAt: new Date().toISOString(),
    userId,
    account: userRows[0] ?? null,
    profile: profileRows[0] ?? null,
    providers: providerRows,
    social: {
      follows: followerRows,
      userInterests: interestRows,
      postInterests: postInterestRows,
      projectSignalResponses: projectResponseRows,
      badges: badgeRows,
    },
    content: {
      posts: postRows,
      comments: commentRows,
      courses: courseRows,
      courseSections: sectionRows,
      exercises: exerciseRows,
      courseRevisions: revisionRows,
      courseMediaAssets: mediaRows,
    },
    learning: {
      courseProgress: courseProgressRows,
      thanks: thanksRows,
      saves: saveRows,
    },
    safetyAndOperations: {
      reports: reportRows,
      notifications: notificationRows,
      auditEvents: auditRows,
    },
    redactions: [
      "OAuth access tokens, refresh tokens, ID tokens, session tokens, and verification tokens are intentionally excluded.",
    ],
  });
}

export async function deleteAccountData(userId: string) {
  return db.transaction(async (tx) => {
    await tx.insert(auditEvents).values({
      actorId: userId,
      action: "account.delete",
      entityType: "user",
      entityId: userId,
      metadata: { initiatedBy: "self" },
    });

    const [deleted] = await tx
      .delete(users)
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    if (!deleted) {
      throw new Error("Account not found.");
    }

    return { deleted: true as const, userId: deleted.id };
  });
}
