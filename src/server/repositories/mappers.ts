import type {
  BinnacleCategory,
  Course,
  FeedItem,
  PostMedia,
  Profile,
} from "@/lib/domain";
import type {
  PostContentType,
  ProjectSignalMetadata,
} from "@/lib/project-signals";
import type { ProjectSignalResponseIntent } from "@/lib/project-signal-actions";
import type { CourseDetail, CourseExercise } from "@/lib/product-types";
import type { CourseMediaAsset } from "@/lib/course-media";
import type { CourseVisualization } from "@/lib/course-visualizations";

export type PersistedPostFeedRow = {
  id: string;
  type: "post" | "rss" | "course";
  contentType?: PostContentType;
  category: BinnacleCategory;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  tags: string[];
  media?: PostMedia[];
  createdAt: Date;
  interests: number;
  comments: number;
  sourceUrl?: string;
  imageUrl?: string;
  projectSignal?: ProjectSignalMetadata | null;
  projectSignalViewerResponses?: ProjectSignalResponseIntent[];
  viewerState?: {
    interested: boolean;
    saved: boolean;
    reported: boolean;
    canDelete: boolean;
  };
};

export type PersistedProfileRow = Profile;

export type PersistedCourseBaseRow = Omit<
  CourseDetail,
  "sections" | "exercises"
>;

export type PersistedCourseSectionRow = {
  id: string;
  title: string;
  body: string;
  code?: string;
  embeds: string[];
  visualizations: CourseVisualization[];
  order: number;
};

export type PersistedCourseRows = {
  course: PersistedCourseBaseRow;
  sections: PersistedCourseSectionRow[];
  exercises: CourseExercise[];
  mediaAssets?: CourseMediaAsset[];
};

export function mapPostRowsToFeedItems(
  rows: PersistedPostFeedRow[],
): FeedItem[] {
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    contentType: row.contentType,
    category: row.category,
    title: row.title,
    body: row.body,
    authorId: row.authorId,
    authorName: row.authorName,
    tags: row.tags,
    media: row.media ?? [],
    createdAt: row.createdAt.toISOString(),
    interests: row.interests,
    comments: row.comments,
    sourceUrl: row.sourceUrl,
    imageUrl: row.imageUrl,
    projectSignal: row.projectSignal ?? undefined,
    projectSignalViewerResponses: row.projectSignalViewerResponses ?? [],
    viewerState: row.viewerState,
  }));
}

export function mapProfileRowsToProfile(row: PersistedProfileRow): Profile {
  return {
    id: row.id,
    handle: row.handle,
    name: row.name,
    image: row.image,
    bannerUrl: row.bannerUrl,
    palette: row.palette,
    bio: row.bio,
    location: row.location,
    email: row.email,
    workStatus: row.workStatus,
    stack: row.stack ?? [],
    interests: row.interests ?? [],
    contentPreferences: row.contentPreferences ?? [],
    participationIntents: row.participationIntents ?? [],
    followers: row.followers,
    thanks: row.thanks,
    badges: row.badges,
    links: row.links,
    visibility: row.visibility,
  };
}

export function mapCourseRowsToDetail(rows: PersistedCourseRows): CourseDetail {
  return {
    ...rows.course,
    mediaAssets: rows.mediaAssets ?? rows.course.mediaAssets ?? [],
    sections: rows.sections
      .toSorted((a, b) => a.order - b.order)
      .map((section) => ({
        id: section.id,
        title: section.title,
        body: section.body,
        code: section.code,
        embeds: section.embeds,
        visualizations: section.visualizations,
        requiredExerciseIds: rows.exercises
          .filter((exercise) => exercise.sectionId === section.id)
          .map((exercise) => exercise.id),
      })),
    exercises: rows.exercises,
  };
}

export function mapCourseRowsToCourse(rows: PersistedCourseRows): Course {
  const detail = mapCourseRowsToDetail(rows);
  return {
    id: detail.id,
    slug: detail.slug,
    title: detail.title,
    description: detail.description,
    creatorId: detail.creatorId,
    tags: detail.tags,
    sections: detail.sections.map((section) => ({
      id: section.id,
      title: section.title,
      requiredExerciseIds: section.requiredExerciseIds,
    })),
  };
}
