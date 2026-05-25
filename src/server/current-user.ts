import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { profiles, users } from "@/db/schema";
import { authOptions, localAuthFallbackEnabled } from "@/lib/auth";
import { env } from "@/lib/env";

export const DEVIT_DEV_USER_ID = "00000000-0000-4000-8000-000000000001";

function handleFromEmail(email: string) {
  const base = email
    .split("@")[0]
    ?.toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);

  return base && base.length >= 3
    ? base
    : `dev-${crypto.randomUUID().slice(0, 8)}`;
}

function loginPath(locale = "en", next = "/app") {
  const params = new URLSearchParams({ lang: locale, next });
  return `/login?${params.toString()}`;
}

async function ensureUserForSession(session: Session | null) {
  const email = session?.user?.email?.toLowerCase();

  if (!email) {
    return null;
  }

  if (email === "mina@example.dev") {
    return "00000000-0000-4000-8000-000000000002";
  }

  if (email === "rahul@example.dev") {
    return "00000000-0000-4000-8000-000000000003";
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));

  if (existing) {
    const [profile] = await db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.userId, existing.id));

    if (!profile) {
      await db.insert(profiles).values({
        userId: existing.id,
        handle: handleFromEmail(email),
        bio: "",
        workStatus: "focused",
      });
    }

    return existing.id;
  }

  const [created] = await db
    .insert(users)
    .values({
      name: session?.user?.name ?? email.split("@")[0] ?? "RubberDuck user",
      email,
      image: session?.user?.image ?? null,
    })
    .returning({ id: users.id });

  if (!created) {
    throw new Error("Unable to create authenticated user.");
  }

  await db.insert(profiles).values({
    userId: created.id,
    handle: handleFromEmail(email),
    bio: "",
    workStatus: "focused",
  });

  return created.id;
}

async function assertAccountAllowed(userId: string) {
  const [user] = await db
    .select({
      banned: users.banned,
      banReason: users.banReason,
      banExpires: users.banExpires,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user?.banned) {
    return;
  }

  if (user.banExpires && user.banExpires.getTime() <= Date.now()) {
    await db
      .update(users)
      .set({ banned: false, banReason: null, banExpires: null })
      .where(eq(users.id, userId));
    return;
  }

  throw new Error(user.banReason ?? "This account is currently restricted.");
}

export async function getOptionalCurrentUserId() {
  const session = await getServerSession(authOptions);
  return ensureUserForSession(session);
}

export async function getCurrentUserId() {
  const userId = await getOptionalCurrentUserId();

  if (userId) {
    await assertAccountAllowed(userId);
    return userId;
  }

  if (!localAuthFallbackEnabled) {
    throw new Error("Authentication required.");
  }

  return DEVIT_DEV_USER_ID;
}

export async function requireCurrentUserId({
  locale = "en",
  next = "/app",
}: {
  locale?: string;
  next?: string;
} = {}) {
  const userId = await getOptionalCurrentUserId();

  if (userId) {
    await assertAccountAllowed(userId);
    return userId;
  }

  if (localAuthFallbackEnabled) {
    return DEVIT_DEV_USER_ID;
  }

  redirect(loginPath(locale, next));
}

export async function isUserOnboarded(userId: string) {
  const [profile] = await db
    .select({ onboardedAt: profiles.onboardedAt })
    .from(profiles)
    .where(eq(profiles.userId, userId));

  return Boolean(profile?.onboardedAt);
}

export async function isCurrentUserOnboarded() {
  const userId = await getCurrentUserId();
  return isUserOnboarded(userId);
}

export async function requireOnboardedUserId({
  locale = "en",
  next = "/app",
}: {
  locale?: string;
  next?: string;
} = {}) {
  const userId = await requireCurrentUserId({ locale, next });
  const onboarded = await isUserOnboarded(userId);

  if (!onboarded) {
    const params = new URLSearchParams({ lang: locale, next });
    redirect(`/onboarding?${params.toString()}`);
  }

  return userId;
}

export async function requireAdminUserId({
  locale = "en",
}: {
  locale?: string;
} = {}) {
  const userId = await requireOnboardedUserId({
    locale,
    next: "/admin/reports",
  });
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId));
  const email = user?.email?.toLowerCase() ?? "";
  const configuredAdmin = env.ADMIN_EMAILS.includes(email);
  const localDevAdmin =
    localAuthFallbackEnabled && userId === DEVIT_DEV_USER_ID;

  if (!configuredAdmin && !localDevAdmin) {
    redirect(`/app?lang=${locale}`);
  }

  return userId;
}

export async function getCurrentUserSummary() {
  const userId = await getCurrentUserId();
  const [row] = await db
    .select({
      name: users.name,
      handle: profiles.handle,
      image: users.image,
    })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.id, userId));

  return {
    id: userId,
    name: row?.name ?? "RubberDuck user",
    handle: row?.handle ?? "rubberduck",
    image: row?.image ?? null,
  };
}
