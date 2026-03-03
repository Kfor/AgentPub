/**
 * AI Arbitration for disputes.
 *
 * Provides automated dispute analysis and resolution recommendations
 * using AI. In production, this would integrate with an LLM API
 * (e.g., Claude or GPT) to analyze dispute evidence and generate
 * fair resolution recommendations.
 *
 * This is a stub implementation that returns mock analysis results.
 */

export interface DisputeInput {
  /** The dispute ID */
  disputeId: string;
  /** Reason for the dispute */
  reason: string;
  /** Task title for context */
  taskTitle: string;
  /** Task description for context */
  taskDescription: string;
  /** The escrowed amount in USDC */
  escrowAmount: number;
  /** Evidence submitted by the dispute raiser */
  raisedByEvidence: string[];
  /** Evidence submitted by the other party */
  respondentEvidence: string[];
  /** Delivery content, if any was submitted */
  deliveryContent?: string;
}

export type ResolutionType = "FULL_RELEASE" | "PARTIAL_REFUND" | "FULL_REFUND";

export interface ArbitrationResult {
  /** Unique identifier for this arbitration analysis */
  analysisId: string;
  /** The recommended resolution */
  recommendation: ResolutionType;
  /** Confidence score from 0 to 1 */
  confidence: number;
  /** Detailed reasoning for the recommendation */
  reasoning: string;
  /** Summary of key findings */
  findings: string[];
  /** If partial refund, the recommended percentage to refund (0-100) */
  refundPercentage?: number;
  /** Suggested actions for the platform */
  suggestedActions: string[];
  /** Timestamp of the analysis */
  analyzedAt: Date;
}

/**
 * Analyze a dispute and provide an AI-generated resolution recommendation.
 *
 * In production, this would:
 * 1. Compile all dispute evidence into a structured prompt
 * 2. Call an LLM API (Claude/GPT) to analyze the dispute
 * 3. Parse the LLM response into a structured ArbitrationResult
 * 4. Log the analysis for audit trail purposes
 *
 * @param dispute - The dispute input data including evidence from both parties
 * @returns An ArbitrationResult with recommendation and reasoning
 */
export async function analyzeDispute(
  dispute: DisputeInput
): Promise<ArbitrationResult> {
  console.log(
    `[Arbitration Stub] Analyzing dispute ${dispute.disputeId}:`,
    `"${dispute.reason}" for task "${dispute.taskTitle}"`
  );

  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Determine mock recommendation based on available evidence
  const hasDelivery = !!dispute.deliveryContent;
  const raisedEvidenceCount = dispute.raisedByEvidence.length;
  const respondentEvidenceCount = dispute.respondentEvidence.length;

  let recommendation: ResolutionType;
  let confidence: number;
  let reasoning: string;
  let refundPercentage: number | undefined;
  const findings: string[] = [];
  const suggestedActions: string[] = [];

  if (!hasDelivery) {
    // No delivery was made — likely favor the payer
    recommendation = "FULL_REFUND";
    confidence = 0.85;
    reasoning =
      "No delivery was submitted for this task. Without evidence of work completed, " +
      "the recommendation is to fully refund the escrowed amount to the task creator.";
    findings.push("No delivery content found for this task");
    findings.push(
      `Dispute raised with ${raisedEvidenceCount} piece(s) of evidence`
    );
    suggestedActions.push("Refund full escrow amount to the payer");
    suggestedActions.push(
      "Send notification to the assignee about the resolution"
    );
  } else if (
    raisedEvidenceCount > respondentEvidenceCount &&
    respondentEvidenceCount === 0
  ) {
    // Raiser has evidence, respondent has none — partial refund
    recommendation = "PARTIAL_REFUND";
    confidence = 0.7;
    refundPercentage = 60;
    reasoning =
      "A delivery was submitted, but the dispute raiser provided evidence of issues " +
      "while the respondent did not provide counter-evidence. A partial refund is recommended " +
      "to compensate for the incomplete or unsatisfactory work.";
    findings.push("Delivery was submitted but disputed");
    findings.push(
      `Raiser provided ${raisedEvidenceCount} piece(s) of evidence`
    );
    findings.push("Respondent did not provide counter-evidence");
    suggestedActions.push(`Refund ${refundPercentage}% of escrow to the payer`);
    suggestedActions.push(
      `Release ${100 - refundPercentage}% of escrow to the payee`
    );
  } else {
    // Both parties have evidence — tends toward release with lower confidence
    recommendation = "FULL_RELEASE";
    confidence = 0.55;
    reasoning =
      "Both parties have provided evidence. The delivery was submitted and the respondent " +
      "has provided counter-evidence supporting the quality of their work. The recommendation " +
      "is to release the escrowed funds, though confidence is moderate — human review is advised.";
    findings.push("Delivery was submitted and completed");
    findings.push(
      `Both parties provided evidence (${raisedEvidenceCount} vs ${respondentEvidenceCount})`
    );
    findings.push(
      "Conflicting claims require careful evaluation"
    );
    suggestedActions.push(
      "Release escrow to the payee"
    );
    suggestedActions.push(
      "Flag for human review due to moderate confidence"
    );
  }

  const result: ArbitrationResult = {
    analysisId: `arb_${Date.now()}_${dispute.disputeId}`,
    recommendation,
    confidence,
    reasoning,
    findings,
    refundPercentage,
    suggestedActions,
    analyzedAt: new Date(),
  };

  console.log(
    `[Arbitration Stub] Result for ${dispute.disputeId}:`,
    `${recommendation} (confidence: ${confidence})`
  );

  return result;
}
