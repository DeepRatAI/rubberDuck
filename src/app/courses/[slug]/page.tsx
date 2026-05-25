import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { CourseReader } from "@/components/course-reader";
import { localAuthFallbackEnabled } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { env } from "@/lib/env";
import { localeFromSearchParams, type PageSearchParams } from "@/lib/routing";
import { createCanonicalUrl, normalizeShareDescription } from "@/lib/share";
import {
  DEVIT_DEV_USER_ID,
  getOptionalCurrentUserId,
  isUserOnboarded,
} from "@/server/current-user";
import {
  getCourseBySlug,
  getCourseProgress,
} from "@/server/repositories/courses";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug, null);
  const url = createCanonicalUrl(`/courses/${slug}`, env.APP_URL);

  if (!course) {
    return {
      title: `${brand.productName} Courses`,
      description: brand.description,
      alternates: { canonical: url },
    };
  }

  const description = normalizeShareDescription(course.description);

  return {
    title: `${course.title} | ${brand.productName}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      siteName: brand.productName,
      title: course.title,
      description,
      url,
      images: [{ url: brand.fullLogoPath, alt: course.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: course.title,
      description,
      images: [brand.fullLogoPath],
    },
  };
}

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: PageSearchParams;
}) {
  const [{ slug }, locale] = await Promise.all([
    params,
    localeFromSearchParams(searchParams),
  ]);
  const sessionViewerId = await getOptionalCurrentUserId();
  const viewerId =
    sessionViewerId && (await isUserOnboarded(sessionViewerId))
      ? sessionViewerId
      : localAuthFallbackEnabled
        ? DEVIT_DEV_USER_ID
        : null;
  const course = await getCourseBySlug(slug, viewerId);
  const progress =
    course && viewerId ? await getCourseProgress(course.id, viewerId) : null;
  const shareUrl = createCanonicalUrl(`/courses/${slug}`, env.APP_URL);

  return (
    <AppShell active="Courses" locale={locale}>
      <CourseReader
        course={course}
        progress={progress}
        locale={locale}
        shareUrl={shareUrl}
        canInteract={Boolean(viewerId)}
        signInUrl={`/login?next=/courses/${slug}&lang=${locale}`}
      />
    </AppShell>
  );
}
