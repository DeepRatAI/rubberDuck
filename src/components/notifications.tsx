"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";

import { markNotificationsRead } from "@/app/actions";
import type { Locale, NotificationEvent } from "@/lib/domain";
import { formatDateTime } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Panel, SectionHeader } from "./ui/panel";

export function NotificationsSurface({
  locale,
  notifications,
}: {
  locale: Locale;
  notifications: NotificationEvent[];
}) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [isPending, startTransition] = useTransition();
  const [readIds, setReadIds] = useState<Set<string>>(
    () =>
      new Set(
        notifications
          .filter((notification) => notification.read)
          .map((notification) => notification.id),
      ),
  );
  const notificationLabels = {
    follow: dictionary.notificationFollow,
    reply: dictionary.notificationReply,
    thanks: dictionary.notificationThanks,
    course_completed: dictionary.notificationCourseCompleted,
    thanks_nudge: dictionary.notificationThanksNudge,
    project_signal_response: dictionary.notificationProjectSignalResponse,
  } satisfies Record<NotificationEvent["type"], string>;

  function markRead() {
    startTransition(() => {
      void markNotificationsRead({
        notificationIds: notifications
          .filter((notification) => !readIds.has(notification.id))
          .map((notification) => notification.id),
      }).then(() => {
        setReadIds(
          new Set(notifications.map((notification) => notification.id)),
        );
        router.refresh();
      });
    });
  }

  return (
    <Panel>
      <SectionHeader
        title={dictionary.notifications}
        description={dictionary.notificationsDescription}
        action={
          <Button onClick={markRead} disabled={isPending}>
            <CheckCheck className="size-4" aria-hidden />
            {dictionary.markRead}
          </Button>
        }
      />
      <div className="divide-y divide-[color:var(--line)]">
        {notifications.map((notification) => {
          const content = (
            <>
              <div className="flex size-9 items-center justify-center rounded-md border border-[color:var(--badge-cyan-border)] bg-[color:var(--badge-cyan-bg)] text-[color:var(--badge-cyan-text)]">
                <Bell className="size-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge
                    tone={notification.type === "thanks" ? "green" : "blue"}
                  >
                    {notificationLabels[notification.type]}
                  </Badge>
                  {!readIds.has(notification.id) ? (
                    <span className="size-2 rounded-full bg-[color:var(--accent)]" />
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-[color:var(--foreground)]">
                  {notification.message}
                </p>
                <p className="mt-1 text-xs text-[color:var(--muted)]">
                  {formatDateTime(notification.createdAt, locale)}
                </p>
              </div>
            </>
          );

          return notification.href ? (
            <Link
              key={notification.id}
              href={`${notification.href}?lang=${locale}`}
              className="flex gap-3 p-4 transition hover:bg-[color:var(--surface-2)]"
            >
              {content}
            </Link>
          ) : (
            <article key={notification.id} className="flex gap-3 p-4">
              {content}
            </article>
          );
        })}
      </div>
    </Panel>
  );
}
