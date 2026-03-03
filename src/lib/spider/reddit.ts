import type { ExternalPost, SpiderSourceConfig } from "./types";

const REDDIT_BASE = "https://www.reddit.com";
const DEFAULT_LIMIT = 25;
const DEFAULT_MAX_AGE_HOURS = 24;

interface RedditListingChild {
  data: {
    id: string;
    title: string;
    selftext: string;
    author: string;
    permalink: string;
    created_utc: number;
    link_flair_text?: string;
  };
}

interface RedditListing {
  data: {
    children: RedditListingChild[];
  };
}

/**
 * Fetch posts from a Reddit subreddit using the public JSON API.
 * Filters to [Hiring] posts only (r/forhire convention).
 */
export async function fetchRedditPosts(
  config: SpiderSourceConfig
): Promise<ExternalPost[]> {
  const subreddit = config.subreddit || "forhire";
  const limit = config.limit || DEFAULT_LIMIT;
  const maxAgeHours = config.maxAgeHours || DEFAULT_MAX_AGE_HOURS;
  const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;

  const url = `${REDDIT_BASE}/r/${subreddit}/new.json?limit=${limit}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "AgentPub Spider/1.0" },
  });

  if (!res.ok) {
    throw new Error(`Reddit API error: ${res.status} ${res.statusText}`);
  }

  const listing: RedditListing = await res.json();

  return listing.data.children
    .filter((child) => {
      const post = child.data;
      // Only include [Hiring] tagged posts
      const isHiring =
        post.title.toLowerCase().includes("[hiring]") ||
        post.link_flair_text?.toLowerCase() === "hiring";
      const isRecent = post.created_utc * 1000 > cutoff;
      return isHiring && isRecent && post.selftext.length > 0;
    })
    .map((child) => {
      const post = child.data;
      return {
        id: post.id,
        title: post.title,
        body: post.selftext,
        author: post.author,
        url: `${REDDIT_BASE}${post.permalink}`,
        source: `reddit:r/${subreddit}`,
        createdAt: new Date(post.created_utc * 1000),
      };
    });
}
