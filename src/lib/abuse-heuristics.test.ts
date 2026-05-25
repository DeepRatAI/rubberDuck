import { describe, expect, it } from "vitest";

import {
  assertUserContentAcceptable,
  assessUserContent,
} from "./abuse-heuristics";

describe("abuse heuristics", () => {
  it("allows normal technical content with code snippets and links", () => {
    const assessment = assessUserContent({
      title: "RAG chunking strategy",
      body: "I compared semantic chunking with fixed windows. Repo: https://github.com/example/rag-lab",
      tags: ["rag", "python", "postgres"],
    });

    expect(assessment).toEqual({
      decision: "allow",
      flags: [],
      reasons: [],
    });
  });

  it("blocks unsafe markup and URL schemes before persistence", () => {
    expect(() =>
      assertUserContentAcceptable({
        body: "Look at this <script>alert(1)</script> javascript:alert(1)",
      }),
    ).toThrow(/unsafe/i);
  });

  it("blocks repeated links and excessive link stuffing", () => {
    const assessment = assessUserContent({
      body: [
        "https://example.com/a",
        "https://example.com/a",
        "https://example.com/a",
      ].join(" "),
    });

    expect(assessment.decision).toBe("block");
    expect(assessment.flags).toContain("repeated_url");
  });

  it("marks clusters of shortened links for review", () => {
    const assessment = assessUserContent({
      body: "https://bit.ly/a https://t.co/b https://tinyurl.com/c",
    });

    expect(assessment.decision).toBe("review");
    expect(assessment.flags).toContain("shortener_cluster");
  });
});
