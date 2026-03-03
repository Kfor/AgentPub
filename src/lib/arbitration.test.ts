import { describe, it, expect } from "vitest";
import { analyzeDispute, type DisputeInput } from "./arbitration";

function makeDispute(overrides: Partial<DisputeInput> = {}): DisputeInput {
  return {
    disputeId: "dispute_test_001",
    reason: "Work not completed as specified",
    taskTitle: "Build a REST API",
    taskDescription: "Create a REST API with CRUD endpoints",
    escrowAmount: 500,
    raisedByEvidence: ["Screenshot showing incomplete work"],
    respondentEvidence: [],
    ...overrides,
  };
}

describe("analyzeDispute", () => {
  it("recommends FULL_REFUND when no delivery exists", async () => {
    const dispute = makeDispute({ deliveryContent: undefined });
    const result = await analyzeDispute(dispute);

    expect(result.recommendation).toBe("FULL_REFUND");
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.reasoning).toContain("No delivery");
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.suggestedActions.length).toBeGreaterThan(0);
  });

  it("recommends PARTIAL_REFUND when raiser has evidence and respondent does not", async () => {
    const dispute = makeDispute({
      deliveryContent: "Here is my work",
      raisedByEvidence: ["Evidence 1", "Evidence 2"],
      respondentEvidence: [],
    });
    const result = await analyzeDispute(dispute);

    expect(result.recommendation).toBe("PARTIAL_REFUND");
    expect(result.refundPercentage).toBeDefined();
    expect(result.refundPercentage).toBeGreaterThan(0);
    expect(result.refundPercentage).toBeLessThan(100);
  });

  it("recommends FULL_RELEASE when both parties have evidence", async () => {
    const dispute = makeDispute({
      deliveryContent: "Here is my work",
      raisedByEvidence: ["Issue found"],
      respondentEvidence: ["Counter-evidence"],
    });
    const result = await analyzeDispute(dispute);

    expect(result.recommendation).toBe("FULL_RELEASE");
    expect(result.confidence).toBeLessThan(1);
  });

  it("returns a valid analysis ID", async () => {
    const dispute = makeDispute();
    const result = await analyzeDispute(dispute);

    expect(result.analysisId).toBeTruthy();
    expect(result.analysisId).toContain("arb_");
    expect(result.analysisId).toContain(dispute.disputeId);
  });

  it("returns a valid timestamp", async () => {
    const before = new Date();
    const dispute = makeDispute();
    const result = await analyzeDispute(dispute);
    const after = new Date();

    expect(result.analyzedAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime()
    );
    expect(result.analyzedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
