import { ExternalLink, Rss } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Panel, SectionHeader } from "@/components/ui/panel";
import type { Locale } from "@/lib/domain";
import type { PageSearchParams } from "@/lib/routing";
import { requireAdminUserId } from "@/server/current-user";
import {
  listRssSourceHealth,
  summarizeRssHealth,
} from "@/server/repositories/rss";

export default async function AdminRssPage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const params = searchParams ? await searchParams : {};
  const locale: Locale = params.lang === "es" ? "es" : "en";
  await requireAdminUserId({ locale });
  const sources = await listRssSourceHealth();
  const summary = summarizeRssHealth(sources);

  return (
    <AppShell active="Settings" locale={locale}>
      <div className="mx-auto max-w-6xl space-y-5">
        <Panel>
          <SectionHeader
            title="RSS operations"
            description="Admin-only source health, freshness, article counts, and direct checks for the home discovery mix."
          />
          <dl className="grid gap-2 p-4 text-sm sm:grid-cols-4">
            {[
              ["Sources", summary.sources],
              ["Enabled", summary.enabled],
              ["Items", summary.totalItems],
              ["Stale", summary.staleSources],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)] p-3"
              >
                <dt className="text-xs text-[color:var(--muted)]">{label}</dt>
                <dd className="mt-1 text-xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel>
          <div className="divide-y divide-[color:var(--line)]">
            {sources.map((source) => (
              <article
                key={source.id}
                className="grid gap-3 p-4 lg:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Rss className="size-4 text-[color:var(--accent)]" />
                    <h2 className="truncate text-sm font-semibold">
                      {source.name}
                    </h2>
                    <Badge tone={source.enabled ? "green" : "slate"}>
                      {source.enabled ? "enabled" : "disabled"}
                    </Badge>
                    <Badge tone={source.itemCount > 0 ? "cyan" : "amber"}>
                      {source.itemCount} items
                    </Badge>
                  </div>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block truncate text-xs text-[color:var(--muted)] hover:text-[color:var(--accent)]"
                  >
                    {source.url}
                  </a>
                  {source.latestItemTitle ? (
                    <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                      Latest:{" "}
                      <a
                        href={source.latestItemUrl ?? source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[color:var(--foreground)] hover:text-[color:var(--accent)]"
                      >
                        {source.latestItemTitle}
                      </a>
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-[color:var(--muted)]">
                      No normalized article has been stored for this source yet.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
                  {source.latestItemAt ? (
                    <span>{source.latestItemAt}</span>
                  ) : null}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${source.name}`}
                    className="inline-flex size-8 items-center justify-center rounded-md border border-[color:var(--line)] hover:bg-[color:var(--surface-2)]"
                  >
                    <ExternalLink className="size-4" aria-hidden />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
