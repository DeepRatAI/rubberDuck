import Link from "next/link";
import { Bookmark, ExternalLink } from "lucide-react";

import type { Locale } from "@/lib/domain";
import { formatDateTime } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import type { SavedItem } from "@/server/repositories/saved";
import { Badge } from "./ui/badge";
import { Panel, SectionHeader } from "./ui/panel";

export function SavedSurface({
  items,
  locale,
}: {
  items: SavedItem[];
  locale: Locale;
}) {
  const dictionary = getDictionary(locale);

  return (
    <Panel>
      <SectionHeader
        title={dictionary.saved}
        description={dictionary.savedDescription}
        action={
          <Badge tone="cyan">
            {items.length} {dictionary.savedCountLabel}
          </Badge>
        }
      />
      <div className="divide-y divide-[color:var(--line)]">
        {items.map((item) => (
          <article key={item.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={item.entityType === "course" ? "green" : "blue"}>
                {item.entityType}
              </Badge>
              <span className="text-xs text-[color:var(--muted)]">
                {dictionary.savedAt} {formatDateTime(item.savedAt, locale)}
              </span>
            </div>
            <Link
              href={`${item.href}?lang=${locale}`}
              className="mt-3 inline-flex items-center gap-2 text-base font-semibold text-[color:var(--foreground)] hover:text-[color:var(--accent)]"
            >
              <Bookmark className="size-4" aria-hidden />
              {item.title}
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-[color:var(--muted)]">
              {item.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span key={tag} className="text-xs text-[color:var(--accent)]">
                  #{tag}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-[color:var(--muted)]">
              {dictionary.byAuthor} {item.authorName}
            </p>
          </article>
        ))}
        {items.length === 0 ? (
          <p className="p-4 text-sm text-[color:var(--muted)]">
            {dictionary.savedEmpty}
          </p>
        ) : null}
      </div>
    </Panel>
  );
}
