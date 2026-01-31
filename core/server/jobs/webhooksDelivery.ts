import { deliverWebhook, type WebhookDeliveryInput } from "../../services/webhooks/deliveryService";

type QueueItem = WebhookDeliveryInput & { enqueuedAt: number };

const queue: QueueItem[] = [];
let isRunning = false;

export function enqueueWebhookDelivery(input: WebhookDeliveryInput) {
  queue.push({ ...input, enqueuedAt: Date.now() });
  if (!isRunning) {
    void runQueue();
  }
}

async function runQueue() {
  isRunning = true;
  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) continue;
    try {
      await deliverWebhook(item);
    } catch {
      // delivery errors are logged in delivery records
    }
  }
  isRunning = false;
}

