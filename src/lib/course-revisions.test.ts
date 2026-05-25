import { describe, expect, it } from "vitest";

import {
  buildCourseRevisionSnapshot,
  summarizeCourseRevisionSnapshot,
} from "./course-revisions";

describe("course revisions", () => {
  it("builds immutable course draft snapshots with stable authoring metrics", () => {
    const snapshot = buildCourseRevisionSnapshot(
      {
        title: " Production RAG ",
        description: " Build a grounded generation workflow. ",
        status: "draft",
        difficulty: "advanced",
        tags: ["rag", "evals"],
        content: { editor: "tiptap" },
        sections: [
          {
            clientId: "intro",
            title: "Intro",
            body: "Explain the workflow and success criteria.",
            code: "",
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
      },
      new Date("2026-05-08T12:30:00.000Z"),
    );

    expect(snapshot).toMatchObject({
      schemaVersion: 1,
      title: "Production RAG",
      description: "Build a grounded generation workflow.",
      status: "draft",
      savedAt: "2026-05-08T12:30:00.000Z",
    });
    expect(summarizeCourseRevisionSnapshot(snapshot)).toEqual({
      embeds: 1,
      exercises: 1,
      sections: 1,
      visualizations: 1,
    });
  });
});
