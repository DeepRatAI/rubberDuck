import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CourseProgress } from "@/lib/domain";
import type { CourseDetail } from "@/lib/product-types";
import { CourseReader } from "./course-reader";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not found");
  },
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("./course-progress-telemetry", () => ({
  CourseProgressTelemetry: () => null,
}));

vi.mock("./course-runner", () => ({
  CourseRunner: ({
    exercise,
  }: {
    exercise: { id: string; prompt: string };
  }) => <div data-testid={`runner-${exercise.id}`}>{exercise.prompt}</div>,
}));

const course: CourseDetail = {
  id: "course-1",
  slug: "multi-checkpoint-course",
  title: "Multi Checkpoint Course",
  description: "A course with several executable checkpoints.",
  creatorId: "creator-1",
  creatorName: "Alex Chen",
  status: "published",
  tags: ["python"],
  difficulty: "intermediate",
  completionCount: 0,
  thanksCount: 0,
  saved: false,
  ipynbMetadata: null,
  sections: [
    {
      id: "section-1",
      title: "Setup",
      body: "Prepare fixtures.",
      code: "fixtures = []",
      embeds: [
        "/uploads/course-media/00000000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp",
      ],
      visualizations: [
        {
          id: "quality-gates",
          type: "bar",
          title: "Quality gates",
          data: [
            { label: "Setup score", value: 87 },
            { label: "Groundedness", value: 94 },
          ],
        },
      ],
      requiredExerciseIds: ["exercise-1", "exercise-2"],
    },
    {
      id: "section-2",
      title: "Evaluate",
      body: "Run quality checks.",
      code: "score = 1",
      embeds: [],
      visualizations: [
        {
          id: "latency-trend",
          type: "line",
          title: "Latency trend",
          data: [
            { label: "P50", value: 120 },
            { label: "P95", value: 240 },
          ],
        },
        {
          id: "eval-table",
          type: "table",
          title: "Eval table",
          data: [{ label: "Citation accuracy", value: 94 }],
        },
      ],
      requiredExerciseIds: ["exercise-3"],
    },
  ],
  mediaAssets: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      ownerId: "00000000-0000-4000-8000-000000000001",
      kind: "image",
      originalFileName: "rag-architecture.webp",
      mimeType: "image/webp",
      byteSize: 2048,
      url: "/uploads/course-media/00000000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp",
      altText: "RAG architecture diagram",
      caption: "Retrieval flow used by the runnable lesson.",
      labels: ["rag", "architecture"],
      createdAt: "2026-05-09T12:00:00.000Z",
    },
  ],
  exercises: [
    {
      id: "exercise-1",
      sectionId: "section-1",
      prompt: "Build deterministic fixtures.",
      starterCode: "fixtures = []",
      assertionCode: "assert isinstance(fixtures, list)",
      successMessage: "Fixtures ready.",
    },
    {
      id: "exercise-2",
      sectionId: "section-1",
      prompt: "Validate setup invariants.",
      starterCode: "ready = False",
      assertionCode: "assert ready is True",
      successMessage: "Setup validated.",
    },
    {
      id: "exercise-3",
      sectionId: "section-2",
      prompt: "Compute evaluation score.",
      starterCode: "score = 0",
      assertionCode: "assert score > 0",
      successMessage: "Score accepted.",
    },
  ],
};

const progress: CourseProgress = {
  courseId: course.id,
  userId: "user-1",
  viewedSectionIds: [],
  passedExerciseIds: [],
  completedAt: null,
};

describe("CourseReader", () => {
  it("renders every executable exercise next to its owning section", () => {
    render(
      <CourseReader
        course={course}
        progress={progress}
        locale="en"
        shareUrl="https://rubberduck.net/courses/advanced-rag"
      />,
    );

    expect(screen.getByTestId("runner-exercise-1")).toHaveTextContent(
      "Build deterministic fixtures.",
    );
    expect(screen.getByTestId("runner-exercise-2")).toHaveTextContent(
      "Validate setup invariants.",
    );
    expect(screen.getByTestId("runner-exercise-3")).toHaveTextContent(
      "Compute evaluation score.",
    );
    expect(
      screen.getByRole("img", { name: "Quality gates bar chart" }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", { name: "RAG architecture diagram" }),
    ).toBeVisible();
    expect(
      screen.getByText("Retrieval flow used by the runnable lesson."),
    ).toBeVisible();
    expect(
      screen.getByRole("img", { name: "Latency trend line chart" }),
    ).toBeVisible();
    expect(
      screen.getByRole("table", { name: "Eval table data table" }),
    ).toBeVisible();
    expect(screen.getByText("Groundedness")).toBeVisible();

    const firstSection = screen
      .getByRole("heading", { name: "Setup" })
      .closest("section");
    const secondSection = screen
      .getByRole("heading", { name: "Evaluate" })
      .closest("section");

    expect(firstSection).toContainElement(
      screen.getByTestId("runner-exercise-1"),
    );
    expect(firstSection).toContainElement(
      screen.getByTestId("runner-exercise-2"),
    );
    expect(secondSection).toContainElement(
      screen.getByTestId("runner-exercise-3"),
    );
  });
});
