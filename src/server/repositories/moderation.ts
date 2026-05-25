import { desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  accountModerationActions,
  auditEvents,
  comments,
  courses,
  posts,
  reports,
  users,
} from "@/db/schema";

export type ModerationReport = {
  id: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  entityStatus: string;
  reason: string;
  details: string | null;
  resolved: boolean;
  createdAt: string;
  reporterName: string;
  reporterEmail: string;
};

export type ModeratedAccount = {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  latestAction: string | null;
  latestActionReason: string | null;
  latestActionAt: string | null;
};

export type AuditEventSummary = {
  id: string;
  actorName: string;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
};

export async function listModerationReports(): Promise<ModerationReport[]> {
  const rows = await db
    .select({
      id: reports.id,
      entityType: reports.entityType,
      entityId: reports.entityId,
      reason: reports.reason,
      details: reports.details,
      resolved: reports.resolved,
      createdAt: reports.createdAt,
      reporterName: users.name,
      reporterEmail: users.email,
    })
    .from(reports)
    .innerJoin(users, eq(reports.reporterId, users.id))
    .orderBy(desc(reports.createdAt));

  const postIds = rows
    .filter((row) => row.entityType === "post")
    .map((row) => row.entityId);
  const commentIds = rows
    .filter((row) => row.entityType === "comment")
    .map((row) => row.entityId);
  const courseIds = rows
    .filter((row) => row.entityType === "course")
    .map((row) => row.entityId);

  const [postRows, commentRows, courseRows] = await Promise.all([
    postIds.length
      ? db
          .select({ id: posts.id, label: posts.title, status: posts.status })
          .from(posts)
          .where(inArray(posts.id, postIds))
      : Promise.resolve([]),
    commentIds.length
      ? db
          .select({
            id: comments.id,
            label: comments.body,
            status: comments.status,
          })
          .from(comments)
          .where(inArray(comments.id, commentIds))
      : Promise.resolve([]),
    courseIds.length
      ? db
          .select({
            id: courses.id,
            label: courses.title,
            status: courses.status,
          })
          .from(courses)
          .where(inArray(courses.id, courseIds))
      : Promise.resolve([]),
  ]);

  const labels = new Map<string, string>();
  const statuses = new Map<string, string>();
  for (const row of [...postRows, ...commentRows, ...courseRows]) {
    labels.set(row.id, row.label);
    statuses.set(row.id, row.status);
  }

  return rows.map((row) => ({
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    entityLabel:
      labels.get(row.entityId)?.slice(0, 180) ?? "Entity no longer exists",
    entityStatus: statuses.get(row.entityId) ?? "missing",
    reason: row.reason,
    details: row.details,
    resolved: row.resolved,
    createdAt: row.createdAt.toISOString(),
    reporterName: row.reporterName ?? "Unknown",
    reporterEmail: row.reporterEmail ?? "unknown",
  }));
}

export async function listAuditEvents(limit = 80): Promise<AuditEventSummary[]> {
  const rows = await db
    .select({
      id: auditEvents.id,
      action: auditEvents.action,
      entityType: auditEvents.entityType,
      entityId: auditEvents.entityId,
      metadata: auditEvents.metadata,
      createdAt: auditEvents.createdAt,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(auditEvents)
    .leftJoin(users, eq(auditEvents.actorId, users.id))
    .orderBy(desc(auditEvents.createdAt))
    .limit(Math.min(Math.max(limit, 1), 200));

  return rows.map((row) => ({
    id: row.id,
    actorName: row.actorName ?? "System",
    actorEmail: row.actorEmail ?? null,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function listModeratedAccounts(): Promise<ModeratedAccount[]> {
  const [userRows, actionRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        banned: users.banned,
        banReason: users.banReason,
        banExpires: users.banExpires,
      })
      .from(users)
      .orderBy(desc(users.createdAt)),
    db
      .select({
        subjectId: accountModerationActions.subjectId,
        action: accountModerationActions.action,
        reason: accountModerationActions.reason,
        createdAt: accountModerationActions.createdAt,
      })
      .from(accountModerationActions)
      .orderBy(desc(accountModerationActions.createdAt)),
  ]);
  const latestByUser = new Map<string, (typeof actionRows)[number]>();

  for (const action of actionRows) {
    if (!latestByUser.has(action.subjectId)) {
      latestByUser.set(action.subjectId, action);
    }
  }

  return userRows.map((user) => {
    const latest = latestByUser.get(user.id);

    return {
      id: user.id,
      name: user.name ?? "RubberDuck user",
      email: user.email,
      role: user.role,
      banned: user.banned,
      banReason: user.banReason,
      banExpires: user.banExpires?.toISOString() ?? null,
      latestAction: latest?.action ?? null,
      latestActionReason: latest?.reason ?? null,
      latestActionAt: latest?.createdAt.toISOString() ?? null,
    };
  });
}
