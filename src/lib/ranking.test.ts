import { describe, expect, it } from "vitest";

import type { Course, FeedItem, Viewer } from "./domain";
import { explainFeedItemForViewer, rankCourses, rankFeedItems } from "./ranking";

const now = "2026-05-20T12:00:00.000Z";

const viewer: Viewer = {
  id: "u_viewer",
  follows: ["u_followed"],
  interests: ["ai", "postgres", "systems"],
};

function feedItem(overrides: Partial<FeedItem> & Pick<FeedItem, "id">): FeedItem {
  const { id, ...rest } = overrides;

  return {
    id,
    type: "post",
    category: "Project",
    title: "Untitled",
    body: "Body",
    authorId: "u_other",
    authorName: "Other",
    tags: [],
    media: [],
    createdAt: "2026-05-18T12:00:00.000Z",
    interests: 0,
    comments: 0,
    ...rest,
  };
}

describe("feed ranking", () => {
  it("prioritizes viewer affinity, follows, freshness, and quality engagement in For You", () => {
    const ranked = rankFeedItems(
      [
        feedItem({
          id: "generic",
          title: "Generic web note",
          tags: ["css"],
          createdAt: "2026-05-20T08:00:00.000Z",
          interests: 2,
          comments: 0,
        }),
        feedItem({
          id: "matched",
          title: "AI eval pipeline",
          tags: ["ai", "systems"],
          createdAt: "2026-05-20T07:00:00.000Z",
          interests: 8,
          comments: 4,
        }),
        feedItem({
          id: "followed",
          title: "Postgres query review",
          authorId: "u_followed",
          tags: ["postgres"],
          createdAt: "2026-05-19T20:00:00.000Z",
          interests: 1,
          comments: 3,
        }),
      ],
      viewer,
      { mode: "for-you", now },
    );

    expect(ranked.map((item) => item.id).slice(0, 2).sort()).toEqual([
      "followed",
      "matched",
    ]);
    expect(ranked.at(-1)?.id).toBe("generic");
  });

  it("keeps Latest chronological and bypasses affinity scoring", () => {
    const ranked = rankFeedItems(
      [
        feedItem({
          id: "older-interest",
          tags: ["ai"],
          createdAt: "2026-05-18T12:00:00.000Z",
          interests: 30,
          comments: 12,
        }),
        feedItem({
          id: "fresh-generic",
          tags: ["css"],
          createdAt: "2026-05-20T11:30:00.000Z",
        }),
      ],
      viewer,
      { mode: "latest", now },
    );

    expect(ranked.map((item) => item.id)).toEqual([
      "fresh-generic",
      "older-interest",
    ]);
  });

  it("filters Following to followed authors, own posts, or interest-matching RSS", () => {
    const ranked = rankFeedItems(
      [
        feedItem({
          id: "followed",
          authorId: "u_followed",
          tags: ["docker"],
        }),
        feedItem({
          id: "own",
          authorId: "u_viewer",
          tags: ["release"],
        }),
        feedItem({
          id: "rss-match",
          type: "rss",
          category: "News",
          authorId: "rss",
          authorName: "RSS: Systems",
          tags: ["systems"],
        }),
        feedItem({
          id: "outside",
          authorId: "u_stranger",
          tags: ["design"],
        }),
      ],
      viewer,
      { mode: "following", now },
    );

    expect(ranked.map((item) => item.id).sort()).toEqual([
      "followed",
      "own",
      "rss-match",
    ]);
  });

  it("does not surface posts the viewer already reported", () => {
    const ranked = rankFeedItems(
      [
        feedItem({
          id: "reported",
          tags: ["ai"],
          viewerState: {
            interested: false,
            saved: false,
            reported: true,
            canDelete: false,
          },
        }),
        feedItem({ id: "clean", tags: ["ai"] }),
      ],
      viewer,
      { now },
    );

    expect(ranked.map((item) => item.id)).toEqual(["clean"]);
  });

  it("applies first-screen diversity across repeated authors", () => {
    const ranked = rankFeedItems(
      [
        feedItem({
          id: "same-1",
          authorId: "u_same",
          tags: ["ai"],
          interests: 20,
          comments: 10,
        }),
        feedItem({
          id: "same-2",
          authorId: "u_same",
          tags: ["ai"],
          interests: 19,
          comments: 9,
        }),
        feedItem({
          id: "different",
          authorId: "u_different",
          tags: ["postgres"],
          interests: 15,
          comments: 8,
        }),
      ],
      viewer,
      { now },
    );

    expect(ranked.slice(0, 2).map((item) => item.authorId)).toContain(
      "u_different",
    );
  });

  it("prioritizes Project Signals that match interests, stack, and contribution needs", () => {
    const ranked = rankFeedItems(
      [
        feedItem({
          id: "generic-engagement",
          title: "Popular CSS redesign",
          tags: ["css"],
          interests: 30,
          comments: 14,
          createdAt: "2026-05-20T10:00:00.000Z",
        }),
        feedItem({
          id: "project-signal",
          title: "Project Signal: DeepRatAI/rubberDuck",
          contentType: "project_signal",
          tags: ["AI Engineering", "TypeScript", "Technical feedback"],
          interests: 4,
          comments: 2,
          createdAt: "2026-05-20T09:00:00.000Z",
          projectSignal: {
            repoUrl: "https://github.com/DeepRatAI/rubberDuck",
            repoKey: "deepratai/rubberduck",
            owner: "DeepRatAI",
            name: "rubberDuck",
            description: "Local-first developer social network.",
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
        }),
      ],
      {
        ...viewer,
        interests: ["ai engineering", "typescript", "technical feedback"],
      },
      { mode: "for-you", now },
    );

    expect(ranked[0]?.id).toBe("project-signal");
  });

  it("returns explainable feed reasons for Project Signals", () => {
    const reasons = explainFeedItemForViewer(
      feedItem({
        id: "project-signal",
        title: "Project Signal: DeepRatAI/rubberDuck",
        contentType: "project_signal",
        tags: ["AI Engineering", "TypeScript", "Technical feedback"],
        projectSignal: {
          repoUrl: "https://github.com/DeepRatAI/rubberDuck",
          repoKey: "deepratai/rubberduck",
          owner: "DeepRatAI",
          name: "rubberDuck",
          description: "Local-first developer social network.",
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
      }),
      {
        ...viewer,
        interests: ["ai engineering", "typescript", "technical feedback"],
      },
    );

    expect(reasons).toEqual([
      "Matches your interest in AI Engineering",
      "Uses TypeScript from your stack",
      "Looking for Technical feedback",
    ]);
  });
});

describe("course ranking", () => {
  const courses: Array<
    Course & {
      difficulty: "beginner" | "intermediate" | "advanced";
      completionCount: number;
      thanksCount: number;
      updatedAt: string;
      exercises: unknown[];
      ipynbMetadata: { cellCount: number; outline: string[] } | null;
    }
  > = [
    {
      id: "generic",
      slug: "generic-course",
      title: "Generic UI Polish",
      description: "Improve a UI",
      creatorId: "u_other",
      tags: ["css"],
      difficulty: "beginner",
      completionCount: 90,
      thanksCount: 45,
      updatedAt: "2026-05-20T10:00:00.000Z",
      sections: [{ id: "s1", title: "Intro", requiredExerciseIds: [] }],
      exercises: [],
      ipynbMetadata: null,
    },
    {
      id: "recommended",
      slug: "ai-systems-course",
      title: "AI Systems Evaluation",
      description: "Notebook-backed AI systems evaluation",
      creatorId: "u_creator",
      tags: ["ai", "systems"],
      difficulty: "advanced",
      completionCount: 30,
      thanksCount: 22,
      updatedAt: "2026-05-19T10:00:00.000Z",
      sections: [
        { id: "s1", title: "Intro", requiredExerciseIds: [] },
        { id: "s2", title: "Runner", requiredExerciseIds: ["e1"] },
      ],
      exercises: [{ id: "e1" }],
      ipynbMetadata: { cellCount: 8, outline: ["Load data", "Evaluate"] },
    },
  ];

  it("recommends rich courses that match viewer interests over generic popularity", () => {
    const ranked = rankCourses(courses, viewer, { mode: "recommended", now });

    expect(ranked[0]?.id).toBe("recommended");
  });

  it("can switch to popularity when the user chooses Popular", () => {
    const ranked = rankCourses(courses, viewer, { mode: "popular", now });

    expect(ranked[0]?.id).toBe("generic");
  });
});
