"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle2, Download, Heart, Search } from "lucide-react";

import { saveCourse, thankCourse } from "@/app/actions";
import type { Locale, Viewer } from "@/lib/domain";
import { searchCourses } from "@/lib/domain";
import { formatNumber } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import type { CourseDetail } from "@/lib/product-types";
import { rankCourses, type CourseRankingMode } from "@/lib/ranking";
import { ShareMenu } from "./share-menu";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Panel, SectionHeader } from "./ui/panel";

export function CoursesIndex({
  locale,
  initialCourses,
  viewer,
}: {
  locale: Locale;
  initialCourses: CourseDetail[];
  viewer: Viewer;
}) {
  const dictionary = getDictionary(locale);
  const [query, setQuery] = useState("");
  const [rankingMode, setRankingMode] =
    useState<CourseRankingMode>("recommended");
  const courses = useMemo(
    () =>
      rankCourses(searchCourses(initialCourses, query), viewer, {
        mode: rankingMode,
      }),
    [initialCourses, query, rankingMode, viewer],
  );

  return (
    <div className="space-y-5">
      <Panel>
        <SectionHeader
          title={dictionary.courses}
          description={dictionary.courseIndexDescription}
          action={
            <Button asChild variant="primary">
              <Link href={`/courses/new?lang=${locale}`}>
                {dictionary.createCourse}
              </Link>
            </Button>
          }
        />
        <div className="border-b border-[color:var(--line)] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="control-input flex min-w-[260px] flex-1 items-center gap-2 rounded-md border px-3">
              <Search
                className="size-4 text-[color:var(--input-muted)]"
                aria-hidden
              />
              <input
                className="h-10 w-full bg-transparent text-sm outline-none"
                placeholder={`${dictionary.search} RAG, #postgres, notebooks...`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div
              className="control-shell flex items-center gap-1 rounded-md p-1"
              aria-label="Course ranking mode"
            >
              {[
                ["recommended", dictionary.recommended],
                ["latest", dictionary.latest],
                ["popular", dictionary.popular],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={
                    rankingMode === value
                      ? "h-8 rounded-md bg-[color:var(--foreground)] px-2.5 text-xs font-medium text-[color:var(--background)]"
                      : "h-8 rounded-md px-2.5 text-xs font-medium text-[color:var(--input-fg)] transition hover:bg-[color:var(--control-hover)]"
                  }
                  onClick={() => setRankingMode(value as CourseRankingMode)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.slug}?lang=${locale}`}
              className="rounded-lg border border-[color:var(--line)] bg-[color:var(--input-bg)] p-4 text-[color:var(--input-fg)] transition hover:border-[color:var(--accent)] hover:shadow-[0_18px_60px_rgba(22,217,210,0.14)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-10 items-center justify-center rounded-md bg-[color:var(--foreground)] text-[color:var(--background)]">
                  <BookOpen className="size-5" aria-hidden />
                </div>
                <Badge
                  tone={course.difficulty === "advanced" ? "amber" : "green"}
                  className={
                    course.difficulty === "advanced"
                      ? "border-amber-700/30 bg-amber-200 text-amber-950"
                      : "border-emerald-800/30 bg-emerald-100 text-emerald-950"
                  }
                >
                  {course.difficulty}
                </Badge>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[color:var(--input-fg)]">
                {course.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[color:var(--input-muted)]">
                {course.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {course.tags.map((tag) => (
                  <Badge
                    key={tag}
                    tone="slate"
                    className="border-[color:var(--line)] bg-[color:var(--surface-2)] text-[color:var(--foreground)]"
                  >
                    <span className="sr-only">Tag </span>
                    #{tag}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-[color:var(--input-muted)]">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="size-4" aria-hidden />
                  {formatNumber(course.completionCount, locale)}{" "}
                  {dictionary.completed}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="size-4" aria-hidden />
                  {formatNumber(course.thanksCount, locale)}{" "}
                  {dictionary.thanks}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function CourseActions({
  locale,
  courseId,
  courseSlug,
  saved,
  thanksCount,
  shareUrl,
  shareTitle,
  shareDescription,
  shareTags = [],
}: {
  locale: Locale;
  courseId: string;
  courseSlug: string;
  saved: boolean;
  thanksCount: number;
  shareUrl: string;
  shareTitle: string;
  shareDescription?: string;
  shareTags?: string[];
}) {
  const dictionary = getDictionary(locale);
  const router = useRouter();
  const [optimisticSaved, setOptimisticSaved] = useState(saved);
  const [optimisticThanks, setOptimisticThanks] = useState(thanksCount);
  const [isPending, startTransition] = useTransition();

  function onThanks() {
    startTransition(() => {
      void thankCourse({ courseId }).then((result) => {
        if (result.created) {
          setOptimisticThanks((count) => count + 1);
        }
        router.refresh();
      });
    });
  }

  function onSave() {
    startTransition(() => {
      void saveCourse({ courseId }).then(() => {
        setOptimisticSaved(true);
        router.refresh();
      });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" onClick={onThanks} disabled={isPending}>
        <Heart className="size-4 text-rose-500" aria-hidden />
        {dictionary.thanks}
        <span className="text-[color:var(--muted)]">{optimisticThanks}</span>
      </Button>
      <Button onClick={onSave} disabled={isPending || optimisticSaved}>
        {optimisticSaved ? dictionary.savedState : dictionary.save}
      </Button>
      <Button asChild>
        <a href={`/api/courses/${courseSlug}/export`}>
          <Download className="size-4" aria-hidden />
          {dictionary.export}
        </a>
      </Button>
      <ShareMenu
        locale={locale}
        url={shareUrl}
        title={shareTitle}
        description={shareDescription}
        tags={shareTags}
        compact
      />
    </div>
  );
}
