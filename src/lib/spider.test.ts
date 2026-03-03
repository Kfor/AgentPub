import { describe, it, expect } from "vitest";
import { structureTaskFromPost, type RedditPost } from "./spider";

function makePost(overrides: Partial<RedditPost> = {}): RedditPost {
  return {
    id: "t3_test001",
    title: "[Hiring] Need help with a project",
    body: "Looking for someone to help me. Budget $100-200.",
    subreddit: "forhire",
    author: "testuser",
    url: "https://reddit.com/r/forhire/comments/test001",
    score: 10,
    numComments: 5,
    createdUtc: Date.now() / 1000,
    flair: "Hiring",
    ...overrides,
  };
}

describe("structureTaskFromPost", () => {
  it("cleans title prefixes", () => {
    const post = makePost({ title: "[Hiring] Build a REST API" });
    const task = structureTaskFromPost(post);
    expect(task.title).toBe("Build a REST API");
  });

  it("removes [TASK] prefix", () => {
    const post = makePost({ title: "[TASK] Translate document" });
    const task = structureTaskFromPost(post);
    expect(task.title).toBe("Translate document");
  });

  it("keeps titles without prefix", () => {
    const post = makePost({ title: "Looking for a developer" });
    const task = structureTaskFromPost(post);
    expect(task.title).toBe("Looking for a developer");
  });

  it("extracts budget from range", () => {
    const post = makePost({ body: "Budget is $200-300 for this work." });
    const task = structureTaskFromPost(post);
    expect(task.estimatedBudget).toBe(250);
  });

  it("extracts single budget amount", () => {
    const post = makePost({ body: "I can pay $150 for this." });
    const task = structureTaskFromPost(post);
    expect(task.estimatedBudget).toBe(150);
  });

  it("uses default budget when none found", () => {
    const post = makePost({ body: "Need some help with a task." });
    const task = structureTaskFromPost(post);
    expect(task.estimatedBudget).toBe(50);
  });

  it("extracts python tag", () => {
    const post = makePost({
      title: "Need Python script",
      body: "Write a Python script for data processing",
    });
    const task = structureTaskFromPost(post);
    expect(task.tags).toContain("python");
    expect(task.tags).toContain("data");
  });

  it("extracts translation tag", () => {
    const post = makePost({
      title: "Translate my document",
      body: "Need translation from English to French",
    });
    const task = structureTaskFromPost(post);
    expect(task.tags).toContain("translation");
  });

  it("adds general tag when no keywords match", () => {
    const post = makePost({
      title: "Help needed",
      body: "I need some assistance with something unique",
    });
    const task = structureTaskFromPost(post);
    expect(task.tags).toContain("general");
  });

  it("sets correct source metadata", () => {
    const post = makePost();
    const task = structureTaskFromPost(post);
    expect(task.source).toBe("REDDIT");
    expect(task.sourceUrl).toBe(post.url);
    expect(task.sourceId).toBe(post.id);
  });

  it("uses post body as description", () => {
    const post = makePost({ body: "Detailed task requirements here." });
    const task = structureTaskFromPost(post);
    expect(task.description).toBe("Detailed task requirements here.");
  });
});
