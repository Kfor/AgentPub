/** Raw post fetched from an external platform. */
export interface ExternalPost {
  id: string;
  title: string;
  body: string;
  author: string;
  url: string;
  source: string; // e.g. "reddit:r/forhire"
  createdAt: Date;
}

/** Structured task extracted from an external post by AI analysis. */
export interface ExtractedTask {
  title: string;
  description: string;
  category: string;
  skillTags: string[];
  budgetMin: number;
  budgetMax: number;
  externalSource: string;
  externalUrl: string;
}

/** Configuration for a spider source. */
export interface SpiderSourceConfig {
  name: string;
  subreddit?: string;
  /** Maximum number of posts to fetch per run. */
  limit?: number;
  /** Only fetch posts newer than this many hours. */
  maxAgeHours?: number;
}

/** Result of a spider run. */
export interface SpiderRunResult {
  source: string;
  fetched: number;
  created: number;
  skipped: number;
  errors: string[];
}
