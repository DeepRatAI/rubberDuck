import { describe, expect, it } from "vitest";

import type { ProjectSignalMetadata } from "./project-signals";
import { buildProjectSignalShareSvg } from "./share-card";

const projectSignal: ProjectSignalMetadata = {
  repoUrl: "https://github.com/DeepRatAI/rubberDuck",
  repoKey: "deepratai/rubberduck",
  owner: "DeepRatAI",
  name: "rubberDuck",
  description: "Local-first developer network for executable knowledge.",
  primaryLanguage: "TypeScript",
  domains: ["AI Engineering"],
  stack: ["TypeScript", "Postgres"],
  needs: ["Technical feedback", "Early users"],
  maturity: "MVP",
  intent: "Looking for feedback",
  audience: ["builders"],
  language: "en",
  evidence: {
    stars: 42,
    forks: 7,
    topics: ["ai"],
    readmeHeadings: ["Setup"],
    rootFiles: ["package.json"],
  },
};

describe("share cards", () => {
  it("builds escaped Project Signal SVG cards for external networks", () => {
    const svg = buildProjectSignalShareSvg({
      title: "Project <Signal>",
      authorName: "Alex & Co",
      projectSignal,
    });

    expect(svg).toContain("<svg");
    expect(svg).toContain("Project &lt;Signal&gt;");
    expect(svg).toContain("Alex &amp; Co");
    expect(svg).toContain("DeepRatAI/rubberDuck");
    expect(svg).toContain("Technical feedback");
  });
});
