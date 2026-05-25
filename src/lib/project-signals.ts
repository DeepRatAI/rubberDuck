export type PostContentType =
  | "standard"
  | "project_signal"
  | "course_update"
  | "question"
  | "build_log"
  | "resource";

export type ProjectSignalMaturity =
  | "Idea"
  | "Prototype"
  | "MVP"
  | "Active development"
  | "Beta"
  | "Production-ready"
  | "Maintained"
  | "Experimental"
  | "Archived";

export type ProjectSignalIntent =
  | "Showcase"
  | "Looking for feedback"
  | "Looking for contributors"
  | "Build in public"
  | "Launch"
  | "Changelog"
  | "Research note"
  | "Learning resource";

export type GitHubRepoIdentity = {
  owner: string;
  name: string;
  repoKey: string;
  url: string;
};

export type GitHubRepoPreview = Omit<GitHubRepoIdentity, "repoKey"> & {
  repoKey?: string;
  description?: string | null;
  stars: number;
  forks: number;
  topics: string[];
  primaryLanguage?: string | null;
  license?: string | null;
  homepage?: string | null;
  readmeHeadings: string[];
  rootFiles: string[];
};

export type ProjectSignalMetadata = Omit<GitHubRepoIdentity, "url"> & {
  repoUrl: string;
  description: string;
  primaryLanguage?: string | null;
  license?: string | null;
  homepage?: string | null;
  domains: string[];
  stack: string[];
  needs: string[];
  maturity: ProjectSignalMaturity;
  intent: ProjectSignalIntent;
  audience: string[];
  language: "en" | "es";
  evidence: {
    stars: number;
    forks: number;
    topics: string[];
    readmeHeadings: string[];
    rootFiles: string[];
  };
};

export type ProjectSignalDraft = {
  contentType: "project_signal";
  category: "Project";
  title: string;
  body: string;
  tags: string[];
  projectSignal: ProjectSignalMetadata;
};

export type ProjectSignalViewer = {
  interests: string[];
  stack?: string[];
  contributionNeeds?: string[];
  locale?: "en" | "es";
};

const TOPIC_DOMAIN_MAP: Record<string, string> = {
  ai: "AI Engineering",
  "artificial-intelligence": "AI Engineering",
  llm: "AI Engineering",
  "developer-tools": "Developer Tools",
  devtools: "Developer Tools",
  education: "Education",
  data: "Data",
  infrastructure: "Infrastructure",
  security: "Security",
  "open-source": "Open Source",
  research: "Research",
  "local-first": "Local-first",
  productivity: "Productivity",
  systems: "Systems",
  design: "Design Tools",
  testing: "Testing",
  observability: "Observability",
  web: "Web Development",
};

const FILE_STACK_RULES: Array<[string, string]> = [
  ["package.json", "TypeScript"],
  ["next.config", "Next.js"],
  ["vite.config", "React"],
  ["drizzle.config", "Drizzle"],
  ["Dockerfile", "Docker"],
  ["docker-compose", "Docker"],
  ["pyproject.toml", "Python"],
  ["requirements.txt", "Python"],
  ["Cargo.toml", "Rust"],
  ["go.mod", "Go"],
  ["supabase", "Supabase"],
  ["wrangler", "Cloudflare"],
  ["vercel", "Vercel"],
];

const TOPIC_STACK_MAP: Record<string, string> = {
  typescript: "TypeScript",
  python: "Python",
  rust: "Rust",
  go: "Go",
  nextjs: "Next.js",
  react: "React",
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  drizzle: "Drizzle",
  docker: "Docker",
  pyodide: "Pyodide",
  supabase: "Supabase",
  cloudflare: "Cloudflare",
  vercel: "Vercel",
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function parseGitHubRepoUrl(value: string): GitHubRepoIdentity | null {
  const input = value.trim();

  const sshMatch = /^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i.exec(input);
  if (sshMatch?.[1] && sshMatch[2]) {
    const owner = sshMatch[1];
    const name = sshMatch[2].replace(/\.git$/i, "");
    return toRepoIdentity(owner, name);
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  if (url.hostname.toLowerCase() !== "github.com") {
    return null;
  }

  const [owner, rawName, ...rest] = url.pathname
    .split("/")
    .filter(Boolean);

  if (!owner || !rawName || rest.length > 0) {
    return null;
  }

  return toRepoIdentity(owner, rawName.replace(/\.git$/i, ""));
}

function toRepoIdentity(owner: string, name: string): GitHubRepoIdentity | null {
  if (!/^[a-zA-Z0-9_.-]+$/.test(owner) || !/^[a-zA-Z0-9_.-]+$/.test(name)) {
    return null;
  }

  return {
    owner,
    name,
    repoKey: `${owner}/${name}`.toLowerCase(),
    url: `https://github.com/${owner}/${name}`,
  };
}

function inferDomains(preview: GitHubRepoPreview) {
  const fromTopics = preview.topics
    .map((topic) => TOPIC_DOMAIN_MAP[normalize(topic)])
    .filter(Boolean);
  const fromDescription =
    /developer|tool|builder/i.test(preview.description ?? "")
      ? ["Developer Tools"]
      : [];

  return unique([...fromTopics, ...fromDescription]).slice(0, 5);
}

function inferStack(preview: GitHubRepoPreview) {
  const rootFiles = preview.rootFiles.map(normalize);
  const fromFiles = FILE_STACK_RULES.flatMap(([needle, label]) =>
    rootFiles.some((file) => file.includes(needle.toLowerCase()))
      ? [label]
      : [],
  );
  const fromTopics = preview.topics
    .map((topic) => TOPIC_STACK_MAP[normalize(topic)])
    .filter(Boolean);
  const fromLanguage = preview.primaryLanguage ? [preview.primaryLanguage] : [];

  return unique([...fromLanguage, ...fromFiles, ...fromTopics]).slice(0, 8);
}

function inferNeeds(preview: GitHubRepoPreview) {
  const headings = preview.readmeHeadings.map(normalize);
  const rootFiles = preview.rootFiles.map(normalize);
  const needs = ["Technical feedback"];

  if (
    headings.some((heading) => heading.includes("test")) ||
    rootFiles.some((file) => file.includes(".github/workflows"))
  ) {
    needs.push("Testing");
  }

  if (headings.some((heading) => heading.includes("contribut"))) {
    needs.push("Contributors");
  }

  if (headings.some((heading) => heading.includes("security"))) {
    needs.push("Security review");
  }

  return unique(needs).slice(0, 5);
}

function inferMaturity(preview: GitHubRepoPreview): ProjectSignalMaturity {
  const rootFiles = preview.rootFiles.map(normalize);
  const hasReadme = rootFiles.includes("readme.md");
  const hasPackage = rootFiles.includes("package.json");
  const hasCi = rootFiles.some((file) => file.includes(".github/workflows"));

  if (preview.topics.some((topic) => normalize(topic) === "experimental")) {
    return "Experimental";
  }

  if (hasReadme && hasPackage && hasCi) {
    return "MVP";
  }

  if (hasReadme && (hasPackage || preview.stars > 5)) {
    return "Prototype";
  }

  return "Idea";
}

function buildBody(preview: GitHubRepoPreview, stack: string[], needs: string[]) {
  const description =
    preview.description?.trim() || "A project shared for builder feedback.";
  const evidence = [
    `Repository: ${preview.owner}/${preview.name}`,
    stack.length > 0 ? `Stack signals: ${stack.join(", ")}` : undefined,
    needs.length > 0 ? `Looking for: ${needs.join(", ")}` : undefined,
    preview.homepage ? `Homepage: ${preview.homepage}` : undefined,
  ].filter(Boolean);

  return `${description}\n\n${evidence.join("\n")}`;
}

export function buildProjectSignalDraft(
  preview: GitHubRepoPreview,
): ProjectSignalDraft {
  const identity = parseGitHubRepoUrl(preview.url) ?? {
    owner: preview.owner,
    name: preview.name,
    repoKey: `${preview.owner}/${preview.name}`.toLowerCase(),
    url: `https://github.com/${preview.owner}/${preview.name}`,
  };
  const domains = inferDomains(preview);
  const stack = inferStack(preview);
  const needs = inferNeeds(preview);
  const maturity = inferMaturity(preview);
  const projectSignal: ProjectSignalMetadata = {
    owner: identity.owner,
    name: identity.name,
    repoKey: identity.repoKey,
    repoUrl: identity.url,
    description:
      preview.description?.trim() || "A project shared for builder feedback.",
    primaryLanguage: preview.primaryLanguage,
    license: preview.license,
    homepage: preview.homepage,
    domains,
    stack,
    needs,
    maturity,
    intent: "Looking for feedback",
    audience: ["Builders", "Open source maintainers"],
    language: "en",
    evidence: {
      stars: preview.stars,
      forks: preview.forks,
      topics: preview.topics,
      readmeHeadings: preview.readmeHeadings,
      rootFiles: preview.rootFiles,
    },
  };

  return {
    contentType: "project_signal",
    category: "Project",
    title: `Project Signal: ${identity.owner}/${identity.name}`,
    body: buildBody(preview, stack, needs),
    tags: unique([...domains, ...stack, ...needs, projectSignal.intent]).slice(
      0,
      12,
    ),
    projectSignal,
  };
}

export function createProjectSignalCardText(
  signal: ProjectSignalMetadata,
): string {
  const stack = signal.stack.length > 0 ? signal.stack.join(", ") : "stack open";
  const needs =
    signal.needs.length > 0 ? `needs ${signal.needs.join(", ")}` : "open to discussion";

  return `${signal.owner}/${signal.name} · ${stack} · ${signal.intent} · ${needs}`;
}

function firstMatch(source: string[], target: string[]) {
  const normalized = new Set(target.map(normalize));
  return source.find((value) => normalized.has(normalize(value)));
}

export function explainProjectSignalMatch(
  signal: ProjectSignalMetadata,
  viewer: ProjectSignalViewer,
): string[] {
  const interests = viewer.interests;
  const stack = viewer.stack ?? interests;
  const contributionNeeds = viewer.contributionNeeds ?? interests;
  const domain = firstMatch(signal.domains, interests);
  const stackMatch = firstMatch(signal.stack, stack);
  const need = firstMatch(signal.needs, contributionNeeds);
  const reasons = [
    domain ? `Matches your interest in ${domain}` : undefined,
    stackMatch ? `Uses ${stackMatch} from your stack` : undefined,
    need ? `Looking for ${need}` : undefined,
    viewer.locale === signal.language
      ? `Published in your preferred language`
      : undefined,
  ].filter(Boolean);

  return reasons.slice(0, 4) as string[];
}
