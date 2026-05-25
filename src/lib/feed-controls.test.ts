import { describe, expect, it } from "vitest";

import type { FeedItem } from "./domain";
import { applyFeedControls } from "./feed-controls";

function item(overrides: Partial<FeedItem> & Pick<FeedItem, "id">): FeedItem {
  const { id, ...rest } = overrides;

  return {
    id,
    type: "post",
    category: "Project",
    title: "Post",
    body: "Body",
    authorId: "author",
    authorName: "Author",
    tags: [],
    media: [],
    createdAt: "2026-05-20T12:00:00.000Z",
    interests: 0,
    comments: 0,
    ...rest,
  };
}

describe("feed controls", () => {
  it("removes explicit less-like-this items and muted tags", () => {
    const ranked = applyFeedControls(
      [
        item({ id: "keep", tags: ["postgres"] }),
        item({ id: "less", tags: ["ai"] }),
        item({ id: "muted-tag", tags: ["crypto"] }),
      ],
      {
        feedback: [
          {
            entityType: "post",
            entityId: "less",
            signal: "less_like_this",
          },
          {
            entityType: "post",
            entityId: "keep",
            signal: "mute_tag",
            value: "crypto",
          },
        ],
      },
    );

    expect(ranked.map((entry) => entry.id)).toEqual(["keep"]);
  });

  it("boosts more-like-this and downranks repeatedly seen content", () => {
    const ranked = applyFeedControls(
      [
        item({ id: "overseen" }),
        item({ id: "fresh" }),
        item({ id: "boosted" }),
      ],
      {
        feedback: [
          {
            entityType: "post",
            entityId: "boosted",
            signal: "more_like_this",
          },
        ],
        impressions: [
          {
            entityType: "post",
            entityId: "overseen",
            seenCount: 10,
          },
        ],
      },
    );

    expect(ranked[0]?.id).toBe("boosted");
    expect(ranked.at(-1)?.id).toBe("overseen");
  });

  it("mutes RSS sources without muting every RSS item", () => {
    const ranked = applyFeedControls(
      [
        item({
          id: "hf",
          type: "rss",
          authorName: "RSS: Hugging Face",
        }),
        item({
          id: "vercel",
          type: "rss",
          authorName: "RSS: Vercel",
        }),
      ],
      {
        feedback: [
          {
            entityType: "rss",
            entityId: "hf",
            signal: "mute_source",
            value: "Hugging Face",
          },
        ],
      },
    );

    expect(ranked.map((entry) => entry.id)).toEqual(["vercel"]);
  });
});
