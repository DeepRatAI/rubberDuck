"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Flag, Heart, Trash2 } from "lucide-react";

import {
  deletePost,
  reportEntity,
  savePost,
  toggleInterest,
} from "@/app/actions";
import type { Locale } from "@/lib/domain";
import { getDictionary } from "@/lib/i18n";
import { ShareMenu } from "./share-menu";
import { Button } from "./ui/button";

export function PostActions({
  postId,
  locale,
  initialInterests,
  initialInterested = false,
  initialSaved = false,
  initialReported = false,
  canDelete = false,
  canInteract = true,
  signInUrl,
  shareUrl,
  shareTitle,
  shareDescription,
  shareTags = [],
}: {
  postId: string;
  locale: Locale;
  initialInterests: number;
  initialInterested?: boolean;
  initialSaved?: boolean;
  initialReported?: boolean;
  canDelete?: boolean;
  canInteract?: boolean;
  signInUrl?: string;
  shareUrl: string;
  shareTitle: string;
  shareDescription?: string;
  shareTags?: string[];
}) {
  const dictionary = getDictionary(locale);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [interested, setInterested] = useState(initialInterested);
  const [interestCount, setInterestCount] = useState(initialInterests);
  const [saved, setSaved] = useState(initialSaved);
  const [reported, setReported] = useState(initialReported);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<unknown>, message: string) {
    setStatus(null);
    setError(null);
    startTransition(() => {
      void action()
        .then(() => {
          setStatus(message);
          router.refresh();
        })
        .catch((caught: unknown) => {
          setError(
            caught instanceof Error ? caught.message : dictionary.actionFailed,
          );
        });
    });
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      {canInteract ? (
        <>
          <Button
            type="button"
            variant={interested ? "primary" : "secondary"}
            disabled={isPending}
            onClick={() => {
              run(
                () =>
                  toggleInterest({ postId }).then((result) => {
                    const nextInterested =
                      typeof result === "object" &&
                      result !== null &&
                      "interested" in result
                        ? Boolean(result.interested)
                        : !interested;
                    setInterested(nextInterested);
                    setInterestCount((count) =>
                      nextInterested ? count + 1 : Math.max(0, count - 1),
                    );
                    return result;
                  }),
                dictionary.interestUpdated,
              );
            }}
          >
            <Heart
              className={interested ? "size-4 fill-current" : "size-4"}
              aria-hidden
            />
            {interestCount}
          </Button>
          <Button
            type="button"
            variant={saved ? "primary" : "secondary"}
            disabled={isPending}
            onClick={() =>
              run(
                () =>
                  savePost({ postId }).then((result) => {
                    setSaved(true);
                    return result;
                  }),
                saved ? dictionary.postAlreadySaved : dictionary.postSaved,
              )
            }
          >
            <Bookmark className="size-4" aria-hidden />
            {saved ? dictionary.savedState : dictionary.save}
          </Button>
          <Button
            type="button"
            variant="subtle"
            disabled={isPending || reported}
            onClick={() =>
              run(
                () =>
                  reportEntity({
                    entityType: "post",
                    entityId: postId,
                    reason: "other",
                    details: "Reported from post detail.",
                  }).then((result) => {
                    setReported(true);
                    return result;
                  }),
                dictionary.reportSentPrivately,
              )
            }
          >
            <Flag className="size-4" aria-hidden />
            {reported ? dictionary.reported : dictionary.report}
          </Button>
        </>
      ) : signInUrl ? (
        <Button asChild variant="secondary">
          <Link href={signInUrl}>{dictionary.signIn}</Link>
        </Button>
      ) : null}
      {canDelete ? (
        <Button
          type="button"
          variant="subtle"
          disabled={isPending}
          onClick={() =>
            run(
              () => deletePost({ postId }),
              dictionary.postRemoved,
            )
          }
        >
          <Trash2 className="size-4" aria-hidden />
          {dictionary.delete}
        </Button>
      ) : null}
      <ShareMenu
        locale={locale}
        url={shareUrl}
        title={shareTitle}
        description={shareDescription}
        tags={shareTags}
        compact
      />
      {status ? (
        <span className="status-success rounded-md px-2 py-1 text-xs">
          {status}
        </span>
      ) : null}
      {error ? (
        <span className="status-warning rounded-md px-2 py-1 text-xs">
          {error}
        </span>
      ) : null}
    </div>
  );
}
