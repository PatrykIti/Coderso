import {
  createDeliveryLog,
  getWebhookForDelivery,
  recordDeliveryAttempt,
} from "./webhooksService";
import { createWebhookSignature } from "./signing";

export type WebhookDeliveryResult = {
  status: "success" | "failed";
  attempts: number;
  responseCode: number | null;
  lastError: string | null;
  deliveryId: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const setWebhookHeader = (headers: Headers, name: string, value: string) => {
  headers.set(`X-Coderso-${name}`, value);
  headers.set(`X-Nextless-${name}`, value);
};

export type WebhookDeliveryInput = {
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  attempts?: number;
  timeoutMs?: number;
  baseDelayMs?: number;
};

export async function deliverWebhook(
  input: WebhookDeliveryInput
): Promise<WebhookDeliveryResult> {
  const webhook = await getWebhookForDelivery(input.webhookId);
  if (!webhook) throw new Error("webhook_not_found");
  if (!webhook.enabled) throw new Error("webhook_disabled");

  const maxAttempts = input.attempts ?? 3;
  const timeoutMs = input.timeoutMs ?? 8000;
  const baseDelayMs = input.baseDelayMs ?? 400;

  const payload = JSON.stringify(input.payload);
  const delivery = await createDeliveryLog({
    webhookId: webhook.id,
    event: input.event,
  });

  let attempts = 0;
  let lastError: string | null = null;
  let responseCode: number | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attempts = attempt;
    const headers = new Headers({ "Content-Type": "application/json" });
    setWebhookHeader(headers, "Event", input.event);
    setWebhookHeader(headers, "Delivery", delivery.id);
    setWebhookHeader(headers, "Attempt", String(attempt));

    if (webhook.secret) {
      const signature = createWebhookSignature(webhook.secret, payload);
      setWebhookHeader(headers, "Signature", signature.signature);
      setWebhookHeader(headers, "Timestamp", signature.timestamp);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: payload,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      responseCode = response.status;

      if (response.ok) {
        await recordDeliveryAttempt({
          id: delivery.id,
          attempts,
          status: "success",
          responseCode,
          lastError: null,
          deliveredAt: new Date(),
        });
        return {
          status: "success",
          attempts,
          responseCode,
          lastError: null,
          deliveryId: delivery.id,
        };
      }

      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "delivery_failed";
    }

    const finalAttempt = attempt >= maxAttempts;
    await recordDeliveryAttempt({
      id: delivery.id,
      attempts,
      status: finalAttempt ? "failed" : "pending",
      responseCode,
      lastError,
    });

    if (!finalAttempt) {
      await sleep(baseDelayMs * Math.pow(2, attempt - 1));
    }
  }

  return {
    status: "failed",
    attempts,
    responseCode,
    lastError,
    deliveryId: delivery.id,
  };
}
