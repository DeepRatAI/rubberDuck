import { notFound } from "next/navigation";
import Image from "next/image";
import {
  BarChart3,
  ExternalLink,
  FileCode2,
  ImageIcon,
  LineChart,
  PlaySquare,
  Table2,
} from "lucide-react";

import type { CourseProgress, Locale } from "@/lib/domain";
import { completeCourseIfEligible } from "@/lib/domain";
import { classifyCourseEmbed, type CourseEmbed } from "@/lib/course-embeds";
import { getDictionary } from "@/lib/i18n";
import type { CourseDetail } from "@/lib/product-types";
import type { CourseMediaAsset } from "@/lib/course-media";
import type { CourseVisualization } from "@/lib/course-visualizations";
import { Badge } from "./ui/badge";
import { Panel } from "./ui/panel";
import { CourseProgressTelemetry } from "./course-progress-telemetry";
import { CourseRunner } from "./course-runner";
import { CourseActions } from "./courses";
import { ShareMenu } from "./share-menu";
import { Button } from "./ui/button";

function CourseEmbedCard({
  embed,
  mediaAsset,
}: {
  embed: CourseEmbed;
  mediaAsset?: CourseMediaAsset;
}) {
  if (embed.type === "image") {
    return (
      <figure className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <a
          className="group block"
          href={embed.url}
          target="_blank"
          rel="noreferrer"
        >
          <Image
            className="aspect-video w-full bg-slate-100 object-cover"
            src={embed.url}
            alt={mediaAsset?.altText ?? embed.label}
            width={1200}
            height={675}
            unoptimized
          />
          <span className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 group-hover:text-blue-700">
            <ImageIcon className="size-4" aria-hidden />
            {mediaAsset?.originalFileName ?? embed.label}
          </span>
        </a>
        {mediaAsset?.caption ? (
          <figcaption className="border-t border-slate-100 px-3 py-2 text-sm leading-6 text-slate-600">
            {mediaAsset.caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  if (embed.type === "video") {
    if (embed.source === "file" || !embed.embedUrl) {
      return (
        <figure className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <video
            className="aspect-video w-full bg-slate-950"
            src={embed.url}
            aria-label={mediaAsset?.altText ?? embed.label}
            controls
            preload="metadata"
          />
          <a
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700"
            href={embed.url}
            target="_blank"
            rel="noreferrer"
          >
            <PlaySquare className="size-4" aria-hidden />
            Open {embed.label}
          </a>
          {mediaAsset?.caption ? (
            <figcaption className="border-t border-slate-100 px-3 py-2 text-sm leading-6 text-slate-600">
              {mediaAsset.caption}
            </figcaption>
          ) : null}
        </figure>
      );
    }

    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <iframe
          className="aspect-video w-full"
          src={embed.embedUrl}
          title={`Embedded video from ${embed.label}`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        <a
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700"
          href={embed.url}
          target="_blank"
          rel="noreferrer"
        >
          <PlaySquare className="size-4" aria-hidden />
          Open {embed.label}
        </a>
      </div>
    );
  }

  const Icon = embed.type === "notebook" ? FileCode2 : ExternalLink;

  return (
    <a
      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-blue-700 hover:border-blue-200 hover:bg-blue-50"
      href={embed.url}
      target="_blank"
      rel="noreferrer"
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="truncate">
          {embed.type === "notebook" ? "Notebook" : embed.label}
        </span>
      </span>
      <ExternalLink className="size-4 shrink-0" aria-hidden />
    </a>
  );
}

function formatChartValue(value: number) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
  }).format(value);
}

function CourseVisualizationBlock({
  visualization,
}: {
  visualization: CourseVisualization;
}) {
  const maxValue = Math.max(
    ...visualization.data.map((datum) => datum.value),
    1,
  );

  if (visualization.type === "table") {
    return (
      <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-slate-950">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-md bg-cyan-700 p-1.5 text-white">
            <Table2 className="size-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-950">
              {visualization.title}
            </h3>
            {visualization.yLabel ? (
              <p className="mt-1 text-xs text-slate-700">
                {visualization.yLabel}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-md border border-cyan-100 bg-white">
          <table
            className="w-full text-left text-sm"
            aria-label={`${visualization.title} data table`}
          >
            <thead className="bg-cyan-50 text-xs uppercase text-cyan-900">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Label
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-100">
              {visualization.data.map((datum) => (
                <tr key={`${visualization.id}-${datum.label}`}>
                  <th
                    scope="row"
                    className="px-3 py-2 font-medium text-slate-700"
                  >
                    {datum.label}
                  </th>
                  <td className="px-3 py-2 text-right font-mono text-xs text-slate-800">
                    {formatChartValue(datum.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (visualization.type === "line") {
    const minValue = Math.min(
      ...visualization.data.map((datum) => datum.value),
      0,
    );
    const range = Math.max(maxValue - minValue, 1);
    const points = visualization.data.map((datum, index) => {
      const x =
        visualization.data.length === 1
          ? 160
          : 16 + (index / (visualization.data.length - 1)) * 288;
      const y = 124 - ((datum.value - minValue) / range) * 108;
      return { ...datum, x, y };
    });

    return (
      <div
        className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-slate-950"
        role="img"
        aria-label={`${visualization.title} line chart`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-md bg-blue-700 p-1.5 text-white">
            <LineChart className="size-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-950">
              {visualization.title}
            </h3>
            {visualization.yLabel ? (
              <p className="mt-1 text-xs text-slate-700">
                {visualization.yLabel}
              </p>
            ) : null}
          </div>
        </div>
        <svg className="mt-4 h-44 w-full" viewBox="0 0 320 150">
          <line x1="16" x2="304" y1="124" y2="124" stroke="rgb(191 219 254)" />
          <polyline
            fill="none"
            stroke="rgb(29 78 216)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            points={points.map((point) => `${point.x},${point.y}`).join(" ")}
          />
          {points.map((point) => (
            <g key={`${visualization.id}-${point.label}`}>
              <circle cx={point.x} cy={point.y} r="4" fill="rgb(29 78 216)">
                <title>
                  {point.label}: {formatChartValue(point.value)}
                </title>
              </circle>
              <text
                x={point.x}
                y="142"
                textAnchor="middle"
                className="fill-slate-800 text-[9px]"
              >
                {point.label.slice(0, 10)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-slate-950"
      role="img"
      aria-label={`${visualization.title} bar chart`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-md bg-emerald-600 p-1.5 text-white">
          <BarChart3 className="size-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-950">
            {visualization.title}
          </h3>
          {visualization.yLabel ? (
            <p className="mt-1 text-xs text-slate-700">
              {visualization.yLabel}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {visualization.data.map((datum) => {
          const width = `${Math.max(4, (datum.value / maxValue) * 100)}%`;

          return (
            <div
              key={`${visualization.id}-${datum.label}`}
              className="grid items-center gap-3 text-sm sm:grid-cols-[150px_1fr_72px]"
            >
              <span className="min-w-0 truncate text-slate-950">
                {datum.label}
              </span>
              <div className="h-3 rounded-full bg-white ring-1 ring-emerald-100">
                <div
                  className="h-3 rounded-full bg-emerald-600"
                  style={{ width }}
                />
              </div>
              <span className="font-mono text-xs text-slate-900 sm:text-right">
                {formatChartValue(datum.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CourseReader({
  course,
  progress,
  locale,
  shareUrl,
  canInteract = true,
  signInUrl,
}: {
  course: CourseDetail | null;
  progress: CourseProgress | null;
  locale: Locale;
  shareUrl: string;
  canInteract?: boolean;
  signInUrl?: string;
}) {
  const dictionary = getDictionary(locale);

  if (!course) {
    notFound();
  }

  const completion = progress
    ? completeCourseIfEligible(course, progress)
    : { completed: false };
  const viewedSectionIds = new Set(progress?.viewedSectionIds ?? []);
  const passedExerciseIds = new Set(progress?.passedExerciseIds ?? []);
  const totalProgressUnits = course.sections.length + course.exercises.length;
  const completedProgressUnits =
    course.sections.filter((section) => viewedSectionIds.has(section.id))
      .length +
    course.exercises.filter((exercise) => passedExerciseIds.has(exercise.id))
      .length;
  const progressPercent = totalProgressUnits
    ? Math.round((completedProgressUnits / totalProgressUnits) * 100)
    : 0;
  const exercisesBySection = new Map(
    course.sections.map((section) => [
      section.id,
      course.exercises.filter((exercise) => exercise.sectionId === section.id),
    ]),
  );
  const mediaAssetsByUrl = new Map(
    (course.mediaAssets ?? []).map((asset) => [asset.url, asset]),
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
      <CourseProgressTelemetry
        courseId={course.id}
        initialViewedSectionIds={progress?.viewedSectionIds ?? []}
      />
      <aside className="lg:sticky lg:top-20 lg:h-[calc(100dvh-6rem)]">
        <Panel className="p-4">
          <h2 className="text-sm font-semibold">{course.title}</h2>
          <div className="mt-3 h-2 rounded-full bg-black/30">
            <div
              className="h-2 rounded-full bg-[color:var(--accent)] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[color:var(--muted)]">
            {progressPercent}% complete
          </p>
          <nav className="mt-5 space-y-1">
            {course.sections.map((section, index) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block rounded-md px-2 py-2 text-sm text-[color:var(--muted)] hover:bg-white/5 hover:text-[color:var(--foreground)]"
              >
                {index + 1}. {section.title}
              </a>
            ))}
          </nav>
        </Panel>
      </aside>
      <article className="min-w-0">
        <Panel>
          <div className="border-b border-[color:var(--line)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {course.tags.map((tag) => (
                    <Badge key={tag} tone="blue">
                      #{tag}
                    </Badge>
                  ))}
                </div>
                <h1 className="text-2xl font-semibold">{course.title}</h1>
                {course.status === "draft" ? (
                  <Badge tone="amber">Private draft</Badge>
                ) : null}
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
                  {course.description}
                </p>
                {course.ipynbMetadata ? (
                  <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
                    <p className="font-medium">
                      Notebook attached: {course.ipynbMetadata.fileName}
                    </p>
                    <p className="mt-1 text-blue-800">
                      {course.ipynbMetadata.cellCount} cells /{" "}
                      {course.ipynbMetadata.language}
                    </p>
                    {course.ipynbMetadata.colabUrl ? (
                      <a
                        className="mt-2 inline-flex font-medium text-blue-700"
                        href={course.ipynbMetadata.colabUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {dictionary.openInColab}
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {course.status === "published" && canInteract ? (
                <CourseActions
                  locale={locale}
                  courseId={course.id}
                  courseSlug={course.slug}
                  saved={course.saved}
                  thanksCount={course.thanksCount}
                  shareUrl={shareUrl}
                  shareTitle={course.title}
                  shareDescription={course.description}
                  shareTags={course.tags}
                />
              ) : course.status === "published" ? (
                <div className="flex flex-wrap items-center gap-2">
                  {signInUrl ? (
                    <Button asChild variant="secondary">
                      <a href={signInUrl}>{dictionary.signIn}</a>
                    </Button>
                  ) : null}
                  <ShareMenu
                    locale={locale}
                    url={shareUrl}
                    title={course.title}
                    description={course.description}
                    tags={course.tags}
                    compact
                  />
                </div>
              ) : null}
            </div>
          </div>
          <div className="space-y-10 p-5">
            {course.sections.map((section) => (
              <section
                id={section.id}
                key={section.id}
                data-course-section-id={section.id}
                className="scroll-mt-24"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">{section.title}</h2>
                  <ShareMenu
                    locale={locale}
                    url={`${shareUrl}#${section.id}`}
                    title={`${course.title} · ${section.title}`}
                    description={section.body}
                    tags={course.tags}
                    compact
                  />
                </div>
                <p className="mt-3 max-w-3xl leading-7 text-[color:var(--muted)]">
                  {section.body}
                </p>
                {section.code ? (
                  <pre
                    className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 p-4 text-sm leading-6 text-slate-100"
                    tabIndex={0}
                  >
                    <code>{section.code}</code>
                  </pre>
                ) : null}
                {section.embeds.length > 0 ? (
                  <div className="mt-4 grid gap-2">
                    {section.embeds
                      .map(classifyCourseEmbed)
                      .filter((embed): embed is CourseEmbed => Boolean(embed))
                      .map((embed) => (
                        <CourseEmbedCard
                          key={embed.url}
                          embed={embed}
                          mediaAsset={mediaAssetsByUrl.get(embed.url)}
                        />
                      ))}
                  </div>
                ) : null}
                {section.visualizations.length > 0 ? (
                  <div className="mt-4 grid gap-3">
                    {section.visualizations.map((visualization) => (
                      <CourseVisualizationBlock
                        key={visualization.id}
                        visualization={visualization}
                      />
                    ))}
                  </div>
                ) : null}
                {(exercisesBySection.get(section.id) ?? []).length > 0 ? (
                  <div className="mt-5 space-y-4">
                    {(exercisesBySection.get(section.id) ?? []).map(
                      (exercise) => (
                        <CourseRunner
                          key={exercise.id}
                          courseId={course.id}
                          exercise={exercise}
                          locale={locale}
                        />
                      ),
                    )}
                  </div>
                ) : null}
              </section>
            ))}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              {completion.completed
                ? dictionary.courseComplete
                : dictionary.completionRequires}
            </div>
          </div>
        </Panel>
      </article>
    </div>
  );
}
