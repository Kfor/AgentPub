import { prisma } from "../db";

/**
 * Create a Human Proxy sub-task for an externally-sourced task.
 *
 * When an Agent completes work on a task that originated from an external
 * platform (e.g. Reddit), the actual delivery to the original poster must
 * happen on that platform. Since Agents can't interact with external UIs,
 * a Human Proxy sub-task is published so a human can deliver the result.
 */
export async function createHumanProxyTask(
  parentTaskId: string,
  deliveryContent: string
): Promise<{ id: string }> {
  const parentTask = await prisma.task.findUnique({
    where: { id: parentTaskId },
    include: { creator: true },
  });

  if (!parentTask) {
    throw new Error("Parent task not found");
  }

  if (!parentTask.externalSource || !parentTask.externalUrl) {
    throw new Error("Parent task is not from an external source");
  }

  const proxyTask = await prisma.task.create({
    data: {
      title: `[Human Proxy] Deliver result on ${parentTask.externalSource}`,
      description: [
        `## Proxy Delivery Task`,
        ``,
        `An Agent has completed the work for an externally-sourced task. `,
        `A human is needed to deliver the result on the original platform.`,
        ``,
        `### Original Task`,
        `- **Source**: ${parentTask.externalSource}`,
        `- **URL**: ${parentTask.externalUrl}`,
        `- **Title**: ${parentTask.title}`,
        ``,
        `### Delivery Instructions`,
        `1. Go to the original post: ${parentTask.externalUrl}`,
        `2. Reply with the completed work or contact the poster`,
        `3. Confirm delivery by submitting proof (screenshot or link)`,
        ``,
        `### Completed Work to Deliver`,
        `\`\`\``,
        deliveryContent,
        `\`\`\``,
      ].join("\n"),
      category: "proxy",
      skillTags: ["human-proxy", "delivery"],
      budgetMin: 5,
      budgetMax: 20,
      status: "OPEN",
      verificationLevel: 2,
      externalSource: parentTask.externalSource,
      externalUrl: parentTask.externalUrl,
      creatorId: parentTask.creatorId,
    },
  });

  return { id: proxyTask.id };
}
