/**
 * Task Spider for Reddit.
 *
 * Fetches posts from Reddit subreddits and structures them into draft tasks
 * for the AgentPub marketplace.
 *
 * This is a stub/mock implementation. In production, this would use the
 * Reddit API (OAuth2) or a scraping service to fetch real posts.
 */

export interface RedditPost {
  /** Reddit post ID (e.g., "t3_abc123") */
  id: string;
  /** Post title */
  title: string;
  /** Post body/selftext */
  body: string;
  /** The subreddit it was posted in */
  subreddit: string;
  /** Reddit author username */
  author: string;
  /** URL to the original Reddit post */
  url: string;
  /** Post score (upvotes - downvotes) */
  score: number;
  /** Number of comments */
  numComments: number;
  /** Unix timestamp of when the post was created */
  createdUtc: number;
  /** Post flair text, if any */
  flair: string | null;
}

export interface SpiderTask {
  /** Draft task title derived from the Reddit post */
  title: string;
  /** Draft task description derived from the post body */
  description: string;
  /** Estimated budget in USDC (heuristic based on post content) */
  estimatedBudget: number;
  /** Tags extracted from the post */
  tags: string[];
  /** Skills inferred from the post content */
  skills: string[];
  /** Source metadata */
  source: "REDDIT";
  /** URL to the original post */
  sourceUrl: string;
  /** Reddit post ID */
  sourceId: string;
}

/** Mock Reddit posts simulating what the spider would find */
const MOCK_POSTS: RedditPost[] = [
  {
    id: "t3_mock001",
    title: "[Hiring] Need a Python script to scrape product prices from 5 e-commerce sites",
    body: "I need someone to build a Python scraper that monitors prices on Amazon, eBay, Walmart, Target, and Best Buy for specific products. Should output to CSV daily. Budget around $200-300. Must handle rate limiting and CAPTCHAs gracefully.",
    subreddit: "forhire",
    author: "data_buyer_42",
    url: "https://reddit.com/r/forhire/comments/mock001",
    score: 15,
    numComments: 8,
    createdUtc: Date.now() / 1000 - 3600,
    flair: "Hiring",
  },
  {
    id: "t3_mock002",
    title: "[TASK] Translate 10-page technical document from English to Japanese",
    body: "Looking for a translator (human or AI-assisted) to translate a technical specification document. It covers API documentation and integration guides. Needs to be accurate with technical terminology. ~10 pages, mostly text with some code snippets.",
    subreddit: "slavelabour",
    author: "techwriter_en",
    url: "https://reddit.com/r/slavelabour/comments/mock002",
    score: 23,
    numComments: 12,
    createdUtc: Date.now() / 1000 - 7200,
    flair: "Task",
  },
  {
    id: "t3_mock003",
    title: "Looking for someone to create a custom Discord bot with GPT integration",
    body: "Need a Discord bot that can: 1) Respond to questions using GPT-4 API 2) Summarize long conversations 3) Moderate content with configurable rules 4) Track user activity stats. Should be hosted on our server. Python or Node.js preferred.",
    subreddit: "forhire",
    author: "discord_admin_99",
    url: "https://reddit.com/r/forhire/comments/mock003",
    score: 45,
    numComments: 22,
    createdUtc: Date.now() / 1000 - 14400,
    flair: "Hiring",
  },
];

/**
 * Fetch posts from a Reddit subreddit.
 *
 * In production, this would make authenticated requests to the Reddit API:
 *   GET https://oauth.reddit.com/r/{subreddit}/new?limit=25
 *
 * @param subreddit - The subreddit to fetch from (without "r/" prefix)
 * @param limit - Maximum number of posts to return (default: 25)
 * @returns Array of Reddit posts
 */
export async function fetchRedditPosts(
  subreddit: string,
  limit: number = 25
): Promise<RedditPost[]> {
  console.log(
    `[Spider Stub] fetchRedditPosts: would fetch from r/${subreddit} (limit: ${limit})`
  );

  // Return mock data filtered/adjusted for the requested subreddit
  const posts = MOCK_POSTS.map((post) => ({
    ...post,
    subreddit,
  })).slice(0, limit);

  return posts;
}

/**
 * Convert a Reddit post into a draft task structure for the AgentPub marketplace.
 *
 * Extracts relevant information from the post to create a structured task
 * that can be reviewed and published by a human moderator or directly
 * by the system.
 *
 * @param post - The Reddit post to convert
 * @returns A structured SpiderTask ready for review/creation
 */
export function structureTaskFromPost(post: RedditPost): SpiderTask {
  // Clean up the title (remove common prefixes like [Hiring], [TASK], etc.)
  const cleanTitle = post.title
    .replace(/^\[(?:Hiring|TASK|For Hire|Job|Help)\]\s*/i, "")
    .trim();

  // Simple budget heuristic based on post content
  const budgetMatch = post.body.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  const budgetRangeMatch = post.body.match(
    /\$(\d+(?:,\d{3})*)\s*[-–]\s*\$?(\d+(?:,\d{3})*)/
  );
  let estimatedBudget = 50; // default

  if (budgetRangeMatch) {
    const low = parseInt(budgetRangeMatch[1].replace(/,/g, ""), 10);
    const high = parseInt(budgetRangeMatch[2].replace(/,/g, ""), 10);
    estimatedBudget = Math.round((low + high) / 2);
  } else if (budgetMatch) {
    estimatedBudget = parseInt(budgetMatch[1].replace(/,/g, ""), 10);
  }

  // Extract tags from common keywords in the post
  const tagKeywords: Record<string, string[]> = {
    python: ["python"],
    javascript: ["javascript", "node.js", "nodejs"],
    typescript: ["typescript"],
    react: ["react"],
    "web-scraping": ["scrape", "scraper", "scraping", "crawl"],
    "machine-learning": ["ml", "machine learning", "ai", "gpt"],
    translation: ["translate", "translation", "translator"],
    design: ["design", "figma", "ui", "ux"],
    "discord-bot": ["discord bot", "discord"],
    api: ["api", "rest", "graphql"],
    data: ["data", "csv", "database", "sql"],
  };

  const combinedText = `${post.title} ${post.body}`.toLowerCase();
  const tags: string[] = [];
  const skills: string[] = [];

  for (const [tag, keywords] of Object.entries(tagKeywords)) {
    if (keywords.some((kw) => combinedText.includes(kw))) {
      tags.push(tag);
      skills.push(tag);
    }
  }

  // Ensure at least one tag
  if (tags.length === 0) {
    tags.push("general");
  }

  return {
    title: cleanTitle,
    description: post.body,
    estimatedBudget,
    tags,
    skills,
    source: "REDDIT",
    sourceUrl: post.url,
    sourceId: post.id,
  };
}
