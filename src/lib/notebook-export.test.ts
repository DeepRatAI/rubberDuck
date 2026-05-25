import { describe, expect, it } from "vitest";

import type { CourseDetail } from "./product-types";
import { buildCourseNotebook, buildNotebookFileName } from "./notebook-export";

const course: CourseDetail = {
  id: "course-1",
  slug: "building-reliable-agent-tools",
  title: "Building Reliable Agent Tools",
  description: "Design observable tool calls and runnable validation.",
  creatorId: "user-1",
  creatorName: "Alex Chen",
  status: "published",
  tags: ["agents", "observability"],
  difficulty: "advanced",
  completionCount: 42,
  thanksCount: 12,
  saved: false,
  ipynbMetadata: null,
  sections: [
    {
      id: "section-1",
      title: "Contract first",
      body: "Define inputs, outputs, and fallback behavior.",
      code: "contract = {'input': 'schema'}\nprint(contract)",
      embeds: ["https://docs.devit.test/contracts"],
      visualizations: [
        {
          id: "quality-gates",
          type: "bar",
          title: "Quality gates",
          data: [
            { label: "Groundedness", value: 94 },
            { label: "Latency score", value: 71 },
          ],
        },
      ],
      requiredExerciseIds: ["exercise-1"],
    },
  ],
  exercises: [
    {
      id: "exercise-1",
      sectionId: "section-1",
      prompt: "Create an answer variable containing Source.",
      starterCode: "answer = ''\nprint(answer)",
      assertionCode: "assert 'source' in answer.lower()",
      successMessage: "Grounding check passed.",
    },
  ],
};

describe("notebook export", () => {
  it("builds a portable Jupyter notebook from a devit course", () => {
    const notebook = buildCourseNotebook(
      course,
      new Date("2026-05-08T12:00:00.000Z"),
    );

    expect(notebook.nbformat).toBe(4);
    expect(notebook.metadata.devit).toMatchObject({
      courseId: "course-1",
      slug: "building-reliable-agent-tools",
      exportedAt: "2026-05-08T12:00:00.000Z",
      execution: {
        browser: {
          engine: "pyodide",
          hardware: "wasm-cpu",
          packageLoading: "auto-from-imports",
        },
        gpu: {
          mode: "colab-handoff",
          provider: "google-colab",
          userRuntimeRequired: true,
        },
      },
    });
    expect(notebook.cells).toHaveLength(4);
    expect(notebook.cells[0]).toMatchObject({
      cell_type: "markdown",
      source: [
        "# Building Reliable Agent Tools\n",
        "\n",
        "Design observable tool calls and runnable validation.\n",
        "\n",
        "**Creator:** Alex Chen\n",
        "\n",
        "**Tags:** agents, observability\n",
        "\n",
        "**Difficulty:** advanced",
      ],
    });
    expect(notebook.cells[1]).toMatchObject({
      cell_type: "markdown",
      source: [
        "## Contract first\n",
        "\n",
        "Define inputs, outputs, and fallback behavior.\n",
        "\n",
        "Resources:\n",
        "- https://docs.devit.test/contracts\n",
        "\n\n",
        "Visualizations:\n",
        "- Quality gates (bar)\n",
        "  - Groundedness: 94\n",
        "  - Latency score: 71\n",
      ],
    });
    expect(notebook.cells[2]).toMatchObject({
      cell_type: "code",
      execution_count: null,
      source: ["contract = {'input': 'schema'}\n", "print(contract)"],
    });
    expect(notebook.cells[3]).toMatchObject({
      cell_type: "code",
      metadata: {
        devit: {
          exercise: true,
          prompt: "Create an answer variable containing Source.",
          assertionCode: "assert 'source' in answer.lower()",
          successMessage: "Grounding check passed.",
        },
      },
      source: ["answer = ''\n", "print(answer)"],
    });
  });

  it("builds a safe notebook file name from the course slug", () => {
    expect(buildNotebookFileName(course)).toBe(
      "building-reliable-agent-tools.ipynb",
    );
  });
});
