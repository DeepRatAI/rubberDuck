"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag, MessageSquareHeart, Pencil, Trash2 } from "lucide-react";

import {
  deleteComment,
  markCommentHelpful,
  reportEntity,
  updateComment,
} from "@/app/actions";
import type { Locale } from "@/lib/domain";
import { getDictionary } from "@/lib/i18n";
import { Button } from "./ui/button";

export function CommentActions({
  commentId,
  body,
  canDelete,
  canMarkHelpful,
  helpfulByAuthor,
  status,
  locale,
}: {
  commentId: string;
  body: string;
  canDelete: boolean;
  canMarkHelpful: boolean;
  helpfulByAuthor: boolean;
  status: "active" | "deleted" | "hidden";
  locale: Locale;
}) {
  const dictionary = getDictionary(locale);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reported, setReported] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftBody, setDraftBody] = useState(body);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status !== "active") {
    return null;
  }

  function run(
    action: () => Promise<unknown>,
    nextMessage: string,
    onSuccess?: () => void,
  ) {
    setMessage(null);
    setError(null);
    startTransition(() => {
      void action()
        .then(() => {
          setMessage(nextMessage);
          onSuccess?.();
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
    <div className="mt-3 space-y-3 text-xs text-[color:var(--muted)]">
      {editing ? (
        <div className="rounded-md border border-[color:var(--line)] bg-black/10 p-3">
          <label className="grid gap-2 text-xs font-medium">
            {dictionary.editComment}
            <textarea
              className="control-input min-h-24 resize-y rounded-md border p-3 font-normal outline-none focus:border-[color:var(--accent)]"
              value={draftBody}
              onChange={(event) => setDraftBody(event.target.value)}
            />
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="primary"
              disabled={isPending || draftBody.trim().length === 0}
              onClick={() =>
                run(
                  () => updateComment({ commentId, body: draftBody }),
                  dictionary.commentUpdated,
                  () => setEditing(false),
                )
              }
            >
              {dictionary.saveEdit}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setDraftBody(body);
              }}
            >
              {dictionary.cancel}
            </Button>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 hover:text-[color:var(--accent-2)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending || reported}
          onClick={() =>
            run(
              () =>
                reportEntity({
                  entityType: "comment",
                  entityId: commentId,
                  reason: "other",
                  details: "Reported from Binnacle discussion.",
                }).then((result) => {
                  setReported(true);
                  return result;
                }),
              dictionary.reportSentPrivately,
            )
          }
        >
          <Flag className="size-3.5" aria-hidden />
          {reported ? dictionary.reported : dictionary.report}
        </button>
        {canDelete ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 hover:text-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
            onClick={() => setEditing((value) => !value)}
          >
            <Pencil className="size-3.5" aria-hidden />
            {dictionary.edit}
          </button>
        ) : null}
        {canMarkHelpful ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 hover:text-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
            onClick={() =>
              run(
                () =>
                  markCommentHelpful({
                    commentId,
                    helpful: !helpfulByAuthor,
                  }),
                helpfulByAuthor
                  ? dictionary.helpfulAnswerRemoved
                  : dictionary.helpfulAnswerMarked,
              )
            }
          >
            <MessageSquareHeart className="size-3.5" aria-hidden />
            {helpfulByAuthor
              ? dictionary.unmarkHelpfulAnswer
              : dictionary.markHelpfulAnswer}
          </button>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
            onClick={() =>
              run(
                () => deleteComment({ commentId }),
                dictionary.commentRemoved,
              )
            }
          >
            <Trash2 className="size-3.5" aria-hidden />
            {dictionary.delete}
          </button>
        ) : null}
        {message ? (
          <span className="status-success rounded-md px-2 py-1">
            {message}
          </span>
        ) : null}
        {error ? (
          <span className="status-warning rounded-md px-2 py-1">{error}</span>
        ) : null}
      </div>
    </div>
  );
}
