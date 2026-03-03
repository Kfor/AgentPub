import { prisma } from "../db";
import { fetchRedditPosts } from "./reddit";
import { analyzePost } from "./analyzer";
import type { SpiderSourceConfig, SpiderRunResult, ExternalPost, ExtractedTask } from "./types";

const DEFAULT_SOURCES: SpiderSourceConfig[] = [
  { name: "reddit:r/forhire", subreddit: "forhire", limit: 25, maxAgeHours: 24 },
];

/**
 * Get a system user for spider-created tasks.
 * Creates one if it doesn't exist.
 */
async function getSpiderUser(): Promise<string> {
  const email = "spider@agentpub.local";
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: "AgentPub Spider",
        userType: "AGENT",
      },
    });
  }
  return user.id;
}

/**
 * Create a draft task from an extracted task.
 * Checks for duplicates by externalUrl before creating.
 */
async function createDraftTask(
  extracted: ExtractedTask,
  creatorId: string
): Promise<{ created: boolean; id?: string }> {
  // Check for duplicate by externalUrl
  const existing = await prisma.task.findFirst({
    where: { externalUrl: extracted.externalUrl },
  });

  if (existing) {
    return { created: false };
  }

  const task = await prisma.task.create({
    data: {
      title: extracted.title,
      description: extracted.description,
      category: extracted.category,
      skillTags: extracted.skillTags,
      budgetMin: extracted.budgetMin,
      budgetMax: extracted.budgetMax,
      status: "DRAFT",
      externalSource: extracted.externalSource,
      externalUrl: extracted.externalUrl,
      creatorId,
    },
  });

  return { created: true, id: task.id };
}

/**
 * Run the spider for a single source.
 * Fetches posts, analyzes them, and creates draft tasks.
 */
export async function runSpiderForSource(
  config: SpiderSourceConfig,
  fetchFn: (config: SpiderSourceConfig) => Promise<ExternalPost[]> = fetchRedditPosts
): Promise<SpiderRunResult> {
  const result: SpiderRunResult = {
    source: config.name,
    fetched: 0,
    created: 0,
    skipped: 0,
    errors: [],
  };

  let posts: ExternalPost[];
  try {
    posts = await fetchFn(config);
  } catch (err) {
    result.errors.push(`Fetch error: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }

  result.fetched = posts.length;
  const creatorId = await getSpiderUser();

  for (const post of posts) {
    try {
      const extracted = analyzePost(post);
      const { created } = await createDraftTask(extracted, creatorId);
      if (created) {
        result.created++;
      } else {
        result.skipped++;
      }
    } catch (err) {
      result.skipped++;
      result.errors.push(
        `Error processing post ${post.id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return result;
}

/**
 * Run the spider for all configured sources.
 */
export async function runSpider(
  sources: SpiderSourceConfig[] = DEFAULT_SOURCES
): Promise<SpiderRunResult[]> {
  const results: SpiderRunResult[] = [];
  for (const source of sources) {
    const result = await runSpiderForSource(source);
    results.push(result);
  }
  return results;
}
