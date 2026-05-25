import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Calendar,
  Eye,
  FilePenLine,
  GitBranch,
  Link as LinkIcon,
  Lock,
  MapPin,
  Shield,
  Users,
} from "lucide-react";

import type { FeedItem, Locale, Profile, Viewer } from "@/lib/domain";
import { getVisibleProfile } from "@/lib/domain";
import { formatDateTime, formatNumber } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import type { CourseDetail, CourseDraftSummary } from "@/lib/product-types";
import type {
  ProfileCourseCompletion,
  ProfileMetrics,
} from "@/server/repositories/profiles";
import type { SavedItem } from "@/server/repositories/saved";
import { formatCompact } from "@/lib/utils";
import { FollowButton } from "./follow-button";
import { ShareMenu } from "./share-menu";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Panel, SectionHeader } from "./ui/panel";

export function ProfileSurface({
  profile,
  viewer,
  createdCourses,
  draftCourses,
  completedCourses,
  ownPosts,
  projectSignals,
  buildLogs,
  savedItems,
  metrics,
  locale,
  canInteract = true,
  shareUrl,
}: {
  profile: Profile | null;
  viewer: Viewer;
  createdCourses: CourseDetail[];
  draftCourses: CourseDraftSummary[];
  completedCourses: ProfileCourseCompletion[];
  ownPosts: FeedItem[];
  projectSignals: FeedItem[];
  buildLogs: FeedItem[];
  savedItems: SavedItem[];
  metrics: ProfileMetrics;
  locale: Locale;
  canInteract?: boolean;
  shareUrl: string;
}) {
  const dictionary = getDictionary(locale);

  if (!profile) {
    notFound();
  }

  const visible = getVisibleProfile(profile, viewer);
  const owner = profile.id === viewer.id;
  const canSeeCompletedCourses =
    owner ||
    profile.visibility.completedCourses === "public" ||
    (profile.visibility.completedCourses === "followers" &&
      viewer.follows.includes(profile.id));
  const topSkills = [
    ...(profile.stack ?? []),
    ...(profile.interests ?? []),
    ...(profile.contentPreferences ?? []),
  ]
    .filter(Boolean)
    .slice(0, 8);

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <Panel className="overflow-hidden">
        <div className="relative h-48 overflow-hidden bg-slate-950 bg-[linear-gradient(to_right,rgba(14,165,233,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(14,165,233,0.18)_1px,transparent_1px)] bg-[size:24px_24px]">
          {profile.bannerUrl ? (
            <Image
              src={profile.bannerUrl}
              alt=""
              fill
              unoptimized
              sizes="(max-width: 1280px) 100vw, 860px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-emerald-300">
              Building in the open.
            </div>
          )}
        </div>
        <div className="px-5 pb-5">
          <div className="-mt-16 flex flex-wrap items-end justify-between gap-4">
            <div className="relative flex size-32 items-center justify-center overflow-hidden rounded-full border-4 border-[color:var(--surface)] bg-amber-300 text-4xl font-semibold text-[#17130f] shadow-[0_18px_50px_rgba(214,154,56,0.2)]">
              {profile.image ? (
                <Image
                  src={profile.image}
                  alt=""
                  fill
                  unoptimized
                  sizes="128px"
                  className="object-cover"
                />
              ) : (
                profile.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {owner ? (
                <Button asChild>
                  <Link href={`/settings/profile?lang=${locale}`}>
                    {dictionary.editProfile}
                  </Link>
                </Button>
              ) : canInteract ? (
                <FollowButton
                  profileUserId={profile.id}
                  initiallyFollowing={viewer.follows.includes(profile.id)}
                  followLabel={dictionary.follow}
                  followingLabel={dictionary.following}
                  errorLabel={dictionary.followFailed}
                />
              ) : (
                <Button asChild>
                  <Link
                    href={`/login?next=/u/${profile.handle}&lang=${locale}`}
                  >
                    {dictionary.signInToFollow}
                  </Link>
                </Button>
              )}
              <ShareMenu
                locale={locale}
                url={shareUrl}
                title={`${profile.name} on RubberDuck`}
                description={profile.bio}
                tags={profile.badges}
                compact
              />
            </div>
          </div>
          <div className="mt-4">
            <h1 className="text-2xl font-semibold">{visible.name}</h1>
            <p className="text-sm text-[color:var(--muted)]">
              @{visible.handle}
            </p>
            <p className="mt-3 max-w-2xl leading-7 text-[color:var(--muted)]">
              {visible.bio}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-[color:var(--muted)]">
              {visible.location ? (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" aria-hidden />
                  {visible.location}
                </span>
              ) : null}
              <span className="flex items-center gap-1.5">
                <Calendar className="size-4" aria-hidden />
                {dictionary.joinedMay}
              </span>
              {visible.links.map((link) => (
                <a
                  key={link}
                  href={link}
                  className="flex items-center gap-1.5 text-[color:var(--accent)]"
                  target="_blank"
                  rel="noreferrer"
                >
                  <LinkIcon className="size-4" aria-hidden />
                  {new URL(link).hostname}
                </a>
              ))}
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-5">
            {[
              [
                dictionary.reputation,
                visible.thanks !== undefined
                  ? formatCompact(metrics.reputation ?? visible.thanks ?? 0)
                  : dictionary.privateValue,
              ],
              [
                dictionary.followers,
                visible.followers !== undefined
                  ? formatCompact(metrics.followers ?? visible.followers ?? 0)
                  : dictionary.privateValue,
              ],
              [dictionary.contributions, formatCompact(metrics.contributions)],
              [
                dictionary.helpfulAnswers,
                formatCompact(metrics.helpfulAnswers),
              ],
              [dictionary.mentions, formatCompact(metrics.mentions)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)] p-3"
              >
                <p className="text-xs text-[color:var(--muted)]">{label}</p>
                <p className="mt-1 text-xl font-semibold text-[color:var(--foreground)]">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <h2 className="text-sm font-semibold">{dictionary.topSkills}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(topSkills.length ? topSkills : profile.badges).map((skill) => (
                <Badge key={skill} tone="slate">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
          <div className="mt-6 rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-2)]">
            <div
              className="flex gap-1 overflow-x-auto border-b border-[color:var(--line)] p-2"
              role="tablist"
              aria-label={dictionary.profileTabs}
            >
              {[
                ["#activity", dictionary.activity],
                ["#projects", dictionary.projectSignals],
                ["#build-logs", dictionary.buildLogs],
                ["#completed-courses", dictionary.completedCourses],
                ...(owner ? [["#saved-items", dictionary.saved] as const] : []),
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-[color:var(--muted)] hover:bg-[color:var(--surface)] hover:text-[color:var(--foreground)]"
                  role="tab"
                >
                  {label}
                </a>
              ))}
            </div>
            <div className="grid gap-6 p-4">
              <ProfileFeedSection
                id="activity"
                title={dictionary.ownPosts}
                empty={dictionary.profilePostsEmpty}
                items={ownPosts}
                locale={locale}
              />
              <ProfileFeedSection
                id="projects"
                title={dictionary.projectSignals}
                empty={dictionary.profileProjectSignalsEmpty}
                items={projectSignals}
                locale={locale}
              />
              <ProfileFeedSection
                id="build-logs"
                title={dictionary.buildLogs}
                empty={dictionary.profileBuildLogsEmpty}
                items={buildLogs}
                locale={locale}
              />
              <section id="completed-courses" className="scroll-mt-24">
                <h3 className="text-sm font-semibold">
                  {dictionary.completedCourses}
                </h3>
                {canSeeCompletedCourses ? (
                  <div className="mt-3 grid gap-2">
                    {completedCourses.map((course) => (
                      <Link
                        key={course.id}
                        href={`/courses/${course.slug}?lang=${locale}`}
                        className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] p-3 hover:border-[color:var(--accent)]"
                      >
                        <p className="text-sm font-medium">{course.title}</p>
                        <p className="mt-1 text-xs text-[color:var(--muted)]">
                          {dictionary.byAuthor} {course.creatorName} ·{" "}
                          {formatDateTime(course.completedAt, locale)}
                        </p>
                      </Link>
                    ))}
                    {completedCourses.length === 0 ? (
                      <p className="text-sm text-[color:var(--muted)]">
                        {dictionary.completedCoursesEmpty}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[color:var(--muted)]">
                    {dictionary.privateValue}
                  </p>
                )}
              </section>
              {owner ? (
                <section id="saved-items" className="scroll-mt-24">
                  <h3 className="text-sm font-semibold">{dictionary.saved}</h3>
                  <div className="mt-3 grid gap-2">
                    {savedItems.map((item) => (
                      <Link
                        key={item.id}
                        href={`${item.href}?lang=${locale}`}
                        className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] p-3 hover:border-[color:var(--accent)]"
                      >
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-[color:var(--muted)]">
                          {item.description}
                        </p>
                      </Link>
                    ))}
                    {savedItems.length === 0 ? (
                      <p className="text-sm text-[color:var(--muted)]">
                        {dictionary.savedEmpty}
                      </p>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </div>
      </Panel>

      <aside className="space-y-5">
        <Panel>
          <SectionHeader
            title={dictionary.privacy}
            description={dictionary.granularVisibility}
          />
          <div className="divide-y divide-[color:var(--line)]">
            {[
              [dictionary.profileVisibility, dictionary.visibleToEveryone, Eye],
              [
                dictionary.activityVisibility,
                dictionary.visibleToEveryone,
                GitBranch,
              ],
              [
                dictionary.emailVisibility,
                profile.visibility.email === "private"
                  ? dictionary.onlyYou
                  : profile.visibility.email,
                Lock,
              ],
              [dictionary.followersList, profile.visibility.followers, Users],
            ].map(([label, value, Icon]) => {
              const TypedIcon = Icon as typeof Eye;
              return (
                <div
                  key={String(label)}
                  className="flex items-center gap-3 p-4"
                >
                  <TypedIcon
                    className="size-4 text-[color:var(--muted)]"
                    aria-hidden
                  />
                  <div>
                    <p className="text-sm font-medium">{String(label)}</p>
                    <p className="text-xs text-[color:var(--muted)]">
                      {String(value)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel>
          <SectionHeader title={dictionary.createdCourses} />
          <div className="space-y-3 p-4">
            {createdCourses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.slug}?lang=${locale}`}
                className="block rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)] p-3 hover:border-[color:var(--accent)]"
              >
                <p className="text-sm font-medium">{course.title}</p>
                <p className="mt-1 text-xs text-[color:var(--muted)]">
                  {formatNumber(course.completionCount, locale)}{" "}
                  {dictionary.completed}
                </p>
              </Link>
            ))}
          </div>
        </Panel>
        {owner ? (
          <Panel>
            <SectionHeader
              title={dictionary.privateDrafts}
              description={dictionary.privateDraftsDescription}
            />
            <div className="space-y-3 p-4">
              {draftCourses.length > 0 ? (
                draftCourses.map((draft) => (
                  <Link
                    key={draft.id}
                    href={`/courses/new?draftId=${draft.id}&lang=${locale}`}
                    className="block rounded-md border border-amber-300/35 bg-amber-400/10 p-3 hover:border-amber-300/70"
                  >
                    <div className="flex items-start gap-3">
                      <FilePenLine
                        className="mt-0.5 size-4 shrink-0 text-amber-200"
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[color:var(--foreground)]">
                          {draft.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[color:var(--muted)]">
                          {draft.description}
                        </p>
                        <p className="mt-2 text-xs text-amber-100">
                          {draft.sectionsCount} sections /{" "}
                          {draft.exercisesCount} checks / {draft.revisionCount}{" "}
                          versions
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm leading-6 text-[color:var(--muted)]">
                  {dictionary.draftsEmpty}
                </p>
              )}
            </div>
          </Panel>
        ) : null}
        <Panel className="p-4">
          <div className="flex items-center gap-3 text-sm text-[color:var(--muted)]">
            <Shield className="size-4 text-emerald-200" aria-hidden />
            {dictionary.noPublicRejection}
          </div>
        </Panel>
      </aside>
    </div>
  );
}

function ProfileFeedSection({
  id,
  title,
  empty,
  items,
  locale,
}: {
  id: string;
  title: string;
  empty: string;
  items: FeedItem[];
  locale: Locale;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 grid gap-2">
        {items.slice(0, 6).map((item) => (
          <Link
            key={item.id}
            href={`/binnacle/${item.id}?lang=${locale}`}
            className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] p-3 hover:border-[color:var(--accent)]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                tone={item.contentType === "project_signal" ? "green" : "blue"}
              >
                {item.category}
              </Badge>
              {item.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-xs text-[color:var(--accent)]">
                  #{tag}
                </span>
              ))}
            </div>
            <p className="mt-2 text-sm font-medium">{item.title}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[color:var(--muted)]">
              {item.body}
            </p>
          </Link>
        ))}
        {items.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">{empty}</p>
        ) : null}
      </div>
    </section>
  );
}
