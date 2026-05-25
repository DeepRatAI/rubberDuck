import { describe, expect, it } from "vitest";

import {
  accountModerationActionSchema,
  commentEntitySchema,
  commentSchema,
  followProfileSchema,
  feedPageSchema,
  moderationEntityActionSchema,
  notificationReadSchema,
  postSchema,
  postEntitySchema,
  reportSchema,
  profileUpdateSchema,
} from "./validators";

describe("social action validators", () => {
  it("requires UUID-backed post and profile mutation targets", () => {
    expect(() =>
      postEntitySchema.parse({
        postId: "10000000-0000-4000-8000-000000000001",
      }),
    ).not.toThrow();
    expect(() =>
      followProfileSchema.parse({
        profileUserId: "00000000-0000-4000-8000-000000000002",
      }),
    ).not.toThrow();
    expect(() => postEntitySchema.parse({ postId: "rss" })).toThrow();
  });

  it("validates account-level moderation actions with bounded reasons", () => {
    const subjectId = "10000000-0000-4000-8000-000000000001";

    expect(
      accountModerationActionSchema.safeParse({
        subjectId,
        action: "suspension",
        reason: "repeated spam reports",
        expiresAt: "2026-06-01T00:00:00.000Z",
      }).success,
    ).toBe(true);
    expect(
      accountModerationActionSchema.safeParse({
        subjectId,
        action: "ban",
        reason: "ok",
      }).success,
    ).toBe(false);
    expect(
      accountModerationActionSchema.safeParse({
        subjectId: "not-a-uuid",
        action: "restore",
        reason: "appeal accepted",
      }).success,
    ).toBe(false);
  });

  it("requires UUID-backed comments, replies, and report targets", () => {
    const postId = "10000000-0000-4000-8000-000000000001";
    const commentId = "20000000-0000-4000-8000-000000000001";

    expect(commentEntitySchema.safeParse({ commentId }).success).toBe(true);
    expect(
      commentSchema.safeParse({
        postId,
        parentId: commentId,
        body: "Can you share the trace config?",
      }).success,
    ).toBe(true);
    expect(
      reportSchema.safeParse({
        entityType: "comment",
        entityId: commentId,
        reason: "other",
      }).success,
    ).toBe(true);
    expect(
      reportSchema.safeParse({
        entityType: "post",
        entityId: "rss",
        reason: "other",
      }).success,
    ).toBe(false);
  });

  it("bounds notification read batches", () => {
    expect(notificationReadSchema.parse({})).toEqual({ notificationIds: [] });
    expect(() =>
      notificationReadSchema.parse({
        notificationIds: Array.from(
          { length: 101 },
          (_, index) =>
            `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
        ),
      }),
    ).toThrow();
  });

  it("bounds feed pagination requests", () => {
    expect(
      feedPageSchema.parse({
        cursor: 10,
        pageSize: 20,
        mode: "following",
        category: "News",
      }),
    ).toMatchObject({
      cursor: 10,
      pageSize: 20,
      mode: "following",
      category: "News",
    });
    expect(feedPageSchema.safeParse({ cursor: -1 }).success).toBe(false);
    expect(feedPageSchema.safeParse({ pageSize: 100 }).success).toBe(false);
    expect(feedPageSchema.safeParse({ mode: "ragebait" }).success).toBe(false);
  });

  it("validates moderator hide and restore actions for social entities only", () => {
    const entityId = "10000000-0000-4000-8000-000000000001";

    expect(
      moderationEntityActionSchema.safeParse({
        entityType: "post",
        entityId,
        action: "hide",
        reason: "malicious code sample",
      }).success,
    ).toBe(true);
    expect(
      moderationEntityActionSchema.safeParse({
        entityType: "comment",
        entityId,
        action: "restore",
        reason: "reviewed and safe",
      }).success,
    ).toBe(true);
    expect(
      moderationEntityActionSchema.safeParse({
        entityType: "course",
        entityId,
        action: "hide",
        reason: "wrong surface",
      }).success,
    ).toBe(false);
  });

  it("accepts a structured Project Signal post with normalized discovery metadata", () => {
    expect(
      postSchema.safeParse({
        contentType: "project_signal",
        category: "Project",
        title: "Project Signal: DeepRatAI/Dev4All",
        body: "A local-first developer network looking for technical feedback.",
        tags: [
          "AI Engineering",
          "Developer Tools",
          "TypeScript",
          "Technical feedback",
        ],
        media: [],
        projectSignal: {
          repoUrl: "https://github.com/DeepRatAI/Dev4All",
          repoKey: "deepratai/dev4all",
          owner: "DeepRatAI",
          name: "Dev4All",
          description: "Local-first developer network.",
          primaryLanguage: "TypeScript",
          license: "MIT",
          homepage: "https://rubberduck.net",
          domains: ["AI Engineering", "Developer Tools"],
          stack: ["TypeScript", "Next.js"],
          needs: ["Technical feedback", "Testing"],
          maturity: "MVP",
          intent: "Looking for feedback",
          audience: ["Builders", "Open source maintainers"],
          language: "en",
          evidence: {
            stars: 42,
            forks: 7,
            topics: ["ai", "developer-tools"],
            readmeHeadings: ["Setup", "Architecture"],
            rootFiles: ["package.json", "README.md"],
          },
        },
      }).success,
    ).toBe(true);
  });

  it("requires valid GitHub metadata for Project Signal posts", () => {
    const result = postSchema.safeParse({
      contentType: "project_signal",
      category: "Project",
      title: "Project Signal: suspicious",
      body: "This should not publish without a valid GitHub repository.",
      tags: ["Security review"],
      media: [],
      projectSignal: {
        repoUrl: "https://gitlab.com/acme/project",
        repoKey: "acme/project",
        owner: "acme",
        name: "project",
        description: "Wrong host.",
        domains: ["Security"],
        stack: [],
        needs: ["Security review"],
        maturity: "Experimental",
        intent: "Looking for feedback",
        audience: [],
        language: "en",
        evidence: {
          stars: 0,
          forks: 0,
          topics: [],
          readmeHeadings: [],
          rootFiles: [],
        },
      },
    });

    expect(result.success).toBe(false);
  });

  it("accepts local avatar and banner paths in profile updates", () => {
    expect(
      profileUpdateSchema.safeParse({
        name: "Alex Chen",
        handle: "alexchen",
        bio: "Building in the open.",
        location: "Seattle",
        workStatus: "open_to_collaborate",
        links: ["https://example.dev"],
        image:
          "/uploads/profile-media/avatar/00000000-0000-4000-8000-000000000001/10000000-0000-4000-8000-000000000001.png",
        bannerUrl:
          "/uploads/profile-media/banner/00000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001.webp",
        palette: "rubberduck",
        visibility: {
          email: "private",
          followers: "public",
          thanks: "public",
          completedCourses: "followers",
          location: "public",
        },
      }).success,
    ).toBe(true);
  });
});
