import { rankFeedItems, type FeedRankingMode } from "./ranking";
import type { PostContentType, ProjectSignalMetadata } from "./project-signals";
import type { ProjectSignalResponseIntent } from "./project-signal-actions";

export type Locale = "en" | "es";

export type Visibility = "public" | "followers" | "private";

export type BinnacleCategory = "News" | "Project" | "Help" | "CoWork" | "Meta";

export const BINNACLE_CATEGORIES: BinnacleCategory[] = [
  "News",
  "Project",
  "Help",
  "CoWork",
  "Meta",
];

export type Viewer = {
  id: string;
  follows: string[];
  interests: string[];
};

export type Profile = {
  id: string;
  handle: string;
  name: string;
  image?: string | null;
  bannerUrl?: string | null;
  palette?: string;
  bio: string;
  location?: string;
  email?: string;
  workStatus: string;
  stack?: string[];
  interests?: string[];
  contentPreferences?: string[];
  participationIntents?: string[];
  followers: number;
  thanks: number;
  badges: string[];
  links: string[];
  visibility: {
    email: Visibility;
    followers: Visibility;
    thanks: Visibility;
    completedCourses: Visibility;
    location: Visibility;
  };
};

export type VisibleProfile = Omit<
  Profile,
  "visibility" | "email" | "followers" | "thanks" | "location"
> & {
  email?: string;
  followers?: number;
  thanks?: number;
  location?: string;
};

export type FeedItem = {
  id: string;
  type: "post" | "course" | "rss";
  contentType?: PostContentType;
  category: BinnacleCategory;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  tags: string[];
  media: PostMedia[];
  createdAt: string;
  interests: number;
  comments: number;
  sourceUrl?: string;
  imageUrl?: string;
  projectSignal?: ProjectSignalMetadata;
  projectSignalViewerResponses?: ProjectSignalResponseIntent[];
  viewerState?: {
    interested: boolean;
    saved: boolean;
    reported: boolean;
    canDelete: boolean;
  };
};

export type TrendWindow = "today" | "recent";

export type TrendTopic = {
  label: string;
  slug: string;
  articleCount: number;
  sourceCount: number;
  score: number;
  window: TrendWindow;
  latestTitle?: string;
  latestUrl?: string;
};

export type FeedFilters = {
  category?: BinnacleCategory;
  query?: string;
  hashtag?: string;
  viewer: Viewer;
  mode?: FeedRankingMode;
};

export type PostMediaType = "image" | "video" | "embed" | "link";

export type PostMedia = {
  type: PostMediaType;
  url: string;
  title?: string;
  provider?: "youtube" | "vimeo" | "external" | "local";
  thumbnailUrl?: string;
};

export type CourseSection = {
  id: string;
  title: string;
  requiredExerciseIds: string[];
};

export type Course = {
  id: string;
  slug: string;
  title: string;
  description: string;
  creatorId: string;
  tags: string[];
  sections: CourseSection[];
  completions?: number;
};

export type CourseProgress = {
  courseId: string;
  userId: string;
  viewedSectionIds: string[];
  passedExerciseIds: string[];
  completedAt: string | null;
};

export type NotificationType =
  | "follow"
  | "reply"
  | "thanks"
  | "course_completed"
  | "thanks_nudge"
  | "project_signal_response";

export type NotificationEvent = {
  id: string;
  type: NotificationType;
  actorId: string;
  recipientId: string;
  message: string;
  entityId?: string;
  href?: string;
  createdAt: string;
  read: boolean;
};

export type CompletionEventInput = {
  kind: "course_completed";
  actorId: string;
  recipientId: string;
  courseId: string;
  courseTitle: string;
};

function isVisible(
  visibility: Visibility,
  fieldOwnerId: string,
  viewer?: Viewer,
) {
  if (viewer?.id === fieldOwnerId) {
    return true;
  }

  if (visibility === "public") {
    return true;
  }

  if (visibility === "followers") {
    return Boolean(viewer?.follows.includes(fieldOwnerId));
  }

  return false;
}

export function getVisibleProfile(
  profile: Profile,
  viewer?: Viewer,
): VisibleProfile {
  const visible: VisibleProfile = {
    id: profile.id,
    handle: profile.handle,
    name: profile.name,
    image: profile.image,
    bannerUrl: profile.bannerUrl,
    palette: profile.palette,
    bio: profile.bio,
    workStatus: profile.workStatus,
    stack: profile.stack ?? [],
    interests: profile.interests ?? [],
    contentPreferences: profile.contentPreferences ?? [],
    participationIntents: profile.participationIntents ?? [],
    badges: profile.badges,
    links: profile.links,
  };

  if (isVisible(profile.visibility.email, profile.id, viewer)) {
    visible.email = profile.email;
  }

  if (isVisible(profile.visibility.followers, profile.id, viewer)) {
    visible.followers = profile.followers;
  }

  if (isVisible(profile.visibility.thanks, profile.id, viewer)) {
    visible.thanks = profile.thanks;
  }

  if (isVisible(profile.visibility.location, profile.id, viewer)) {
    visible.location = profile.location;
  }

  return visible;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function matchesQuery(item: FeedItem, query?: string) {
  if (!query?.trim()) {
    return true;
  }

  const normalized = normalizeText(query).replace(/^#/, "");
  const haystack = [item.title, item.body, item.authorName, ...item.tags]
    .map(normalizeText)
    .join(" ");

  return haystack.includes(normalized);
}

export function buildHomeFeed(
  items: FeedItem[],
  filters: FeedFilters,
): FeedItem[] {
  const hashtag = filters.hashtag?.replace(/^#/, "").toLowerCase();

  const filtered = items
    .filter((item) =>
      filters.category ? item.category === filters.category : true,
    )
    .filter((item) => matchesQuery(item, filters.query))
    .filter((item) =>
      hashtag ? item.tags.some((tag) => normalizeText(tag) === hashtag) : true,
    );

  return rankFeedItems(filtered, filters.viewer, { mode: filters.mode });
}

export function completeCourseIfEligible(
  course: Course,
  progress: CourseProgress,
  completedAt = new Date().toISOString(),
) {
  const viewedSections = new Set(progress.viewedSectionIds);
  const passedExercises = new Set(progress.passedExerciseIds);
  const allSectionsViewed = course.sections.every((section) =>
    viewedSections.has(section.id),
  );
  const allExercisesPassed = course.sections
    .flatMap((section) => section.requiredExerciseIds)
    .every((exerciseId) => passedExercises.has(exerciseId));

  if (!allSectionsViewed || !allExercisesPassed) {
    return { completed: false, progress };
  }

  if (progress.completedAt) {
    return { completed: true, progress };
  }

  return {
    completed: true,
    progress: {
      ...progress,
      completedAt,
    },
  };
}

export function createNotificationEvents(
  input: CompletionEventInput,
): NotificationEvent[] {
  const now = new Date().toISOString();

  return [
    {
      id: `${input.courseId}-creator-completion`,
      type: "course_completed",
      actorId: input.actorId,
      recipientId: input.recipientId,
      entityId: input.courseId,
      message: `A learner completed ${input.courseTitle}.`,
      createdAt: now,
      read: false,
    },
    {
      id: `${input.courseId}-student-thanks-nudge`,
      type: "thanks_nudge",
      actorId: input.recipientId,
      recipientId: input.actorId,
      entityId: input.courseId,
      message: `Leave Thanks if ${input.courseTitle} helped you.`,
      createdAt: now,
      read: false,
    },
  ];
}

export function searchCourses<T extends Course>(
  courses: T[],
  query: string,
): T[] {
  const normalized = normalizeText(query).replace(/^#/, "");

  if (!normalized) {
    return courses;
  }

  return courses.filter((course) => {
    const haystack = [course.title, course.description, ...course.tags]
      .map(normalizeText)
      .join(" ");
    return haystack.includes(normalized);
  });
}
