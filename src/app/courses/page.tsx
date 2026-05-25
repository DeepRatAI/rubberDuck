import { AppShell } from "@/components/app-shell";
import { CoursesIndex } from "@/components/courses";
import { localeFromSearchParams, type PageSearchParams } from "@/lib/routing";
import { requireOnboardedUserId } from "@/server/current-user";
import { listCoursesForDiscovery } from "@/server/repositories/courses";
import { getViewer } from "@/server/repositories/feed";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const locale = await localeFromSearchParams(searchParams);
  const viewerId = await requireOnboardedUserId({ locale, next: "/courses" });
  const [courses, viewer] = await Promise.all([
    listCoursesForDiscovery(viewerId),
    getViewer(viewerId),
  ]);

  return (
    <AppShell active="Courses" locale={locale}>
      <CoursesIndex locale={locale} initialCourses={courses} viewer={viewer} />
    </AppShell>
  );
}
