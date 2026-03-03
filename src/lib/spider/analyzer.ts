import type { ExternalPost, ExtractedTask } from "./types";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  code: ["code", "programming", "developer", "software", "web", "app", "api", "script", "python", "javascript", "typescript", "react", "node"],
  data: ["data", "csv", "excel", "spreadsheet", "database", "sql", "scraping", "etl", "analysis"],
  design: ["design", "ui", "ux", "graphic", "logo", "figma", "photoshop", "illustration"],
  writing: ["writing", "content", "copywriting", "blog", "article", "seo", "editing"],
  translation: ["translation", "translate", "localization", "language"],
  video: ["video", "editing", "animation", "motion", "after effects", "premiere"],
  marketing: ["marketing", "social media", "ads", "campaign", "email"],
  other: [],
};

const BUDGET_PATTERNS = [
  /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*[-–—to]+\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
  /budget[:\s]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*[-–—to]+\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
  /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
  /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:usd|dollars?)/i,
];

function parseNumber(s: string): number {
  return parseFloat(s.replace(/,/g, ""));
}

/** Detect the task category from text. */
function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === "other") continue;
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return "other";
}

/** Extract skill tags from text. */
function extractSkillTags(text: string): string[] {
  const techTerms = [
    "python", "javascript", "typescript", "react", "node", "nextjs",
    "html", "css", "sql", "postgresql", "mongodb", "aws", "docker",
    "figma", "photoshop", "illustrator", "wordpress", "shopify",
    "excel", "google sheets", "data analysis", "machine learning",
    "api", "rest", "graphql", "vue", "angular", "swift", "kotlin",
    "java", "c#", "go", "rust", "php", "ruby", "rails",
  ];
  const lower = text.toLowerCase();
  return techTerms.filter((term) => lower.includes(term));
}

/** Extract budget range from text. Returns [min, max] in USD. */
function extractBudget(text: string): [number, number] {
  for (const pattern of BUDGET_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      if (match[2]) {
        return [parseNumber(match[1]), parseNumber(match[2])];
      }
      const amount = parseNumber(match[1]);
      // Single amount: use as max, min = 80% of max
      return [Math.round(amount * 0.8), amount];
    }
  }
  // Default budget range when none detected
  return [50, 200];
}

/** Clean the title by removing Reddit flair tags like [Hiring]. */
function cleanTitle(title: string): string {
  return title
    .replace(/\[(?:hiring|for hire|forhire)\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Analyze a raw external post and extract structured task data.
 * Uses rule-based extraction. Can be replaced with LLM analysis.
 */
export function analyzePost(post: ExternalPost): ExtractedTask {
  const fullText = `${post.title} ${post.body}`;
  const category = detectCategory(fullText);
  const skillTags = extractSkillTags(fullText);
  const [budgetMin, budgetMax] = extractBudget(fullText);
  const title = cleanTitle(post.title) || post.title;

  // Truncate description to a reasonable length
  const description =
    post.body.length > 2000 ? post.body.slice(0, 2000) + "…" : post.body;

  return {
    title,
    description,
    category,
    skillTags,
    budgetMin,
    budgetMax,
    externalSource: post.source,
    externalUrl: post.url,
  };
}
