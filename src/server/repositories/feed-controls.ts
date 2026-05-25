import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { feedFeedback, feedImpressions } from "@/db/schema";
import type {
  feedFeedbackSchema,
  feedImpressionSchema,
} from "@/lib/validators";

export async function recordFeedImpressions(
  userId: string,
  input: z.infer<typeof feedImpressionSchema>,
) {
  const uniqueItems = Array.from(
    new Map(
      input.items.map((item) => [
        `${item.entityType}:${item.entityId}`,
        {
          userId,
          entityType: item.entityType,
          entityId: item.entityId,
          source: input.source,
          seenCount: 1,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
        },
      ]),
    ).values(),
  );

  if (uniqueItems.length === 0) {
    return { recorded: 0 };
  }

  await db
    .insert(feedImpressions)
    .values(uniqueItems)
    .onConflictDoUpdate({
      target: [
        feedImpressions.userId,
        feedImpressions.entityType,
        feedImpressions.entityId,
      ],
      set: {
        source: sql`excluded.source`,
        seenCount: sql`${feedImpressions.seenCount} + 1`,
        lastSeenAt: new Date(),
      },
    });

  return { recorded: uniqueItems.length };
}

export async function persistFeedFeedback(
  userId: string,
  input: z.infer<typeof feedFeedbackSchema>,
) {
  const [existing] = await db
    .select({ signal: feedFeedback.signal })
    .from(feedFeedback)
    .where(
      and(
        eq(feedFeedback.userId, userId),
        eq(feedFeedback.entityType, input.entityType),
        eq(feedFeedback.entityId, input.entityId),
        eq(feedFeedback.signal, input.signal),
      ),
    );

  if (existing) {
    return { created: false, signal: input.signal };
  }

  await db.insert(feedFeedback).values({
    userId,
    entityType: input.entityType,
    entityId: input.entityId,
    signal: input.signal,
    value: input.value,
  });

  return { created: true, signal: input.signal };
}
