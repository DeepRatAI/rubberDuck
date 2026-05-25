"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  EyeOff,
  ExternalLink,
  Flag,
  Heart,
  Image as ImageIcon,
  Info,
  Link2,
  GitBranch,
  MessageSquare,
  Pencil,
  Play,
  Rss,
  SlidersHorizontal,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";

import type {
  BinnacleCategory,
  FeedItem,
  Locale,
  PostMedia,
  Profile,
  TrendTopic,
  Viewer,
} from "@/lib/domain";
import { BINNACLE_CATEGORIES, buildHomeFeed } from "@/lib/domain";
import { formatTime } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { explainFeedItemForViewer, type FeedRankingMode } from "@/lib/ranking";
import type {
  PostContentType,
  ProjectSignalMetadata,
} from "@/lib/project-signals";
import {
  createPost,
  deletePost,
  followProfile,
  loadFeedPage,
  previewProjectSignal,
  reportEntity,
  savePost,
  recordFeedSeen,
  sendFeedFeedback,
  toggleInterest,
  updatePost,
  uploadPostMedia,
} from "@/app/actions";
import { createCanonicalUrl } from "@/lib/share";
import { ProjectSignalResponseActions } from "./project-signal-response-actions";
import { ShareMenu } from "./share-menu";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Panel, SectionHeader } from "./ui/panel";
import { RssCover } from "./rss-cover";
import { SafeMarkdown } from "./markdown";

const categoryTones: Record<
  BinnacleCategory,
  "blue" | "green" | "amber" | "cyan" | "slate"
> = {
  News: "blue",
  Project: "green",
  Help: "amber",
  CoWork: "cyan",
  Meta: "slate",
};

type LocalPostState = {
  interested: boolean;
  saved: boolean;
  reported: boolean;
  deleted: boolean;
  interests: number;
};

function categoryForContentType(type: PostContentType): BinnacleCategory {
  if (type === "question") {
    return "Help";
  }

  if (type === "resource" || type === "course_update") {
    return "News";
  }

  return "Project";
}

function getEmbeddableUrl(media: PostMedia) {
  if (media.provider === "youtube") {
    const url = new URL(media.url);
    const id =
      url.hostname === "youtu.be"
        ? url.pathname.slice(1)
        : url.searchParams.get("v");
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }

  if (media.provider === "vimeo") {
    const id = new URL(media.url).pathname.split("/").filter(Boolean).at(0);
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }

  return null;
}

function getEmbedPoster(media: PostMedia) {
  if (media.thumbnailUrl) {
    return media.thumbnailUrl;
  }

  if (media.provider === "youtube") {
    const url = new URL(media.url);
    const id =
      url.hostname === "youtu.be"
        ? url.pathname.slice(1)
        : url.searchParams.get("v");
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
  }

  return null;
}

function classifyUrlMedia(rawUrl: string): PostMedia | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");
    const lowerPath = url.pathname.toLowerCase();

    if (host === "youtube.com" || host === "youtu.be") {
      return {
        type: "embed",
        url: url.toString(),
        title: "YouTube video",
        provider: "youtube",
      };
    }

    if (host === "vimeo.com") {
      return {
        type: "embed",
        url: url.toString(),
        title: "Vimeo video",
        provider: "vimeo",
      };
    }

    if (/\.(png|jpe?g|webp|gif)$/i.test(lowerPath)) {
      return {
        type: "image",
        url: url.toString(),
        title: host,
        provider: "external",
      };
    }

    if (/\.(mp4|webm)$/i.test(lowerPath)) {
      return {
        type: "video",
        url: url.toString(),
        title: host,
        provider: "external",
      };
    }

    return {
      type: "link",
      url: url.toString(),
      title: host,
      provider: "external",
    };
  } catch {
    return null;
  }
}

export function MediaPreview({ media }: { media: PostMedia }) {
  const [playingEmbed, setPlayingEmbed] = useState(false);

  if (media.type === "image") {
    return (
      <figure className="overflow-hidden rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)]">
        <div className="relative aspect-[16/9] w-full">
          <Image
            src={media.url}
            alt={media.title ?? "Post image"}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            unoptimized
            className="object-cover"
          />
        </div>
      </figure>
    );
  }

  if (media.type === "video") {
    return (
      <video
        className="aspect-video w-full rounded-md border border-[color:var(--line)] bg-black"
        src={media.url}
        controls
        preload="metadata"
      />
    );
  }

  if (media.type === "embed") {
    const src = getEmbeddableUrl(media);
    const poster = getEmbedPoster(media);

    if (!src) {
      return null;
    }

    if (playingEmbed) {
      return (
        <iframe
          className="aspect-video w-full rounded-md border border-[color:var(--line)] bg-black"
          src={src}
          title={media.title ?? "Embedded video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }

    return (
      <button
        type="button"
        onClick={() => setPlayingEmbed(true)}
        className="group relative aspect-video w-full overflow-hidden rounded-md border border-[color:var(--line)] bg-black text-left text-white transition hover:border-[color:var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
        aria-label={`Play ${media.title ?? "embedded video"}`}
      >
        {poster ? (
          <Image
            src={poster}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            unoptimized
            className="object-cover opacity-75 transition group-hover:scale-[1.02]"
          />
        ) : null}
        <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-[color:var(--accent)] text-[color:var(--accent-contrast)] shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
            <Play className="size-6" aria-hidden />
          </span>
        </span>
        <span className="absolute bottom-3 left-3 right-3 text-sm font-semibold">
          {media.title ?? "Embedded video"}
        </span>
      </button>
    );
  }

  return (
    <a
      href={media.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)] p-3 text-sm text-[color:var(--foreground)] transition hover:border-[color:var(--accent)]"
    >
      <Link2 className="size-4 text-[color:var(--accent)]" aria-hidden />
      <span className="min-w-0 truncate">{media.title ?? media.url}</span>
    </a>
  );
}

export function FeedSurface({
  locale,
  initialFeed,
  initialNextCursor = null,
  totalFeedItems = initialFeed.length,
  viewer,
  suggestedProfiles,
  externalTrends = [],
  publicBaseUrl = "http://localhost:3000",
  showComposer = true,
}: {
  locale: Locale;
  initialFeed: FeedItem[];
  initialNextCursor?: number | null;
  totalFeedItems?: number;
  viewer: Viewer;
  suggestedProfiles: Profile[];
  externalTrends?: TrendTopic[];
  publicBaseUrl?: string;
  showComposer?: boolean;
}) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [, startTransition] = useTransition();
  const [isHydrated, setIsHydrated] = useState(false);
  const composerTitleRef = useRef<HTMLInputElement>(null);
  const composerRegionRef = useRef<HTMLDivElement>(null);
  const [category, setCategory] = useState<BinnacleCategory | "All">("All");
  const [rankingMode, setRankingMode] = useState<FeedRankingMode>("for-you");
  const [query, setQuery] = useState("");
  const [pagedFeed, setPagedFeed] = useState(initialFeed);
  const [nextCursor, setNextCursor] = useState<number | null>(
    initialNextCursor,
  );
  const [totalItems, setTotalItems] = useState(totalFeedItems);
  const [loadingMore, setLoadingMore] = useState(false);
  const [composerCategory, setComposerCategory] =
    useState<BinnacleCategory>("Project");
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [postTags, setPostTags] = useState("oss, help");
  const [postMedia, setPostMedia] = useState<PostMedia[]>([]);
  const [composerType, setComposerType] = useState<PostContentType>("standard");
  const [projectRepoUrl, setProjectRepoUrl] = useState("");
  const [projectSignal, setProjectSignal] =
    useState<ProjectSignalMetadata | null>(null);
  const [previewingProject, setPreviewingProject] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");
  const [editingPost, setEditingPost] = useState<{
    id: string;
    title: string;
    body: string;
    tags: string;
  } | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [postStates, setPostStates] = useState<Record<string, LocalPostState>>(
    {},
  );
  const [suppressedItems, setSuppressedItems] = useState<Set<string>>(
    () => new Set(),
  );
  const [socialStatus, setSocialStatus] = useState<string | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const categoryLabels = {
    News: dictionary.news,
    Project: dictionary.project,
    Help: dictionary.help,
    CoWork: dictionary.cowork,
    Meta: dictionary.meta,
  } satisfies Record<BinnacleCategory, string>;
  const rankingModes: Array<{ value: FeedRankingMode; label: string }> = [
    { value: "for-you", label: dictionary.forYou },
    { value: "latest", label: dictionary.latest },
    { value: "following", label: dictionary.following },
    { value: "top", label: dictionary.top },
  ];
  const contentTypeOptions: Array<{
    value: PostContentType;
    label: string;
    icon: typeof Link2;
  }> = [
    { value: "standard", label: dictionary.standardPost, icon: Link2 },
    {
      value: "project_signal",
      label: dictionary.projectSignal,
      icon: GitBranch,
    },
    { value: "question", label: dictionary.questionPost, icon: MessageSquare },
    { value: "build_log", label: dictionary.buildLogPost, icon: GitBranch },
    { value: "resource", label: dictionary.resourcePost, icon: Link2 },
    { value: "course_update", label: dictionary.courseUpdatePost, icon: Wand2 },
  ];

  useEffect(() => {
    const hydrationTick = window.setTimeout(() => setIsHydrated(true), 0);

    return () => window.clearTimeout(hydrationTick);
  }, []);

  const feed = useMemo(
    () =>
      buildHomeFeed(pagedFeed, {
        viewer,
        category: category === "All" ? undefined : category,
        query,
        hashtag: query.startsWith("#") ? query : undefined,
        mode: rankingMode,
      }),
    [category, pagedFeed, query, rankingMode, viewer],
  );

  const visibleFeed = useMemo(
    () =>
      feed.filter((item) => {
        if (suppressedItems.has(`${item.type}:${item.id}`)) {
          return false;
        }

        if (item.type !== "post") {
          return true;
        }

        return !postStates[item.id]?.deleted;
      }),
    [feed, postStates, suppressedItems],
  );
  const impressionKey = useMemo(
    () => visibleFeed.map((item) => `${item.type}:${item.id}`).join("|"),
    [visibleFeed],
  );

  useEffect(() => {
    if (!isHydrated || visibleFeed.length === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void recordFeedSeen({
        source: rankingMode,
        items: visibleFeed.slice(0, 20).map((item) => ({
          entityType: item.type,
          entityId: item.id,
        })),
      }).catch(() => {
        // Impression telemetry is non-blocking; feed rendering must never fail on it.
      });
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [impressionKey, isHydrated, rankingMode, visibleFeed]);

  function getPostState(item: FeedItem): LocalPostState {
    return (
      postStates[item.id] ?? {
        interested: item.viewerState?.interested ?? false,
        saved: item.viewerState?.saved ?? false,
        reported: item.viewerState?.reported ?? false,
        deleted: false,
        interests: item.interests,
      }
    );
  }

  function shareUrlForItem(item: FeedItem) {
    if (item.type === "rss" && item.sourceUrl) {
      return item.sourceUrl;
    }

    if (item.type === "course") {
      return createCanonicalUrl(`/courses/${item.id}`, publicBaseUrl);
    }

    return createCanonicalUrl(`/binnacle/${item.id}`, publicBaseUrl);
  }

  function parseTags(value: string) {
    const rawTags = value.includes(",") ? value.split(",") : value.split(/\s+/);
    const tags = new Map<string, string>();

    for (const tag of rawTags) {
      const clean = tag.trim().replace(/^#/, "");
      if (clean) {
        tags.set(clean.toLowerCase(), clean);
      }
    }

    return Array.from(tags.values()).slice(0, 12);
  }

  function runFeedAction(
    action: () => Promise<unknown>,
    successMessage: string,
  ) {
    setSocialStatus(null);
    setSocialError(null);
    startTransition(() => {
      void action()
        .then(() => {
          setSocialStatus(successMessage);
          router.refresh();
        })
        .catch((error: unknown) => {
          setSocialError(
            error instanceof Error ? error.message : dictionary.actionFailed,
          );
        });
    });
  }

  function sendFeedback(
    item: FeedItem,
    signal: "more_like_this" | "less_like_this" | "mute_source" | "mute_tag",
    value?: string,
  ) {
    if (
      signal === "less_like_this" ||
      signal === "mute_source" ||
      signal === "mute_tag"
    ) {
      setSuppressedItems((current) => {
        const next = new Set(current);
        next.add(`${item.type}:${item.id}`);
        return next;
      });
    }

    runFeedAction(
      () =>
        sendFeedFeedback({
          entityType: item.type,
          entityId: item.id,
          signal,
          value,
        }),
      signal === "more_like_this"
        ? dictionary.feedMoreLikeThisSaved
        : dictionary.feedLessLikeThisSaved,
    );
  }

  function publishPost() {
    runFeedAction(
      () =>
        createPost({
          contentType: composerType,
          category: composerCategory,
          title: postTitle,
          body: postBody,
          tags: parseTags(postTags),
          media: postMedia,
          projectSignal:
            composerType === "project_signal" ? projectSignal : undefined,
        }).then((result) => {
          setPagedFeed((items) => {
            const created = result as FeedItem;
            if (items.some((item) => item.id === created.id)) {
              return items;
            }

            return [created, ...items];
          });
          setTotalItems((current) =>
            typeof current === "number" ? current + 1 : current,
          );
          setPostTitle("");
          setPostBody("");
          setPostTags("oss, help");
          setPostMedia([]);
          setComposerType("standard");
          setProjectRepoUrl("");
          setProjectSignal(null);
          setMediaUrl("");
          return result;
        }),
      dictionary.postPublished,
    );
  }

  function previewProjectRepo() {
    if (!projectRepoUrl.trim()) {
      setSocialError(dictionary.projectPreviewRequired);
      return;
    }

    setPreviewingProject(true);
    setSocialError(null);
    void previewProjectSignal({ repoUrl: projectRepoUrl })
      .then((draft) => {
        setComposerType("project_signal");
        setComposerCategory("Project");
        setPostTitle(draft.title);
        setPostBody(draft.body);
        setPostTags(draft.tags.join(", "));
        setProjectSignal(draft.projectSignal);
        setPostMedia((items) => {
          const repoMedia: PostMedia = {
            type: "link",
            url: draft.projectSignal.repoUrl,
            title: `${draft.projectSignal.owner}/${draft.projectSignal.name}`,
            provider: "external",
          };

          if (items.some((item) => item.url === repoMedia.url)) {
            return items;
          }

          return [repoMedia, ...items].slice(0, 6);
        });
      })
      .catch((error: unknown) => {
        setSocialError(
          error instanceof Error ? error.message : dictionary.actionFailed,
        );
      })
      .finally(() => setPreviewingProject(false));
  }

  function savePostEdit(item: FeedItem) {
    if (!editingPost || item.type !== "post" || editingPost.id !== item.id) {
      return;
    }

    runFeedAction(
      () =>
        updatePost({
          postId: item.id,
          contentType: item.contentType ?? "standard",
          category: item.category,
          title: editingPost.title,
          body: editingPost.body,
          tags: parseTags(editingPost.tags),
          media: item.media,
          projectSignal: item.projectSignal,
        }).then((result) => {
          setPagedFeed((items) =>
            items.map((feedItem) =>
              feedItem.id === item.id
                ? {
                    ...feedItem,
                    title: editingPost.title,
                    body: editingPost.body,
                    tags: parseTags(editingPost.tags),
                  }
                : feedItem,
            ),
          );
          setEditingPost(null);
          return result;
        }),
      dictionary.postUpdated,
    );
  }

  function addUrlMedia() {
    const media = classifyUrlMedia(mediaUrl);
    if (!media) {
      setSocialError(dictionary.pasteValidUrl);
      return;
    }

    setPostMedia((items) => [...items, media].slice(0, 6));
    setMediaUrl("");
    setSocialError(null);
  }

  function insertSpoiler() {
    setPostBody(
      (body) =>
        `${body}${body ? "\n\n" : ""}<details><summary>Spoiler</summary>\n\nHidden note.\n\n</details>`,
    );
  }

  function loadMoreItems() {
    setLoadingMore(true);
    setSocialError(null);
    const categoryFilter = category === "All" ? undefined : category;
    const cursor = visibleFeed.length;

    startTransition(() => {
      void loadFeedPage({
        cursor,
        pageSize: 10,
        category: categoryFilter,
        query,
        hashtag: query.startsWith("#") ? query : undefined,
        mode: rankingMode,
      })
        .then((page) => {
          setPagedFeed((current) => {
            const existing = new Set(current.map((item) => item.id));
            return [
              ...current,
              ...page.items.filter((item) => !existing.has(item.id)),
            ];
          });
          setNextCursor(page.nextCursor);
          setTotalItems(page.total);
        })
        .catch((error: unknown) => {
          setSocialError(
            error instanceof Error
              ? error.message
              : dictionary.couldNotLoadFeed,
          );
        })
        .finally(() => setLoadingMore(false));
    });
  }

  function applyTrendFilter(trend: TrendTopic) {
    setCategory("News");
    setRankingMode("latest");
    setQuery(trend.label);
  }

  function focusComposer() {
    composerTitleRef.current?.focus({ preventScroll: true });
    composerRegionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    window.setTimeout(() => composerTitleRef.current?.focus(), 120);
  }

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[1fr_280px]">
      <Panel>
        <SectionHeader
          title={dictionary.binnacle}
          description={dictionary.binnacleDescription}
          action={
            showComposer ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={focusComposer}
              >
                {dictionary.newPost}
              </Button>
            ) : (
              <Button asChild variant="primary" size="sm">
                <Link href={`/binnacle?lang=${locale}`}>
                  {dictionary.newPost}
                </Link>
              </Button>
            )
          }
        />
        <div className="border-b border-[color:var(--line)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {(["All", ...BINNACLE_CATEGORIES, "RSS"] as const).map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={category === item ? "primary" : "ghost"}
                onClick={() => {
                  if (item !== "RSS") {
                    setCategory(item);
                  } else {
                    setCategory("News");
                    setQuery("rss");
                  }
                }}
              >
                {item === "All"
                  ? dictionary.all
                  : item === "RSS"
                    ? dictionary.rss
                    : categoryLabels[item]}
              </Button>
            ))}
            <div
              className="flex flex-wrap items-center gap-1 rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)] p-1"
              aria-label="Feed ranking mode"
            >
              {rankingModes.map((mode) => (
                <Button
                  key={mode.value}
                  type="button"
                  size="sm"
                  variant={rankingMode === mode.value ? "secondary" : "ghost"}
                  onClick={() => setRankingMode(mode.value)}
                >
                  {mode.label}
                </Button>
              ))}
            </div>
            <div className="control-input ml-auto flex min-w-[220px] items-center gap-2 rounded-md border px-2">
              <SlidersHorizontal
                className="size-4 text-[color:var(--input-muted)]"
                aria-hidden
              />
              <input
                className="h-9 w-full bg-transparent text-sm outline-none"
                placeholder={`${dictionary.search} #ai, postgres...`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
        </div>

        {showComposer ? (
          <div
            ref={composerRegionRef}
            className="scroll-mt-20 border-b border-[color:var(--line)] bg-[color:var(--surface-2)]/45 p-4"
          >
            <label
              className="text-sm font-medium text-[color:var(--foreground)]"
              htmlFor="quick-post-title"
            >
              {dictionary.newBinnacleNote}
            </label>
            <div className="mt-3 grid gap-3 rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] p-3">
              <div className="flex flex-wrap gap-2">
                {contentTypeOptions.map((mode) => {
                  const Icon = mode.icon;
                  const selected = composerType === mode.value;

                  return (
                    <button
                      key={mode.value}
                      type="button"
                      className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition ${
                        selected
                          ? "border-[color:var(--accent)] bg-[color:var(--accent)]/15 text-[color:var(--foreground)]"
                          : "border-[color:var(--line)] bg-[color:var(--surface-2)] text-[color:var(--muted)] hover:border-[color:var(--accent)]"
                      }`}
                      onClick={() => {
                        setComposerType(mode.value);
                        setComposerCategory(categoryForContentType(mode.value));
                        if (mode.value !== "project_signal") {
                          setProjectSignal(null);
                        }
                      }}
                    >
                      <Icon className="size-4" aria-hidden />
                      {mode.label}
                    </button>
                  );
                })}
              </div>
              {composerType === "project_signal" ? (
                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                  <label className="sr-only" htmlFor="project-repo-url">
                    {dictionary.projectRepositoryUrl}
                  </label>
                  <input
                    id="project-repo-url"
                    className="control-input h-10 rounded-md border px-3 text-sm outline-none focus:border-[color:var(--accent)]"
                    placeholder="https://github.com/owner/repo"
                    value={projectRepoUrl}
                    disabled={!isHydrated || previewingProject}
                    onChange={(event) => setProjectRepoUrl(event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="subtle"
                    disabled={!isHydrated || previewingProject}
                    onClick={previewProjectRepo}
                  >
                    <Wand2 className="size-4" aria-hidden />
                    {previewingProject
                      ? dictionary.loading
                      : dictionary.previewProject}
                  </Button>
                  <p className="text-xs text-[color:var(--muted)] md:col-span-2">
                    {projectSignal
                      ? dictionary.projectSignalReady
                      : dictionary.projectSignalDescription}
                  </p>
                </div>
              ) : null}
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-[160px_1fr]">
              <select
                className="control-input h-10 rounded-md border px-3 text-sm outline-none focus:border-[color:var(--accent)]"
                aria-label={dictionary.binnacle}
                value={composerCategory}
                disabled={!isHydrated || composerType === "project_signal"}
                onChange={(event) =>
                  setComposerCategory(event.target.value as BinnacleCategory)
                }
              >
                {BINNACLE_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {categoryLabels[item]}
                  </option>
                ))}
              </select>
              <input
                ref={composerTitleRef}
                id="quick-post-title"
                className="control-input h-10 rounded-md border px-3 text-sm outline-none focus:border-[color:var(--accent)]"
                placeholder={dictionary.postTitle}
                value={postTitle}
                disabled={!isHydrated}
                onChange={(event) => setPostTitle(event.target.value)}
              />
            </div>
            <textarea
              className="control-input mt-2 min-h-24 w-full resize-y rounded-md border p-3 text-sm outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/20"
              placeholder={dictionary.postComposerPlaceholder}
              value={postBody}
              disabled={!isHydrated}
              onChange={(event) => setPostBody(event.target.value)}
            />
            <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
              <input
                className="control-input h-10 rounded-md border px-3 text-sm outline-none focus:border-[color:var(--accent)]"
                aria-label={dictionary.attachUrl}
                placeholder={dictionary.attachUrlPlaceholder}
                value={mediaUrl}
                disabled={!isHydrated}
                onChange={(event) => setMediaUrl(event.target.value)}
              />
              <Button
                type="button"
                onClick={addUrlMedia}
                disabled={!isHydrated}
              >
                <Link2 className="size-4" aria-hidden />
                {dictionary.attachUrl}
              </Button>
              <Button
                type="button"
                variant="subtle"
                onClick={insertSpoiler}
                disabled={!isHydrated}
              >
                {dictionary.spoiler}
              </Button>
              <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)] px-3 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--accent-2)]">
                <Upload className="size-4" aria-hidden />
                {uploadingMedia ? dictionary.loading : dictionary.uploadMedia}
                <input
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                  disabled={!isHydrated || uploadingMedia}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }
                    const formData = new FormData();
                    formData.append("file", file);
                    setUploadingMedia(true);
                    setSocialError(null);
                    void uploadPostMedia(formData)
                      .then((media) => {
                        setPostMedia((items) => [...items, media].slice(0, 6));
                      })
                      .catch((error: unknown) => {
                        setSocialError(
                          error instanceof Error
                            ? error.message
                            : dictionary.mediaUploadFailed,
                        );
                      })
                      .finally(() => {
                        setUploadingMedia(false);
                        event.target.value = "";
                      });
                  }}
                />
              </label>
            </div>
            {postMedia.length > 0 ? (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {postMedia.map((media, index) => (
                  <div key={`${media.url}-${index}`} className="relative">
                    <MediaPreview media={media} />
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-md border border-[color:var(--line)] bg-[color:var(--control-bg)]/95 px-2 py-1 text-xs font-medium text-[color:var(--input-fg)] shadow-sm"
                      onClick={() =>
                        setPostMedia((items) =>
                          items.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      {dictionary.remove}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <input
              className="control-input mt-2 h-10 w-full rounded-md border px-3 text-sm outline-none focus:border-[color:var(--accent)]"
              aria-label={dictionary.postTags}
              placeholder={dictionary.postTagsPlaceholder}
              value={postTags}
              disabled={!isHydrated}
              onChange={(event) => setPostTags(event.target.value)}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[color:var(--muted)]">
                {dictionary.composerSupport}
              </p>
              <Button
                variant="primary"
                disabled={
                  !isHydrated ||
                  postTitle.trim().length < 3 ||
                  postBody.trim().length < 1 ||
                  (composerType === "project_signal" && !projectSignal)
                }
                onClick={publishPost}
              >
                {dictionary.publish}
              </Button>
            </div>
            {composerType === "project_signal" && !projectSignal ? (
              <p className="mt-2 text-xs text-[color:var(--muted)]">
                {dictionary.projectPreviewRequired}
              </p>
            ) : null}
            {socialStatus ? (
              <p className="status-success mt-3 rounded-md p-2 text-xs">
                {socialStatus}
              </p>
            ) : null}
            {socialError ? (
              <p className="status-warning mt-3 rounded-md p-2 text-xs">
                {socialError}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="divide-y divide-[color:var(--line)]">
          {visibleFeed.map((item, index) => {
            const state = getPostState(item);
            const feedReasons = explainFeedItemForViewer(item, viewer);

            return (
              <article
                key={item.id}
                className="p-4 transition hover:bg-white/[0.035]"
              >
                <div className="flex gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--badge-cyan-border)] bg-[color:var(--badge-cyan-bg)] text-sm font-semibold text-[color:var(--badge-cyan-text)]">
                    {item.type === "rss" ? (
                      <Rss className="size-4" aria-hidden />
                    ) : (
                      item.authorName.slice(0, 1)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold text-[color:var(--foreground)]">
                        {item.authorName}
                      </span>
                      <span className="text-[color:var(--muted)]">·</span>
                      <span className="text-[color:var(--muted)]">
                        {formatTime(item.createdAt, locale)}
                      </span>
                      <Badge tone={categoryTones[item.category]}>
                        {categoryLabels[item.category]}
                      </Badge>
                      {item.type === "rss" ? (
                        <Badge tone="cyan">RSS</Badge>
                      ) : null}
                      {item.type === "course" ? (
                        <Badge tone="amber">{dictionary.courses}</Badge>
                      ) : null}
                      {item.contentType === "project_signal" ? (
                        <Badge tone="green">{dictionary.projectSignal}</Badge>
                      ) : null}
                      {item.contentType === "question" ? (
                        <Badge tone="amber">{dictionary.questionPost}</Badge>
                      ) : null}
                      {item.contentType === "build_log" ? (
                        <Badge tone="green">{dictionary.buildLogPost}</Badge>
                      ) : null}
                      {item.contentType === "resource" ? (
                        <Badge tone="cyan">{dictionary.resourcePost}</Badge>
                      ) : null}
                      {item.contentType === "course_update" ? (
                        <Badge tone="blue">{dictionary.courseUpdatePost}</Badge>
                      ) : null}
                    </div>
                    {item.type === "rss" && item.sourceUrl ? (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block font-medium text-[color:var(--foreground)] hover:text-[color:var(--accent)]"
                      >
                        {item.title}
                      </a>
                    ) : item.type === "course" ? (
                      <Link
                        href={`/courses/${item.id}?lang=${locale}`}
                        className="mt-2 block font-medium text-[color:var(--foreground)] hover:text-[color:var(--accent)]"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <Link
                        href={`/binnacle/${item.id}?lang=${locale}`}
                        className="mt-2 block font-medium text-[color:var(--foreground)] hover:text-[color:var(--accent)]"
                      >
                        {item.title}
                      </Link>
                    )}
                    {editingPost?.id === item.id ? (
                      <div className="mt-3 rounded-md border border-cyan-300/25 bg-black/15 p-3">
                        <label className="grid gap-1 text-xs font-medium text-[color:var(--muted)]">
                          {dictionary.editTitle}
                          <input
                            className="control-input h-9 rounded-md border px-3 text-sm font-normal outline-none focus:border-[color:var(--accent)]"
                            value={editingPost.title}
                            onChange={(event) =>
                              setEditingPost((current) =>
                                current
                                  ? { ...current, title: event.target.value }
                                  : current,
                              )
                            }
                          />
                        </label>
                        <label className="mt-2 grid gap-1 text-xs font-medium text-[color:var(--muted)]">
                          {dictionary.editBody}
                          <textarea
                            className="control-input min-h-28 resize-y rounded-md border p-3 text-sm font-normal outline-none focus:border-[color:var(--accent)]"
                            value={editingPost.body}
                            onChange={(event) =>
                              setEditingPost((current) =>
                                current
                                  ? { ...current, body: event.target.value }
                                  : current,
                              )
                            }
                          />
                        </label>
                        <label className="mt-2 grid gap-1 text-xs font-medium text-[color:var(--muted)]">
                          {dictionary.editTags}
                          <input
                            className="control-input h-9 rounded-md border px-3 text-sm font-normal outline-none focus:border-[color:var(--accent)]"
                            value={editingPost.tags}
                            onChange={(event) =>
                              setEditingPost((current) =>
                                current
                                  ? { ...current, tags: event.target.value }
                                  : current,
                              )
                            }
                          />
                        </label>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            disabled={
                              editingPost.title.trim().length < 3 ||
                              editingPost.body.trim().length === 0
                            }
                            onClick={() => savePostEdit(item)}
                          >
                            {dictionary.saveEdit}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingPost(null)}
                          >
                            {dictionary.cancel}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
                        <SafeMarkdown value={item.body} />
                      </div>
                    )}
                    {item.contentType &&
                    item.contentType !== "standard" &&
                    item.contentType !== "project_signal" ? (
                      <div className="mt-3 rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)] p-3 text-xs text-[color:var(--muted)]">
                        <span className="font-semibold text-[color:var(--foreground)]">
                          {item.contentType === "question"
                            ? dictionary.questionPost
                            : item.contentType === "build_log"
                              ? dictionary.buildLogPost
                              : item.contentType === "resource"
                                ? dictionary.resourcePost
                                : dictionary.courseUpdatePost}
                        </span>{" "}
                        ·{" "}
                        {item.contentType === "question"
                          ? dictionary.questionPostHint
                          : item.contentType === "build_log"
                            ? dictionary.buildLogPostHint
                            : item.contentType === "resource"
                              ? dictionary.resourcePostHint
                              : dictionary.courseUpdatePostHint}
                      </div>
                    ) : null}
                    {item.contentType === "project_signal" &&
                    item.projectSignal ? (
                      <div className="mt-3 rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <a
                            href={item.projectSignal.repoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--foreground)] hover:text-[color:var(--accent)]"
                          >
                            <GitBranch className="size-4" aria-hidden />
                            {item.projectSignal.owner}/{item.projectSignal.name}
                          </a>
                          <span className="text-xs text-[color:var(--muted)]">
                            {item.projectSignal.maturity} ·{" "}
                            {item.projectSignal.intent}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                          {item.projectSignal.description}
                        </p>
                        <div className="mt-3 grid gap-2 md:grid-cols-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
                              {dictionary.stack}
                            </p>
                            <p className="mt-1 text-xs text-[color:var(--foreground)]">
                              {item.projectSignal.stack.join(", ") ||
                                dictionary.openValue}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
                              {dictionary.projectNeeds}
                            </p>
                            <p className="mt-1 text-xs text-[color:var(--foreground)]">
                              {item.projectSignal.needs.join(", ")}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
                              {dictionary.projectSignals}
                            </p>
                            <p className="mt-1 text-xs text-[color:var(--foreground)]">
                              {item.projectSignal.evidence.stars}{" "}
                              {dictionary.stars} ·{" "}
                              {item.projectSignal.evidence.forks}{" "}
                              {dictionary.forks}
                            </p>
                          </div>
                        </div>
                        <ProjectSignalResponseActions
                          postId={item.id}
                          locale={locale}
                          initialResponses={
                            item.projectSignalViewerResponses ?? []
                          }
                        />
                      </div>
                    ) : null}
                    {feedReasons.length > 0 ? (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-[color:var(--muted)]">
                        <Info className="size-3.5" aria-hidden />
                        <span>{dictionary.whySeeingThis}:</span>
                        {feedReasons.map((reason) => (
                          <span
                            key={reason}
                            className="rounded-full border border-[color:var(--line)] bg-[color:var(--surface-2)] px-2 py-1"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {item.type === "rss" ? (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open ${item.title}`}
                        className="mt-3 block overflow-hidden rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)]"
                      >
                        <div className="relative aspect-[2.4/1] w-full">
                          <RssCover
                            title={item.title}
                            imageUrl={item.imageUrl}
                            priority={index < 3}
                            className="absolute inset-0"
                          />
                        </div>
                      </a>
                    ) : null}
                    {item.type === "course" ? (
                      <Link
                        href={`/courses/${item.id}?lang=${locale}`}
                        aria-label={`Open ${item.title}`}
                        className="mt-3 block overflow-hidden rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)]"
                      >
                        <div className="relative aspect-[2.4/1] w-full">
                          <RssCover
                            title={item.title}
                            imageUrl={item.imageUrl}
                            priority={index < 3}
                            className="absolute inset-0"
                          />
                        </div>
                      </Link>
                    ) : null}
                    {item.media.length > 0 ? (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {item.media.map((media, index) => (
                          <MediaPreview
                            key={`${media.url}-${index}`}
                            media={media}
                          />
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className="text-xs text-[color:var(--accent)] hover:underline"
                          onClick={() => setQuery(`#${tag}`)}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[color:var(--muted)]">
                      {item.type === "post" ? (
                        <button
                          type="button"
                          className="flex items-center gap-1.5 hover:text-rose-300 disabled:cursor-not-allowed disabled:text-stone-500 disabled:opacity-100"
                          onClick={() => {
                            runFeedAction(
                              () =>
                                toggleInterest({ postId: item.id }).then(
                                  (result) => {
                                    const nextInterested =
                                      typeof result === "object" &&
                                      result !== null &&
                                      "interested" in result
                                        ? Boolean(result.interested)
                                        : !state.interested;
                                    setPostStates((current) => ({
                                      ...current,
                                      [item.id]: {
                                        ...state,
                                        interested: nextInterested,
                                        interests: nextInterested
                                          ? state.interests + 1
                                          : Math.max(0, state.interests - 1),
                                      },
                                    }));
                                    return result;
                                  },
                                ),
                              dictionary.interestUpdated,
                            );
                          }}
                        >
                          <Heart
                            className={
                              state.interested
                                ? "size-4 fill-rose-500 text-rose-500"
                                : "size-4"
                            }
                            aria-hidden
                          />
                          {state.interests}
                        </button>
                      ) : null}
                      {item.type === "post" && item.media.length > 0 ? (
                        <span className="flex items-center gap-1.5">
                          {item.media.some(
                            (media) =>
                              media.type === "embed" || media.type === "video",
                          ) ? (
                            <Play className="size-4" aria-hidden />
                          ) : (
                            <ImageIcon className="size-4" aria-hidden />
                          )}
                          {item.media.length}
                        </span>
                      ) : null}
                      {item.type === "post" ? (
                        <Link
                          href={`/binnacle/${item.id}?lang=${locale}`}
                          className="flex items-center gap-1.5 hover:text-[color:var(--accent)]"
                        >
                          <MessageSquare className="size-4" aria-hidden />
                          {item.comments}
                        </Link>
                      ) : null}
                      {item.type === "post" ? (
                        <button
                          type="button"
                          className="flex items-center gap-1.5 hover:text-[color:var(--foreground)] disabled:cursor-not-allowed disabled:text-stone-500 disabled:opacity-100"
                          onClick={() => {
                            runFeedAction(
                              () =>
                                savePost({ postId: item.id }).then((result) => {
                                  setPostStates((current) => ({
                                    ...current,
                                    [item.id]: {
                                      ...state,
                                      saved: true,
                                    },
                                  }));
                                  return result;
                                }),
                              state.saved
                                ? dictionary.postAlreadySaved
                                : dictionary.postSaved,
                            );
                          }}
                        >
                          <Bookmark
                            className={
                              state.saved
                                ? "size-4 fill-current text-[color:var(--accent)]"
                                : "size-4"
                            }
                            aria-hidden
                          />
                          {state.saved
                            ? dictionary.savedState
                            : dictionary.save}
                        </button>
                      ) : null}
                      {item.type === "post" ? (
                        <button
                          type="button"
                          className="flex items-center gap-1.5 hover:text-[color:var(--accent-2)] disabled:cursor-not-allowed disabled:text-stone-500 disabled:opacity-100"
                          disabled={state.reported}
                          onClick={() => {
                            runFeedAction(
                              () =>
                                reportEntity({
                                  entityType: "post",
                                  entityId: item.id,
                                  reason: "other",
                                  details: "Reported from Binnacle feed.",
                                }).then((result) => {
                                  setPostStates((current) => ({
                                    ...current,
                                    [item.id]: {
                                      ...state,
                                      reported: true,
                                    },
                                  }));
                                  return result;
                                }),
                              dictionary.reportSentPrivately,
                            );
                          }}
                        >
                          <Flag className="size-4" aria-hidden />
                          {state.reported
                            ? dictionary.reported
                            : dictionary.report}
                        </button>
                      ) : null}
                      {item.type === "rss" && item.sourceUrl ? (
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 hover:text-[color:var(--accent)]"
                        >
                          <ExternalLink className="size-4" aria-hidden />
                          {dictionary.openSource}
                        </a>
                      ) : null}
                      {item.type === "course" ? (
                        <Link
                          href={`/courses/${item.id}?lang=${locale}`}
                          className="flex items-center gap-1.5 hover:text-[color:var(--accent)]"
                        >
                          <ExternalLink className="size-4" aria-hidden />
                          {dictionary.openCourse}
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        className="flex items-center gap-1.5 hover:text-[color:var(--accent)]"
                        onClick={() => sendFeedback(item, "more_like_this")}
                      >
                        <Wand2 className="size-4" aria-hidden />
                        {dictionary.moreLikeThis}
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 hover:text-[color:var(--accent-2)]"
                        onClick={() => sendFeedback(item, "less_like_this")}
                      >
                        <EyeOff className="size-4" aria-hidden />
                        {dictionary.lessLikeThis}
                      </button>
                      {item.tags[0] ? (
                        <button
                          type="button"
                          className="flex items-center gap-1.5 hover:text-[color:var(--accent-2)]"
                          onClick={() =>
                            sendFeedback(item, "mute_tag", item.tags[0])
                          }
                        >
                          <SlidersHorizontal className="size-4" aria-hidden />
                          {dictionary.muteTag}
                        </button>
                      ) : null}
                      {item.type === "rss" ? (
                        <button
                          type="button"
                          className="flex items-center gap-1.5 hover:text-[color:var(--accent-2)]"
                          onClick={() =>
                            sendFeedback(
                              item,
                              "mute_source",
                              item.authorName.replace(/^RSS:\s*/i, ""),
                            )
                          }
                        >
                          <EyeOff className="size-4" aria-hidden />
                          {dictionary.muteSource}
                        </button>
                      ) : null}
                      <ShareMenu
                        locale={locale}
                        url={shareUrlForItem(item)}
                        title={item.title}
                        description={item.body}
                        tags={item.tags}
                        compact
                      />
                      {item.type === "post" && item.viewerState?.canDelete ? (
                        <button
                          type="button"
                          className="ml-auto flex items-center gap-1.5 hover:text-[color:var(--accent)] disabled:cursor-not-allowed disabled:text-stone-500 disabled:opacity-100"
                          onClick={() =>
                            setEditingPost({
                              id: item.id,
                              title: item.title,
                              body: item.body,
                              tags: item.tags.join(", "),
                            })
                          }
                        >
                          <Pencil className="size-4" aria-hidden />
                          {dictionary.edit}
                        </button>
                      ) : null}
                      {item.type === "post" && item.viewerState?.canDelete ? (
                        <button
                          type="button"
                          className="flex items-center gap-1.5 hover:text-rose-300 disabled:cursor-not-allowed disabled:text-stone-500 disabled:opacity-100"
                          onClick={() =>
                            runFeedAction(
                              () =>
                                deletePost({ postId: item.id }).then(
                                  (result) => {
                                    setPostStates((current) => ({
                                      ...current,
                                      [item.id]: {
                                        ...state,
                                        deleted: true,
                                      },
                                    }));
                                    return result;
                                  },
                                ),
                              dictionary.postRemoved,
                            )
                          }
                        >
                          <Trash2 className="size-4" aria-hidden />
                          {dictionary.delete}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
          {visibleFeed.length === 0 ? (
            <p className="p-4 text-sm text-[color:var(--muted)]">
              {dictionary.noFeedResults}
            </p>
          ) : null}
          {nextCursor !== null || visibleFeed.length < totalItems ? (
            <div className="flex items-center justify-center p-4">
              <Button
                type="button"
                variant="subtle"
                disabled={loadingMore}
                onClick={loadMoreItems}
              >
                {loadingMore ? dictionary.loading : dictionary.loadMore}
              </Button>
            </div>
          ) : null}
        </div>
      </Panel>

      <aside className="min-w-0 space-y-5">
        <Panel className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">
                {dictionary.externalTrending}
              </h2>
              <p className="mt-1 text-xs text-[color:var(--muted)]">
                {externalTrends[0]?.window === "today"
                  ? dictionary.trendWindowToday
                  : dictionary.trendWindowRecent}
              </p>
            </div>
            <Rss className="mt-0.5 size-4 text-[color:var(--accent)]" />
          </div>
          {externalTrends.length > 0 ? (
            <ol className="mt-4 space-y-3 text-sm">
              {externalTrends.map((trend, index) => (
                <li key={trend.slug} className="min-w-0">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 w-4 shrink-0 text-xs text-[color:var(--muted)]">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        data-trend-topic={trend.slug}
                        className="block max-w-full truncate text-left font-medium text-[color:var(--foreground)] hover:text-[color:var(--accent)]"
                        onClick={() => applyTrendFilter(trend)}
                      >
                        {trend.label}
                      </button>
                      <p className="mt-1 text-xs text-[color:var(--muted)]">
                        {dictionary.trendEvidence(
                          trend.articleCount,
                          trend.sourceCount,
                        )}
                      </p>
                      {trend.latestUrl ? (
                        <a
                          href={trend.latestUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex max-w-full items-center gap-1 text-xs text-[color:var(--accent)] hover:underline"
                          title={trend.latestTitle}
                        >
                          <ExternalLink className="size-3" aria-hidden />
                          <span className="truncate">
                            {dictionary.trendLatestSource}
                          </span>
                        </a>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-[color:var(--muted)]">
              {dictionary.trendingEmpty}
            </p>
          )}
        </Panel>
        <Panel className="p-4">
          <h2 className="text-sm font-semibold">{dictionary.whoToFollow}</h2>
          <div className="mt-4 space-y-4">
            {suggestedProfiles.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-medium">{profile.name}</p>
                  <p className="text-xs text-[color:var(--muted)]">
                    @{profile.handle}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    runFeedAction(
                      () => followProfile({ profileUserId: profile.id }),
                      dictionary.followUpdated,
                    )
                  }
                >
                  {dictionary.follow}
                </Button>
              </div>
            ))}
          </div>
        </Panel>
      </aside>
    </div>
  );
}
