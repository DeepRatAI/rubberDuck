import { describe, expect, it } from "vitest";

import {
  buildHomeFeed,
  completeCourseIfEligible,
  createNotificationEvents,
  getVisibleProfile,
  searchCourses,
  type Course,
  type CourseProgress,
  type FeedItem,
  type Profile,
  type Viewer,
} from "./domain";
import { dictionaries, getDictionary } from "./i18n";
import {
  courseEntitySchema,
  courseDraftSchema,
  courseSectionViewSchema,
  exerciseResultSchema,
} from "./validators";

const owner: Viewer = {
  id: "u_owner",
  follows: ["u_creator"],
  interests: ["ai", "postgres", "oss"],
};

const publicViewer: Viewer = {
  id: "u_reader",
  follows: [],
  interests: ["ai"],
};

const profile: Profile = {
  id: "u_creator",
  handle: "alexchen",
  name: "Alex Chen",
  bio: "ML engineer and open-source contributor.",
  location: "Seattle, WA",
  email: "alex@example.dev",
  workStatus: "Open to collaborate",
  followers: 1300,
  thanks: 2842,
  badges: ["Open Source First"],
  links: ["https://alexchen.dev"],
  visibility: {
    email: "private",
    followers: "followers",
    thanks: "public",
    completedCourses: "followers",
    location: "public",
  },
};

const feedItems: FeedItem[] = [
  {
    id: "p1",
    type: "post",
    category: "News",
    title: "Language tracing release",
    body: "Prompt tracing and eval observability for AI apps.",
    authorId: "u_creator",
    authorName: "Alex Chen",
    tags: ["ai", "observability"],
    media: [],
    createdAt: "2026-05-07T12:00:00.000Z",
    interests: 8,
    comments: 3,
  },
  {
    id: "p2",
    type: "post",
    category: "Help",
    title: "Postgres index review",
    body: "Need help with a slow query plan.",
    authorId: "u_other",
    authorName: "Mina Park",
    tags: ["postgres"],
    media: [],
    createdAt: "2026-05-07T11:00:00.000Z",
    interests: 3,
    comments: 7,
  },
  {
    id: "r1",
    type: "rss",
    category: "News",
    title: "WebAssembly runtime update",
    body: "Runtime improvements for browser execution.",
    authorId: "rss",
    authorName: "RSS: Engineering Daily",
    tags: ["wasm"],
    media: [],
    createdAt: "2026-05-07T10:00:00.000Z",
    interests: 0,
    comments: 0,
    sourceUrl: "https://example.dev/wasm",
  },
];

const course: Course = {
  id: "c1",
  slug: "rag-course",
  title: "Building an LLM App with RAG",
  description: "Grounded generation with citations.",
  creatorId: "u_creator",
  tags: ["ai", "rag"],
  sections: [
    { id: "s1", title: "Setup", requiredExerciseIds: [] },
    { id: "s2", title: "Generate Answer", requiredExerciseIds: ["e1"] },
  ],
};

describe("profile privacy", () => {
  it("hides private fields and follower-only fields from non-followers", () => {
    const visible = getVisibleProfile(profile, publicViewer);

    expect(visible.email).toBeUndefined();
    expect(visible.followers).toBeUndefined();
    expect(visible.thanks).toBe(2842);
    expect(visible.location).toBe("Seattle, WA");
  });

  it("shows follower-only profile fields to followers", () => {
    const visible = getVisibleProfile(profile, owner);

    expect(visible.followers).toBe(1300);
    expect(visible.email).toBeUndefined();
  });
});

describe("feed discovery", () => {
  it("filters by category, keyword, hashtags, and never exposes negative counters", () => {
    const feed = buildHomeFeed(feedItems, {
      category: "News",
      query: "tracing",
      hashtag: "ai",
      viewer: owner,
    });

    expect(feed).toHaveLength(1);
    expect(feed[0]?.id).toBe("p1");
    expect(feed[0]).not.toHaveProperty("dislikes");
    expect(feed[0]).not.toHaveProperty("downvotes");
  });

  it("keeps RSS items in the cold-start blend when no user filter is active", () => {
    const feed = buildHomeFeed(feedItems, { viewer: publicViewer });

    expect(feed.map((item) => item.type)).toContain("rss");
  });
});

describe("course progress", () => {
  it("marks a course complete only when all sections are viewed and required exercises pass", () => {
    const incomplete: CourseProgress = {
      courseId: "c1",
      userId: "u_reader",
      viewedSectionIds: ["s1", "s2"],
      passedExerciseIds: [],
      completedAt: null,
    };

    expect(completeCourseIfEligible(course, incomplete)).toEqual({
      completed: false,
      progress: incomplete,
    });

    const eligible: CourseProgress = {
      ...incomplete,
      passedExerciseIds: ["e1"],
    };

    const result = completeCourseIfEligible(
      course,
      eligible,
      "2026-05-07T13:00:00.000Z",
    );
    expect(result.completed).toBe(true);
    expect(result.progress.completedAt).toBe("2026-05-07T13:00:00.000Z");
  });

  it("keeps completion idempotent once the course is already completed", () => {
    const completed: CourseProgress = {
      courseId: "c1",
      userId: "u_reader",
      viewedSectionIds: ["s1", "s2"],
      passedExerciseIds: ["e1"],
      completedAt: "2026-05-07T13:00:00.000Z",
    };

    const result = completeCourseIfEligible(
      course,
      completed,
      "2026-05-07T14:00:00.000Z",
    );

    expect(result.completed).toBe(true);
    expect(result.progress.completedAt).toBe("2026-05-07T13:00:00.000Z");
  });
});

describe("course action validators", () => {
  const courseId = "30000000-0000-4000-8000-000000000001";
  const sectionId = "40000000-0000-4000-8000-000000000001";
  const exerciseId = "50000000-0000-4000-8000-000000000001";

  it("accepts only UUID-shaped course action identifiers", () => {
    expect(courseEntitySchema.safeParse({ courseId }).success).toBe(true);
    expect(
      courseEntitySchema.safeParse({ courseId: "course-rag" }).success,
    ).toBe(false);
  });

  it("validates section and exercise telemetry payloads", () => {
    expect(
      courseSectionViewSchema.safeParse({ courseId, sectionId }).success,
    ).toBe(true);

    expect(
      exerciseResultSchema.safeParse({
        courseId,
        exerciseId,
        status: "passed",
        stdout: "ok",
        stderr: "",
        durationMs: 120,
      }).success,
    ).toBe(true);

    expect(
      exerciseResultSchema.safeParse({
        courseId,
        exerciseId,
        status: "running",
        stdout: "",
        stderr: "",
        durationMs: 120,
      }).success,
    ).toBe(false);
  });

  it("validates structured course studio drafts with notebook metadata and exercises", () => {
    const draft = courseDraftSchema.parse({
      title: "Production RAG Evaluation",
      description:
        "Build an observable RAG evaluation workflow with runnable Python checks.",
      tags: ["ai", "rag", "evals"],
      difficulty: "advanced",
      status: "published",
      content: { editor: "tiptap" },
      sections: [
        {
          clientId: "intro",
          title: "Evaluation contract",
          body: "Define the answer contract, citation rules, and failure classes.",
          code: "required = ['answer', 'sources']",
          embeds: ["https://example.dev/evals"],
        },
        {
          clientId: "exercise",
          title: "Autograde groundedness",
          body: "Write a small check that proves the answer cites a source.",
        },
      ],
      exercises: [
        {
          sectionClientId: "exercise",
          prompt: "Create an answer variable containing Source.",
          starterCode: "answer = ''",
          assertionCode: "assert 'source' in answer.lower()",
          successMessage: "Grounded answer detected.",
        },
      ],
      ipynbMetadata: {
        fileName: "rag-evals.ipynb",
        cellCount: 8,
        language: "python",
        outline: ["Load corpus", "Run eval"],
        colabUrl: "https://colab.research.google.com/",
      },
    });

    expect(draft.sections).toHaveLength(2);
    expect(draft.exercises[0]?.sectionClientId).toBe("exercise");
    expect(draft.ipynbMetadata?.outline).toContain("Run eval");
  });

  it("accepts local media library embeds and rejects traversal paths", () => {
    const validDraft = {
      title: "Production RAG Evaluation",
      description:
        "Build an observable RAG evaluation workflow with runnable Python checks.",
      tags: ["ai"],
      difficulty: "advanced",
      content: {},
      sections: [
        {
          clientId: "intro",
          title: "Evaluation contract",
          body: "Define the answer contract, citation rules, and failure classes.",
          embeds: [
            "/uploads/course-media/00000000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp",
          ],
        },
      ],
      exercises: [],
    };

    expect(courseDraftSchema.safeParse(validDraft).success).toBe(true);

    expect(
      courseDraftSchema.safeParse({
        ...validDraft,
        sections: [
          {
            ...validDraft.sections[0],
            embeds: [
              "/uploads/course-media/00000000-0000-4000-8000-000000000001/../../secret.png",
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects course studio exercises that point to missing draft sections", () => {
    const result = courseDraftSchema.safeParse({
      title: "Production RAG Evaluation",
      description:
        "Build an observable RAG evaluation workflow with runnable Python checks.",
      tags: ["ai"],
      difficulty: "advanced",
      content: {},
      sections: [
        {
          clientId: "intro",
          title: "Evaluation contract",
          body: "Define the answer contract.",
        },
      ],
      exercises: [
        {
          sectionClientId: "missing-section",
          prompt: "Create an answer variable containing Source.",
          starterCode: "answer = ''",
          assertionCode: "assert 'source' in answer.lower()",
          successMessage: "Grounded answer detected.",
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});

describe("notifications", () => {
  it("creates creator and student events after course completion", () => {
    const events = createNotificationEvents({
      kind: "course_completed",
      actorId: "u_reader",
      recipientId: "u_creator",
      courseId: "c1",
      courseTitle: course.title,
    });

    expect(events).toHaveLength(2);
    expect(events.map((event) => event.type)).toEqual([
      "course_completed",
      "thanks_nudge",
    ]);
  });
});

describe("course search and i18n", () => {
  it("searches courses by keyword and hashtag", () => {
    expect(searchCourses([course], "rag")).toHaveLength(1);
    expect(searchCourses([course], "#ai")).toHaveLength(1);
    expect(searchCourses([course], "kubernetes")).toHaveLength(0);
  });

  it("keeps English and Spanish dictionaries aligned for shared keys", () => {
    const englishKeys = Object.keys(dictionaries.en).sort();
    const spanishKeys = Object.keys(dictionaries.es).sort();

    expect(spanishKeys).toEqual(englishKeys);
    expect(getDictionary("es").thanks).toBe("Agradecer");
  });
});
