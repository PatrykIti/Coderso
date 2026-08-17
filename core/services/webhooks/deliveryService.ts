import { createDeliveryLog, getWebhookForDelivery, recordDeliveryAttempt } from "./webhooksService";
import { createWebhookSignature } from "./signing";
import { postWithRetry } from "./retryPost";

export type WebhookDeliveryResult = {
  status: "success" | "failed";
  attempts: number;
  responseCode: number | null;
  lastError: string | null;
  deliveryId: string;
};

const setWebhookHeader = (headers: Record<string, string>, name: string, value: string) => {
  headers[`X-Coderso-${name}`] = value;
  headers[`X-Nextless-${name}`] = value;
};

export type WebhookDeliveryInput = {
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  attempts?: number;
  timeoutMs?: number;
  baseDelayMs?: number;
};

export async function deliverWebhook(input: WebhookDeliveryInput): Promise<WebhookDeliveryResult> {
  const webhook = await getWebhookForDelivery(input.webhookId);
  if (!webhook) throw new Error("webhook_not_found");
  if (!webhook.enabled) throw new Error("webhook_disabled");

  const payload = JSON.stringify(input.payload);
  const delivery = await createDeliveryLog({
    webhookId: webhook.id,
    event: input.event,
  });

  // Signature headers are stable across attempts (they sign the unchanged
  // payload); the per-attempt Attempt header is added by the transport.
  const baseHeaders: Record<string, string> = {};
  setWebhookHeader(baseHeaders, "Event", input.event);
  setWebhookHeader(baseHeaders, "Delivery", delivery.id);
  if (webhook.secret) {
    const signature = createWebhookSignature(webhook.secret, payload);
    setWebhookHeader(baseHeaders, "Signature", signature.signature);
    setWebhookHeader(baseHeaders, "Timestamp", signature.timestamp);
  }

  const result = await postWithRetry({
    url: webhook.url,
    body: payload,
    headers: baseHeaders,
    attempts: input.attempts,
    timeoutMs: input.timeoutMs,
    baseDelayMs: input.baseDelayMs,
    // TASK-567: custom webhooks run the full blocklist policy at delivery time.
    provider: "webhook",
    onAttempt: async (state) => {
      await recordDeliveryAttempt({
        id: delivery.id,
        attempts: state.attempt,
        status: state.ok ? "success" : state.finalAttempt ? "failed" : "pending",
        responseCode: state.responseCode,
        lastError: state.lastError,
        deliveredAt: state.ok ? new Date() : null,
      });
    },
  });

  return {
    status: result.ok ? "success" : "failed",
    attempts: result.attempts,
    responseCode: result.responseCode,
    lastError: result.lastError,
    deliveryId: delivery.id,
  };
}
