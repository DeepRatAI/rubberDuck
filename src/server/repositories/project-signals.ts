import { eq } from "drizzle-orm";

import { db } from "@/db";
import { githubRepoCache } from "@/db/schema";
import { env } from "@/lib/env";
import {
  buildProjectSignalDraft,
  parseGitHubRepoUrl,
  type GitHubRepoPreview,
  type ProjectSignalDraft,
} from "@/lib/project-signals";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function isRecent(date: Date) {
  return Date.now() - date.getTime() < CACHE_TTL_MS;
}

function parseReadmeHeadings(readme: string) {
  return readme
    .split(/\r?\n/)
    .map((line) => /^#{1,3}\s+(.+)$/.exec(line)?.[1]?.trim())
    .filter(Boolean)
    .slice(0, 24) as string[];
}

function asPreviewSnapshot(value: unknown): GitHubRepoPreview | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const snapshot = value as Partial<GitHubRepoPreview>;
  if (
    typeof snapshot.url !== "string" ||
    typeof snapshot.owner !== "string" ||
    typeof snapshot.name !== "string" ||
    !Array.isArray(snapshot.topics) ||
    !Array.isArray(snapshot.readmeHeadings) ||
    !Array.isArray(snapshot.rootFiles)
  ) {
    return null;
  }

  return {
    url: snapshot.url,
    owner: snapshot.owner,
    name: snapshot.name,
    repoKey:
      snapshot.repoKey ?? `${snapshot.owner}/${snapshot.name}`.toLowerCase(),
    description: snapshot.description ?? null,
    stars: Number(snapshot.stars ?? 0),
    forks: Number(snapshot.forks ?? 0),
    topics: snapshot.topics,
    primaryLanguage: snapshot.primaryLanguage ?? null,
    license: snapshot.license ?? null,
    homepage: snapshot.homepage ?? null,
    readmeHeadings: snapshot.readmeHeadings,
    rootFiles: snapshot.rootFiles,
  };
}

async function githubJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "RubberDuck-Project-Signal",
      ...(env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` }
        : {}),
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`GitHub preview request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}

async function githubText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.raw",
      "User-Agent": "RubberDuck-Project-Signal",
      ...(env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` }
        : {}),
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return "";
  }

  return response.text();
}

type GitHubRepoResponse = {
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  topics?: string[];
  language: string | null;
  license: { spdx_id?: string; name?: string } | null;
  homepage: string | null;
};

type GitHubContentEntry = {
  name: string;
  type: string;
};

async function fetchLivePreview(repoUrl: string): Promise<GitHubRepoPreview> {
  const identity = parseGitHubRepoUrl(repoUrl);
  if (!identity) {
    throw new Error(
      "Project Signal requires a valid public GitHub repository.",
    );
  }

  const apiBase = `https://api.github.com/repos/${identity.owner}/${identity.name}`;
  const [repo, rootFiles, readme] = await Promise.all([
    githubJson<GitHubRepoResponse>(apiBase),
    githubJson<GitHubContentEntry[]>(`${apiBase}/contents`).catch(() => []),
    githubText(`${apiBase}/readme`),
  ]);

  return {
    owner: identity.owner,
    name: identity.name,
    repoKey: identity.repoKey,
    url: identity.url,
    description: repo.description,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    topics: repo.topics ?? [],
    primaryLanguage: repo.language,
    license: repo.license?.spdx_id ?? repo.license?.name ?? null,
    homepage: repo.homepage,
    readmeHeadings: parseReadmeHeadings(readme),
    rootFiles: rootFiles
      .filter((entry) => entry.type === "file" || entry.type === "dir")
      .map((entry) => entry.name)
      .slice(0, 120),
  };
}

export async function previewProjectSignalDraft(
  repoUrl: string,
): Promise<ProjectSignalDraft> {
  const identity = parseGitHubRepoUrl(repoUrl);
  if (!identity) {
    throw new Error(
      "Project Signal requires a valid public GitHub repository.",
    );
  }

  const [cached] = await db
    .select({
      snapshot: githubRepoCache.snapshot,
      fetchedAt: githubRepoCache.fetchedAt,
    })
    .from(githubRepoCache)
    .where(eq(githubRepoCache.repoKey, identity.repoKey));
  const cachedPreview = asPreviewSnapshot(cached?.snapshot);

  if (cached && cachedPreview && isRecent(cached.fetchedAt)) {
    return buildProjectSignalDraft(cachedPreview);
  }

  const preview = await fetchLivePreview(identity.url);
  const repoKey = preview.repoKey ?? identity.repoKey;
  await db
    .insert(githubRepoCache)
    .values({
      repoKey,
      owner: preview.owner,
      name: preview.name,
      url: preview.url,
      snapshot: { ...preview, repoKey },
      fetchedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: githubRepoCache.repoKey,
      set: {
        owner: preview.owner,
        name: preview.name,
        url: preview.url,
        snapshot: { ...preview, repoKey },
        fetchedAt: new Date(),
      },
    });

  return buildProjectSignalDraft(preview);
}
