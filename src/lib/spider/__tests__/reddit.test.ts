import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchRedditPosts } from "../reddit";

const mockListingData = {
  data: {
    children: [
      {
        data: {
          id: "abc123",
          title: "[Hiring] Need a React developer",
          selftext: "Looking for a React developer to build a dashboard. Budget $500-$1000.",
          author: "poster1",
          permalink: "/r/forhire/comments/abc123/hiring_react_dev/",
          created_utc: Date.now() / 1000 - 3600, // 1 hour ago
          link_flair_text: "Hiring",
        },
      },
      {
        data: {
          id: "def456",
          title: "[For Hire] Experienced Python Developer",
          selftext: "I'm a Python developer looking for work.",
          author: "worker1",
          permalink: "/r/forhire/comments/def456/for_hire_python/",
          created_utc: Date.now() / 1000 - 7200,
          link_flair_text: "For Hire",
        },
      },
      {
        data: {
          id: "ghi789",
          title: "[Hiring] Data entry helper",
          selftext: "", // empty body
          author: "poster2",
          permalink: "/r/forhire/comments/ghi789/hiring_data/",
          created_utc: Date.now() / 1000 - 1800,
          link_flair_text: "Hiring",
        },
      },
      {
        data: {
          id: "old1",
          title: "[Hiring] Old post",
          selftext: "This is an old post.",
          author: "oldposter",
          permalink: "/r/forhire/comments/old1/old_post/",
          created_utc: Date.now() / 1000 - 100000, // ~28 hours ago
          link_flair_text: "Hiring",
        },
      },
    ],
  },
};

describe("fetchRedditPosts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches and filters hiring posts", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockListingData), { status: 200 })
    );

    const posts = await fetchRedditPosts({ name: "reddit:r/forhire", subreddit: "forhire" });

    // Only the first post should pass: is [Hiring], recent, and has body
    // abc123 = hiring + recent + has body ✓
    // def456 = not hiring ✗
    // ghi789 = hiring + recent but empty body ✗
    // old1 = hiring but too old ✗
    expect(posts).toHaveLength(1);
    expect(posts[0].id).toBe("abc123");
    expect(posts[0].source).toBe("reddit:r/forhire");
    expect(posts[0].url).toContain("abc123");
  });

  it("throws on API error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Too Many Requests", { status: 429, statusText: "Too Many Requests" })
    );

    await expect(
      fetchRedditPosts({ name: "reddit:r/forhire", subreddit: "forhire" })
    ).rejects.toThrow("Reddit API error: 429");
  });
});
