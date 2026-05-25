import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  ".next",
  "node_modules",
  "playwright-report",
  "test-results",
  ".turbo",
]);
const ignoredFiles = new Set(["pnpm-lock.yaml"]);
const highConfidencePatterns = [
  [/GOCSPX-[A-Za-z0-9_-]{20,}/g, "Google OAuth client secret"],
  [/gh[pousr]_[A-Za-z0-9_]{30,}/g, "GitHub token"],
  [/github_pat_[A-Za-z0-9_]{50,}/g, "GitHub fine-grained token"],
  [/cfat_[A-Za-z0-9_-]{30,}/g, "Cloudflare API token"],
  [/npg_[A-Za-z0-9]{16,}/g, "Neon password"],
  [/postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@[^"'\s]+/g, "Postgres URL"],
  [/sk-[A-Za-z0-9]{32,}/g, "OpenAI-style secret key"],
  [/phx_[A-Za-z0-9]{20,}/g, "PostHog personal API key"],
];
const allowedMatches = [
  "postgres://devit:devit@localhost:5432/devit",
  "postgres://rubberduck:rubberduck@localhost:5432/rubberduck",
];

function* walk(directory) {
  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry)) {
      continue;
    }

    const fullPath = path.join(directory, entry);
    const relativePath = path.relative(root, fullPath);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      yield* walk(fullPath);
      continue;
    }

    if (ignoredFiles.has(entry) || stats.size > 2_000_000) {
      continue;
    }

    yield relativePath;
  }
}

const findings = [];

for (const file of walk(root)) {
  const text = readFileSync(path.join(root, file), "utf8");
  for (const [pattern, label] of highConfidencePatterns) {
    for (const match of text.matchAll(pattern)) {
      const value = match[0];
      if (allowedMatches.includes(value)) {
        continue;
      }

      const line = text.slice(0, match.index).split("\n").length;
      findings.push({ file, line, label });
    }
  }
}

if (findings.length > 0) {
  console.error("High-confidence secret patterns found:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.label}`);
  }
  process.exit(1);
}

console.log("No high-confidence secrets found.");
