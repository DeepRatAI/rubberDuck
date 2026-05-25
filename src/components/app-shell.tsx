import Link from "next/link";
import Image from "next/image";
import {
  Bell,
  BookOpen,
  Bookmark,
  Boxes,
  FolderGit2,
  Home,
  Radar,
  Settings,
  UserRound,
} from "lucide-react";

import type { Locale } from "@/lib/domain";
import { getDictionary } from "@/lib/i18n";
import { getLegalPage, legalNav } from "@/lib/legal-content";
import { cn } from "@/lib/utils";
import { getCurrentUserId, getCurrentUserSummary } from "@/server/current-user";
import { listNotifications } from "@/server/repositories/notifications";
import { BrandMark } from "./brand";
import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme-toggle";

const nav = [
  { href: "/app", id: "Home", labelKey: "home", icon: Home },
  { href: "/binnacle", id: "Binnacle", labelKey: "binnacle", icon: FolderGit2 },
  { href: "/radar", id: "Radar", labelKey: "radar", icon: Radar },
  { href: "/courses", id: "Courses", labelKey: "courses", icon: BookOpen },
  { href: "/people", id: "People", labelKey: "people", icon: UserRound },
  {
    href: "/notifications",
    id: "Notifications",
    labelKey: "notifications",
    icon: Bell,
  },
  { href: "/saved", id: "Saved", labelKey: "saved", icon: Bookmark },
  {
    href: "/settings/profile",
    id: "Settings",
    labelKey: "settings",
    icon: Settings,
  },
] as const;

export async function AppShell({
  children,
  active,
  locale,
}: {
  children: React.ReactNode;
  active: string;
  locale: Locale;
}) {
  const dictionary = getDictionary(locale);
  const viewerId = await getCurrentUserId();
  const [notifications, currentUser] = await Promise.all([
    listNotifications(viewerId),
    getCurrentUserSummary(),
  ]);
  const unread = notifications.filter(
    (notification) => !notification.read,
  ).length;

  return (
    <div className="min-h-dvh text-[color:var(--foreground)]">
      <div className="mx-auto grid max-w-[1500px] grid-cols-1 lg:grid-cols-[240px_1fr]">
        <aside className="theme-shell hidden min-h-dvh border-r border-[color:var(--line)] lg:block">
          <div className="sticky top-0 flex h-dvh flex-col p-4">
            <Link href="/app" className="mb-6 flex justify-center">
              <BrandMark />
            </Link>
            <nav className="flex flex-1 flex-col gap-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                const label = dictionary[item.labelKey];
                return (
                  <Link
                    key={item.href}
                    href={`${item.href}?lang=${locale}`}
                    className={cn(
                      "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-[color:var(--muted)] transition hover:bg-white/5 hover:text-[color:var(--foreground)]",
                      isActive &&
                        "border border-[color:var(--accent)] bg-[color:var(--badge-cyan-bg)] text-[color:var(--foreground)]",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                    <span>{label}</span>
                    {item.id === "Notifications" && unread ? (
                      <span className="ml-auto rounded-full bg-[color:var(--accent)] px-1.5 py-0.5 text-[10px] text-[color:var(--accent-contrast)]">
                        {unread}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
            <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-2)] p-3">
              <div className="flex items-center gap-3">
                {currentUser.image ? (
                  <Image
                    src={currentUser.image}
                    alt=""
                    width={36}
                    height={36}
                    unoptimized
                    className="size-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-9 items-center justify-center rounded-full bg-[color:var(--badge-cyan-bg)] text-sm font-semibold text-[color:var(--badge-cyan-text)]">
                    {currentUser.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {currentUser.name}
                  </p>
                  <p className="truncate text-xs text-[color:var(--muted)]">
                    @{currentUser.handle}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[11px] text-[color:var(--muted)]">
              {legalNav.slice(0, 3).map((item) => (
                <Link
                  key={item.key}
                  href={`${item.href}?lang=${locale}`}
                  className="hover:text-[color:var(--accent)]"
                >
                  {getLegalPage(locale, item.key).title}
                </Link>
              ))}
            </div>
          </div>
        </aside>
        <main className="min-w-0">
          <header className="theme-header sticky top-0 z-[250] flex h-14 items-center justify-between border-b border-[color:var(--line)] px-4 backdrop-blur lg:hidden">
            <BrandMark compact />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageToggle locale={locale} />
              <Boxes
                className="size-5 text-[color:var(--muted)]"
                aria-label={dictionary.settings}
              />
            </div>
          </header>
          <div className="flex min-h-dvh flex-col">
            <div className="theme-header sticky top-0 z-[250] hidden items-center justify-end border-b border-[color:var(--line)] px-6 py-3 backdrop-blur lg:flex">
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <LanguageToggle locale={locale} />
                <Link
                  href={`/saved?lang=${locale}`}
                  className="flex size-9 items-center justify-center rounded-md border border-[color:var(--line)] text-[color:var(--muted)] hover:bg-white/5"
                  aria-label={dictionary.save}
                >
                  <Bookmark className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
            <div className="flex-1 px-4 py-5 sm:px-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
