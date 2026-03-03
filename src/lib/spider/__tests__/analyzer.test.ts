import { describe, it, expect } from "vitest";
import { analyzePost } from "../analyzer";
import type { ExternalPost } from "../types";

function makePost(overrides: Partial<ExternalPost> = {}): ExternalPost {
  return {
    id: "test1",
    title: "[Hiring] Need a Python developer for data processing",
    body: "Looking for someone to write a Python script to clean CSV data and convert to JSON. Budget: $100-$200. Must know pandas and SQL.",
    author: "testuser",
    url: "https://www.reddit.com/r/forhire/comments/test1",
    source: "reddit:r/forhire",
    createdAt: new Date(),
    ...overrides,
  };
}

describe("analyzePost", () => {
  it("extracts category from keywords", () => {
    const result = analyzePost(makePost());
    expect(result.category).toBe("code");
  });

  it("detects data category", () => {
    const result = analyzePost(
      makePost({
        title: "[Hiring] Data entry specialist needed",
        body: "Need help with spreadsheet data entry and CSV formatting",
      })
    );
    expect(result.category).toBe("data");
  });

  it("detects design category", () => {
    const result = analyzePost(
      makePost({
        title: "[Hiring] Logo designer needed",
        body: "Looking for a graphic designer to create a logo in Figma",
      })
    );
    expect(result.category).toBe("design");
  });

  it("extracts skill tags", () => {
    const result = analyzePost(makePost());
    expect(result.skillTags).toContain("python");
    expect(result.skillTags).toContain("sql");
  });

  it("extracts budget range from dollar range format", () => {
    const result = analyzePost(makePost());
    expect(result.budgetMin).toBe(100);
    expect(result.budgetMax).toBe(200);
  });

  it("extracts single dollar amount", () => {
    const result = analyzePost(
      makePost({ body: "Will pay $500 for this project." })
    );
    expect(result.budgetMin).toBe(400); // 80% of 500
    expect(result.budgetMax).toBe(500);
  });

  it("uses default budget when none found", () => {
    const result = analyzePost(
      makePost({ body: "Need help with a coding project, will discuss pay." })
    );
    expect(result.budgetMin).toBe(50);
    expect(result.budgetMax).toBe(200);
  });

  it("cleans [Hiring] tag from title", () => {
    const result = analyzePost(makePost());
    expect(result.title).not.toContain("[Hiring]");
    expect(result.title).toContain("Python developer");
  });

  it("sets external source and URL", () => {
    const result = analyzePost(makePost());
    expect(result.externalSource).toBe("reddit:r/forhire");
    expect(result.externalUrl).toBe(
      "https://www.reddit.com/r/forhire/comments/test1"
    );
  });

  it("truncates long descriptions", () => {
    const longBody = "x".repeat(3000);
    const result = analyzePost(makePost({ body: longBody }));
    expect(result.description.length).toBeLessThanOrEqual(2001); // 2000 + ellipsis
  });

  it("falls back to other category for unmatched content", () => {
    const result = analyzePost(
      makePost({
        title: "[Hiring] General assistant needed",
        body: "Need someone to help with miscellaneous tasks around the office.",
      })
    );
    expect(result.category).toBe("other");
  });
});
