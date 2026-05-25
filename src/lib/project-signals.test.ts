import { describe, expect, it } from "vitest";

import {
  buildProjectSignalDraft,
  createProjectSignalCardText,
  explainProjectSignalMatch,
  parseGitHubRepoUrl,
  type GitHubRepoPreview,
} from "./project-signals";

const preview: GitHubRepoPreview = {
  url: "https://github.com/DeepRatAI/Dev4All",
  owner: "DeepRatAI",
  name: "Dev4All",
  description: "Local-first developer social network for builders.",
  stars: 42,
  forks: 7,
  topics: ["ai", "developer-tools", "open-source"],
  primaryLanguage: "TypeScript",
  license: "MIT",
  homepage: "https://rubberduck.net",
  readmeHeadings: ["Setup", "Architecture", "Testing"],
  rootFiles: [
    "package.json",
    "drizzle.config.ts",
    "next.config.ts",
    "README.md",
    ".github/workflows/ci.yml",
  ],
};

describe("Project Signal", () => {
  it("normalizes common GitHub repository URLs into a stable repo identity", () => {
    expect(parseGitHubRepoUrl("https://github.com/DeepRatAI/Dev4All")).toEqual({
      owner: "DeepRatAI",
      name: "Dev4All",
      repoKey: "deepratai/dev4all",
      url: "https://github.com/DeepRatAI/Dev4All",
    });
    expect(parseGitHubRepoUrl("git@github.com:DeepRatAI/Dev4All.git")).toEqual(
      {
        owner: "DeepRatAI",
        name: "Dev4All",
        repoKey: "deepratai/dev4all",
        url: "https://github.com/DeepRatAI/Dev4All",
      },
    );
  });

  it("rejects unsupported or incomplete repository URLs", () => {
    expect(parseGitHubRepoUrl("https://gitlab.com/org/repo")).toBeNull();
    expect(parseGitHubRepoUrl("https://github.com/only-owner")).toBeNull();
    expect(parseGitHubRepoUrl("not a url")).toBeNull();
  });

  it("builds an editable post draft from shallow repository evidence", () => {
    const draft = buildProjectSignalDraft(preview);

    expect(draft.title).toBe("Project Signal: DeepRatAI/Dev4All");
    expect(draft.body).toContain("Local-first developer social network");
    expect(draft.tags).toEqual(
      expect.arrayContaining([
        "AI Engineering",
        "Developer Tools",
        "Open Source",
        "TypeScript",
        "Next.js",
        "Drizzle",
        "Testing",
        "Technical feedback",
      ]),
    );
    expect(draft.projectSignal).toMatchObject({
      repoUrl: "https://github.com/DeepRatAI/Dev4All",
      repoKey: "deepratai/dev4all",
      owner: "DeepRatAI",
      name: "Dev4All",
      primaryLanguage: "TypeScript",
      license: "MIT",
      domains: ["AI Engineering", "Developer Tools", "Open Source"],
      stack: ["TypeScript", "Next.js", "Drizzle"],
      needs: ["Technical feedback", "Testing"],
      maturity: "MVP",
      intent: "Looking for feedback",
    });
    expect(draft.projectSignal.evidence.readmeHeadings).toEqual([
      "Setup",
      "Architecture",
      "Testing",
    ]);
    expect(draft.projectSignal.stack).not.toContain("Python");
  });

  it("creates a compact card text without losing the collaboration signal", () => {
    const draft = buildProjectSignalDraft(preview);

    expect(createProjectSignalCardText(draft.projectSignal)).toBe(
      "DeepRatAI/Dev4All · TypeScript, Next.js, Drizzle · Looking for feedback · needs Technical feedback, Testing",
    );
  });

  it("explains why a project matches a viewer without opaque ranking language", () => {
    const draft = buildProjectSignalDraft(preview);
    const reasons = explainProjectSignalMatch(draft.projectSignal, {
      interests: ["ai engineering", "testing"],
      stack: ["typescript", "postgresql"],
      contributionNeeds: ["technical feedback"],
      locale: "en",
    });

    expect(reasons).toEqual([
      "Matches your interest in AI Engineering",
      "Uses TypeScript from your stack",
      "Looking for Technical feedback",
      "Published in your preferred language",
    ]);
  });
});
