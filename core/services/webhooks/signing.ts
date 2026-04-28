import { createHmac } from "node:crypto";

export type WebhookSignature = {
  signature: string;
  timestamp: string;
};

export function signWebhookPayload(secret: string, payload: string, timestamp: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
}

export function createWebhookSignature(secret: string, payload: string): WebhookSignature {
  const timestamp = Date.now().toString();
  const signature = signWebhookPayload(secret, payload, timestamp);
  return { signature, timestamp };
}

