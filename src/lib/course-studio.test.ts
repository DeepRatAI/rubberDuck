import { describe, expect, it } from "vitest";

import {
  addStudioEmbed,
  buildCourseStudioPayload,
  importNotebookToStudio,
  moveStudioSection,
  parseNotebookMetadata,
  removeStudioEmbed,
  restoreSnapshotToStudio,
  type StudioExercise,
  type StudioSection,
} from "./course-studio";

const sections: StudioSection[] = [
  {
    clientId: "intro",
    title: "Introduction",
    body: "Explain what the learner will build and why it matters.",
    code: "",
    embeds: [],
    visualizations: [],
  },
  {
    clientId: "checkpoint",
    title: "Runnable checkpoint",
    body: "Ask the learner to prove the concept with executable code.",
    code: "answer = 'Source: docs'",
    embeds: ["https://example.dev/docs"],
    visualizations: [
      {
        id: "quality-gates",
        type: "bar",
        title: "Quality gates",
        data: [{ label: "Groundedness", value: 94 }],
      },
    ],
  },
];

const exercises: StudioExercise[] = [
  {
    id: "local-exercise",
    sectionClientId: "checkpoint",
    prompt: "Create an answer variable containing Source.",
    starterCode: "answer = ''",
    assertionCode: "assert 'source' in answer.lower()",
    successMessage: "Grounded answer detected.",
  },
];

describe("course studio helpers", () => {
  it("extracts metadata and outline from Jupyter notebooks", () => {
    const metadata = parseNotebookMetadata(
      "rag-evals.ipynb",
      JSON.stringify({
        metadata: {
          kernelspec: {
            language: "python",
          },
        },
        cells: [
          { cell_type: "markdown", source: ["# Load corpus\n", "Details"] },
          { cell_type: "code", source: ["answer = 'Source: docs'\n"] },
          { cell_type: "markdown", source: "## Evaluate groundedness" },
        ],
      }),
    );

    expect(metadata).toEqual({
      fileName: "rag-evals.ipynb",
      cellCount: 3,
      language: "python",
      outline: [
        "Load corpus",
        "answer = 'Source: docs'",
        "Evaluate groundedness",
      ],
      colabUrl: "https://colab.research.google.com/",
    });
  });

  it("normalizes draft payload tags and strips local exercise ids", () => {
    const payload = buildCourseStudioPayload({
      draftId: "30000000-0000-4000-8000-000000000001",
      title: " Production RAG Evaluation ",
      description: " Build an observable RAG evaluation workflow. ",
      difficulty: "advanced",
      status: "published",
      tagsInput: " #ai, rag, AI, evals ",
      content: { editor: "tiptap" },
      sections,
      exercises,
      notebook: null,
    });

    expect(payload.tags).toEqual(["ai", "rag", "evals"]);
    expect(payload.title).toBe("Production RAG Evaluation");
    expect(payload.description).toBe(
      "Build an observable RAG evaluation workflow.",
    );
    expect(payload.exercises[0]).not.toHaveProperty("id");
    expect(payload.exercises[0]?.sectionClientId).toBe("checkpoint");
  });

  it("moves sections without moving past collection boundaries", () => {
    expect(
      moveStudioSection(sections, "checkpoint", "up").map(
        (section) => section.clientId,
      ),
    ).toEqual(["checkpoint", "intro"]);

    expect(moveStudioSection(sections, "intro", "up")).toEqual(sections);
    expect(moveStudioSection(sections, "checkpoint", "down")).toEqual(sections);
  });

  it("converts notebook headings and devit exercise cells into editable studio content", () => {
    const imported = importNotebookToStudio(
      "rag-evals.ipynb",
      JSON.stringify({
        metadata: {
          kernelspec: {
            language: "python",
          },
        },
        cells: [
          {
            cell_type: "markdown",
            source: "# Load corpus\nStart with deterministic fixtures.",
          },
          {
            cell_type: "code",
            source: "documents = ['Source: docs']\nprint(len(documents))",
          },
          {
            cell_type: "markdown",
            source: "## Grounded answer\nNow validate attribution.",
          },
          {
            cell_type: "code",
            source: "answer = ''\nprint(answer)",
            metadata: {
              devit: {
                exercise: true,
                prompt: "Create an answer containing Source.",
                assertionCode: "assert 'source' in answer.lower()",
                successMessage: "Grounding check passed.",
              },
            },
          },
        ],
      }),
    );

    expect(imported.metadata.outline).toEqual([
      "Load corpus",
      "documents = ['Source: docs']",
      "Grounded answer",
      "answer = ''",
    ]);
    expect(imported.sections).toHaveLength(2);
    expect(imported.sections[0]).toMatchObject({
      title: "Load corpus",
      body: "Start with deterministic fixtures.",
      code: "documents = ['Source: docs']\nprint(len(documents))",
    });
    expect(imported.exercises).toHaveLength(1);
    expect(imported.exercises[0]).toMatchObject({
      sectionClientId: imported.sections[1]?.clientId,
      prompt: "Create an answer containing Source.",
      starterCode: "answer = ''\nprint(answer)",
      assertionCode: "assert 'source' in answer.lower()",
      successMessage: "Grounding check passed.",
    });
    expect(imported.cellMap).toEqual([
      {
        index: 0,
        kind: "section",
        title: "Load corpus",
        targetSectionClientId: imported.sections[0]?.clientId,
      },
      {
        index: 1,
        kind: "reference_code",
        title: "documents = ['Source: docs']",
        targetSectionClientId: imported.sections[0]?.clientId,
      },
      {
        index: 2,
        kind: "section",
        title: "Grounded answer",
        targetSectionClientId: imported.sections[1]?.clientId,
      },
      {
        index: 3,
        kind: "exercise",
        title: "Create an answer containing Source.",
        targetSectionClientId: imported.sections[1]?.clientId,
      },
    ]);
  });

  it("keeps imported notebook section ids stable and unique", () => {
    const imported = importNotebookToStudio(
      "duplicates.ipynb",
      JSON.stringify({
        cells: [
          { cell_type: "markdown", source: "# Setup" },
          { cell_type: "markdown", source: "# Setup" },
          { cell_type: "markdown", source: "# Setup" },
        ],
      }),
    );

    expect(imported.sections.map((section) => section.clientId)).toEqual([
      "setup",
      "setup-2",
      "setup-3",
    ]);
  });

  it("adds normalized safe embeds and rejects duplicates or unsafe URLs", () => {
    const first = addStudioEmbed(
      [],
      " https://www.youtube.com/watch?v=abc123 ",
    );
    expect(first).toEqual({
      embeds: ["https://www.youtube.com/watch?v=abc123"],
      error: null,
    });

    const duplicate = addStudioEmbed(
      first.embeds,
      "https://www.youtube.com/watch?v=abc123",
    );
    expect(duplicate).toEqual({
      embeds: first.embeds,
      error: "Resource already attached.",
    });

    const unsafe = addStudioEmbed(first.embeds, "javascript:alert(1)");
    expect(unsafe).toEqual({
      embeds: first.embeds,
      error: "Enter a valid http(s) URL.",
    });
  });

  it("removes studio embeds without mutating unrelated resources", () => {
    expect(
      removeStudioEmbed(
        ["https://example.dev/video", "https://example.dev/docs"],
        "https://example.dev/video",
      ),
    ).toEqual(["https://example.dev/docs"]);
  });

  it("restores a saved course revision snapshot into editable studio state", () => {
    const restored = restoreSnapshotToStudio({
      schemaVersion: 1,
      savedAt: "2026-05-08T12:30:00.000Z",
      title: "Production RAG",
      description: "Build a grounded generation workflow.",
      status: "draft",
      difficulty: "advanced",
      tags: ["rag", "evals"],
      content: { editor: "tiptap" },
      sections: [
        {
          clientId: "intro",
          title: "Intro",
          body: "Explain the workflow and success criteria.",
          code: "print('restore')",
          embeds: ["https://example.dev/spec"],
          visualizations: [
            {
              id: "quality",
              type: "bar",
              title: "Quality gates",
              data: [{ label: "Groundedness", value: 94 }],
            },
          ],
        },
      ],
      exercises: [
        {
          sectionClientId: "intro",
          prompt: "Create a sourced answer.",
          starterCode: "answer = ''",
          assertionCode: "assert 'source' in answer.lower()",
          successMessage: "Grounded.",
        },
      ],
      ipynbMetadata: null,
    });

    expect(restored.title).toBe("Production RAG");
    expect(restored.tagsInput).toBe("rag, evals");
    expect(restored.sections[0]).toMatchObject({
      clientId: "intro",
      code: "print('restore')",
      visualizations: [
        {
          title: "Quality gates",
          data: [{ label: "Groundedness", value: 94 }],
        },
      ],
    });
    expect(restored.exercises[0]).toMatchObject({
      id: "restored-exercise-1",
      sectionClientId: "intro",
      assertionCode: "assert 'source' in answer.lower()",
    });
  });
});
