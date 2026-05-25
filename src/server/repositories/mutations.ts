import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  auditEvents,
  accountModerationActions,
  badges,
  comments,
  courseProgress,
  courseRevisions,
  courses,
  courseSections,
  exercises,
  follows,
  notifications,
  postAudienceTargets,
  postInterests,
  postTags,
  projectSignalResponses,
  posts,
  profiles,
  reports,
  saves,
  tags as tagsTable,
  thanks,
  userInterests,
  users,
} from "@/db/schema";
import { buildCourseRevisionSnapshot } from "@/lib/course-revisions";
import { completeCourseIfEligible } from "@/lib/domain";
import { createProjectSignalResponseNotification } from "@/lib/project-signal-actions";
import {
  getTagCategory,
  normalizeTagLabels,
  toTagSlug,
} from "@/lib/social-taxonomy";
import type {
  commentSchema,
  commentHelpfulSchema,
  accountModerationActionSchema,
  courseEntitySchema,
  courseDraftSchema,
  courseSectionViewSchema,
  exerciseResultSchema,
  followProfileSchema,
  moderationEntityActionSchema,
  notificationReadSchema,
  onboardingSchema,
  postEntitySchema,
  postSchema,
  projectSignalResponseSchema,
  profileUpdateSchema,
  reportSchema,
} from "@/lib/validators";
import type { z } from "zod";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function upsertTagIds(labels: string[]) {
  const normalizedLabels = normalizeTagLabels(labels);

  if (normalizedLabels.length === 0) {
    return new Map<string, string>();
  }

  const tagValues = normalizedLabels.map((label) => ({
    slug: toTagSlug(label),
    label,
    category: getTagCategory(label),
  }));

  await db
    .insert(tagsTable)
    .values(tagValues)
    .onConflictDoUpdate({
      target: tagsTable.slug,
      set: {
        label: sql`excluded.label`,
        category: sql`excluded.category`,
      },
    });

  const rows = await db
    .select({ id: tagsTable.id, slug: tagsTable.slug })
    .from(tagsTable)
    .where(
      inArray(
        tagsTable.slug,
        tagValues.map((tag) => tag.slug),
      ),
    );

  return new Map(rows.map((row) => [row.slug, row.id]));
}

async function syncUserInterestSignals(
  userId: string,
  labels: string[],
  source: string,
) {
  const tagIdsBySlug = await upsertTagIds(labels);
  const rows = normalizeTagLabels(labels)
    .map((label) => tagIdsBySlug.get(toTagSlug(label)))
    .filter(Boolean)
    .map((tagId) => ({
      userId,
      tagId: tagId as string,
      weight: 100,
      source,
      updatedAt: new Date(),
    }));

  if (rows.length === 0) {
    return;
  }

  await db
    .insert(userInterests)
    .values(rows)
    .onConflictDoUpdate({
      target: [userInterests.userId, userInterests.tagId],
      set: {
        weight: 100,
        source,
        updatedAt: new Date(),
      },
    });
}

function postDiscoveryLabels(input: z.infer<typeof postSchema>) {
  const signal = input.projectSignal;
  const tagLabels = normalizeTagLabels([
    ...input.tags,
    ...(signal?.domains ?? []),
    ...(signal?.stack ?? []),
    ...(signal?.needs ?? []),
    ...(signal ? [signal.maturity, signal.intent] : []),
  ]);
  const audienceLabels = normalizeTagLabels(
    signal
      ? [
          ...signal.domains,
          ...signal.needs,
          ...signal.audience,
          ...signal.stack,
        ]
      : input.tags,
  );

  return { tagLabels, audienceLabels };
}

async function attachPostDiscoverySignals(
  postId: string,
  input: z.infer<typeof postSchema>,
) {
  const { tagLabels, audienceLabels } = postDiscoveryLabels(input);
  const tagIdsBySlug = await upsertTagIds([...tagLabels, ...audienceLabels]);

  const postTagRows = tagLabels
    .map((label) => tagIdsBySlug.get(toTagSlug(label)))
    .filter(Boolean)
    .map((tagId) => ({
      postId,
      tagId: tagId as string,
      source:
        input.contentType === "project_signal" ? "project_signal" : "author",
      confidence: input.contentType === "project_signal" ? 100 : 85,
    }));

  const audienceRows = audienceLabels
    .map((label) => tagIdsBySlug.get(toTagSlug(label)))
    .filter(Boolean)
    .map((tagId) => ({
      postId,
      tagId: tagId as string,
      weight: 100,
    }));

  if (postTagRows.length > 0) {
    await db.insert(postTags).values(postTagRows).onConflictDoNothing();
  }

  if (audienceRows.length > 0) {
    await db
      .insert(postAudienceTargets)
      .values(audienceRows)
      .onConflictDoNothing();
  }
}

async function replacePostDiscoverySignals(
  postId: string,
  input: z.infer<typeof postSchema>,
) {
  await db.delete(postTags).where(eq(postTags.postId, postId));
  await db
    .delete(postAudienceTargets)
    .where(eq(postAudienceTargets.postId, postId));
  await attachPostDiscoverySignals(postId, input);
}

async function attemptCourseCompletion(userId: string, courseId: string) {
  const [course] = await db
    .select({
      id: courses.id,
      title: courses.title,
      creatorId: courses.creatorId,
    })
    .from(courses)
    .where(eq(courses.id, courseId));

  if (!course) {
    throw new Error("Course not found.");
  }

  const [progressRows, sectionRows, exerciseRows] = await Promise.all([
    db
      .select()
      .from(courseProgress)
      .where(
        and(
          eq(courseProgress.courseId, courseId),
          eq(courseProgress.userId, userId),
        ),
      ),
    db
      .select({ id: courseSections.id })
      .from(courseSections)
      .where(eq(courseSections.courseId, courseId)),
    db
      .select({ id: exercises.id, sectionId: exercises.sectionId })
      .from(exercises)
      .where(eq(exercises.courseId, courseId)),
  ]);
  const progressRow = progressRows[0];

  if (!progressRow) {
    return { completed: false, alreadyCompleted: false };
  }

  if (progressRow.completedAt) {
    return { completed: true, alreadyCompleted: true };
  }

  const completion = completeCourseIfEligible(
    {
      id: course.id,
      slug: course.id,
      title: course.title,
      description: course.title,
      creatorId: course.creatorId,
      tags: [],
      sections: sectionRows.map((section) => ({
        id: section.id,
        title: section.id,
        requiredExerciseIds: exerciseRows
          .filter((exercise) => exercise.sectionId === section.id)
          .map((exercise) => exercise.id),
      })),
    },
    {
      courseId,
      userId,
      viewedSectionIds: progressRow.viewedSectionIds,
      passedExerciseIds: progressRow.passedExerciseIds,
      completedAt: null,
    },
  );

  if (!completion.completed) {
    return { completed: false, alreadyCompleted: false };
  }

  const now = new Date();
  const committed = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(courseProgress)
      .set({ completedAt: now, updatedAt: now })
      .where(
        and(
          eq(courseProgress.courseId, courseId),
          eq(courseProgress.userId, userId),
          isNull(courseProgress.completedAt),
        ),
      )
      .returning({ courseId: courseProgress.courseId });

    if (!updated) {
      return false;
    }

    await tx
      .update(courses)
      .set({
        completionCount: sql`${courses.completionCount} + 1`,
        updatedAt: now,
      })
      .where(eq(courses.id, courseId));

    await tx.insert(notifications).values([
      {
        recipientId: course.creatorId,
        actorId: userId,
        type: "course_completed",
        message: `A learner completed ${course.title}.`,
        entityId: courseId,
        read: false,
      },
      {
        recipientId: userId,
        actorId: course.creatorId,
        type: "thanks_nudge",
        message: `Leave Thanks if ${course.title} helped you.`,
        entityId: courseId,
        read: false,
      },
    ]);

    return true;
  });

  return { completed: true, alreadyCompleted: !committed };
}

export async function persistOnboarding(
  userId: string,
  input: z.infer<typeof onboardingSchema>,
) {
  await db
    .update(profiles)
    .set({
      stack: input.stack,
      interests: input.interests,
      contentPreferences: input.contentPreferences,
      participationIntents: input.participationIntents,
      seniority: input.seniority,
      location: input.location,
      workStatus: input.workStatus,
      availability: input.availability,
      onboardedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, userId));

  await syncUserInterestSignals(
    userId,
    [
      ...input.stack,
      ...input.interests,
      ...input.contentPreferences,
      ...input.participationIntents,
    ],
    "onboarding",
  );

  return { ok: true };
}

export async function persistProfileUpdate(
  userId: string,
  input: z.infer<typeof profileUpdateSchema>,
) {
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        name: input.name,
        ...(input.image !== undefined ? { image: input.image } : {}),
      })
      .where(eq(users.id, userId));
    await tx
      .update(profiles)
      .set({
        handle: input.handle,
        bio: input.bio,
        location: input.location,
        workStatus: input.workStatus,
        stack: input.stack,
        interests: input.interests,
        contentPreferences: input.contentPreferences,
        participationIntents: input.participationIntents,
        links: input.links,
        ...(input.bannerUrl !== undefined
          ? { bannerUrl: input.bannerUrl }
          : {}),
        ...(input.palette !== undefined ? { palette: input.palette } : {}),
        visibility: input.visibility,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId));
    await syncUserInterestSignals(
      userId,
      [
        ...input.stack,
        ...input.interests,
        ...input.contentPreferences,
        ...input.participationIntents,
      ],
      "profile",
    );
  });

  return { ok: true };
}

export async function persistPost(
  userId: string,
  input: z.infer<typeof postSchema>,
) {
  const [post] = await db
    .insert(posts)
    .values({
      authorId: userId,
      category: input.category,
      contentType: input.contentType,
      title: input.title,
      body: input.body,
      tags: input.tags,
      media: input.media,
      projectSignal: input.projectSignal ?? null,
    })
    .returning({
      id: posts.id,
      category: posts.category,
      contentType: posts.contentType,
      title: posts.title,
      body: posts.body,
      tags: posts.tags,
      media: posts.media,
      projectSignal: posts.projectSignal,
      createdAt: posts.createdAt,
    });

  const [author] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId));

  await attachPostDiscoverySignals(post.id, input);

  return {
    id: post.id,
    type: "post" as const,
    contentType: post.contentType,
    category: post.category,
    title: post.title,
    body: post.body,
    authorId: userId,
    authorName: author?.name ?? "RubberDuck user",
    tags: post.tags,
    media: post.media,
    projectSignal: post.projectSignal ?? undefined,
    createdAt: post.createdAt.toISOString(),
    interests: 0,
    comments: 0,
    viewerState: {
      interested: false,
      saved: false,
      reported: false,
      canDelete: true,
    },
  };
}

export async function persistProjectSignalResponse(
  userId: string,
  input: z.infer<typeof projectSignalResponseSchema>,
) {
  const [post] = await db
    .select({
      id: posts.id,
      authorId: posts.authorId,
      contentType: posts.contentType,
      projectSignal: posts.projectSignal,
      status: posts.status,
    })
    .from(posts)
    .where(eq(posts.id, input.postId));

  if (
    !post ||
    post.status !== "active" ||
    post.contentType !== "project_signal" ||
    !post.projectSignal
  ) {
    throw new Error("Project Signal not found.");
  }

  if (post.authorId === userId) {
    throw new Error("Authors cannot respond to their own Project Signal.");
  }

  const projectSignal = post.projectSignal;
  const [actor] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId));

  const [response] = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(projectSignalResponses)
      .values({
        postId: input.postId,
        userId,
        intent: input.intent,
        note: input.note ?? "",
      })
      .onConflictDoNothing()
      .returning({
        postId: projectSignalResponses.postId,
        intent: projectSignalResponses.intent,
      });

    if (inserted) {
      await tx.insert(notifications).values({
        recipientId: post.authorId,
        actorId: userId,
        type: "project_signal_response",
        message: createProjectSignalResponseNotification({
          actorName: actor?.name,
          repoLabel: `${projectSignal.owner}/${projectSignal.name}`,
          intent: input.intent,
        }),
        entityId: input.postId,
        read: false,
      });
    }

    return [inserted];
  });

  return {
    accepted: true,
    duplicate: !response,
    intent: input.intent,
    postId: input.postId,
  };
}

export async function persistComment(
  userId: string,
  input: z.infer<typeof commentSchema>,
) {
  const [post] = await db
    .select({ id: posts.id, authorId: posts.authorId })
    .from(posts)
    .where(and(eq(posts.id, input.postId), eq(posts.status, "active")));

  if (!post) {
    throw new Error("Post not found.");
  }

  if (input.parentId) {
    const [parent] = await db
      .select({ id: comments.id })
      .from(comments)
      .where(
        and(
          eq(comments.id, input.parentId),
          eq(comments.postId, input.postId),
          eq(comments.status, "active"),
        ),
      );

    if (!parent) {
      throw new Error("Parent comment not found for this post.");
    }
  }

  const [comment] = await db
    .insert(comments)
    .values({
      postId: input.postId,
      authorId: userId,
      parentId: input.parentId,
      body: input.body,
    })
    .returning({ id: comments.id, postId: comments.postId });

  if (post.authorId !== userId) {
    await db.insert(notifications).values({
      recipientId: post.authorId,
      actorId: userId,
      type: "reply",
      message: "Someone replied to your Binnacle post.",
      entityId: input.postId,
      read: false,
    });
  }

  return comment;
}

export async function softDeletePost(userId: string, postId: string) {
  const [post] = await db
    .select({ id: posts.id, authorId: posts.authorId, status: posts.status })
    .from(posts)
    .where(eq(posts.id, postId));

  if (!post || post.status !== "active") {
    throw new Error("Post not found.");
  }

  if (post.authorId !== userId) {
    throw new Error("Only the author can remove this post.");
  }

  await db
    .update(posts)
    .set({
      status: "deleted",
      statusReason: "author_deleted",
      deletedAt: new Date(),
      deletedBy: userId,
      updatedAt: new Date(),
    })
    .where(and(eq(posts.id, postId), eq(posts.authorId, userId)));

  return { deleted: true, postId };
}

export async function updatePostForAuthor(
  userId: string,
  input: z.infer<typeof postSchema> & { postId: string },
) {
  const [post] = await db
    .select({ id: posts.id, authorId: posts.authorId, status: posts.status })
    .from(posts)
    .where(eq(posts.id, input.postId));

  if (!post || post.status !== "active") {
    throw new Error("Post not found.");
  }

  if (post.authorId !== userId) {
    throw new Error("Only the author can edit this post.");
  }

  const [updated] = await db
    .update(posts)
    .set({
      category: input.category,
      contentType: input.contentType,
      title: input.title,
      body: input.body,
      tags: input.tags,
      media: input.media,
      projectSignal: input.projectSignal ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(posts.id, input.postId), eq(posts.authorId, userId)))
    .returning({ id: posts.id });

  if (!updated) {
    throw new Error("Post could not be updated.");
  }

  await replacePostDiscoverySignals(updated.id, input);

  return { updated: true, postId: updated.id };
}

export async function softDeleteComment(userId: string, commentId: string) {
  const [comment] = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      authorId: comments.authorId,
      status: comments.status,
    })
    .from(comments)
    .where(eq(comments.id, commentId));

  if (!comment || comment.status !== "active") {
    throw new Error("Comment not found.");
  }

  if (comment.authorId !== userId) {
    throw new Error("Only the author can remove this comment.");
  }

  await db
    .update(comments)
    .set({
      status: "deleted",
      statusReason: "author_deleted",
      deletedAt: new Date(),
      deletedBy: userId,
    })
    .where(and(eq(comments.id, commentId), eq(comments.authorId, userId)));

  return { deleted: true, commentId, postId: comment.postId };
}

export async function updateCommentForAuthor(
  userId: string,
  input: { commentId: string; body: string },
) {
  const [comment] = await db
    .select({
      id: comments.id,
      authorId: comments.authorId,
      status: comments.status,
    })
    .from(comments)
    .where(eq(comments.id, input.commentId));

  if (!comment || comment.status !== "active") {
    throw new Error("Comment not found.");
  }

  if (comment.authorId !== userId) {
    throw new Error("Only the author can edit this comment.");
  }

  const [updated] = await db
    .update(comments)
    .set({ body: input.body })
    .where(and(eq(comments.id, input.commentId), eq(comments.authorId, userId)))
    .returning({ id: comments.id });

  if (!updated) {
    throw new Error("Comment could not be updated.");
  }

  return { updated: true, commentId: updated.id };
}

export async function setCommentHelpfulByAuthor(
  userId: string,
  input: z.infer<typeof commentHelpfulSchema>,
) {
  return db.transaction(async (tx) => {
    const [comment] = await tx
      .select({
        id: comments.id,
        authorId: comments.authorId,
        postId: comments.postId,
        status: comments.status,
        helpfulByAuthor: comments.helpfulByAuthor,
        postAuthorId: posts.authorId,
        postTitle: posts.title,
        postCategory: posts.category,
        postContentType: posts.contentType,
      })
      .from(comments)
      .innerJoin(posts, eq(comments.postId, posts.id))
      .where(eq(comments.id, input.commentId));

    if (!comment || comment.status !== "active") {
      throw new Error("Comment not found.");
    }

    if (comment.postAuthorId !== userId) {
      throw new Error("Only the post author can mark a helpful answer.");
    }

    if (
      comment.postCategory !== "Help" &&
      comment.postContentType !== "question"
    ) {
      throw new Error("Helpful answers are only available on Help questions.");
    }

    const now = new Date();
    await tx
      .update(comments)
      .set({
        helpfulByAuthor: input.helpful,
        helpfulAt: input.helpful ? now : null,
        helpfulBy: input.helpful ? userId : null,
      })
      .where(eq(comments.id, input.commentId));

    await tx.insert(auditEvents).values({
      actorId: userId,
      action: input.helpful
        ? "comment_marked_helpful"
        : "comment_unmarked_helpful",
      entityType: "comment",
      entityId: input.commentId,
      metadata: { postId: comment.postId },
    });

    if (
      input.helpful &&
      comment.authorId !== userId &&
      !comment.helpfulByAuthor
    ) {
      await tx.insert(notifications).values({
        recipientId: comment.authorId,
        actorId: userId,
        type: "reply",
        message: `Your answer was marked helpful on ${comment.postTitle}.`,
        entityId: comment.postId,
        read: false,
      });
      const [existingBadge] = await tx
        .select({ id: badges.id })
        .from(badges)
        .where(
          and(
            eq(badges.userId, comment.authorId),
            eq(badges.label, "Helpful Answer"),
          ),
        );

      if (!existingBadge) {
        await tx.insert(badges).values({
          userId: comment.authorId,
          label: "Helpful Answer",
          description:
            "Had an answer marked helpful by the author of a Help question.",
        });
      }
    }

    return {
      commentId: input.commentId,
      helpful: input.helpful,
    };
  });
}

async function assertReportTargetExists(input: z.infer<typeof reportSchema>) {
  if (input.entityType === "post") {
    const [post] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.id, input.entityId), eq(posts.status, "active")));
    return Boolean(post);
  }

  if (input.entityType === "comment") {
    const [comment] = await db
      .select({ id: comments.id })
      .from(comments)
      .where(
        and(eq(comments.id, input.entityId), eq(comments.status, "active")),
      );
    return Boolean(comment);
  }

  const [course] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.id, input.entityId));
  return Boolean(course);
}

export async function persistReport(
  userId: string,
  input: z.infer<typeof reportSchema>,
) {
  const targetExists = await assertReportTargetExists(input);
  if (!targetExists) {
    throw new Error("Reported entity not found.");
  }

  const [report] = await db
    .insert(reports)
    .values({
      reporterId: userId,
      entityType: input.entityType,
      entityId: input.entityId,
      reason: input.reason,
      details: input.details,
      resolved: false,
    })
    .onConflictDoUpdate({
      target: [reports.reporterId, reports.entityType, reports.entityId],
      set: {
        reason: input.reason,
        details: input.details,
        resolved: false,
      },
    })
    .returning({ id: reports.id });

  return { accepted: true, id: report?.id };
}

export async function setReportResolved(input: {
  reportId: string;
  resolved: boolean;
  actorId?: string;
}) {
  const report = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(reports)
      .set({ resolved: input.resolved })
      .where(eq(reports.id, input.reportId))
      .returning({
        id: reports.id,
        resolved: reports.resolved,
        entityType: reports.entityType,
        entityId: reports.entityId,
      });

    if (!updated) {
      return null;
    }

    await tx.insert(auditEvents).values({
      actorId: input.actorId,
      action: input.resolved ? "report_resolved" : "report_reopened",
      entityType: updated.entityType,
      entityId: updated.entityId,
      metadata: { reportId: updated.id },
    });

    return updated;
  });

  if (!report) {
    throw new Error("Report not found.");
  }

  return report;
}

export async function moderateEntityStatus(
  actorId: string,
  input: z.infer<typeof moderationEntityActionSchema>,
) {
  const hidden = input.action === "hide";
  const nextStatus = hidden ? "hidden" : "active";
  const statusReason = hidden ? input.reason : "admin_restored";
  const now = new Date();

  return db.transaction(async (tx) => {
    if (input.entityType === "post") {
      const [current] = await tx
        .select({ id: posts.id, status: posts.status })
        .from(posts)
        .where(eq(posts.id, input.entityId));

      if (!current) {
        throw new Error("Post not found.");
      }

      if (!hidden && current.status !== "hidden") {
        throw new Error("Only hidden posts can be restored by moderation.");
      }

      await tx
        .update(posts)
        .set({
          status: nextStatus,
          statusReason,
          deletedAt: hidden ? now : null,
          deletedBy: hidden ? actorId : null,
          updatedAt: now,
        })
        .where(eq(posts.id, input.entityId));
    } else {
      const [current] = await tx
        .select({ id: comments.id, status: comments.status })
        .from(comments)
        .where(eq(comments.id, input.entityId));

      if (!current) {
        throw new Error("Comment not found.");
      }

      if (!hidden && current.status !== "hidden") {
        throw new Error("Only hidden comments can be restored by moderation.");
      }

      await tx
        .update(comments)
        .set({
          status: nextStatus,
          statusReason,
          deletedAt: hidden ? now : null,
          deletedBy: hidden ? actorId : null,
        })
        .where(eq(comments.id, input.entityId));
    }

    await tx.insert(auditEvents).values({
      actorId,
      action: hidden ? "entity_hidden" : "entity_restored",
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: { reason: input.reason },
    });

    return {
      entityType: input.entityType,
      entityId: input.entityId,
      status: nextStatus,
    };
  });
}

export async function moderateAccountStatus(
  actorId: string,
  input: z.infer<typeof accountModerationActionSchema>,
) {
  if (actorId === input.subjectId && input.action !== "restore") {
    throw new Error("Moderators cannot restrict their own account.");
  }

  const expiresAt = input.expiresAt
    ? new Date(input.expiresAt)
    : input.action === "suspension"
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      : null;
  const banned = input.action === "ban" || input.action === "suspension";

  return db.transaction(async (tx) => {
    const [subject] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, input.subjectId));

    if (!subject) {
      throw new Error("Account not found.");
    }

    await tx
      .update(users)
      .set({
        banned,
        banReason: banned ? input.reason : null,
        banExpires: input.action === "suspension" ? expiresAt : null,
      })
      .where(eq(users.id, input.subjectId));

    const [action] = await tx
      .insert(accountModerationActions)
      .values({
        actorId,
        subjectId: input.subjectId,
        action: input.action,
        reason: input.reason,
        expiresAt,
      })
      .returning({ id: accountModerationActions.id });

    await tx.insert(auditEvents).values({
      actorId,
      action: `account_${input.action}`,
      entityType: "user",
      entityId: input.subjectId,
      metadata: {
        reason: input.reason,
        moderationActionId: action?.id ?? null,
      },
    });

    return {
      subjectId: input.subjectId,
      action: input.action,
      banned,
    };
  });
}

export async function persistCourseDraft(
  userId: string,
  input: z.infer<typeof courseDraftSchema>,
) {
  const now = new Date();
  const draft = await db.transaction(async (tx) => {
    const existing = input.draftId
      ? (
          await tx
            .select({ id: courses.id, slug: courses.slug })
            .from(courses)
            .where(
              and(eq(courses.id, input.draftId), eq(courses.creatorId, userId)),
            )
        )[0]
      : null;

    if (input.draftId && !existing) {
      throw new Error("Course draft not found or not editable.");
    }

    const course =
      existing ??
      (
        await tx
          .insert(courses)
          .values({
            creatorId: userId,
            slug: `${slugify(input.title)}-${crypto.randomUUID().slice(0, 8)}`,
            title: input.title,
            description: input.description,
            status: input.status,
            difficulty: input.difficulty,
            tags: input.tags,
            ipynbMetadata: input.ipynbMetadata ?? null,
            createdAt: now,
            updatedAt: now,
          })
          .returning({ id: courses.id, slug: courses.slug })
      )[0];

    if (!course) {
      throw new Error("Unable to create course draft.");
    }

    if (existing) {
      await tx
        .update(courses)
        .set({
          title: input.title,
          description: input.description,
          status: input.status,
          difficulty: input.difficulty,
          tags: input.tags,
          ipynbMetadata: input.ipynbMetadata ?? null,
          updatedAt: now,
        })
        .where(and(eq(courses.id, course.id), eq(courses.creatorId, userId)));

      await tx
        .delete(courseSections)
        .where(eq(courseSections.courseId, course.id));
    }

    const sectionIdByClientId = new Map<string, string>();

    for (const [index, section] of input.sections.entries()) {
      const [createdSection] = await tx
        .insert(courseSections)
        .values({
          courseId: course.id,
          title: section.title,
          order: index + 1,
          content: {
            body: section.body,
            code: section.code,
            embeds: section.embeds,
            visualizations: section.visualizations,
            sourceClientId: section.clientId,
          },
        })
        .returning({ id: courseSections.id });

      if (!createdSection) {
        throw new Error("Unable to create course section.");
      }

      sectionIdByClientId.set(section.clientId, createdSection.id);
    }

    for (const exercise of input.exercises) {
      const sectionId = sectionIdByClientId.get(exercise.sectionClientId);
      if (!sectionId) {
        throw new Error("Exercise references a missing section.");
      }

      await tx.insert(exercises).values({
        courseId: course.id,
        sectionId,
        prompt: exercise.prompt,
        starterCode: exercise.starterCode,
        assertionCode: exercise.assertionCode,
        successMessage: exercise.successMessage,
      });
    }

    const [latestRevision] = await tx
      .select({ revisionNumber: courseRevisions.revisionNumber })
      .from(courseRevisions)
      .where(eq(courseRevisions.courseId, course.id))
      .orderBy(desc(courseRevisions.revisionNumber))
      .limit(1);
    const revisionNumber = (latestRevision?.revisionNumber ?? 0) + 1;
    const snapshot = buildCourseRevisionSnapshot(input, now);
    const [revision] = await tx
      .insert(courseRevisions)
      .values({
        courseId: course.id,
        creatorId: userId,
        revisionNumber,
        status: input.status,
        title: input.title,
        snapshot,
        createdAt: now,
      })
      .returning({
        id: courseRevisions.id,
        revisionNumber: courseRevisions.revisionNumber,
        createdAt: courseRevisions.createdAt,
      });

    return {
      ...course,
      revision: revision ? { ...revision, snapshot } : null,
    };
  });

  return {
    savedAt: now.toISOString(),
    draft: {
      id: draft.id,
      slug: draft.slug,
      status: input.status,
      sections: input.sections.length,
      exercises: input.exercises.length,
      revision: draft.revision
        ? {
            id: draft.revision.id,
            revisionNumber: draft.revision.revisionNumber,
            createdAt: draft.revision.createdAt.toISOString(),
            snapshot: draft.revision.snapshot,
          }
        : null,
    },
  };
}

export async function persistExerciseTelemetry(
  userId: string,
  input: z.infer<typeof exerciseResultSchema>,
) {
  const [exercise] = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(
      and(
        eq(exercises.id, input.exerciseId),
        eq(exercises.courseId, input.courseId),
      ),
    );

  if (!exercise) {
    throw new Error("Exercise not found for this course.");
  }

  const [existing] = await db
    .select()
    .from(courseProgress)
    .where(
      and(
        eq(courseProgress.courseId, input.courseId),
        eq(courseProgress.userId, userId),
      ),
    );

  const passedExerciseIds = new Set(existing?.passedExerciseIds ?? []);
  if (input.status === "passed") {
    passedExerciseIds.add(input.exerciseId);
  }

  const progress = {
    courseId: input.courseId,
    userId,
    viewedSectionIds: existing?.viewedSectionIds ?? [],
    passedExerciseIds: Array.from(passedExerciseIds),
    completedAt: existing?.completedAt ?? null,
    updatedAt: new Date(),
  };

  await db
    .insert(courseProgress)
    .values(progress)
    .onConflictDoUpdate({
      target: [courseProgress.courseId, courseProgress.userId],
      set: {
        passedExerciseIds: progress.passedExerciseIds,
        updatedAt: new Date(),
      },
    });

  const completion = await attemptCourseCompletion(userId, input.courseId);

  return { ...input, completion };
}

export async function persistSectionView(
  userId: string,
  input: z.infer<typeof courseSectionViewSchema>,
) {
  const [section] = await db
    .select({ id: courseSections.id })
    .from(courseSections)
    .where(
      and(
        eq(courseSections.id, input.sectionId),
        eq(courseSections.courseId, input.courseId),
      ),
    );

  if (!section) {
    throw new Error("Section not found for this course.");
  }

  const [existing] = await db
    .select()
    .from(courseProgress)
    .where(
      and(
        eq(courseProgress.courseId, input.courseId),
        eq(courseProgress.userId, userId),
      ),
    );

  const viewedSectionIds = new Set(existing?.viewedSectionIds ?? []);
  viewedSectionIds.add(input.sectionId);

  const progress = {
    courseId: input.courseId,
    userId,
    viewedSectionIds: Array.from(viewedSectionIds),
    passedExerciseIds: existing?.passedExerciseIds ?? [],
    completedAt: existing?.completedAt ?? null,
    updatedAt: new Date(),
  };

  await db
    .insert(courseProgress)
    .values(progress)
    .onConflictDoUpdate({
      target: [courseProgress.courseId, courseProgress.userId],
      set: {
        viewedSectionIds: progress.viewedSectionIds,
        updatedAt: new Date(),
      },
    });

  const completion = await attemptCourseCompletion(userId, input.courseId);

  return {
    viewedSectionId: input.sectionId,
    viewedSectionIds: progress.viewedSectionIds,
    completion,
  };
}

export async function persistCourseThanks(
  userId: string,
  input: z.infer<typeof courseEntitySchema>,
) {
  const [course] = await db
    .select({
      id: courses.id,
      title: courses.title,
      creatorId: courses.creatorId,
    })
    .from(courses)
    .where(eq(courses.id, input.courseId));

  if (!course) {
    throw new Error("Course not found.");
  }

  const inserted = await db
    .insert(thanks)
    .values({ courseId: input.courseId, userId })
    .onConflictDoNothing()
    .returning({ courseId: thanks.courseId });

  if (inserted.length > 0 && course.creatorId !== userId) {
    await db.insert(notifications).values({
      recipientId: course.creatorId,
      actorId: userId,
      type: "thanks",
      message: `Someone left Thanks on ${course.title}.`,
      entityId: input.courseId,
      read: false,
    });
  }

  return { thanked: true, created: inserted.length > 0 };
}

export async function persistCourseSave(
  userId: string,
  input: z.infer<typeof courseEntitySchema>,
) {
  const [course] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.id, input.courseId));

  if (!course) {
    throw new Error("Course not found.");
  }

  const inserted = await db
    .insert(saves)
    .values({ entityType: "course", entityId: input.courseId, userId })
    .onConflictDoNothing()
    .returning({ entityId: saves.entityId });

  return { saved: true, created: inserted.length > 0 };
}

export async function persistPostSave(
  userId: string,
  input: z.infer<typeof postEntitySchema>,
) {
  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.id, input.postId), eq(posts.status, "active")));

  if (!post) {
    throw new Error("Post not found.");
  }

  const inserted = await db
    .insert(saves)
    .values({ entityType: "post", entityId: input.postId, userId })
    .onConflictDoNothing()
    .returning({ entityId: saves.entityId });

  return { saved: true, created: inserted.length > 0 };
}

export async function completeCourseForUser(userId: string, courseId: string) {
  return attemptCourseCompletion(userId, courseId);
}

export async function togglePostInterest(userId: string, postId: string) {
  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.status, "active")));

  if (!post) {
    throw new Error("Post not found.");
  }

  const [existing] = await db
    .select()
    .from(postInterests)
    .where(
      and(eq(postInterests.postId, postId), eq(postInterests.userId, userId)),
    );

  if (existing) {
    await db
      .delete(postInterests)
      .where(
        and(eq(postInterests.postId, postId), eq(postInterests.userId, userId)),
      );
    return { interested: false };
  }

  await db
    .insert(postInterests)
    .values({ postId, userId })
    .onConflictDoNothing();
  return { interested: true };
}

export async function toggleFollowProfile(
  userId: string,
  input: z.infer<typeof followProfileSchema>,
) {
  if (input.profileUserId === userId) {
    throw new Error("You cannot follow yourself.");
  }

  const [profile] = await db
    .select({ userId: profiles.userId, handle: profiles.handle })
    .from(profiles)
    .where(eq(profiles.userId, input.profileUserId));

  if (!profile) {
    throw new Error("Profile not found.");
  }

  const [existing] = await db
    .select()
    .from(follows)
    .where(
      and(
        eq(follows.followerId, userId),
        eq(follows.followingId, input.profileUserId),
      ),
    );

  if (existing) {
    await db
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, userId),
          eq(follows.followingId, input.profileUserId),
        ),
      );
    return { following: false };
  }

  const inserted = await db
    .insert(follows)
    .values({ followerId: userId, followingId: input.profileUserId })
    .onConflictDoNothing()
    .returning({ followingId: follows.followingId });

  if (inserted.length > 0) {
    await db.insert(notifications).values({
      recipientId: input.profileUserId,
      actorId: userId,
      type: "follow",
      message: "Someone followed your Identity Hub.",
      entityId: userId,
      read: false,
    });
  }

  return { following: true };
}

export async function markNotificationsReadForUser(
  userId: string,
  input: z.infer<typeof notificationReadSchema>,
) {
  if (input.notificationIds.length === 0) {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.recipientId, userId));
    return { read: true };
  }

  await Promise.all(
    input.notificationIds.map((notificationId) =>
      db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.recipientId, userId),
          ),
        ),
    ),
  );

  return { read: true };
}
