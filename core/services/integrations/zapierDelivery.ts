/**
 * Zapier outbound delivery adapter (TASK-491-02-L02).
 *
 * POSTs the normalized integration event (raw event JSON) to the configured
 * Zapier webhook URL via the shared retry transport, then records per-target
 * health from the delivery outcome.
 *
 * Security: the hook URL (itself the Zapier secret) is used only as the
 * `fetch` target and is never logged, echoed, or persisted in `lastError`;
 * health stores only machine-readable codes.
 */

import type { RetryPostResult } from "../webhooks/retryPost";
import { postWithRetry } from "../webhooks/retryPost";
import type { IntegrationEventPayload } from "./integrationEventDispatch";
import { recordIntegrationHealth, type IntegrationRuntimeConfig } from "./integrationsService";

const toHealthCode = (result: RetryPostResult): string => {
  if (result.responseCode !== null) return `http_${result.responseCode}`;
  if (result.lastError && /timeout|abort/i.test(result.lastError)) return "timeout";
  return "delivery_failed";
};

export async function deliverZapier(
  config: IntegrationRuntimeConfig,
  payload: IntegrationEventPayload
): Promise<void> {
  const url = config.hookUrl;
  if (!url) return;
  const result = await postWithRetry({
    url,
    body: JSON.stringify(payload),
  });
  await recordIntegrationHealth("zapier", {
    ok: result.ok,
    lastError: result.ok ? null : toHealthCode(result),
  });
}
