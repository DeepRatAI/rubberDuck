import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { CourseEditor } from "@/components/course-editor";
import type { Locale } from "@/lib/domain";
import type { PageSearchParams } from "@/lib/routing";
import { requireOnboardedUserId } from "@/server/current-user";
import {
  getCreatorCourseAnalytics,
  listCourseRevisions,
} from "@/server/repositories/courses";
import { listCourseMediaAssets } from "@/server/repositories/media";

export default async function NewCoursePage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const params = searchParams ? await searchParams : {};
  const locale: Locale = params.lang === "es" ? "es" : "en";
  const draftId = typeof params.draftId === "string" ? params.draftId : null;
  const viewerId = await requireOnboardedUserId({
    locale,
    next: draftId ? `/courses/new?draftId=${draftId}` : "/courses/new",
  });
  const [initialRevisions, initialMediaAssets, creatorAnalytics] =
    await Promise.all([
      draftId ? listCourseRevisions(draftId, viewerId) : Promise.resolve([]),
      listCourseMediaAssets(viewerId),
      getCreatorCourseAnalytics(viewerId),
    ]);

  if (draftId && initialRevisions.length === 0) {
    notFound();
  }

  return (
    <AppShell active="Courses" locale={locale}>
      <CourseEditor
        locale={locale}
        initialDraftId={draftId}
        initialSnapshot={initialRevisions[0]?.snapshot ?? null}
        initialRevisions={initialRevisions}
        initialMediaAssets={initialMediaAssets}
        creatorAnalytics={creatorAnalytics}
      />
    </AppShell>
  );
}
