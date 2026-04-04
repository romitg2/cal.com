import dayjs from "@calcom/dayjs";
import { getWebhookFeature } from "@calcom/features/di/webhooks/containers/webhook";
import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
import { prisma } from "@calcom/prisma";
import { DEFAULT_WEBHOOK_VERSION } from "./interface/webhook-repository";
import { createWebhookSignature, jsonParse } from "./sendPayload";

export async function handleWebhookScheduledTriggers(_prisma?: PrismaClient) {
  const repository = getWebhookFeature().repository;

  await repository.deleteOldScheduledTriggers(dayjs().subtract(1, "day").toDate());

  const jobsToRun = await repository.findScheduledTriggersReadyToRun(dayjs().toDate());

  const fetchPromises: Promise<Response | void>[] = [];

  for (const job of jobsToRun) {
    let webhook = job.webhook;

    if (!webhook && job.jobName) {
      const [appId, subscriberId] = job.jobName.split("_");
      try {
        webhook = await prisma.webhook.findUniqueOrThrow({
          where: { id: subscriberId, appId: appId !== "null" ? appId : null },
          select: { secret: true, version: true },
        });
      } catch {
        logger.error(`Error finding webhook for subscriberId: ${subscriberId}, appId: ${appId}`);
      }
    }

    const headers: Record<string, string> = {
      "Content-Type":
        !job.payload || jsonParse(job.payload) ? "application/json" : "application/x-www-form-urlencoded",
      "X-Cal-Webhook-Version": webhook?.version ?? DEFAULT_WEBHOOK_VERSION,
    };

    if (webhook) {
      headers["X-Cal-Signature-256"] = createWebhookSignature({ secret: webhook.secret, body: job.payload });
    }
    fetchPromises.push(
      fetch(job.subscriberUrl, {
        method: "POST",
        body: job.payload,
        headers,
        redirect: "manual",
      }).catch((error) => {
        console.error(`Webhook trigger for subscriber url ${job.subscriberUrl} failed with error: ${error}`);
      })
    );

    await repository.deleteScheduledTriggerById(job.id);
  }

  Promise.allSettled(fetchPromises);
}
