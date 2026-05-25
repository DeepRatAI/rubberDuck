"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  Mail,
  MessageCircle,
  Send,
  Share2,
} from "lucide-react";

import type { Locale } from "@/lib/domain";
import { getDictionary } from "@/lib/i18n";
import {
  buildPortableShareText,
  buildPlatformShareDraft,
  createSocialShareUrl,
  defaultShareHashtags,
  type SharePayload,
  type ShareTarget,
} from "@/lib/share";
import { Button } from "./ui/button";

const targets: Array<{
  value: ShareTarget;
  label: string;
  icon: typeof Share2;
}> = [
  { value: "x", label: "X", icon: Share2 },
  { value: "reddit", label: "Reddit", icon: MessageCircle },
  { value: "linkedin", label: "LinkedIn", icon: Share2 },
  { value: "facebook", label: "Facebook", icon: Share2 },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "telegram", label: "Telegram", icon: Send },
  { value: "email", label: "Email", icon: Mail },
];

export function ShareMenu({
  locale,
  url,
  title,
  description,
  tags = [],
  compact = false,
}: {
  locale: Locale;
  url: string;
  title: string;
  description?: string;
  tags?: string[];
  compact?: boolean;
}) {
  const dictionary = getDictionary(locale);
  const [copiedMode, setCopiedMode] = useState<"link" | "post" | null>(null);
  const payload = useMemo<SharePayload>(
    () => ({
      url,
      title,
      description,
      hashtags: defaultShareHashtags(tags),
    }),
    [description, tags, title, url],
  );

  async function nativeShare() {
    if (typeof navigator === "undefined" || !("share" in navigator)) {
      await copyLink();
      return;
    }

    await navigator.share({
      title,
      text: description,
      url,
    });
  }

  async function copyLink() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopiedMode("link");
      window.setTimeout(() => setCopiedMode(null), 1800);
    }
  }

  async function copyPortablePost() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(buildPortableShareText(payload));
      setCopiedMode("post");
      window.setTimeout(() => setCopiedMode(null), 1800);
    }
  }

  async function copyPlatformDraft(
    target: Parameters<typeof buildPlatformShareDraft>[0],
  ) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(buildPlatformShareDraft(target, payload));
      setCopiedMode("post");
      window.setTimeout(() => setCopiedMode(null), 1800);
    }
  }

  return (
    <div className={compact ? "flex flex-wrap items-center gap-2" : "space-y-2"}>
      <Button type="button" variant="secondary" onClick={nativeShare}>
        <Share2 className="size-4" aria-hidden />
        {dictionary.share}
      </Button>
      <Button type="button" variant="subtle" onClick={copyLink}>
        {copiedMode === "link" ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
        {copiedMode === "link" ? dictionary.linkCopied : dictionary.copyLink}
      </Button>
      <Button type="button" variant="subtle" onClick={copyPortablePost}>
        {copiedMode === "post" ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
        {copiedMode === "post"
          ? dictionary.postTextCopied
          : dictionary.copyPostText}
      </Button>
      <div
        className={
          compact
            ? "flex flex-wrap items-center gap-1.5"
            : "flex flex-wrap gap-1.5"
        }
        aria-label={dictionary.shareTargets}
      >
        {targets.map((target) => {
          const Icon = target.icon;
          return (
            <a
              key={target.value}
              href={createSocialShareUrl(target.value, payload)}
              target={target.value === "email" ? undefined : "_blank"}
              rel={target.value === "email" ? undefined : "noreferrer"}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)] px-2.5 text-xs font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--accent)]"
            >
              <Icon className="size-3.5" aria-hidden />
              {target.label}
            </a>
          );
        })}
      </div>
      <details className={compact ? "w-full text-xs" : "text-xs"}>
        <summary className="cursor-pointer text-[color:var(--muted)] transition hover:text-[color:var(--accent)]">
          {dictionary.copyNetworkDrafts}
        </summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(["linkedin", "x", "reddit"] as const).map((target) => (
            <button
              key={target}
              type="button"
              className="inline-flex h-8 items-center rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)] px-2.5 font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--accent)]"
              onClick={() => copyPlatformDraft(target)}
            >
              {target === "x" ? "X" : target[0].toUpperCase() + target.slice(1)}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
