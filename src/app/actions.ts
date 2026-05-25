"use server";

import {
  commentSchema,
  commentEntitySchema,
  commentHelpfulSchema,
  commentUpdateSchema,
  courseEntitySchema,
  courseDraftSchema,
  courseMediaMetadataSchema,
  courseSectionViewSchema,
  exerciseResultSchema,
  feedFeedbackSchema,
  feedImpressionSchema,
  feedPageSchema,
  followProfileSchema,
  accountModerationActionSchema,
  moderationEntityActionSchema,
  notificationReadSchema,
  accountDeleteSchema,
  onboardingSchema,
  postEntitySchema,
  postSchema,
  postUpdateSchema,
  projectSignalResponseSchema,
  profileUpdateSchema,
  projectSignalPreviewSchema,
  reportSchema,
  reportResolutionSchema,
} from "@/lib/validators";
import { getCurrentUserId, requireAdminUserId } from "@/server/current-user";
import { persistCourseMediaUpload } from "@/server/course-media-storage";
import { persistPostMediaUpload } from "@/server/post-media-storage";
import { persistProfileMediaUpload } from "@/server/profile-media-storage";
import {
  deleteAccountData,
  exportAccountData,
} from "@/server/repositories/account";
import {
  completeCourseForUser,
  markNotificationsReadForUser,
  moderateAccountStatus,
  moderateEntityStatus,
  persistComment,
  persistCourseDraft,
  persistCourseSave,
  persistCourseThanks,
  persistExerciseTelemetry,
  persistOnboarding,
  persistPost,
  persistProjectSignalResponse,
  persistPostSave,
  persistProfileUpdate,
  persistReport,
  softDeleteComment,
  softDeletePost,
  persistSectionView,
  setReportResolved,
  setCommentHelpfulByAuthor,
  toggleFollowProfile,
  togglePostInterest,
  updateCommentForAuthor,
  updatePostForAuthor,
} from "@/server/repositories/mutations";
import { updateCourseMediaAssetMetadata } from "@/server/repositories/media";
import {
  persistFeedFeedback,
  recordFeedImpressions,
} from "@/server/repositories/feed-controls";
import { listFeedPage } from "@/server/repositories/feed";
import { previewProjectSignalDraft } from "@/server/repositories/project-signals";
import { assertRateLimit } from "@/server/rate-limit";
import { assertUserContentAcceptable } from "@/lib/abuse-heuristics";

export async function submitOnboarding(input: unknown) {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "onboarding:submit",
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  return persistOnboarding(userId, onboardingSchema.parse(input));
}

export async function updateProfile(input: unknown) {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "profile:update",
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  return persistProfileUpdate(userId, profileUpdateSchema.parse(input));
}

export async function uploadProfileMedia(input: FormData) {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "profile:media",
    limit: 20,
    windowMs: 30 * 60 * 1000,
  });
  const file = input.get("file");
  const kind = input.get("kind");

  if (!(file instanceof File)) {
    throw new Error("Upload an avatar or banner image.");
  }

  if (kind !== "avatar" && kind !== "banner") {
    throw new Error("Profile media kind must be avatar or banner.");
  }

  return persistProfileMediaUpload(userId, kind, file);
}

export async function createPost(input: unknown) {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "post:create",
    limit: 12,
    windowMs: 10 * 60 * 1000,
  });
  const post = postSchema.parse(input);
  assertUserContentAcceptable({
    title: post.title,
    body: post.body,
    tags: post.tags,
    mediaUrls: post.media.map((media) => media.url),
  });
  return persistPost(userId, post);
}

export async function previewProjectSignal(input: unknown) {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "project_signal:preview",
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  const { repoUrl } = projectSignalPreviewSchema.parse(input);
  return previewProjectSignalDraft(repoUrl);
}

export async function respondToProjectSignal(input: unknown) {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "project_signal:respond",
    limit: 40,
    windowMs: 30 * 60 * 1000,
  });
  return persistProjectSignalResponse(
    userId,
    projectSignalResponseSchema.parse(input),
  );
}

export async function updatePost(input: unknown) {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "post:update",
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  const post = postUpdateSchema.parse(input);
  assertUserContentAcceptable({
    title: post.title,
    body: post.body,
    tags: post.tags,
    mediaUrls: post.media.map((media) => media.url),
  });
  return updatePostForAuthor(userId, post);
}

export async function uploadPostMedia(input: FormData) {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "post:media",
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  const file = input.get("file");

  if (!(file instanceof File)) {
    throw new Error("Upload an image or video file.");
  }

  return persistPostMediaUpload(userId, file);
}

export async function createComment(input: unknown) {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "comment:create",
    limit: 40,
    windowMs: 10 * 60 * 1000,
  });
  const comment = commentSchema.parse(input);
  assertUserContentAcceptable({ body: comment.body });
  return persistComment(userId, comment);
}

export async function updateComment(input: unknown) {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "comment:update",
    limit: 60,
    windowMs: 10 * 60 * 1000,
  });
  const comment = commentUpdateSchema.parse(input);
  assertUserContentAcceptable({ body: comment.body });
  return updateCommentForAuthor(userId, comment);
}

export async function markCommentHelpful(input: unknown) {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "comment:helpful",
    limit: 40,
    windowMs: 10 * 60 * 1000,
  });
  return setCommentHelpfulByAuthor(userId, commentHelpfulSchema.parse(input));
}

export async function deletePost(input: unknown) {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "post:delete",
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  const { postId } = postEntitySchema.parse(input);
  return softDeletePost(userId, postId);
}

export async function deleteComment(input: unknown) {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "comment:delete",
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  const { commentId } = commentEntitySchema.parse(input);
  return softDeleteComment(userId, commentId);
}

export async function reportEntity(input: unknown) {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "report:create",
    limit: 10,
    windowMs: 30 * 60 * 1000,
  });
  return persistReport(userId, reportSchema.parse(input));
}

export async function loadFeedPage(input: unknown) {
  const userId = await getCurrentUserId();
  const page = feedPageSchema.parse(input);
  return listFeedPage({
    viewerId: userId,
    category: page.category,
    query: page.query,
    hashtag: page.hashtag,
    mode: page.mode,
    cursor: page.cursor,
    pageSize: page.pageSize,
  });
}

export async function recordFeedSeen(input: unknown) {
  const userId = await getCurrentUserId();
  return recordFeedImpressions(userId, feedImpressionSchema.parse(input));
}

export async function sendFeedFeedback(input: unknown) {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "feed:feedback",
    limit: 120,
    windowMs: 10 * 60 * 1000,
  });
  return persistFeedFeedback(userId, feedFeedbackSchema.parse(input));
}

export async function resolveReport(input: unknown) {
  const actorId = await requireAdminUserId();
  return setReportResolved({ ...reportResolutionSchema.parse(input), actorId });
}

export async function moderateEntity(input: unknown) {
  const actorId = await requireAdminUserId();
  return moderateEntityStatus(
    actorId,
    moderationEntityActionSchema.parse(input),
  );
}

export async function moderateAccount(input: unknown) {
  const actorId = await requireAdminUserId();
  return moderateAccountStatus(
    actorId,
    accountModerationActionSchema.parse(input),
  );
}

export async function toggleInterest(input: unknown) {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "post:interest",
    limit: 120,
    windowMs: 5 * 60 * 1000,
  });
  const { postId } = postEntitySchema.parse(input);
  return togglePostInterest(userId, postId);
}

export async function savePost(input: unknown) {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "post:save",
    limit: 120,
    windowMs: 5 * 60 * 1000,
  });
  return persistPostSave(userId, postEntitySchema.parse(input));
}

export async function followProfile(input: unknown) {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "profile:follow",
    limit: 80,
    windowMs: 10 * 60 * 1000,
  });
  return toggleFollowProfile(userId, followProfileSchema.parse(input));
}

export async function markNotificationsRead(input: unknown) {
  const userId = await getCurrentUserId();
  return markNotificationsReadForUser(
    userId,
    notificationReadSchema.parse(input),
  );
}

export async function saveCourseDraft(input: unknown) {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "course:draft",
    limit: 120,
    windowMs: 10 * 60 * 1000,
  });
  return persistCourseDraft(userId, courseDraftSchema.parse(input));
}

export async function uploadCourseMedia(input: FormData) {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "course:media",
    limit: 40,
    windowMs: 30 * 60 * 1000,
  });
  const file = input.get("file");

  if (!(file instanceof File)) {
    throw new Error("Upload a media file.");
  }

  return persistCourseMediaUpload(userId, file);
}

export async function updateCourseMediaMetadata(input: unknown) {
  const userId = await getCurrentUserId();
  const metadata = courseMediaMetadataSchema.parse(input);
  return updateCourseMediaAssetMetadata(userId, metadata.assetId, {
    altText: metadata.altText ?? null,
    caption: metadata.caption ?? null,
    labels: metadata.labels ?? [],
  });
}

export async function persistExerciseResult(input: unknown) {
  const userId = await getCurrentUserId();
  return persistExerciseTelemetry(userId, exerciseResultSchema.parse(input));
}

export async function markCourseSectionViewed(input: unknown) {
  const userId = await getCurrentUserId();
  return persistSectionView(userId, courseSectionViewSchema.parse(input));
}

export async function thankCourse(input: unknown) {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "course:thanks",
    limit: 80,
    windowMs: 10 * 60 * 1000,
  });
  return persistCourseThanks(userId, courseEntitySchema.parse(input));
}

export async function saveCourse(input: unknown) {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "course:save",
    limit: 120,
    windowMs: 5 * 60 * 1000,
  });
  return persistCourseSave(userId, courseEntitySchema.parse(input));
}

export async function completeCourse(input: unknown) {
  const userId = await getCurrentUserId();
  const { courseId } = courseEntitySchema.parse(input);
  return completeCourseForUser(userId, courseId);
}

export async function exportMyAccountData() {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "account:export",
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  return exportAccountData(userId);
}

export async function deleteMyAccount(input: unknown) {
  const userId = await getCurrentUserId();
  await assertRateLimit({
    actorId: userId,
    action: "account:delete",
    limit: 3,
    windowMs: 24 * 60 * 60 * 1000,
  });
  accountDeleteSchema.parse(input);
  return deleteAccountData(userId);
}
