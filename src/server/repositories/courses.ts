import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  courseProgress,
  courseRevisions,
  courses,
  courseSections,
  exercises,
  saves,
  thanks,
  users,
} from "@/db/schema";
import type { CourseProgress } from "@/lib/domain";
import type { CourseDetail, CourseDraftSummary } from "@/lib/product-types";
import { isCourseMediaPublicPath } from "@/lib/course-media";
import { sanitizeVisualizations } from "@/lib/course-visualizations";
import {
  summarizeCourseRevisionSnapshot,
  type CourseRevisionSnapshot,
} from "@/lib/course-revisions";
import { mapCourseRowsToDetail } from "./mappers";
import { listCourseMediaAssetsByUrls } from "./media";

function sectionBody(content: Record<string, unknown>) {
  return typeof content.body === "string" ? content.body : "";
}

function sectionCode(content: Record<string, unknown>) {
  return typeof content.code === "string" ? content.code : undefined;
}

function sectionEmbeds(content: Record<string, unknown>) {
  return Array.isArray(content.embeds)
    ? content.embeds.filter(
        (embed): embed is string => typeof embed === "string",
      )
    : [];
}

function sectionVisualizations(content: Record<string, unknown>) {
  return sanitizeVisualizations(content.visualizations);
}

export async function listCoursesForDiscovery(
  userId: string | null,
): Promise<CourseDetail[]> {
  const rows = await db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      description: courses.description,
      creatorId: courses.creatorId,
      creatorName: users.name,
      status: courses.status,
      tags: courses.tags,
      difficulty: courses.difficulty,
      completionCount: courses.completionCount,
      ipynbMetadata: courses.ipynbMetadata,
      updatedAt: courses.updatedAt,
    })
    .from(courses)
    .innerJoin(users, eq(courses.creatorId, users.id))
    .where(eq(courses.status, "published"));

  const details = await Promise.all(
    rows.map((row) => getCourseBySlug(row.slug, userId)),
  );
  return details.filter((course): course is CourseDetail => Boolean(course));
}

export async function getCourseBySlug(
  slug: string,
  userId: string | null,
): Promise<CourseDetail | null> {
  const [course] = await db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      description: courses.description,
      creatorId: courses.creatorId,
      creatorName: users.name,
      status: courses.status,
      tags: courses.tags,
      difficulty: courses.difficulty,
      completionCount: courses.completionCount,
      ipynbMetadata: courses.ipynbMetadata,
      updatedAt: courses.updatedAt,
    })
    .from(courses)
    .innerJoin(users, eq(courses.creatorId, users.id))
    .where(eq(courses.slug, slug));

  if (!course) {
    return null;
  }

  if (course.status !== "published" && course.creatorId !== userId) {
    return null;
  }

  const [sections, exerciseRows, thanksRows, saveRows] = await Promise.all([
    db
      .select({
        id: courseSections.id,
        title: courseSections.title,
        content: courseSections.content,
        order: courseSections.order,
      })
      .from(courseSections)
      .where(eq(courseSections.courseId, course.id)),
    db
      .select({
        id: exercises.id,
        sectionId: exercises.sectionId,
        prompt: exercises.prompt,
        starterCode: exercises.starterCode,
        assertionCode: exercises.assertionCode,
        successMessage: exercises.successMessage,
      })
      .from(exercises)
      .where(eq(exercises.courseId, course.id)),
    db
      .select({ userId: thanks.userId })
      .from(thanks)
      .where(eq(thanks.courseId, course.id)),
    db
      .select({ userId: saves.userId })
      .from(saves)
      .where(eq(saves.entityId, course.id)),
  ]);

  const sectionRows = sections.map((section) => ({
    id: section.id,
    title: section.title,
    body: sectionBody(section.content),
    code: sectionCode(section.content),
    embeds: sectionEmbeds(section.content),
    visualizations: sectionVisualizations(section.content),
    order: section.order,
  }));
  const mediaAssets = await listCourseMediaAssetsByUrls(
    course.creatorId,
    sectionRows
      .flatMap((section) => section.embeds)
      .filter(isCourseMediaPublicPath),
  );

  return mapCourseRowsToDetail({
    course: {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      creatorId: course.creatorId,
      creatorName: course.creatorName ?? "Unknown",
      status: course.status,
      tags: course.tags,
      difficulty: course.difficulty as CourseDetail["difficulty"],
      completionCount: course.completionCount,
      ipynbMetadata: course.ipynbMetadata as CourseDetail["ipynbMetadata"],
      updatedAt: course.updatedAt.toISOString(),
      thanksCount: thanksRows.length,
      saved: userId ? saveRows.some((save) => save.userId === userId) : false,
    },
    sections: sectionRows,
    exercises: exerciseRows,
    mediaAssets,
  });
}

export async function listDraftsForCreator(
  creatorId: string,
): Promise<CourseDraftSummary[]> {
  const draftRows = await db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      description: courses.description,
      tags: courses.tags,
      difficulty: courses.difficulty,
      updatedAt: courses.updatedAt,
    })
    .from(courses)
    .where(and(eq(courses.creatorId, creatorId), eq(courses.status, "draft")))
    .orderBy(desc(courses.updatedAt));

  return Promise.all(
    draftRows.map(async (course) => {
      const [sectionRows, exerciseRows, revisionRows] = await Promise.all([
        db
          .select({ id: courseSections.id })
          .from(courseSections)
          .where(eq(courseSections.courseId, course.id)),
        db
          .select({ id: exercises.id })
          .from(exercises)
          .where(eq(exercises.courseId, course.id)),
        db
          .select({ createdAt: courseRevisions.createdAt })
          .from(courseRevisions)
          .where(eq(courseRevisions.courseId, course.id))
          .orderBy(desc(courseRevisions.revisionNumber)),
      ]);

      return {
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        tags: course.tags,
        difficulty: course.difficulty as CourseDraftSummary["difficulty"],
        updatedAt: course.updatedAt.toISOString(),
        sectionsCount: sectionRows.length,
        exercisesCount: exerciseRows.length,
        revisionCount: revisionRows.length,
        latestRevisionAt: revisionRows[0]?.createdAt.toISOString() ?? null,
      };
    }),
  );
}

export async function listCourseRevisions(courseId: string, creatorId: string) {
  const rows = await db
    .select({
      id: courseRevisions.id,
      courseId: courseRevisions.courseId,
      revisionNumber: courseRevisions.revisionNumber,
      status: courseRevisions.status,
      title: courseRevisions.title,
      snapshot: courseRevisions.snapshot,
      createdAt: courseRevisions.createdAt,
    })
    .from(courseRevisions)
    .innerJoin(courses, eq(courseRevisions.courseId, courses.id))
    .where(
      and(
        eq(courseRevisions.courseId, courseId),
        eq(courses.creatorId, creatorId),
      ),
    )
    .orderBy(desc(courseRevisions.revisionNumber));

  return rows.map((row) => {
    const snapshot = row.snapshot as unknown as CourseRevisionSnapshot;
    return {
      id: row.id,
      courseId: row.courseId,
      revisionNumber: row.revisionNumber,
      status: row.status,
      title: row.title,
      createdAt: row.createdAt.toISOString(),
      snapshot,
      metrics: summarizeCourseRevisionSnapshot(snapshot),
    };
  });
}

export type CreatorCourseAnalytics = {
  totalCourses: number;
  publishedCourses: number;
  totalCompletions: number;
  totalThanks: number;
  totalSaves: number;
  activeLearners: number;
  exercisePasses: number;
  sectionViews: number;
  courses: Array<{
    id: string;
    title: string;
    slug: string;
    status: CourseDetail["status"];
    completions: number;
    thanks: number;
    saves: number;
    activeLearners: number;
    exercisePasses: number;
    sectionViews: number;
  }>;
};

export async function getCreatorCourseAnalytics(
  creatorId: string,
): Promise<CreatorCourseAnalytics> {
  const courseRows = await db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      status: courses.status,
      completionCount: courses.completionCount,
    })
    .from(courses)
    .where(eq(courses.creatorId, creatorId))
    .orderBy(desc(courses.updatedAt));

  if (courseRows.length === 0) {
    return {
      totalCourses: 0,
      publishedCourses: 0,
      totalCompletions: 0,
      totalThanks: 0,
      totalSaves: 0,
      activeLearners: 0,
      exercisePasses: 0,
      sectionViews: 0,
      courses: [],
    };
  }

  const courseIds = courseRows.map((course) => course.id);
  const [progressRows, thanksRows, saveRows] = await Promise.all([
    db
      .select({
        courseId: courseProgress.courseId,
        userId: courseProgress.userId,
        viewedSectionIds: courseProgress.viewedSectionIds,
        passedExerciseIds: courseProgress.passedExerciseIds,
        completedAt: courseProgress.completedAt,
      })
      .from(courseProgress)
      .where(inArray(courseProgress.courseId, courseIds)),
    db
      .select({ courseId: thanks.courseId })
      .from(thanks)
      .where(inArray(thanks.courseId, courseIds)),
    db
      .select({ entityId: saves.entityId })
      .from(saves)
      .where(
        and(eq(saves.entityType, "course"), inArray(saves.entityId, courseIds)),
      ),
  ]);

  const thanksByCourse = new Map<string, number>();
  const savesByCourse = new Map<string, number>();
  const learnersByCourse = new Map<string, Set<string>>();
  const completionsByCourse = new Map<string, number>();
  const sectionViewsByCourse = new Map<string, number>();
  const exercisePassesByCourse = new Map<string, number>();

  for (const row of thanksRows) {
    thanksByCourse.set(
      row.courseId,
      (thanksByCourse.get(row.courseId) ?? 0) + 1,
    );
  }

  for (const row of saveRows) {
    savesByCourse.set(row.entityId, (savesByCourse.get(row.entityId) ?? 0) + 1);
  }

  for (const row of progressRows) {
    const learners = learnersByCourse.get(row.courseId) ?? new Set<string>();
    learners.add(row.userId);
    learnersByCourse.set(row.courseId, learners);
    sectionViewsByCourse.set(
      row.courseId,
      (sectionViewsByCourse.get(row.courseId) ?? 0) +
        row.viewedSectionIds.length,
    );
    exercisePassesByCourse.set(
      row.courseId,
      (exercisePassesByCourse.get(row.courseId) ?? 0) +
        row.passedExerciseIds.length,
    );

    if (row.completedAt) {
      completionsByCourse.set(
        row.courseId,
        (completionsByCourse.get(row.courseId) ?? 0) + 1,
      );
    }
  }

  const courseAnalytics = courseRows.map((course) => ({
    id: course.id,
    title: course.title,
    slug: course.slug,
    status: course.status as CourseDetail["status"],
    completions: completionsByCourse.get(course.id) ?? course.completionCount,
    thanks: thanksByCourse.get(course.id) ?? 0,
    saves: savesByCourse.get(course.id) ?? 0,
    activeLearners: learnersByCourse.get(course.id)?.size ?? 0,
    exercisePasses: exercisePassesByCourse.get(course.id) ?? 0,
    sectionViews: sectionViewsByCourse.get(course.id) ?? 0,
  }));

  return {
    totalCourses: courseAnalytics.length,
    publishedCourses: courseAnalytics.filter(
      (course) => course.status === "published",
    ).length,
    totalCompletions: courseAnalytics.reduce(
      (total, course) => total + course.completions,
      0,
    ),
    totalThanks: courseAnalytics.reduce(
      (total, course) => total + course.thanks,
      0,
    ),
    totalSaves: courseAnalytics.reduce(
      (total, course) => total + course.saves,
      0,
    ),
    activeLearners: new Set(progressRows.map((row) => row.userId)).size,
    exercisePasses: courseAnalytics.reduce(
      (total, course) => total + course.exercisePasses,
      0,
    ),
    sectionViews: courseAnalytics.reduce(
      (total, course) => total + course.sectionViews,
      0,
    ),
    courses: courseAnalytics,
  };
}

export async function getCourseProgress(
  courseId: string,
  userId: string,
): Promise<CourseProgress> {
  const [progress] = await db
    .select()
    .from(courseProgress)
    .where(
      and(
        eq(courseProgress.courseId, courseId),
        eq(courseProgress.userId, userId),
      ),
    );

  return {
    courseId,
    userId,
    viewedSectionIds: progress?.viewedSectionIds ?? [],
    passedExerciseIds: progress?.passedExerciseIds ?? [],
    completedAt: progress?.completedAt?.toISOString() ?? null,
  };
}
