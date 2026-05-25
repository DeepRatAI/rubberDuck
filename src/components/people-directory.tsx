import Image from "next/image";
import Link from "next/link";
import { MapPin, Search, Sparkles } from "lucide-react";

import type { Locale } from "@/lib/domain";
import { getDictionary } from "@/lib/i18n";
import type { PeopleDirectoryProfile } from "@/server/repositories/people";
import { FollowButton } from "./follow-button";
import { Panel, SectionHeader } from "./ui/panel";

function formatReason(
  dictionary: ReturnType<typeof getDictionary>,
  reason: PeopleDirectoryProfile["recommendationReasons"][number],
) {
  if (reason.type === "shared_stack") {
    return `${dictionary.sharedStack}: ${reason.values.join(", ")}`;
  }

  if (reason.type === "shared_interest") {
    return `${dictionary.sharedInterest}: ${reason.values.join(", ")}`;
  }

  return dictionary.openCollaborationSignals;
}

export function PeopleDirectory({
  locale,
  people,
  query,
}: {
  locale: Locale;
  people: PeopleDirectoryProfile[];
  query?: string;
}) {
  const dictionary = getDictionary(locale);

  return (
    <div className="grid gap-5">
      <Panel>
        <SectionHeader
          title={dictionary.peopleDirectoryTitle}
          description={dictionary.peopleDirectoryDescription}
        />
        <form className="flex flex-col gap-3 p-4 sm:flex-row" action="/people">
          <input type="hidden" name="lang" value={locale} />
          <label className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted)]"
              aria-hidden
            />
            <span className="sr-only">{dictionary.searchPeople}</span>
            <input
              name="q"
              defaultValue={query}
              placeholder={dictionary.searchPeople}
              className="control-input h-10 w-full rounded-md border px-9 text-sm outline-none focus:border-[color:var(--accent)]"
            />
          </label>
          <button className="inline-flex h-10 items-center justify-center rounded-md border border-[color:var(--accent)] bg-[color:var(--accent)] px-4 text-sm font-medium text-[color:var(--accent-contrast)]">
            {dictionary.search}
          </button>
        </form>
      </Panel>

      {people.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {people.map((profile) => (
            <article
              key={profile.id}
              className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.16)]"
            >
              <div className="flex items-start gap-3">
                <Link
                  href={`/u/${profile.handle}?lang=${locale}`}
                  className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[color:var(--line)] bg-[color:var(--surface-2)] text-sm font-semibold"
                >
                  {profile.image ? (
                    <Image
                      src={profile.image}
                      alt=""
                      fill
                      unoptimized
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    profile.name.slice(0, 2).toUpperCase()
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/u/${profile.handle}?lang=${locale}`}
                    className="font-semibold hover:text-[color:var(--accent)]"
                  >
                    {profile.name}
                  </Link>
                  <p className="truncate text-xs text-[color:var(--muted)]">
                    @{profile.handle}
                  </p>
                  {profile.location ? (
                    <p className="mt-2 flex items-center gap-1 text-xs text-[color:var(--muted)]">
                      <MapPin className="size-3" aria-hidden />
                      {profile.location}
                    </p>
                  ) : null}
                </div>
                <FollowButton
                  profileUserId={profile.id}
                  initiallyFollowing={profile.following}
                  followLabel={dictionary.follow}
                  followingLabel={dictionary.following}
                  errorLabel={dictionary.followFailed}
                />
              </div>

              <p className="mt-4 line-clamp-3 min-h-16 text-sm leading-6 text-[color:var(--muted)]">
                {profile.bio || dictionary.profileNoBio}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {[...profile.stack, ...profile.interests]
                  .slice(0, 6)
                  .map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[color:var(--line)] bg-[color:var(--surface-2)] px-2.5 py-1 text-xs text-[color:var(--muted)]"
                    >
                      {tag}
                    </span>
                  ))}
              </div>

              <div className="mt-4 border-t border-[color:var(--line)] pt-3">
                <p className="flex items-center gap-2 text-xs font-medium text-[color:var(--accent)]">
                  <Sparkles className="size-3.5" aria-hidden />
                  {dictionary.recommendationSignals}
                </p>
                {profile.recommendationReasons.length ? (
                  <ul className="mt-2 grid gap-1 text-xs text-[color:var(--muted)]">
                    {profile.recommendationReasons.map((reason) => (
                      <li key={`${reason.type}-${reason.values.join("-")}`}>
                        {formatReason(dictionary, reason)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-[color:var(--muted)]">
                    {dictionary.generalDiscovery}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Panel>
          <p className="p-6 text-sm text-[color:var(--muted)]">
            {dictionary.noPeopleResults}
          </p>
        </Panel>
      )}
    </div>
  );
}
