import { eq, or } from "drizzle-orm";

import { db } from "@/db";
import { follows, profiles, users } from "@/db/schema";

export type PeopleDirectoryProfile = {
  id: string;
  handle: string;
  name: string;
  image: string | null;
  bio: string;
  location: string | null;
  workStatus: string;
  availability: string;
  stack: string[];
  interests: string[];
  followers: number;
  following: boolean;
  recommendationReasons: RecommendationReason[];
};

export type RecommendationReason =
  | { type: "shared_stack"; values: string[] }
  | { type: "shared_interest"; values: string[] }
  | { type: "open_collaboration"; values: [] };

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function matchesQuery(profile: PeopleDirectoryProfile, query?: string) {
  const normalized = normalize(query ?? "");

  if (!normalized) {
    return true;
  }

  return [
    profile.name,
    profile.handle,
    profile.bio,
    profile.location ?? "",
    profile.workStatus,
    profile.availability,
    ...profile.stack,
    ...profile.interests,
  ].some((value) => normalize(value).includes(normalized));
}

function buildReasons({
  profile,
  viewerProfile,
}: {
  profile: PeopleDirectoryProfile;
  viewerProfile: { stack: string[]; interests: string[] } | null;
}) {
  const reasons: RecommendationReason[] = [];
  const viewerStack = new Set(
    (viewerProfile?.stack ?? []).map((item) => normalize(item)),
  );
  const viewerInterests = new Set(
    (viewerProfile?.interests ?? []).map((item) => normalize(item)),
  );
  const sharedStack = profile.stack.filter((item) =>
    viewerStack.has(normalize(item)),
  );
  const sharedInterests = profile.interests.filter((item) =>
    viewerInterests.has(normalize(item)),
  );

  if (sharedStack[0]) {
    reasons.push({ type: "shared_stack", values: sharedStack.slice(0, 2) });
  }

  if (sharedInterests[0]) {
    reasons.push({
      type: "shared_interest",
      values: sharedInterests.slice(0, 2),
    });
  }

  if (profile.availability !== "none") {
    reasons.push({ type: "open_collaboration", values: [] });
  }

  return reasons.slice(0, 3);
}

export async function listPeopleDirectory({
  viewerId,
  query,
}: {
  viewerId: string;
  query?: string;
}): Promise<PeopleDirectoryProfile[]> {
  const [profileRows, followRows, viewerProfileRows] = await Promise.all([
    db
      .select({
        id: users.id,
        handle: profiles.handle,
        name: users.name,
        image: users.image,
        bio: profiles.bio,
        location: profiles.location,
        workStatus: profiles.workStatus,
        availability: profiles.availability,
        stack: profiles.stack,
        interests: profiles.interests,
      })
      .from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id)),
    db
      .select()
      .from(follows)
      .where(
        or(eq(follows.followerId, viewerId), eq(follows.followingId, viewerId)),
      ),
    db
      .select({
        stack: profiles.stack,
        interests: profiles.interests,
      })
      .from(profiles)
      .where(eq(profiles.userId, viewerId)),
  ]);

  const following = new Set(
    followRows
      .filter((follow) => follow.followerId === viewerId)
      .map((follow) => follow.followingId),
  );
  const followerCounts = new Map<string, number>();

  for (const follow of followRows) {
    followerCounts.set(
      follow.followingId,
      (followerCounts.get(follow.followingId) ?? 0) + 1,
    );
  }

  const viewerProfile = viewerProfileRows[0] ?? null;
  const people = profileRows
    .filter((profile) => profile.id !== viewerId)
    .map((profile) => {
      const directoryProfile: PeopleDirectoryProfile = {
        id: profile.id,
        handle: profile.handle,
        name: profile.name ?? profile.handle,
        image: profile.image,
        bio: profile.bio,
        location: profile.location,
        workStatus: profile.workStatus,
        availability: profile.availability,
        stack: profile.stack,
        interests: profile.interests,
        followers: followerCounts.get(profile.id) ?? 0,
        following: following.has(profile.id),
        recommendationReasons: [],
      };

      return {
        ...directoryProfile,
        recommendationReasons: buildReasons({
          profile: directoryProfile,
          viewerProfile,
        }),
      };
    })
    .filter((profile) => matchesQuery(profile, query));

  return people.toSorted((a, b) => {
    const aScore =
      a.recommendationReasons.length * 10 + a.followers + (a.following ? 5 : 0);
    const bScore =
      b.recommendationReasons.length * 10 + b.followers + (b.following ? 5 : 0);
    return bScore - aScore || a.name.localeCompare(b.name);
  });
}
