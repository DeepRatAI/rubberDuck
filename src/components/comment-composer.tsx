"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";

import { createComment, reportEntity } from "@/app/actions";
import type { Locale } from "@/lib/domain";
import { getDictionary } from "@/lib/i18n";
import { Button } from "./ui/button";

export function CommentComposer({
  postId,
  parentId,
  compact = false,
  locale,
}: {
  postId: string;
  parentId?: string;
  compact?: boolean;
  locale: Locale;
}) {
  const dictionary = getDictionary(locale);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submitComment() {
    setStatus(null);
    setError(null);
    startTransition(() => {
      void createComment({ postId, parentId, body })
        .then(() => {
          setBody("");
          setStatus(
            parentId
              ? dictionary.nestedReplyPublished
              : dictionary.replyPublished,
          );
          router.refresh();
        })
        .catch((caught: unknown) => {
          setError(
            caught instanceof Error
              ? caught.message
              : dictionary.replySaveError,
          );
        });
    });
  }

  function reportPost() {
    setStatus(null);
    setError(null);
    startTransition(() => {
      void reportEntity({
        entityType: "post",
        entityId: postId,
        reason: "other",
        details: "Reported from post detail.",
      })
        .then(() => setStatus(dictionary.reportSentPrivately))
        .catch((caught: unknown) => {
          setError(
            caught instanceof Error
              ? caught.message
              : dictionary.reportCouldNotSend,
          );
        });
    });
  }

  return (
    <div
      className={
        compact
          ? "mt-3 rounded-md border border-[color:var(--line)] bg-black/10 p-3"
          : "border-b border-[color:var(--line)] bg-black/10 p-4"
      }
    >
      <label className="grid gap-2 text-sm font-medium">
        {parentId ? dictionary.replyInThread : dictionary.addTechnicalReply}
        <textarea
          className="control-input min-h-20 resize-y rounded-md border p-3 font-normal outline-none focus:border-[color:var(--accent)]"
          placeholder={dictionary.commentPlaceholder}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="primary"
          disabled={isPending || body.trim().length === 0}
          onClick={submitComment}
        >
          <MessageSquare className="size-4" aria-hidden />
          {dictionary.reply}
        </Button>
        <Button type="button" disabled={isPending} onClick={reportPost}>
          {dictionary.reportPostPrivately}
        </Button>
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
    </div>
  );
}
