import { describe, expect, it } from "vitest";

import {
  mapCourseRowsToDetail,
  mapPostRowsToFeedItems,
  mapProfileRowsToProfile,
} from "./mappers";

describe("repository mappers", () => {
  it("maps persisted posts to feed items without negative interaction counters", () => {
    const items = mapPostRowsToFeedItems([
      {
        id: "post-1",
        type: "post",
        category: "Help",
        title: "Debug an RSC boundary",
        body: "I need help with a hydration mismatch.",
        authorId: "user-1",
        authorName: "Mina Park",
        tags: ["nextjs", "debugging"],
        createdAt: new Date("2026-05-07T12:00:00.000Z"),
        interests: 3,
        comments: 2,
      },
    ]);

    expect(items[0]).toMatchObject({
      id: "post-1",
      type: "post",
      category: "Help",
      title: "Debug an RSC boundary",
      interests: 3,
      comments: 2,
    });
    expect(items[0]).not.toHaveProperty("downvotes");
    expect(items[0]).not.toHaveProperty("dislikes");
  });

  it("preserves Project Signal metadata for ranking and rich feed rendering", () => {
    const [item] = mapPostRowsToFeedItems([
      {
        id: "post-2",
        type: "post",
        contentType: "project_signal",
        category: "Project",
        title: "Project Signal: DeepRatAI/Dev4All",
        body: "Local-first developer network.",
        authorId: "user-1",
        authorName: "Alex Chen",
        tags: ["AI Engineering", "TypeScript", "Technical feedback"],
        createdAt: new Date("2026-05-07T12:00:00.000Z"),
        interests: 3,
        comments: 2,
        projectSignal: {
          repoUrl: "https://github.com/DeepRatAI/Dev4All",
          repoKey: "deepratai/dev4all",
          owner: "DeepRatAI",
          name: "Dev4All",
          description: "Local-first developer network.",
          primaryLanguage: "TypeScript",
          domains: ["AI Engineering"],
          stack: ["TypeScript"],
          needs: ["Technical feedback"],
          maturity: "MVP",
          intent: "Looking for feedback",
          audience: ["builders"],
          language: "en",
          evidence: {
            stars: 42,
            forks: 7,
            topics: ["ai"],
            readmeHeadings: ["Setup"],
            rootFiles: ["package.json"],
          },
        },
      },
    ]);

    expect(item).toMatchObject({
      contentType: "project_signal",
      projectSignal: {
        repoKey: "deepratai/dev4all",
        needs: ["Technical feedback"],
      },
    });
  });

  it("maps profile rows into the public privacy contract", () => {
    const profile = mapProfileRowsToProfile({
      id: "user-1",
      handle: "mina",
      name: "Mina Park",
      bio: "Observability engineer",
      location: "Berlin",
      email: "mina@example.dev",
      workStatus: "Focused",
      followers: 4,
      thanks: 9,
      badges: ["Helpful Answers"],
      links: ["https://github.com/mina"],
      visibility: {
        email: "private",
        followers: "public",
        thanks: "public",
        completedCourses: "followers",
        location: "public",
      },
    });

    expect(profile.handle).toBe("mina");
    expect(profile.followers).toBe(4);
    expect(profile.visibility.email).toBe("private");
  });

  it("maps normalized course rows into a course detail with exercises", () => {
    const course = mapCourseRowsToDetail({
      course: {
        id: "course-1",
        slug: "rag",
        title: "RAG",
        description: "Grounded generation",
        creatorId: "user-1",
        creatorName: "Alex Chen",
        status: "published",
        tags: ["ai"],
        difficulty: "intermediate",
        completionCount: 7,
        ipynbMetadata: null,
        thanksCount: 2,
        saved: true,
      },
      sections: [
        {
          id: "section-1",
          title: "Generate",
          body: "Use retrieved context.",
          code: "answer = 'Source: docs'",
          embeds: ["https://example.dev/demo"],
          visualizations: [
            {
              id: "quality-gates",
              type: "bar",
              title: "Quality gates",
              data: [{ label: "Groundedness", value: 94 }],
            },
          ],
          order: 1,
        },
      ],
      exercises: [
        {
          id: "exercise-1",
          sectionId: "section-1",
          prompt: "Include a source",
          starterCode: "answer = ''",
          assertionCode: "assert 'source' in answer.lower()",
          successMessage: "Grounded",
        },
      ],
    });

    expect(course.sections[0]?.requiredExerciseIds).toEqual(["exercise-1"]);
    expect(course.sections[0]?.embeds).toEqual(["https://example.dev/demo"]);
    expect(course.sections[0]?.visualizations[0]?.title).toBe("Quality gates");
    expect(course.exercises[0]?.assertionCode).toContain("source");
  });
});
