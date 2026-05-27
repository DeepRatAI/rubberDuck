"use client";

import { useState, useTransition } from "react";
import {
  GitPullRequest,
  MessageSquareText,
  Rocket,
  UserPlus,
} from "lucide-react";

import { respondToProjectSignal } from "@/app/actions";
import type { Locale } from "@/lib/domain";
import {
  getProjectSignalResponseCopy,
  projectSignalResponseIntents,
  type ProjectSignalResponseIntent,
} from "@/lib/project-signal-actions";
import { getDictionary } from "@/lib/i18n";
import { Button } from "./ui/button";

const icons = {
  try: Rocket,
  review: MessageSquareText,
  contribute: GitPullRequest,
  follow_build: UserPlus,
} satisfies Record<ProjectSignalResponseIntent, typeof Rocket>;

export function ProjectSignalResponseActions({
  postId,
  locale,
  initialResponses = [],
  canRespond = true,
}: {
  postId: string;
  locale: Locale;
  initialResponses?: ProjectSignalResponseIntent[];
  canRespond?: boolean;
}) {
  const dictionary = getDictionary(locale);
  const [responses, setResponses] = useState(
    () => new Set<ProjectSignalResponseIntent>(initialResponses),
  );
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function respond(intent: ProjectSignalResponseIntent) {
    setStatus(null);
    setError(null);
    startTransition(() => {
      void respondToProjectSignal({ postId, intent })
        .then(() => {
          setResponses((current) => new Set(current).add(intent));
          setStatus(dictionary.projectSignalResponseSaved);
        })
        .catch((caught: unknown) => {
          setError(
            caught instanceof Error ? caught.message : dictionary.actionFailed,
          );
        });
    });
  }

  return (
    <div className="mt-3 rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
        {dictionary.projectSignalActions}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {projectSignalResponseIntents.map((intent) => {
          const copy = getProjectSignalResponseCopy(intent, locale);
          const Icon = icons[intent];
          const selected = responses.has(intent);

          return (
            <Button
              key={intent}
              type="button"
              size="sm"
              variant={selected ? "primary" : "secondary"}
              disabled={!canRespond || isPending || selected}
              onClick={() => respond(intent)}
              title={
                canRespond
                  ? copy.label
                  : dictionary.signInToRespondProjectSignal
              }
            >
              <Icon className="size-4" aria-hidden />
              {selected ? copy.pastTense : copy.label}
            </Button>
          );
        })}
      </div>
      {status ? (
        <p className="status-success mt-2 rounded-md px-2 py-1 text-xs">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="status-warning mt-2 rounded-md px-2 py-1 text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}
