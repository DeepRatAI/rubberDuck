import type { CourseVisualization } from "./course-visualizations";
import type { NotebookMetadata } from "./product-types";

export type CourseRevisionSection = {
  clientId: string;
  title: string;
  body: string;
  code?: string;
  embeds: string[];
  visualizations: CourseVisualization[];
};

export type CourseRevisionExercise = {
  sectionClientId: string;
  prompt: string;
  starterCode: string;
  assertionCode: string;
  successMessage: string;
};

export type CourseRevisionSnapshotInput = {
  title: string;
  description: string;
  status: "draft" | "published";
  difficulty: "beginner" | "intermediate" | "advanced";
  tags: string[];
  content: unknown;
  sections: CourseRevisionSection[];
  exercises: CourseRevisionExercise[];
  ipynbMetadata?: NotebookMetadata | null;
};

export type CourseRevisionSnapshot = CourseRevisionSnapshotInput & {
  schemaVersion: 1;
  savedAt: string;
};

export type CourseRevisionMetrics = {
  sections: number;
  exercises: number;
  embeds: number;
  visualizations: number;
};

export function buildCourseRevisionSnapshot(
  input: CourseRevisionSnapshotInput,
  savedAt: Date,
): CourseRevisionSnapshot {
  return {
    schemaVersion: 1,
    title: input.title.trim(),
    description: input.description.trim(),
    status: input.status,
    difficulty: input.difficulty,
    tags: [...input.tags],
    content: input.content,
    sections: input.sections.map((section) => ({
      ...section,
      embeds: [...section.embeds],
      visualizations: section.visualizations.map((visualization) => ({
        ...visualization,
        data: visualization.data.map((datum) => ({ ...datum })),
      })),
    })),
    exercises: input.exercises.map((exercise) => ({ ...exercise })),
    ipynbMetadata: input.ipynbMetadata ?? null,
    savedAt: savedAt.toISOString(),
  };
}

export function summarizeCourseRevisionSnapshot(
  snapshot: CourseRevisionSnapshot,
): CourseRevisionMetrics {
  return {
    sections: snapshot.sections.length,
    exercises: snapshot.exercises.length,
    embeds: snapshot.sections.reduce(
      (count, section) => count + section.embeds.length,
      0,
    ),
    visualizations: snapshot.sections.reduce(
      (count, section) => count + section.visualizations.length,
      0,
    ),
  };
}
