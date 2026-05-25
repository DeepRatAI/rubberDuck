import { db } from "@/db";
import { eq, inArray, notInArray, sql } from "drizzle-orm";
import {
  badges,
  comments,
  courseProgress,
  courses,
  courseSections,
  exercises,
  follows,
  githubRepoCache,
  notifications,
  postAudienceTargets,
  postInterests,
  postTags,
  projectSignalResponses,
  posts,
  profiles,
  reports,
  rssItems,
  rssSources,
  saves,
  tags as tagsTable,
  thanks,
  userInterests,
  users,
} from "@/db/schema";
import { buildProjectSignalDraft } from "@/lib/project-signals";
import { curatedRssSources } from "@/lib/rss-sources";
import { getTagCategory, toTagSlug } from "@/lib/social-taxonomy";

const ids = {
  alex: "00000000-0000-4000-8000-000000000001",
  mina: "00000000-0000-4000-8000-000000000002",
  rahul: "00000000-0000-4000-8000-000000000003",
  postLangfuse: "10000000-0000-4000-8000-000000000001",
  postPostgres: "10000000-0000-4000-8000-000000000002",
  postDataCommons: "10000000-0000-4000-8000-000000000003",
  postGpu: "10000000-0000-4000-8000-000000000004",
  postMeta: "10000000-0000-4000-8000-000000000005",
  postRubberDuckSignal: "10000000-0000-4000-8000-000000000006",
  commentOne: "20000000-0000-4000-8000-000000000001",
  commentTwo: "20000000-0000-4000-8000-000000000002",
  courseRag: "30000000-0000-4000-8000-000000000001",
  coursePostgres: "30000000-0000-4000-8000-000000000002",
  sectionIntro: "40000000-0000-4000-8000-000000000001",
  sectionSetup: "40000000-0000-4000-8000-000000000002",
  sectionGenerate: "40000000-0000-4000-8000-000000000003",
  sectionEval: "40000000-0000-4000-8000-000000000004",
  sectionPgIntro: "40000000-0000-4000-8000-000000000005",
  exerciseAnswer: "50000000-0000-4000-8000-000000000001",
  rssGithubCopilot: "70000000-0000-4000-8000-000000000001",
  rssGithubChangelog: "70000000-0000-4000-8000-000000000002",
  rssCloudflareMythos: "70000000-0000-4000-8000-000000000003",
  rssNeonWrites: "70000000-0000-4000-8000-000000000004",
  rssHuggingFaceCosmos: "70000000-0000-4000-8000-000000000005",
  rssOpenAiDell: "70000000-0000-4000-8000-000000000006",
  rssMozillaFirefox: "70000000-0000-4000-8000-000000000007",
  notificationReply: "80000000-0000-4000-8000-000000000001",
  notificationThanks: "80000000-0000-4000-8000-000000000002",
  notificationProjectSignal: "80000000-0000-4000-8000-000000000003",
  badgeOss: "90000000-0000-4000-8000-000000000001",
  badgeHelpful: "90000000-0000-4000-8000-000000000002",
  badgeCourse: "90000000-0000-4000-8000-000000000003",
  reportSeed: "a0000000-0000-4000-8000-000000000001",
} as const;

const dates = {
  now: new Date("2026-05-07T13:00:00.000Z"),
  langfuse: new Date("2026-05-07T12:40:00.000Z"),
  postgres: new Date("2026-05-07T12:15:00.000Z"),
  dataCommons: new Date("2026-05-07T11:50:00.000Z"),
  gpu: new Date("2026-05-07T10:30:00.000Z"),
  meta: new Date("2026-05-07T09:45:00.000Z"),
  projectSignal: new Date("2026-05-07T12:55:00.000Z"),
  rss: new Date("2026-05-07T08:20:00.000Z"),
} as const;

const rubberDuckRepoPreview = {
  url: "https://github.com/DeepRatAI/Dev4All",
  owner: "DeepRatAI",
  name: "Dev4All",
  description:
    "RubberDuck is a bilingual developer social network with Binnacle, executable courses, RSS discovery, and privacy-first profiles.",
  stars: 42,
  forks: 7,
  topics: ["ai", "developer-tools", "open-source", "local-first"],
  primaryLanguage: "TypeScript",
  license: "MIT",
  homepage: "https://rubberduck.net",
  readmeHeadings: [
    "Setup",
    "Architecture",
    "Testing",
    "Contributing",
    "Security",
  ],
  rootFiles: [
    "package.json",
    "next.config.ts",
    "drizzle.config.ts",
    "README.md",
    ".github/workflows/ci.yml",
  ],
};
const rubberDuckSignalDraft = buildProjectSignalDraft(rubberDuckRepoPreview);

async function upsertUsers() {
  await db
    .insert(users)
    .values([
      {
        id: ids.alex,
        name: "Alex Chen",
        email: "alex@example.dev",
        image: null,
        createdAt: dates.now,
      },
      {
        id: ids.mina,
        name: "Mina Park",
        email: "mina@example.dev",
        image: null,
        createdAt: dates.now,
      },
      {
        id: ids.rahul,
        name: "Rahul Gupta",
        email: "rahul@example.dev",
        image: null,
        createdAt: dates.now,
      },
    ])
    .onConflictDoNothing();
}

async function upsertProfiles() {
  await db
    .insert(profiles)
    .values([
      {
        userId: ids.alex,
        handle: "alexchen",
        bio: "ML engineer. Open-source contributor. Working on developer tools and LLM infra.",
        location: "Seattle, WA",
        workStatus: "Open to collaborate",
        availability: "part_time",
        seniority: "senior",
        stack: [
          "Python",
          "TypeScript",
          "PyTorch",
          "Docker",
          "Kubernetes",
          "LangChain",
        ],
        interests: ["ai", "oss", "postgres", "wasm", "observability"],
        contentPreferences: [
          "Project Signals",
          "Runnable exercises",
          "Architecture notes",
        ],
        participationIntents: [
          "I build projects",
          "I review projects",
          "I mentor others",
        ],
        links: ["https://alexchen.dev", "https://github.com/alexchen"],
        onboardedAt: dates.now,
      },
      {
        userId: ids.mina,
        handle: "minapark",
        bio: "Tracing, evals, and prompt management for production AI systems.",
        location: "Berlin, DE",
        workStatus: "Focused",
        availability: "advisory",
        seniority: "staff",
        stack: ["TypeScript", "Python", "OpenTelemetry"],
        interests: ["ai", "observability", "evals"],
        contentPreferences: [
          "Technical build logs",
          "Research notes",
          "RSS engineering reads",
        ],
        participationIntents: [
          "I review projects",
          "I scout interesting work",
          "I can contribute",
        ],
        links: ["https://github.com/minapark"],
        onboardedAt: dates.now,
      },
      {
        userId: ids.rahul,
        handle: "rgupta",
        bio: "Platform engineer focused on CI, monorepos, and deploy graphs.",
        location: "Austin, TX",
        workStatus: "Open to collaborate",
        availability: "part_time",
        seniority: "senior",
        stack: ["Postgres", "Kubernetes", "TypeScript"],
        interests: ["architecture", "postgres", "ci"],
        contentPreferences: [
          "Open-source projects",
          "Architecture notes",
          "Courses",
        ],
        participationIntents: [
          "I build projects",
          "I can contribute",
          "I want to learn",
        ],
        links: ["https://github.com/rgupta"],
        onboardedAt: dates.now,
      },
    ])
    .onConflictDoNothing();
}

async function upsertSocialGraph() {
  await db
    .insert(follows)
    .values([
      { followerId: ids.alex, followingId: ids.mina, createdAt: dates.now },
      { followerId: ids.alex, followingId: ids.rahul, createdAt: dates.now },
      { followerId: ids.mina, followingId: ids.alex, createdAt: dates.now },
      { followerId: ids.rahul, followingId: ids.alex, createdAt: dates.now },
    ])
    .onConflictDoNothing();
}

async function upsertPosts() {
  await db
    .insert(posts)
    .values([
      {
        id: ids.postLangfuse,
        authorId: ids.mina,
        category: "News",
        title: "Just shipped v2.1 of Langfuse tracing",
        body: "Prompt tracing, evals, and model cost management now share one timeline. Curious how teams are structuring eval datasets for long-running agents.",
        tags: ["ai", "observability", "evals"],
        media: [
          {
            type: "link",
            url: "https://langfuse.com",
            title: "Langfuse release notes",
            provider: "external",
          },
        ],
        createdAt: dates.langfuse,
        updatedAt: dates.langfuse,
      },
      {
        id: ids.postRubberDuckSignal,
        authorId: ids.alex,
        category: rubberDuckSignalDraft.category,
        contentType: rubberDuckSignalDraft.contentType,
        title: rubberDuckSignalDraft.title,
        body: rubberDuckSignalDraft.body,
        tags: rubberDuckSignalDraft.tags,
        media: [
          {
            type: "link",
            url: rubberDuckSignalDraft.projectSignal.repoUrl,
            title: "RubberDuck repository",
            provider: "external",
          },
        ],
        projectSignal: rubberDuckSignalDraft.projectSignal,
        createdAt: dates.projectSignal,
        updatedAt: dates.projectSignal,
      },
      {
        id: ids.postPostgres,
        authorId: ids.rahul,
        category: "Help",
        title: "How would you structure a multi-deployable monorepo?",
        body: "We have web, workers, migrations, shared package code, and per-customer deploys. Looking for a pattern that keeps CI fast without breaking ownership.",
        tags: ["architecture", "monorepo", "ci", "postgres"],
        createdAt: dates.postgres,
        updatedAt: dates.postgres,
      },
      {
        id: ids.postDataCommons,
        authorId: ids.alex,
        category: "Project",
        title: "Announcing Data Commons 1.0",
        body: "A modular toolkit for data sharing and discovery with schema provenance, source attribution, and typed transforms.",
        tags: ["typescript", "data", "oss"],
        media: [
          {
            type: "embed",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            title: "Project walkthrough",
            provider: "youtube",
          },
        ],
        createdAt: dates.dataCommons,
        updatedAt: dates.dataCommons,
      },
      {
        id: ids.postGpu,
        authorId: ids.mina,
        category: "CoWork",
        title: "Looking for contributors to build an open-source GPU profiler",
        body: "The first milestone is WebGPU timeline capture with flamegraph export. Frontend, Rust, and docs contributors welcome.",
        tags: ["webgpu", "rust", "cowork"],
        createdAt: dates.gpu,
        updatedAt: dates.gpu,
      },
      {
        id: ids.postMeta,
        authorId: ids.alex,
        category: "Meta",
        title: "Proposal: public roadmap labels for the network itself",
        body: "Feature proposals should be easy to discuss without turning into popularity contests. Suggesting labels for RFC, Accepted, In Progress, and Needs Maintainer.",
        tags: ["meta", "governance", "oss"],
        createdAt: dates.meta,
        updatedAt: dates.meta,
      },
    ])
    .onConflictDoNothing();

  await db
    .update(posts)
    .set({
      media: [
        {
          type: "link",
          url: "https://langfuse.com",
          title: "Langfuse release notes",
          provider: "external",
        },
      ],
    })
    .where(eq(posts.id, ids.postLangfuse));

  await db
    .update(posts)
    .set({
      media: [
        {
          type: "embed",
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          title: "Project walkthrough",
          provider: "youtube",
        },
      ],
    })
    .where(eq(posts.id, ids.postDataCommons));

  await db
    .update(posts)
    .set({
      contentType: rubberDuckSignalDraft.contentType,
      title: rubberDuckSignalDraft.title,
      body: rubberDuckSignalDraft.body,
      tags: rubberDuckSignalDraft.tags,
      media: [
        {
          type: "link",
          url: rubberDuckSignalDraft.projectSignal.repoUrl,
          title: "RubberDuck repository",
          provider: "external",
        },
      ],
      projectSignal: rubberDuckSignalDraft.projectSignal,
      updatedAt: dates.projectSignal,
    })
    .where(eq(posts.id, ids.postRubberDuckSignal));

  await db
    .insert(postInterests)
    .values([
      { postId: ids.postLangfuse, userId: ids.alex, createdAt: dates.now },
      { postId: ids.postLangfuse, userId: ids.rahul, createdAt: dates.now },
      {
        postId: ids.postRubberDuckSignal,
        userId: ids.mina,
        createdAt: dates.now,
      },
      {
        postId: ids.postRubberDuckSignal,
        userId: ids.rahul,
        createdAt: dates.now,
      },
      { postId: ids.postPostgres, userId: ids.alex, createdAt: dates.now },
      { postId: ids.postDataCommons, userId: ids.mina, createdAt: dates.now },
      { postId: ids.postDataCommons, userId: ids.rahul, createdAt: dates.now },
      { postId: ids.postGpu, userId: ids.alex, createdAt: dates.now },
      { postId: ids.postMeta, userId: ids.mina, createdAt: dates.now },
    ])
    .onConflictDoNothing();
}

async function upsertDiscoveryMetadata() {
  const projectSignalTags = [
    ...rubberDuckSignalDraft.tags,
    ...rubberDuckSignalDraft.projectSignal.domains,
    ...rubberDuckSignalDraft.projectSignal.stack,
    ...rubberDuckSignalDraft.projectSignal.needs,
  ];
  const profileSignals = [
    "AI Engineering",
    "Developer Tools",
    "Open Source",
    "Local-first",
    "TypeScript",
    "Python",
    "PostgreSQL",
    "Observability",
    "Technical feedback",
    "Testing",
    "Security review",
    "Contributors",
  ];
  const seedTags = Array.from(
    new Map(
      [...projectSignalTags, ...profileSignals].map((label) => [
        toTagSlug(label),
        {
          slug: toTagSlug(label),
          label,
          category: getTagCategory(label),
        },
      ]),
    ).values(),
  ).filter((tag) => tag.slug.length > 0);

  await db
    .insert(tagsTable)
    .values(seedTags)
    .onConflictDoUpdate({
      target: tagsTable.slug,
      set: {
        label: sql`excluded.label`,
        category: sql`excluded.category`,
      },
    });

  const tagRows = await db
    .select({ id: tagsTable.id, slug: tagsTable.slug, label: tagsTable.label })
    .from(tagsTable)
    .where(
      inArray(
        tagsTable.slug,
        seedTags.map((tag) => tag.slug),
      ),
    );
  const tagByLabel = new Map(
    tagRows.map((tag) => [tag.label.toLowerCase(), tag.id]),
  );
  const tagIdFor = (label: string) => tagByLabel.get(label.toLowerCase());
  const projectTagIds = Array.from(
    new Set(projectSignalTags.map(tagIdFor).filter(Boolean)),
  ) as string[];
  const audienceTagIds = Array.from(
    new Set(
      [
        ...rubberDuckSignalDraft.projectSignal.domains,
        ...rubberDuckSignalDraft.projectSignal.needs,
      ]
        .map(tagIdFor)
        .filter(Boolean),
    ),
  ) as string[];

  if (projectTagIds.length > 0) {
    await db
      .insert(postTags)
      .values(
        projectTagIds.map((tagId) => ({
          postId: ids.postRubberDuckSignal,
          tagId,
          source: "project_signal",
          confidence: 100,
        })),
      )
      .onConflictDoNothing();
  }

  if (audienceTagIds.length > 0) {
    await db
      .insert(postAudienceTargets)
      .values(
        audienceTagIds.map((tagId) => ({
          postId: ids.postRubberDuckSignal,
          tagId,
          weight: 100,
        })),
      )
      .onConflictDoNothing();
  }

  const userInterestRows = [
    { userId: ids.alex, labels: ["AI Engineering", "TypeScript", "Python"] },
    {
      userId: ids.mina,
      labels: ["AI Engineering", "Observability", "Technical feedback"],
    },
    {
      userId: ids.rahul,
      labels: ["PostgreSQL", "TypeScript", "Testing"],
    },
  ].flatMap((profile) =>
    profile.labels
      .map((label) => tagIdFor(label))
      .filter(Boolean)
      .map((tagId) => ({
        userId: profile.userId,
        tagId: tagId as string,
        weight: 100,
        source: "seeded_profile",
        updatedAt: dates.now,
      })),
  );

  if (userInterestRows.length > 0) {
    await db
      .insert(userInterests)
      .values(userInterestRows)
      .onConflictDoUpdate({
        target: [userInterests.userId, userInterests.tagId],
        set: {
          weight: 100,
          source: "seeded_profile",
          updatedAt: dates.now,
        },
      });
  }

  await db
    .insert(githubRepoCache)
    .values({
      repoKey: rubberDuckSignalDraft.projectSignal.repoKey,
      owner: rubberDuckSignalDraft.projectSignal.owner,
      name: rubberDuckSignalDraft.projectSignal.name,
      url: rubberDuckSignalDraft.projectSignal.repoUrl,
      snapshot: {
        ...rubberDuckRepoPreview,
        repoKey: rubberDuckSignalDraft.projectSignal.repoKey,
      },
      fetchedAt: dates.projectSignal,
    })
    .onConflictDoUpdate({
      target: githubRepoCache.repoKey,
      set: {
        snapshot: {
          ...rubberDuckRepoPreview,
          repoKey: rubberDuckSignalDraft.projectSignal.repoKey,
        },
        fetchedAt: dates.projectSignal,
      },
    });
}

async function upsertComments() {
  await db
    .insert(comments)
    .values([
      {
        id: ids.commentOne,
        postId: ids.postPostgres,
        authorId: ids.alex,
        body: "We had good results with package-level ownership plus a deploy graph. The key was making every app own its migrations explicitly.\n\n```ts\nconst affected = graph.changedSince(baseSha)\n```",
        createdAt: dates.now,
      },
      {
        id: ids.commentTwo,
        postId: ids.postPostgres,
        authorId: ids.rahul,
        parentId: ids.commentOne,
        body: "That ownership boundary is exactly what we are missing. Did you enforce it in CI or review?",
        createdAt: dates.now,
      },
    ])
    .onConflictDoNothing();
}

async function upsertCourses() {
  const generateSectionContent = {
    body: "Use retrieved context to generate a grounded answer with citations. The exercise checks that your answer contains source attribution.",
    code: "context = ['Attention Is All You Need introduced transformer self-attention.']\nquestion = 'What did the paper introduce?'\nanswer = 'The paper introduced transformer self-attention. Source: Attention Is All You Need.'\nprint(answer)",
    visualizations: [
      {
        id: "rag-quality-gates",
        type: "bar",
        title: "RAG quality gates",
        yLabel: "Score",
        data: [
          { label: "Retrieval recall", value: 86 },
          { label: "Citation accuracy", value: 94 },
          { label: "Latency score", value: 71 },
        ],
      },
    ],
  };

  await db
    .insert(courses)
    .values([
      {
        id: ids.courseRag,
        creatorId: ids.alex,
        slug: "building-an-llm-app-with-rag",
        title: "Building an LLM App with RAG",
        description:
          "Use retrieval context to generate grounded answers with citations and observable evaluation loops.",
        status: "published",
        difficulty: "intermediate",
        tags: ["ai", "rag", "python", "langchain"],
        completionCount: 6700,
        createdAt: dates.now,
        updatedAt: dates.now,
      },
      {
        id: ids.coursePostgres,
        creatorId: ids.mina,
        slug: "postgres-indexes-for-product-engineers",
        title: "Postgres Indexes for Product Engineers",
        description:
          "A practical course on query plans, partial indexes, and production-safe migrations.",
        status: "published",
        difficulty: "beginner",
        tags: ["postgres", "database", "performance"],
        completionCount: 2100,
        createdAt: dates.now,
        updatedAt: dates.now,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(courseSections)
    .values([
      {
        id: ids.sectionIntro,
        courseId: ids.courseRag,
        title: "Introduction",
        order: 1,
        content: {
          body: "RAG systems are useful when the answer must cite private or fast-moving source material. The architecture should make retrieval, generation, and evaluation observable.",
        },
      },
      {
        id: ids.sectionSetup,
        courseId: ids.courseRag,
        title: "Setup",
        order: 2,
        content: {
          body: "Start with a small corpus, deterministic chunking, and a baseline retrieval quality check before adding orchestration complexity.",
        },
      },
      {
        id: ids.sectionGenerate,
        courseId: ids.courseRag,
        title: "Generate Answer",
        order: 3,
        content: generateSectionContent,
      },
      {
        id: ids.sectionEval,
        courseId: ids.courseRag,
        title: "Evaluation",
        order: 4,
        content: {
          body: "Track citation presence, groundedness, latency, token cost, and failure classes. Do not ship a RAG flow without eval fixtures.",
        },
      },
      {
        id: ids.sectionPgIntro,
        courseId: ids.coursePostgres,
        title: "Read the query plan",
        order: 1,
        content: {
          body: "Start with the shape of the query and the selectivity of predicates before reaching for new indexes.",
        },
      },
    ])
    .onConflictDoNothing();

  await db
    .update(courseSections)
    .set({ content: generateSectionContent })
    .where(eq(courseSections.id, ids.sectionGenerate));

  await db
    .insert(exercises)
    .values([
      {
        id: ids.exerciseAnswer,
        courseId: ids.courseRag,
        sectionId: ids.sectionGenerate,
        prompt: "Create an answer variable that includes the word Source.",
        starterCode:
          "context = ['Attention Is All You Need introduced transformer self-attention.']\nanswer = ''\nprint(answer)",
        assertionCode: "assert 'source' in answer.lower()",
        successMessage: "Grounded answer detected with source attribution.",
      },
    ])
    .onConflictDoNothing();
}

async function upsertLearningState() {
  await db
    .insert(courseProgress)
    .values({
      courseId: ids.courseRag,
      userId: ids.alex,
      viewedSectionIds: [
        ids.sectionIntro,
        ids.sectionSetup,
        ids.sectionGenerate,
      ],
      passedExerciseIds: [],
      completedAt: null,
      updatedAt: dates.now,
    })
    .onConflictDoNothing();

  await db
    .insert(thanks)
    .values([
      { courseId: ids.courseRag, userId: ids.mina, createdAt: dates.now },
      { courseId: ids.courseRag, userId: ids.rahul, createdAt: dates.now },
    ])
    .onConflictDoNothing();

  await db
    .insert(saves)
    .values({
      entityType: "course",
      entityId: ids.courseRag,
      userId: ids.alex,
      createdAt: dates.now,
    })
    .onConflictDoNothing();
}

async function upsertRssAndOps() {
  await db.delete(rssSources).where(
    notInArray(
      rssSources.url,
      curatedRssSources.map((source) => source.url),
    ),
  );

  const seededSources = await db
    .insert(rssSources)
    .values(
      curatedRssSources.map((source) => ({
        name: source.name,
        url: source.url,
        enabled: true,
      })),
    )
    .onConflictDoUpdate({
      target: rssSources.url,
      set: {
        enabled: true,
      },
    })
    .returning({
      id: rssSources.id,
      name: rssSources.name,
    });

  const sourceByName = new Map(
    seededSources.map((source) => [source.name, source.id]),
  );
  const rssSeedItems = [
    {
      id: ids.rssGithubCopilot,
      sourceName: "GitHub Blog",
      title: "Take your local GitHub sessions anywhere",
      summary:
        "Remote control for GitHub Copilot coding sessions lets builders start work in VS Code or the CLI and continue from another device.",
      url: "https://github.blog/news-insights/product-news/take-your-local-github-sessions-anywhere/",
      tags: ["github", "copilot", "developer-tools"],
      publishedAt: new Date("2026-05-18T16:54:53.000Z"),
    },
    {
      id: ids.rssGithubChangelog,
      sourceName: "GitHub Changelog",
      title:
        "Removal of code_scanning_upload field from rate_limit API endpoint",
      summary:
        "GitHub removed the code_scanning_upload field from the rate limit REST API endpoint response.",
      url: "https://github.blog/changelog/2026-05-19-removal-of-code_scanning_upload-field-from-rate_limit-api-endpoint",
      tags: ["github", "api", "security"],
      publishedAt: new Date("2026-05-19T10:40:26.000Z"),
    },
    {
      id: ids.rssCloudflareMythos,
      sourceName: "Cloudflare Blog",
      title: "Project Glasswing: what Mythos showed us",
      summary:
        "Cloudflare shares what security-focused frontier models found when pointed at live code across critical infrastructure.",
      url: "https://blog.cloudflare.com/cyber-frontier-models/",
      tags: ["security", "ai", "cloudflare"],
      publishedAt: new Date("2026-05-18T06:00:00.000Z"),
    },
    {
      id: ids.rssNeonWrites,
      sourceName: "Neon Blog",
      title: "Everyone gets faster writes: We turned off FPW's in Neon",
      summary:
        "Neon describes a Postgres durability and performance change that improves write-heavy workloads.",
      url: "https://neon.com/blog/turning-off-fpw-for-faster-writes",
      tags: ["postgres", "database", "performance"],
      publishedAt: new Date("2026-05-07T10:00:00.000Z"),
    },
    {
      id: ids.rssHuggingFaceCosmos,
      sourceName: "Hugging Face Blog",
      title:
        "Fine-Tuning NVIDIA Cosmos Predict 2.5 with LoRA/DoRA for Robot Video Generation",
      summary:
        "A Hugging Face tutorial on fine-tuning NVIDIA Cosmos Predict for robot video generation workflows.",
      url: "https://huggingface.co/blog/nvidia/cosmos-fine-tuning-for-robot-video-generation",
      tags: ["ai", "robotics", "hugging-face"],
      publishedAt: new Date("2026-05-18T16:00:21.000Z"),
    },
    {
      id: ids.rssOpenAiDell,
      sourceName: "OpenAI News",
      title:
        "OpenAI and Dell partner to bring Codex to hybrid and on-premise enterprise environments",
      summary:
        "OpenAI and Dell are partnering to help enterprises deploy AI coding agents securely across data environments.",
      url: "https://openai.com/index/dell-codex-enterprise-partnership",
      tags: ["ai", "codex", "enterprise"],
      publishedAt: new Date("2026-05-18T10:00:00.000Z"),
    },
    {
      id: ids.rssMozillaFirefox,
      sourceName: "Mozilla Hacks",
      title: "Behind the Scenes Hardening Firefox with Claude Mythos Preview",
      summary:
        "Mozilla describes how frontier model-assisted review helped identify and fix latent security bugs in Firefox.",
      url: "https://hacks.mozilla.org/2026/05/behind-the-scenes-hardening-firefox/",
      tags: ["browser", "security", "mozilla"],
      publishedAt: new Date("2026-05-07T16:01:21.000Z"),
    },
  ];

  for (const item of rssSeedItems) {
    const sourceId = sourceByName.get(item.sourceName);
    if (!sourceId) {
      throw new Error(`Seed RSS source not found: ${item.sourceName}`);
    }

    await db
      .insert(rssItems)
      .values({
        id: item.id,
        sourceId,
        title: item.title,
        summary: item.summary,
        url: item.url,
        imageUrl: null,
        tags: item.tags,
        publishedAt: item.publishedAt,
      })
      .onConflictDoUpdate({
        target: rssItems.id,
        set: {
          sourceId,
          title: item.title,
          summary: item.summary,
          url: item.url,
          tags: item.tags,
          publishedAt: item.publishedAt,
        },
      });
  }

  await db
    .insert(projectSignalResponses)
    .values([
      {
        postId: ids.postRubberDuckSignal,
        userId: ids.mina,
        intent: "review",
        note: "Seed response proving Project Signal collaboration intent.",
        createdAt: dates.now,
      },
      {
        postId: ids.postRubberDuckSignal,
        userId: ids.rahul,
        intent: "try",
        note: "Seed response proving Project Signal test intent.",
        createdAt: dates.postgres,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(notifications)
    .values([
      {
        id: ids.notificationReply,
        type: "reply",
        actorId: ids.rahul,
        recipientId: ids.alex,
        message: "Rahul replied to your monorepo comment.",
        entityId: ids.postPostgres,
        createdAt: dates.now,
        read: false,
      },
      {
        id: ids.notificationThanks,
        type: "thanks",
        actorId: ids.mina,
        recipientId: ids.alex,
        message: "Mina left Thanks on Building an LLM App with RAG.",
        entityId: ids.courseRag,
        createdAt: dates.postgres,
        read: false,
      },
      {
        id: ids.notificationProjectSignal,
        type: "project_signal_response",
        actorId: ids.mina,
        recipientId: ids.alex,
        message: "Mina Park offered to review DeepRatAI/Dev4All.",
        entityId: ids.postRubberDuckSignal,
        createdAt: dates.projectSignal,
        read: false,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(badges)
    .values([
      {
        id: ids.badgeOss,
        userId: ids.alex,
        label: "Open Source First",
        description: "Published meaningful open-source work.",
        awardedAt: dates.now,
      },
      {
        id: ids.badgeHelpful,
        userId: ids.alex,
        label: "Helpful Answers",
        description: "Provided high-signal technical help.",
        awardedAt: dates.now,
      },
      {
        id: ids.badgeCourse,
        userId: ids.alex,
        label: "Course Builder",
        description: "Published a tutorial with executable exercises.",
        awardedAt: dates.now,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(reports)
    .values({
      id: ids.reportSeed,
      reporterId: ids.alex,
      entityType: "post",
      entityId: ids.postMeta,
      reason: "spam",
      details: "Seed report proving private moderation plumbing.",
      createdAt: dates.now,
      resolved: true,
    })
    .onConflictDoNothing();
}

async function main() {
  await upsertUsers();
  await upsertProfiles();
  await upsertSocialGraph();
  await upsertPosts();
  await upsertDiscoveryMetadata();
  await upsertComments();
  await upsertCourses();
  await upsertLearningState();
  await upsertRssAndOps();

  console.log("RubberDuck database seeded");
  console.log("users=3");
  console.log("posts=6");
  console.log(`rss_sources=${curatedRssSources.length}`);
  console.log("rss_items=7");
  console.log("courses=2");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
