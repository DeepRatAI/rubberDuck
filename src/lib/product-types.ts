import type { Course } from "./domain";
import type { CourseMediaAsset } from "./course-media";
import type { CourseVisualization } from "./course-visualizations";
import type {
  CourseRevisionMetrics,
  CourseRevisionSnapshot,
} from "./course-revisions";

export type CommentNode = {
  id: string;
  postId: string;
  authorName: string;
  authorHandle: string;
  body: string;
  status: "active" | "deleted" | "hidden";
  canDelete: boolean;
  canMarkHelpful: boolean;
  helpfulByAuthor: boolean;
  createdAt: string;
  replies: CommentNode[];
};

export type CourseExercise = {
  id: string;
  sectionId: string;
  prompt: string;
  starterCode: string;
  assertionCode: string;
  successMessage: string;
};

export type NotebookMetadata = {
  fileName: string;
  cellCount: number;
  language: string;
  outline: string[];
  colabUrl?: string;
};

export type CourseDetail = Omit<Course, "sections"> & {
  creatorName: string;
  status: "draft" | "published" | "archived";
  difficulty: "beginner" | "intermediate" | "advanced";
  completionCount: number;
  thanksCount: number;
  saved: boolean;
  updatedAt?: string;
  ipynbMetadata?: NotebookMetadata | null;
  sections: Array<
    Course["sections"][number] & {
      body: string;
      code?: string;
      embeds: string[];
      visualizations: CourseVisualization[];
    }
  >;
  exercises: CourseExercise[];
  mediaAssets?: CourseMediaAsset[];
};

export type CourseRevisionSummary = {
  id: string;
  courseId: string;
  revisionNumber: number;
  status: "draft" | "published" | "archived";
  title: string;
  createdAt: string;
  metrics: CourseRevisionMetrics;
  snapshot: CourseRevisionSnapshot;
};

export type CourseDraftSummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  updatedAt: string;
  sectionsCount: number;
  exercisesCount: number;
  revisionCount: number;
  latestRevisionAt: string | null;
};

export type ProjectSignalResponseSummary = {
  postId: string;
  userId: string;
  userName: string;
  userHandle: string;
  intent: "try" | "review" | "contribute" | "follow_build";
  note: string;
  createdAt: string;
};
