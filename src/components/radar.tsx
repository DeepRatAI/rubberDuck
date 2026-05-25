import Link from "next/link";
import {
  Activity,
  GitBranch,
  MessageSquare,
  Search,
  Sparkles,
} from "lucide-react";

import type { Locale } from "@/lib/domain";
import { getDictionary } from "@/lib/i18n";
import type { RadarBucket, RadarProject } from "@/server/repositories/radar";
import { Badge } from "./ui/badge";
import { Panel, SectionHeader } from "./ui/panel";

const buckets: RadarBucket[] = [
  "under_discovered",
  "needs_feedback",
  "needs_contributors",
  "active_interest",
];

function bucketLabel(
  dictionary: ReturnType<typeof getDictionary>,
  bucket: RadarBucket,
) {
  return dictionary[`radar_${bucket}`];
}

export function RadarSurface({
  locale,
  projects,
  activeBucket,
  query,
}: {
  locale: Locale;
  projects: RadarProject[];
  activeBucket?: RadarBucket;
  query?: string;
}) {
  const dictionary = getDictionary(locale);

  return (
    <div className="grid gap-5">
      <Panel>
        <SectionHeader
          title={dictionary.radarTitle}
          description={dictionary.radarDescription}
        />
        <div className="grid gap-3 p-4">
          <form className="flex flex-col gap-3 sm:flex-row" action="/radar">
            <input type="hidden" name="lang" value={locale} />
            {activeBucket ? (
              <input type="hidden" name="bucket" value={activeBucket} />
            ) : null}
            <label className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted)]"
                aria-hidden
              />
              <span className="sr-only">{dictionary.search}</span>
              <input
                name="q"
                defaultValue={query}
                placeholder={dictionary.radarSearchPlaceholder}
                className="control-input h-10 w-full rounded-md border px-9 text-sm outline-none focus:border-[color:var(--accent)]"
              />
            </label>
            <button className="inline-flex h-10 items-center justify-center rounded-md border border-[color:var(--accent)] bg-[color:var(--accent)] px-4 text-sm font-medium text-[color:var(--accent-contrast)]">
              {dictionary.search}
            </button>
          </form>
          <nav
            className="flex flex-wrap gap-2"
            aria-label={dictionary.radarBuckets}
          >
            <Link
              href={`/radar?lang=${locale}`}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                !activeBucket
                  ? "border-[color:var(--accent)] bg-[color:var(--badge-cyan-bg)] text-[color:var(--foreground)]"
                  : "border-[color:var(--line)] text-[color:var(--muted)]"
              }`}
            >
              {dictionary.all}
            </Link>
            {buckets.map((bucket) => (
              <Link
                key={bucket}
                href={`/radar?lang=${locale}&bucket=${bucket}`}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  activeBucket === bucket
                    ? "border-[color:var(--accent)] bg-[color:var(--badge-cyan-bg)] text-[color:var(--foreground)]"
                    : "border-[color:var(--line)] text-[color:var(--muted)]"
                }`}
              >
                {bucketLabel(dictionary, bucket)}
              </Link>
            ))}
          </nav>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {projects.map((project) => (
          <article
            key={project.postId}
            className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.16)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {project.buckets.map((bucket) => (
                  <Badge key={bucket} tone="cyan">
                    {bucketLabel(dictionary, bucket)}
                  </Badge>
                ))}
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--line)] px-2 py-1 text-xs text-[color:var(--muted)]">
                <Sparkles className="size-3" aria-hidden />
                {project.score}
              </span>
            </div>
            <Link
              href={`/binnacle/${project.postId}?lang=${locale}`}
              className="mt-4 block text-lg font-semibold hover:text-[color:var(--accent)]"
            >
              {project.title}
            </Link>
            <a
              href={project.signal.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-2 text-sm text-[color:var(--accent)]"
            >
              <GitBranch className="size-4" aria-hidden />
              {project.signal.owner}/{project.signal.name}
            </a>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-[color:var(--muted)]">
              {project.signal.description || project.body}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Metric
                icon={Activity}
                label={dictionary.interests}
                value={project.interestCount}
              />
              <Metric
                icon={MessageSquare}
                label={dictionary.discussion}
                value={project.commentCount}
              />
              <Metric
                icon={Sparkles}
                label={dictionary.responses}
                value={project.responseCount}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[...project.signal.stack, ...project.signal.needs]
                .slice(0, 8)
                .map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[color:var(--line)] bg-[color:var(--surface-2)] px-2.5 py-1 text-xs text-[color:var(--muted)]"
                  >
                    {tag}
                  </span>
                ))}
            </div>
          </article>
        ))}
      </div>

      {projects.length === 0 ? (
        <Panel>
          <p className="p-6 text-sm text-[color:var(--muted)]">
            {dictionary.radarEmpty}
          </p>
        </Panel>
      ) : null}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)] p-3">
      <p className="flex items-center gap-1 text-xs text-[color:var(--muted)]">
        <Icon className="size-3" aria-hidden />
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
