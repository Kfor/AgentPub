import { describe, it, expect } from "vitest";
import {
  calculateLevel,
  formatReputation,
  getLevelColor,
  getLevelDescription,
  getReputationBadgeClasses,
  formatCurrency,
  timeAgo,
} from "./reputation-utils";

describe("calculateLevel", () => {
  it("returns NOVICE for new users", () => {
    expect(
      calculateLevel({ tasksCompleted: 0, completionRate: 0, averageRating: 0 })
    ).toBe("NOVICE");
  });

  it("returns TRUSTED when thresholds are met", () => {
    expect(
      calculateLevel({
        tasksCompleted: 10,
        completionRate: 70,
        averageRating: 3.5,
      })
    ).toBe("TRUSTED");
  });

  it("returns EXPERT when thresholds are met", () => {
    expect(
      calculateLevel({
        tasksCompleted: 50,
        completionRate: 85,
        averageRating: 4.0,
      })
    ).toBe("EXPERT");
  });

  it("returns MASTER when thresholds are met", () => {
    expect(
      calculateLevel({
        tasksCompleted: 200,
        completionRate: 95,
        averageRating: 4.5,
      })
    ).toBe("MASTER");
  });

  it("returns NOVICE when tasks are high but rating is too low", () => {
    expect(
      calculateLevel({
        tasksCompleted: 100,
        completionRate: 90,
        averageRating: 2.0,
      })
    ).toBe("NOVICE");
  });

  it("returns the highest matching level", () => {
    expect(
      calculateLevel({
        tasksCompleted: 300,
        completionRate: 99,
        averageRating: 4.9,
      })
    ).toBe("MASTER");
  });
});

describe("formatReputation", () => {
  it("formats zero-task user", () => {
    expect(
      formatReputation({
        level: "NOVICE",
        tasksCompleted: 0,
        completionRate: 0,
        averageRating: 0,
      })
    ).toBe("NOVICE | No rating yet | 0 tasks");
  });

  it("formats user with stats", () => {
    expect(
      formatReputation({
        level: "EXPERT",
        tasksCompleted: 65,
        completionRate: 87.3,
        averageRating: 4.2,
      })
    ).toBe("EXPERT | 4.2 rating | 87% completion | 65 tasks");
  });
});

describe("getLevelColor", () => {
  it("returns correct colors for each level", () => {
    expect(getLevelColor("MASTER")).toBe("text-purple-600");
    expect(getLevelColor("EXPERT")).toBe("text-blue-600");
    expect(getLevelColor("TRUSTED")).toBe("text-green-600");
    expect(getLevelColor("NOVICE")).toBe("text-gray-500");
  });
});

describe("getLevelDescription", () => {
  it("returns descriptions for each level", () => {
    expect(getLevelDescription("MASTER")).toContain("Top-tier");
    expect(getLevelDescription("EXPERT")).toContain("experienced");
    expect(getLevelDescription("TRUSTED")).toContain("Proven");
    expect(getLevelDescription("NOVICE")).toContain("New");
  });
});

describe("getReputationBadgeClasses", () => {
  it("returns CSS classes for each level", () => {
    expect(getReputationBadgeClasses("MASTER")).toContain("purple");
    expect(getReputationBadgeClasses("EXPERT")).toContain("blue");
    expect(getReputationBadgeClasses("TRUSTED")).toContain("green");
    expect(getReputationBadgeClasses("NOVICE")).toContain("gray");
  });
});

describe("formatCurrency", () => {
  it("formats USDC amounts", () => {
    expect(formatCurrency(100)).toBe("100.00 USDC");
    expect(formatCurrency(1234.5)).toBe("1,234.50 USDC");
    expect(formatCurrency(0)).toBe("0.00 USDC");
  });

  it("supports custom currency", () => {
    expect(formatCurrency(50, "ETH")).toBe("50.00 ETH");
  });
});

describe("timeAgo", () => {
  it("returns 'just now' for recent times", () => {
    expect(timeAgo(new Date())).toBe("just now");
  });

  it("returns minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(timeAgo(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(timeAgo(threeHoursAgo)).toBe("3h ago");
  });

  it("returns days ago", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(timeAgo(twoDaysAgo)).toBe("2d ago");
  });

  it("accepts string dates", () => {
    const date = new Date(Date.now() - 60 * 1000).toISOString();
    expect(timeAgo(date)).toBe("1m ago");
  });
});
