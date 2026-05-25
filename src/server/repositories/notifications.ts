import { desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { courses, notifications, profiles } from "@/db/schema";
import type { NotificationEvent } from "@/lib/domain";

function notificationHref(
  notification: {
    type: NotificationEvent["type"];
    actorId: string | null;
    entityId: string | null;
  },
  lookups: {
    courseSlugs: Map<string, string>;
    actorHandles: Map<string, string>;
  },
) {
  if (!notification.entityId) {
    return undefined;
  }

  if (
    notification.type === "reply" ||
    notification.type === "project_signal_response"
  ) {
    return `/binnacle/${notification.entityId}`;
  }

  if (
    notification.type === "thanks" ||
    notification.type === "thanks_nudge" ||
    notification.type === "course_completed"
  ) {
    const slug = lookups.courseSlugs.get(notification.entityId);
    return slug ? `/courses/${slug}` : undefined;
  }

  if (notification.type === "follow") {
    const handle = notification.actorId
      ? lookups.actorHandles.get(notification.actorId)
      : undefined;
    return handle ? `/u/${handle}` : undefined;
  }

  return undefined;
}

export async function listNotifications(
  userId: string,
): Promise<NotificationEvent[]> {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientId, userId))
    .orderBy(desc(notifications.createdAt));

  const courseIds = rows
    .filter((row) =>
      ["thanks", "thanks_nudge", "course_completed"].includes(row.type),
    )
    .map((row) => row.entityId)
    .filter((id): id is string => Boolean(id));
  const actorIds = rows
    .filter((row) => row.type === "follow")
    .map((row) => row.actorId)
    .filter((id): id is string => Boolean(id));

  const [courseRows, actorProfileRows] = await Promise.all([
    courseIds.length > 0
      ? db
          .select({ id: courses.id, slug: courses.slug })
          .from(courses)
          .where(inArray(courses.id, courseIds))
      : Promise.resolve([]),
    actorIds.length > 0
      ? db
          .select({ userId: profiles.userId, handle: profiles.handle })
          .from(profiles)
          .where(inArray(profiles.userId, actorIds))
      : Promise.resolve([]),
  ]);

  const lookups = {
    courseSlugs: new Map(courseRows.map((course) => [course.id, course.slug])),
    actorHandles: new Map(
      actorProfileRows.map((profile) => [profile.userId, profile.handle]),
    ),
  };

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    actorId: row.actorId ?? "system",
    recipientId: row.recipientId,
    message: row.message,
    entityId: row.entityId ?? undefined,
    href: notificationHref(row, lookups),
    createdAt: row.createdAt.toISOString(),
    read: row.read,
  }));
}
