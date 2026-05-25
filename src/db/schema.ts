import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { PostMedia } from "@/lib/domain";
import type {
  PostContentType,
  ProjectSignalMetadata,
} from "@/lib/project-signals";
import type { ProjectSignalResponseIntent } from "@/lib/project-signal-actions";

export const visibilityEnum = pgEnum("visibility", [
  "public",
  "followers",
  "private",
]);
export const postCategoryEnum = pgEnum("post_category", [
  "News",
  "Project",
  "Help",
  "CoWork",
  "Meta",
]);
export const postContentTypeEnum = pgEnum("post_content_type", [
  "standard",
  "project_signal",
  "course_update",
  "question",
  "build_log",
  "resource",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "follow",
  "reply",
  "thanks",
  "course_completed",
  "thanks_nudge",
  "project_signal_response",
]);
export const projectSignalResponseIntentEnum = pgEnum(
  "project_signal_response_intent",
  ["try", "review", "contribute", "follow_build"],
);
export const reportReasonEnum = pgEnum("report_reason", [
  "spam",
  "malicious_code",
  "harassment",
  "copyright",
  "other",
]);
export const feedFeedbackSignalEnum = pgEnum("feed_feedback_signal", [
  "more_like_this",
  "less_like_this",
  "mute_source",
  "mute_tag",
]);
export const accountModerationActionEnum = pgEnum("account_moderation_action", [
  "warning",
  "suspension",
  "ban",
  "restore",
]);
export const courseStatusEnum = pgEnum("course_status", [
  "draft",
  "published",
  "archived",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name"),
    email: text("email").notNull(),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    image: text("image"),
    role: text("role").notNull().default("user"),
    banned: boolean("banned").notNull().default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
    index("accounts_user_id_idx").on(table.userId),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

export const profiles = pgTable(
  "profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    handle: text("handle").notNull(),
    bio: text("bio").notNull().default(""),
    bannerUrl: text("banner_url"),
    palette: text("palette").notNull().default("cyan"),
    location: text("location"),
    workStatus: text("work_status").notNull().default("focused"),
    availability: text("availability").notNull().default("none"),
    seniority: text("seniority").notNull().default("mid"),
    stack: jsonb("stack").$type<string[]>().notNull().default([]),
    interests: jsonb("interests").$type<string[]>().notNull().default([]),
    contentPreferences: jsonb("content_preferences")
      .$type<string[]>()
      .notNull()
      .default([]),
    participationIntents: jsonb("participation_intents")
      .$type<string[]>()
      .notNull()
      .default([]),
    links: jsonb("links").$type<string[]>().notNull().default([]),
    visibility: jsonb("visibility")
      .$type<Record<string, "public" | "followers" | "private">>()
      .notNull()
      .default({
        email: "private",
        followers: "public",
        thanks: "public",
        completedCourses: "followers",
        location: "public",
      }),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("profiles_handle_idx").on(table.handle)],
);

export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followingId] }),
    index("follows_following_idx").on(table.followingId),
  ],
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: postCategoryEnum("category").notNull(),
    contentType: postContentTypeEnum("content_type")
      .$type<PostContentType>()
      .notNull()
      .default("standard"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    media: jsonb("media").$type<PostMedia[]>().notNull().default([]),
    projectSignal: jsonb(
      "project_signal",
    ).$type<ProjectSignalMetadata | null>(),
    status: text("status").notNull().default("active"),
    statusReason: text("status_reason"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("posts_category_created_idx").on(table.category, table.createdAt),
    index("posts_author_idx").on(table.authorId),
    index("posts_content_type_created_idx").on(
      table.contentType,
      table.createdAt,
    ),
    index("posts_status_created_idx").on(table.status, table.createdAt),
  ],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    category: text("category").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("tags_slug_idx").on(table.slug),
    index("tags_category_idx").on(table.category),
  ],
);

export const postTags = pgTable(
  "post_tags",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    source: text("source").notNull().default("author"),
    confidence: integer("confidence").notNull().default(100),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.tagId] }),
    index("post_tags_tag_idx").on(table.tagId),
  ],
);

export const userInterests = pgTable(
  "user_interests",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    weight: integer("weight").notNull().default(100),
    source: text("source").notNull().default("onboarding"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.tagId] }),
    index("user_interests_tag_idx").on(table.tagId),
  ],
);

export const postAudienceTargets = pgTable(
  "post_audience_targets",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    weight: integer("weight").notNull().default(100),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.tagId] }),
    index("post_audience_targets_tag_idx").on(table.tagId),
  ],
);

export const githubRepoCache = pgTable(
  "github_repo_cache",
  {
    repoKey: text("repo_key").primaryKey(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("github_repo_cache_fetched_idx").on(table.fetchedAt)],
);

export const postInterests = pgTable(
  "post_interests",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.postId, table.userId] })],
);

export const projectSignalResponses = pgTable(
  "project_signal_responses",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    intent: projectSignalResponseIntentEnum("intent")
      .$type<ProjectSignalResponseIntent>()
      .notNull(),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.userId, table.intent] }),
    index("project_signal_responses_post_idx").on(table.postId),
    index("project_signal_responses_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    body: text("body").notNull(),
    status: text("status").notNull().default("active"),
    statusReason: text("status_reason"),
    helpfulByAuthor: boolean("helpful_by_author").notNull().default(false),
    helpfulAt: timestamp("helpful_at", { withTimezone: true }),
    helpfulBy: uuid("helpful_by").references(() => users.id, {
      onDelete: "set null",
    }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("comments_post_parent_idx").on(table.postId, table.parentId),
    index("comments_helpful_idx").on(table.helpfulByAuthor),
  ],
);

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    status: courseStatusEnum("status").notNull().default("draft"),
    difficulty: text("difficulty").notNull().default("intermediate"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    coverUrl: text("cover_url"),
    ipynbMetadata: jsonb("ipynb_metadata").$type<Record<
      string,
      unknown
    > | null>(),
    completionCount: integer("completion_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("courses_slug_idx").on(table.slug),
    index("courses_creator_idx").on(table.creatorId),
  ],
);

export const courseSections = pgTable(
  "course_sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: jsonb("content").$type<Record<string, unknown>>().notNull(),
    order: integer("order").notNull(),
  },
  (table) => [
    index("course_sections_course_order_idx").on(table.courseId, table.order),
  ],
);

export const courseRevisions = pgTable(
  "course_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    status: courseStatusEnum("status").notNull(),
    title: text("title").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("course_revisions_course_revision_idx").on(
      table.courseId,
      table.revisionNumber,
    ),
    index("course_revisions_course_created_idx").on(
      table.courseId,
      table.createdAt,
    ),
    index("course_revisions_creator_created_idx").on(
      table.creatorId,
      table.createdAt,
    ),
  ],
);

export const courseMediaAssets = pgTable(
  "course_media_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").references(() => courses.id, {
      onDelete: "set null",
    }),
    kind: text("kind").notNull(),
    originalFileName: text("original_file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    url: text("url").notNull(),
    altText: text("alt_text"),
    caption: text("caption"),
    labels: jsonb("labels").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("course_media_assets_url_idx").on(table.url),
    index("course_media_assets_owner_created_idx").on(
      table.ownerId,
      table.createdAt,
    ),
    index("course_media_assets_course_idx").on(table.courseId),
  ],
);

export const exercises = pgTable("exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  sectionId: uuid("section_id")
    .notNull()
    .references(() => courseSections.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  starterCode: text("starter_code").notNull(),
  assertionCode: text("assertion_code").notNull(),
  successMessage: text("success_message").notNull(),
});

export const courseProgress = pgTable(
  "course_progress",
  {
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    viewedSectionIds: jsonb("viewed_section_ids")
      .$type<string[]>()
      .notNull()
      .default([]),
    passedExerciseIds: jsonb("passed_exercise_ids")
      .$type<string[]>()
      .notNull()
      .default([]),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.courseId, table.userId] })],
);

export const thanks = pgTable(
  "thanks",
  {
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.courseId, table.userId] })],
);

export const saves = pgTable(
  "saves",
  {
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.entityType, table.entityId, table.userId] }),
  ],
);

export const feedImpressions = pgTable(
  "feed_impressions",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    source: text("source").notNull().default("feed"),
    seenCount: integer("seen_count").notNull().default(1),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.entityType, table.entityId] }),
    index("feed_impressions_user_last_seen_idx").on(
      table.userId,
      table.lastSeenAt,
    ),
  ],
);

export const feedFeedback = pgTable(
  "feed_feedback",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    signal: feedFeedbackSignalEnum("signal").notNull(),
    value: text("value"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.entityType, table.entityId, table.signal],
    }),
    index("feed_feedback_user_signal_idx").on(table.userId, table.signal),
  ],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    reason: reportReasonEnum("reason").notNull(),
    details: text("details"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    resolved: boolean("resolved").notNull().default(false),
  },
  (table) => [
    uniqueIndex("reports_reporter_entity_idx").on(
      table.reporterId,
      table.entityType,
      table.entityId,
    ),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, string | number | boolean | null>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_events_entity_idx").on(table.entityType, table.entityId),
    index("audit_events_actor_created_idx").on(table.actorId, table.createdAt),
  ],
);

export const accountModerationActions = pgTable(
  "account_moderation_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: accountModerationActionEnum("action").notNull(),
    reason: text("reason").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("account_moderation_subject_created_idx").on(
      table.subjectId,
      table.createdAt,
    ),
    index("account_moderation_actor_created_idx").on(
      table.actorId,
      table.createdAt,
    ),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    type: notificationTypeEnum("type").notNull(),
    message: text("message").notNull(),
    entityId: uuid("entity_id"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notifications_recipient_read_idx").on(table.recipientId, table.read),
  ],
);

export const rssSources = pgTable(
  "rss_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    enabled: boolean("enabled").notNull().default(true),
  },
  (table) => [uniqueIndex("rss_sources_url_idx").on(table.url)],
);

export const rssItems = pgTable(
  "rss_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => rssSources.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    url: text("url").notNull(),
    imageUrl: text("image_url"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  },
  (table) => [uniqueIndex("rss_items_url_idx").on(table.url)],
);

export const badges = pgTable("badges", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  description: text("description").notNull(),
  awardedAt: timestamp("awarded_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
