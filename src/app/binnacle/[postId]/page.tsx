import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GitBranch } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { CommentActions } from "@/components/comment-actions";
import { CommentComposer } from "@/components/comment-composer";
import { MediaPreview } from "@/components/feed";
import { SafeMarkdown } from "@/components/markdown";
import { PostActions } from "@/components/post-actions";
import { ProjectSignalResponseActions } from "@/components/project-signal-response-actions";
import { ProjectSignalResponseRoster } from "@/components/project-signal-response-roster";
import { ShareMenu } from "@/components/share-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel, SectionHeader } from "@/components/ui/panel";
import { brand } from "@/lib/brand";
import { localAuthFallbackEnabled } from "@/lib/auth";
import { env } from "@/lib/env";
import { getDictionary } from "@/lib/i18n";
import type { CommentNode } from "@/lib/product-types";
import { localeFromSearchParams, type PageSearchParams } from "@/lib/routing";
import { createCanonicalUrl, normalizeShareDescription } from "@/lib/share";
import {
  DEVIT_DEV_USER_ID,
  getOptionalCurrentUserId,
  isUserOnboarded,
} from "@/server/current-user";
import { getCommentsForPost } from "@/server/repositories/comments";
import { getFeedItemById } from "@/server/repositories/feed";
import { listProjectSignalResponsesForAuthor } from "@/server/repositories/project-signal-responses";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postId: string }>;
}): Promise<Metadata> {
  const { postId } = await params;
  const post = await getFeedItemById(postId);
  const url = createCanonicalUrl(`/binnacle/${postId}`, env.APP_URL);

  if (!post) {
    return {
      title: `${brand.productName} Binnacle`,
      description: brand.description,
      alternates: { canonical: url },
    };
  }

  const description = normalizeShareDescription(post.body);
  const fallbackImage =
    post.imageUrl ??
    post.media.find((media) => media.type === "image")?.url ??
    brand.fullLogoPath;
  const image =
    post.contentType === "project_signal"
      ? createCanonicalUrl(`/api/share/project-signal/${postId}`, env.APP_URL)
      : fallbackImage;

  return {
    title: `${post.title} | ${brand.productName}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      siteName: brand.productName,
      title: post.title,
      description,
      url,
      images: [{ url: image, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [image],
    },
  };
}

export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams?: PageSearchParams;
}) {
  const [{ postId }, locale] = await Promise.all([
    params,
    localeFromSearchParams(searchParams),
  ]);
  const sessionViewerId = await getOptionalCurrentUserId();
  const viewerId =
    sessionViewerId && (await isUserOnboarded(sessionViewerId))
      ? sessionViewerId
      : localAuthFallbackEnabled
        ? DEVIT_DEV_USER_ID
        : null;
  const post = await getFeedItemById(postId, viewerId);

  if (!post) {
    notFound();
  }

  const feedPost = post;
  const dictionary = getDictionary(locale);
  const [comments, projectSignalResponses] = await Promise.all([
    getCommentsForPost(feedPost.id, viewerId),
    feedPost.contentType === "project_signal"
      ? listProjectSignalResponsesForAuthor(feedPost.id, viewerId)
      : Promise.resolve([]),
  ]);
  const shareUrl = createCanonicalUrl(`/binnacle/${feedPost.id}`, env.APP_URL);

  function renderComment(comment: CommentNode, depth = 0) {
    return (
      <div
        id={`comment-${comment.id}`}
        key={comment.id}
        className={
          depth > 0 ? "mt-4 border-l-2 border-cyan-300/20 pl-4" : "p-4"
        }
      >
        <div className="text-sm font-medium text-[color:var(--foreground)]">
          {comment.authorName}{" "}
          <span className="font-normal text-[color:var(--muted)]">
            @{comment.authorHandle}
          </span>
          {comment.helpfulByAuthor ? (
            <Badge tone="green" className="ml-2 align-middle">
              {dictionary.helpfulAnswer}
            </Badge>
          ) : null}
        </div>
        <div className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
          <SafeMarkdown value={comment.body} />
        </div>
        {viewerId ? (
          <CommentActions
            commentId={comment.id}
            body={comment.body}
            canDelete={comment.canDelete}
            canMarkHelpful={comment.canMarkHelpful}
            helpfulByAuthor={comment.helpfulByAuthor}
            status={comment.status}
            locale={locale}
          />
        ) : null}
        <div className="mt-2">
          <ShareMenu
            locale={locale}
            url={`${shareUrl}#comment-${comment.id}`}
            title={`${feedPost.title} · ${comment.authorName}`}
            description={comment.body}
            tags={feedPost.tags}
            compact
          />
        </div>
        {viewerId && comment.status === "active" ? (
          <CommentComposer
            postId={feedPost.id}
            parentId={comment.id}
            compact
            locale={locale}
          />
        ) : null}
        {comment.replies.map((reply) => renderComment(reply, depth + 1))}
      </div>
    );
  }

  return (
    <AppShell active="Binnacle" locale={locale}>
      <div className="mx-auto max-w-4xl space-y-5">
        <Button asChild variant="ghost">
          <Link href={`/binnacle?lang=${locale}`}>
            <ArrowLeft className="size-4" aria-hidden />
            {dictionary.backToBinnacle}
          </Link>
        </Button>
        <Panel>
          <article className="p-5">
            <div className="flex items-center gap-2">
              <Badge tone="blue">{feedPost.category}</Badge>
              {feedPost.contentType === "project_signal" ? (
                <Badge tone="green">{dictionary.projectSignal}</Badge>
              ) : null}
              {feedPost.contentType === "question" ? (
                <Badge tone="amber">{dictionary.questionPost}</Badge>
              ) : null}
              {feedPost.contentType === "build_log" ? (
                <Badge tone="green">{dictionary.buildLogPost}</Badge>
              ) : null}
              {feedPost.contentType === "resource" ? (
                <Badge tone="cyan">{dictionary.resourcePost}</Badge>
              ) : null}
              {feedPost.contentType === "course_update" ? (
                <Badge tone="blue">{dictionary.courseUpdatePost}</Badge>
              ) : null}
              {feedPost.tags.map((tag) => (
                <span key={tag} className="text-xs text-[color:var(--accent)]">
                  #{tag}
                </span>
              ))}
            </div>
            <h1 className="mt-4 text-2xl font-semibold">{feedPost.title}</h1>
            <div className="mt-3 leading-7 text-[color:var(--muted)]">
              <SafeMarkdown value={feedPost.body} />
            </div>
            {feedPost.contentType === "project_signal" &&
            feedPost.projectSignal ? (
              <div className="mt-5 rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <a
                    href={feedPost.projectSignal.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--foreground)] hover:text-[color:var(--accent)]"
                  >
                    <GitBranch className="size-4" aria-hidden />
                    {feedPost.projectSignal.owner}/{feedPost.projectSignal.name}
                  </a>
                  <span className="text-xs text-[color:var(--muted)]">
                    {feedPost.projectSignal.maturity} ·{" "}
                    {feedPost.projectSignal.intent}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  {feedPost.projectSignal.description}
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
                      {dictionary.stack}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--foreground)]">
                      {feedPost.projectSignal.stack.join(", ") ||
                        dictionary.openValue}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
                      {dictionary.projectNeeds}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--foreground)]">
                      {feedPost.projectSignal.needs.join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
                      {dictionary.projectSignals}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--foreground)]">
                      {feedPost.projectSignal.evidence.stars} {dictionary.stars}{" "}
                      · {feedPost.projectSignal.evidence.forks}{" "}
                      {dictionary.forks}
                    </p>
                  </div>
                </div>
                <ProjectSignalResponseActions
                  postId={feedPost.id}
                  locale={locale}
                  initialResponses={feedPost.projectSignalViewerResponses ?? []}
                  canRespond={Boolean(viewerId)}
                />
                {viewerId === feedPost.authorId ? (
                  <ProjectSignalResponseRoster
                    locale={locale}
                    responses={projectSignalResponses}
                  />
                ) : null}
              </div>
            ) : null}
            {feedPost.media.length > 0 ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {feedPost.media.map((media, index) => (
                  <MediaPreview key={`${media.url}-${index}`} media={media} />
                ))}
              </div>
            ) : null}
            <PostActions
              postId={feedPost.id}
              locale={locale}
              initialInterests={feedPost.interests}
              initialInterested={feedPost.viewerState?.interested ?? false}
              initialSaved={feedPost.viewerState?.saved ?? false}
              initialReported={feedPost.viewerState?.reported ?? false}
              canDelete={feedPost.viewerState?.canDelete ?? false}
              canInteract={Boolean(viewerId)}
              signInUrl={`/login?next=/binnacle/${postId}&lang=${locale}`}
              shareUrl={shareUrl}
              shareTitle={feedPost.title}
              shareDescription={feedPost.body}
              shareTags={feedPost.tags}
            />
          </article>
        </Panel>
        <Panel>
          <SectionHeader
            title={dictionary.discussion}
            description={dictionary.discussionDescription}
          />
          {viewerId ? (
            <CommentComposer postId={feedPost.id} locale={locale} />
          ) : (
            <div className="border-b border-[color:var(--line)] bg-black/10 p-4">
              <Button asChild>
                <Link href={`/login?next=/binnacle/${postId}&lang=${locale}`}>
                  {dictionary.signIn}
                </Link>
              </Button>
            </div>
          )}
          <div className="divide-y divide-[color:var(--line)]">
            {comments.map((comment) => renderComment(comment))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
