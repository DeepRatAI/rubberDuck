import { z } from "zod";

import { courseMediaPublicPathPattern } from "./course-media";
import { courseVisualizationSchema } from "./course-visualizations";
import { POST_MEDIA_MAX_BYTES, postMediaMimeTypes } from "./post-media";
import { projectSignalResponseIntents } from "./project-signal-actions";
import { parseGitHubRepoUrl } from "./project-signals";
import { profileMediaPublicPathPattern } from "./profile-media";

export const visibilitySchema = z.enum(["public", "followers", "private"]);

export const onboardingSchema = z.object({
  stack: z.array(z.string().trim().min(1).max(32)).min(1).max(12),
  interests: z.array(z.string().trim().min(1).max(32)).min(1).max(16),
  contentPreferences: z
    .array(z.string().trim().min(1).max(48))
    .min(1)
    .max(10)
    .default(["Project Signals", "Runnable exercises", "Build logs"]),
  participationIntents: z
    .array(z.string().trim().min(1).max(48))
    .min(1)
    .max(10)
    .default(["I build projects", "I review projects"]),
  seniority: z.enum([
    "student",
    "junior",
    "mid",
    "senior",
    "staff",
    "researcher",
  ]),
  location: z.string().trim().max(80).optional(),
  workStatus: z.enum([
    "focused",
    "open_to_work",
    "open_to_collaborate",
    "hiring",
  ]),
  availability: z.enum(["none", "part_time", "full_time", "advisory"]),
  locale: z.enum(["en", "es"]),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  handle: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9-]+$/),
  bio: z.string().trim().max(240),
  location: z.string().trim().max(80).optional(),
  workStatus: z.string().trim().max(80),
  stack: z.array(z.string().trim().min(1).max(32)).max(12).default([]),
  interests: z.array(z.string().trim().min(1).max(32)).max(16).default([]),
  contentPreferences: z
    .array(z.string().trim().min(1).max(48))
    .max(10)
    .default([]),
  participationIntents: z
    .array(z.string().trim().min(1).max(48))
    .max(10)
    .default([]),
  links: z.array(z.url()).max(8),
  image: z
    .union([
      z.url(),
      z.string().regex(profileMediaPublicPathPattern, {
        message: "Invalid local avatar path.",
      }),
    ])
    .nullable()
    .optional(),
  bannerUrl: z
    .union([
      z.url(),
      z.string().regex(profileMediaPublicPathPattern, {
        message: "Invalid local banner path.",
      }),
    ])
    .nullable()
    .optional(),
  palette: z.string().trim().min(2).max(32).optional(),
  visibility: z.object({
    email: visibilitySchema,
    followers: visibilitySchema,
    thanks: visibilitySchema,
    completedCourses: visibilitySchema,
    location: visibilitySchema,
  }),
});

const postContentTypeSchema = z
  .enum([
    "standard",
    "project_signal",
    "course_update",
    "question",
    "build_log",
    "resource",
  ])
  .default("standard");

const projectSignalSchema = z.object({
  repoUrl: z.url().refine((value) => parseGitHubRepoUrl(value) !== null, {
    message: "Project Signal posts require a valid GitHub repository URL.",
  }),
  repoKey: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/),
  owner: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(500),
  primaryLanguage: z.string().trim().min(1).max(40).nullable().optional(),
  license: z.string().trim().min(1).max(80).nullable().optional(),
  homepage: z.url().nullable().optional(),
  domains: z.array(z.string().trim().min(1).max(48)).max(8).default([]),
  stack: z.array(z.string().trim().min(1).max(48)).max(12).default([]),
  needs: z.array(z.string().trim().min(1).max(64)).min(1).max(8),
  maturity: z.enum([
    "Idea",
    "Prototype",
    "MVP",
    "Active development",
    "Beta",
    "Production-ready",
    "Maintained",
    "Experimental",
    "Archived",
  ]),
  intent: z.enum([
    "Showcase",
    "Looking for feedback",
    "Looking for contributors",
    "Build in public",
    "Launch",
    "Changelog",
    "Research note",
    "Learning resource",
  ]),
  audience: z.array(z.string().trim().min(1).max(64)).max(8).default([]),
  language: z.enum(["en", "es"]).default("en"),
  evidence: z.object({
    stars: z.number().int().nonnegative().max(10_000_000),
    forks: z.number().int().nonnegative().max(10_000_000),
    topics: z.array(z.string().trim().min(1).max(64)).max(40).default([]),
    readmeHeadings: z
      .array(z.string().trim().min(1).max(160))
      .max(80)
      .default([]),
    rootFiles: z.array(z.string().trim().min(1).max(240)).max(200).default([]),
  }),
});

export const postSchema = z
  .object({
    contentType: postContentTypeSchema,
    category: z.enum(["News", "Project", "Help", "CoWork", "Meta"]),
    title: z.string().trim().min(3).max(140),
    body: z.string().trim().min(1).max(4000),
    tags: z.array(z.string().trim().min(1).max(64)).max(12),
    media: z
      .array(
        z.object({
          type: z.enum(["image", "video", "embed", "link"]),
          url: z.union([
            z.url(),
            z.string().regex(/^\/uploads\/posts\/[a-zA-Z0-9/_.,-]+$/, {
              message: "Invalid local post media path.",
            }),
          ]),
          title: z.string().trim().max(120).optional(),
          provider: z
            .enum(["youtube", "vimeo", "external", "local"])
            .optional(),
          thumbnailUrl: z.url().optional(),
        }),
      )
      .max(6)
      .default([]),
    projectSignal: projectSignalSchema.optional(),
  })
  .superRefine((post, context) => {
    if (post.contentType === "project_signal" && !post.projectSignal) {
      context.addIssue({
        code: "custom",
        path: ["projectSignal"],
        message: "Project Signal metadata is required.",
      });
    }

    if (post.projectSignal && post.contentType !== "project_signal") {
      context.addIssue({
        code: "custom",
        path: ["contentType"],
        message:
          "Project Signal metadata can only be used on Project Signal posts.",
      });
    }
  });

export const postMediaUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(240),
  mimeType: z.enum(postMediaMimeTypes),
  byteSize: z.number().int().positive().max(POST_MEDIA_MAX_BYTES),
});

export const commentSchema = z.object({
  postId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  body: z.string().trim().min(1).max(2500),
});

export const postEntitySchema = z.object({
  postId: z.string().uuid(),
});

export const postUpdateSchema = postSchema.extend({
  postId: z.string().uuid(),
});

export const projectSignalPreviewSchema = z.object({
  repoUrl: z.string().trim().min(10).max(240),
});

export const projectSignalResponseSchema = z.object({
  postId: z.string().uuid(),
  intent: z.enum(projectSignalResponseIntents),
  note: z.string().trim().max(280).optional(),
});

export const commentEntitySchema = z.object({
  commentId: z.string().uuid(),
});

export const commentHelpfulSchema = commentEntitySchema.extend({
  helpful: z.boolean().default(true),
});

export const commentUpdateSchema = commentEntitySchema.extend({
  body: z.string().trim().min(1).max(2500),
});

export const followProfileSchema = z.object({
  profileUserId: z.string().uuid(),
});

export const notificationReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).max(100).default([]),
});

export const accountDeleteSchema = z.object({
  confirmation: z.literal("DELETE"),
});

export const feedPageSchema = z.object({
  cursor: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().min(1).max(30).default(10),
  category: z.enum(["News", "Project", "Help", "CoWork", "Meta"]).optional(),
  query: z.string().trim().max(120).optional(),
  hashtag: z.string().trim().max(64).optional(),
  mode: z.enum(["for-you", "latest", "following", "top"]).default("for-you"),
});

export const feedImpressionSchema = z.object({
  items: z
    .array(
      z.object({
        entityType: z.enum(["post", "course", "rss"]),
        entityId: z.string().trim().min(1).max(160),
      }),
    )
    .max(40),
  source: z.string().trim().min(1).max(40).default("feed"),
});

export const feedFeedbackSchema = z.object({
  entityType: z.enum(["post", "course", "rss"]),
  entityId: z.string().trim().min(1).max(160),
  signal: z.enum([
    "more_like_this",
    "less_like_this",
    "mute_source",
    "mute_tag",
  ]),
  value: z.string().trim().max(160).optional(),
});

export const reportSchema = z.object({
  entityType: z.enum(["post", "comment", "course"]),
  entityId: z.string().uuid(),
  reason: z.enum([
    "spam",
    "malicious_code",
    "harassment",
    "copyright",
    "other",
  ]),
  details: z.string().trim().max(1000).optional(),
});

export const reportResolutionSchema = z.object({
  reportId: z.string().uuid(),
  resolved: z.boolean(),
});

export const moderationEntityActionSchema = z.object({
  entityType: z.enum(["post", "comment"]),
  entityId: z.string().uuid(),
  action: z.enum(["hide", "restore"]),
  reason: z.string().trim().min(3).max(240),
});

export const accountModerationActionSchema = z.object({
  subjectId: z.string().uuid(),
  action: z.enum(["warning", "suspension", "ban", "restore"]),
  reason: z.string().trim().min(3).max(240),
  expiresAt: z.iso.datetime().optional(),
});

const courseStudioSectionSchema = z.object({
  clientId: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(20).max(12_000),
  code: z.string().max(20_000).optional(),
  embeds: z
    .array(
      z.union([
        z.url(),
        z.string().regex(courseMediaPublicPathPattern, {
          message: "Invalid media library asset path.",
        }),
      ]),
    )
    .max(8)
    .default([]),
  visualizations: z.array(courseVisualizationSchema).max(6).default([]),
});

const courseStudioExerciseSchema = z.object({
  sectionClientId: z.string().trim().min(2).max(64),
  prompt: z.string().trim().min(10).max(500),
  starterCode: z.string().trim().min(1).max(20_000),
  assertionCode: z.string().trim().min(1).max(20_000),
  successMessage: z.string().trim().min(3).max(240),
});

const ipynbMetadataSchema = z
  .object({
    fileName: z.string().trim().min(1).max(240),
    cellCount: z.number().int().nonnegative().max(10_000),
    language: z.string().trim().min(1).max(40).default("python"),
    outline: z.array(z.string().trim().min(1).max(160)).max(80).default([]),
    colabUrl: z.url().optional(),
  })
  .nullable()
  .optional();

export const courseDraftSchema = z
  .object({
    draftId: z.string().uuid().optional(),
    title: z.string().trim().min(4).max(140),
    description: z.string().trim().min(10).max(500),
    tags: z.array(z.string().trim().min(1).max(32)).min(1).max(12),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    status: z.enum(["draft", "published"]).default("draft"),
    content: z.unknown(),
    sections: z.array(courseStudioSectionSchema).min(1).max(80),
    exercises: z.array(courseStudioExerciseSchema).max(120).default([]),
    ipynbMetadata: ipynbMetadataSchema,
  })
  .superRefine((draft, context) => {
    const sectionIds = new Set(
      draft.sections.map((section) => section.clientId),
    );
    const duplicateSectionIds = draft.sections.filter(
      (section, index) =>
        draft.sections.findIndex(
          (item) => item.clientId === section.clientId,
        ) !== index,
    );

    for (const section of duplicateSectionIds) {
      context.addIssue({
        code: "custom",
        path: ["sections", section.clientId],
        message: "Section client ids must be unique.",
      });
    }

    for (const [index, exercise] of draft.exercises.entries()) {
      if (!sectionIds.has(exercise.sectionClientId)) {
        context.addIssue({
          code: "custom",
          path: ["exercises", index, "sectionClientId"],
          message: "Exercise must reference an existing draft section.",
        });
      }
    }
  });

export const courseEntitySchema = z.object({
  courseId: z.string().uuid(),
});

export const courseMediaMetadataSchema = z.object({
  assetId: z.string().uuid(),
  altText: z.string().trim().max(160).nullable().optional(),
  caption: z.string().trim().max(240).nullable().optional(),
  labels: z.array(z.string().trim().max(32)).max(8).optional(),
});

export const courseSectionViewSchema = z.object({
  courseId: z.string().uuid(),
  sectionId: z.string().uuid(),
});

export const exerciseResultSchema = z.object({
  courseId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  status: z.enum(["passed", "failed"]),
  stdout: z.string().max(10_000),
  stderr: z.string().max(10_000),
  durationMs: z.number().int().nonnegative().max(30_000),
});
