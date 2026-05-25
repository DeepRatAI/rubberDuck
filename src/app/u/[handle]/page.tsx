import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/brand";
import { ProfileSurface } from "@/components/profile";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { getDictionary } from "@/lib/i18n";
import { localAuthFallbackEnabled } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { env } from "@/lib/env";
import { localeFromSearchParams, type PageSearchParams } from "@/lib/routing";
import { createCanonicalUrl, normalizeShareDescription } from "@/lib/share";
import {
  DEVIT_DEV_USER_ID,
  getOptionalCurrentUserId,
} from "@/server/current-user";
import {
  listCoursesForDiscovery,
  listDraftsForCreator,
} from "@/server/repositories/courses";
import { getViewer } from "@/server/repositories/feed";
import { listSavedItems } from "@/server/repositories/saved";
import {
  getProfileByHandle,
  getProfileMetrics,
  listCompletedCoursesForProfile,
  listProfilePosts,
} from "@/server/repositories/profiles";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);
  const url = createCanonicalUrl(`/u/${handle}`, env.APP_URL);

  if (!profile) {
    return {
      title: `${brand.productName} Identity Hub`,
      description: brand.description,
      alternates: { canonical: url },
    };
  }

  const description = normalizeShareDescription(profile.bio);
  const image = profile.image ?? brand.fullLogoPath;

  return {
    title: `${profile.name} (@${profile.handle}) | ${brand.productName}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      siteName: brand.productName,
      title: `${profile.name} on ${brand.productName}`,
      description,
      url,
      images: [{ url: image, alt: profile.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${profile.name} on ${brand.productName}`,
      description,
      images: [image],
    },
  };
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams?: PageSearchParams;
}) {
  const [{ handle }, locale] = await Promise.all([
    params,
    localeFromSearchParams(searchParams),
  ]);
  const sessionViewerId = await getOptionalCurrentUserId();
  const viewerId =
    sessionViewerId ?? (localAuthFallbackEnabled ? DEVIT_DEV_USER_ID : null);
  const viewerModel = viewerId
    ? await getViewer(viewerId)
    : { id: "anonymous", follows: [], interests: [] };
  const dictionary = getDictionary(locale);
  const [profile, courses] = await Promise.all([
    getProfileByHandle(handle),
    listCoursesForDiscovery(viewerId),
  ]);
  const createdCourses = courses.filter(
    (course) => course.creatorId === profile?.id,
  );
  const [
    metrics,
    ownPosts,
    projectSignals,
    buildLogs,
    completedCourses,
    draftCourses,
    savedItems,
  ] =
    profile && viewerId
      ? await Promise.all([
          getProfileMetrics(profile),
          listProfilePosts(profile.id),
          listProfilePosts(profile.id, "project_signal"),
          listProfilePosts(profile.id, "build_log"),
          listCompletedCoursesForProfile(profile.id),
          profile.id === viewerId ? listDraftsForCreator(viewerId) : [],
          profile.id === viewerId ? listSavedItems(viewerId) : [],
        ])
      : [
          {
            reputation: 0,
            followers: 0,
            contributions: 0,
            helpfulAnswers: 0,
            mentions: 0,
          },
          [],
          [],
          [],
          [],
          [],
          [],
        ];

  return (
    <main className="min-h-dvh px-4 py-5 text-[color:var(--foreground)] sm:px-6">
      <header className="mx-auto mb-5 flex max-w-[1200px] items-center justify-between">
        <Link href={`/app?lang=${locale}`}>
          <BrandMark />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle locale={locale} />
          {viewerId ? null : (
            <Link
              href={`/login?next=/u/${handle}&lang=${locale}`}
              className="rounded-md border border-[color:var(--line)] px-3 py-2 text-sm text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
            >
              {dictionary.signIn}
            </Link>
          )}
        </div>
      </header>
      <div className="mx-auto max-w-[1200px]">
        <ProfileSurface
          profile={profile}
          viewer={viewerModel}
          createdCourses={createdCourses}
          draftCourses={draftCourses}
          completedCourses={completedCourses}
          ownPosts={ownPosts}
          projectSignals={projectSignals}
          buildLogs={buildLogs}
          savedItems={savedItems}
          metrics={metrics}
          locale={locale}
          canInteract={Boolean(viewerId)}
          shareUrl={createCanonicalUrl(
            `/u/${profile?.handle ?? handle}`,
            env.APP_URL,
          )}
        />
      </div>
    </main>
  );
}
