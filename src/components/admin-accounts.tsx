"use client";

import { useState, useTransition } from "react";

import { moderateAccount } from "@/app/actions";
import type { ModeratedAccount } from "@/server/repositories/moderation";
import type { Locale } from "@/lib/domain";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export function AdminAccounts({
  accounts,
}: {
  accounts: ModeratedAccount[];
  locale: Locale;
}) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function runAction(subjectId: string, action: ModeratedAccountAction) {
    const reason =
      action === "restore"
        ? "Administrative restore after review."
        : `Administrative ${action} after moderation review.`;
    setStatus(null);
    setError(null);
    startTransition(() => {
      void moderateAccount({ subjectId, action, reason })
        .then(() =>
          setStatus("Account enforcement updated. Refresh to verify."),
        )
        .catch((caught: unknown) =>
          setError(caught instanceof Error ? caught.message : "Action failed."),
        );
    });
  }

  return (
    <div className="divide-y divide-[color:var(--line)]">
      {status ? (
        <p className="status-success m-4 rounded-md p-3 text-sm">{status}</p>
      ) : null}
      {error ? (
        <p className="status-warning m-4 rounded-md p-3 text-sm">{error}</p>
      ) : null}
      {accounts.map((account) => (
        <article
          key={account.id}
          className="grid gap-3 p-4 lg:grid-cols-[1fr_auto]"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-sm font-semibold">{account.name}</h2>
              <Badge tone={account.banned ? "amber" : "green"}>
                {account.banned ? "restricted" : "active"}
              </Badge>
              <Badge tone="slate">{account.role}</Badge>
            </div>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              {account.email}
            </p>
            {account.banReason ? (
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                {account.banReason}
                {account.banExpires ? ` until ${account.banExpires}` : ""}
              </p>
            ) : null}
            {account.latestAction ? (
              <p className="mt-2 text-xs text-[color:var(--muted)]">
                Latest: {account.latestAction} / {account.latestActionReason}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="subtle"
              disabled={pending}
              onClick={() => runAction(account.id, "warning")}
            >
              Warn
            </Button>
            <Button
              type="button"
              size="sm"
              variant="subtle"
              disabled={pending}
              onClick={() => runAction(account.id, "suspension")}
            >
              Suspend 7d
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => runAction(account.id, "ban")}
            >
              Ban
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || !account.banned}
              onClick={() => runAction(account.id, "restore")}
            >
              Restore
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

type ModeratedAccountAction = "warning" | "suspension" | "ban" | "restore";
