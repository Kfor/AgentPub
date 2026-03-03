/**
 * Pure reputation calculation utilities.
 *
 * This module contains NO server-only imports (no Prisma, no database).
 * It is safe to import from client components.
 */

// Mirror the Prisma enum so this file stays independent of @prisma/client
export type ReputationLevel = "NOVICE" | "TRUSTED" | "EXPERT" | "MASTER";

export interface ReputationStats {
  tasksCompleted: number;
  completionRate: number; // 0-100 percentage
  averageRating: number; // 0-5 scale
}

export interface ReputationInfo {
  level: ReputationLevel;
  tasksCompleted: number;
  completionRate: number;
  averageRating: number;
}

/**
 * Level thresholds for reputation calculation.
 *
 * NOVICE:  Default level for all new users
 * TRUSTED: >=10 tasks completed, >=70% completion rate, >=3.5 average rating
 * EXPERT:  >=50 tasks completed, >=85% completion rate, >=4.0 average rating
 * MASTER:  >=200 tasks completed, >=95% completion rate, >=4.5 average rating
 */
const LEVEL_THRESHOLDS: {
  level: ReputationLevel;
  minTasks: number;
  minCompletionRate: number;
  minRating: number;
}[] = [
  { level: "MASTER", minTasks: 200, minCompletionRate: 95, minRating: 4.5 },
  { level: "EXPERT", minTasks: 50, minCompletionRate: 85, minRating: 4.0 },
  { level: "TRUSTED", minTasks: 10, minCompletionRate: 70, minRating: 3.5 },
];

/**
 * Calculate the reputation level based on a user's stats.
 *
 * Checks thresholds in descending order (MASTER -> EXPERT -> TRUSTED)
 * and returns the highest level for which all criteria are met.
 * Falls back to NOVICE if no thresholds are satisfied.
 */
export function calculateLevel(stats: ReputationStats): ReputationLevel {
  for (const threshold of LEVEL_THRESHOLDS) {
    if (
      stats.tasksCompleted >= threshold.minTasks &&
      stats.completionRate >= threshold.minCompletionRate &&
      stats.averageRating >= threshold.minRating
    ) {
      return threshold.level;
    }
  }

  return "NOVICE";
}

/**
 * Format a reputation object into a human-readable display string.
 *
 * Examples:
 *   "EXPERT | 4.2 rating | 87% completion | 65 tasks"
 *   "NOVICE | No rating yet | 0 tasks"
 */
export function formatReputation(reputation: ReputationInfo): string {
  const { level, averageRating, completionRate, tasksCompleted } = reputation;

  if (tasksCompleted === 0) {
    return `${level} | No rating yet | 0 tasks`;
  }

  const ratingStr = averageRating.toFixed(1);
  const completionStr = Math.round(completionRate);

  return `${level} | ${ratingStr} rating | ${completionStr}% completion | ${tasksCompleted} tasks`;
}

/**
 * Get a color class name associated with a reputation level.
 * Useful for UI rendering in components.
 */
export function getLevelColor(level: ReputationLevel): string {
  switch (level) {
    case "MASTER":
      return "text-purple-600";
    case "EXPERT":
      return "text-blue-600";
    case "TRUSTED":
      return "text-green-600";
    case "NOVICE":
    default:
      return "text-gray-500";
  }
}

/**
 * Get a human-friendly description for a reputation level.
 */
export function getLevelDescription(level: ReputationLevel): string {
  switch (level) {
    case "MASTER":
      return "Top-tier contributor with exceptional track record";
    case "EXPERT":
      return "Highly experienced and reliable contributor";
    case "TRUSTED":
      return "Proven contributor with solid completion history";
    case "NOVICE":
    default:
      return "New to the platform";
  }
}

/**
 * Get badge CSS classes for a reputation level.
 */
export function getReputationBadgeClasses(level: ReputationLevel): string {
  switch (level) {
    case "MASTER":
      return "bg-purple-100 text-purple-700";
    case "EXPERT":
      return "bg-blue-100 text-blue-700";
    case "TRUSTED":
      return "bg-green-100 text-green-700";
    case "NOVICE":
    default:
      return "bg-gray-100 text-gray-700";
  }
}

/**
 * Format a currency amount for display.
 */
export function formatCurrency(
  amount: number,
  currency: string = "USDC"
): string {
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

/**
 * Get a human-readable "time ago" string from a date.
 */
export function timeAgo(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  return `${diffMonths}mo ago`;
}
