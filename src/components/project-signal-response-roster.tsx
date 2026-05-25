import Link from "next/link";
import { UserRoundCheck } from "lucide-react";

import type { Locale } from "@/lib/domain";
import { formatTime } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { getProjectSignalResponseCopy } from "@/lib/project-signal-actions";
import type { ProjectSignalResponseSummary } from "@/lib/product-types";
import { Badge } from "./ui/badge";

export function ProjectSignalResponseRoster({
  locale,
  responses,
}: {
  locale: Locale;
  responses: ProjectSignalResponseSummary[];
}) {
  const dictionary = getDictionary(locale);

  return (
    <section className="mt-4 rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[color:var(--foreground)]">
            {dictionary.projectSignalResponders}
          </h2>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            {dictionary.projectSignalRespondersDescription}
          </p>
        </div>
        <Badge tone="green">
          {responses.length} {dictionary.responses}
        </Badge>
      </div>
      <div className="mt-4 grid gap-2">
        {responses.length > 0 ? (
          responses.map((response) => (
            <Link
              key={`${response.userId}-${response.intent}`}
              href={`/u/${response.userHandle}?lang=${locale}`}
              className="flex items-start gap-3 rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)] p-3 transition hover:border-[color:var(--accent)]"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[color:var(--badge-cyan-border)] bg-[color:var(--badge-cyan-bg)] text-[color:var(--badge-cyan-text)]">
                <UserRoundCheck className="size-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[color:var(--foreground)]">
                    {response.userName}
                  </span>
                  <span className="text-xs text-[color:var(--muted)]">
                    @{response.userHandle}
                  </span>
                  <Badge tone="blue">
                    {
                      getProjectSignalResponseCopy(response.intent, locale)
                        .pastTense
                    }
                  </Badge>
                </div>
                {response.note ? (
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                    {response.note}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-[color:var(--muted)]">
                  {formatTime(response.createdAt, locale)}
                </p>
              </div>
            </Link>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-[color:var(--line)] p-3 text-sm text-[color:var(--muted)]">
            {dictionary.projectSignalNoResponses}
          </p>
        )}
      </div>
    </section>
  );
}
