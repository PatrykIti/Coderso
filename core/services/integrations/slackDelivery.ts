/**
 * Slack outbound delivery adapter (TASK-491-02-L02).
 *
 * Formats the normalized integration event as a plain Slack text message and
 * POSTs it to the configured Slack incoming-webhook URL via the shared retry
 * transport, then records per-target health from the delivery outcome.
 *
 * Security: the webhook URL (itself the Slack secret) is used only as the
 * `fetch` target and is never logged, echoed, or persisted in `lastError`;
 * health stores only machine-readable codes.
 */

import type { RetryPostResult } from "../webhooks/retryPost";
import { postWithRetry } from "../webhooks/retryPost";
import type { IntegrationEventPayload } from "./integrationEventDispatch";
import { formatSlackMessage } from "./slackFormat";
import { recordIntegrationHealth, type IntegrationRuntimeConfig } from "./integrationsService";

export { formatSlackMessage } from "./slackFormat";

const toHealthCode = (result: RetryPostResult): string => {
  if (result.responseCode !== null) return `http_${result.responseCode}`;
  if (result.lastError && /timeout|abort/i.test(result.lastError)) return "timeout";
  if (result.lastError && /^egress_/.test(result.lastError)) return result.lastError;
  return "delivery_failed";
};

export async function deliverSlack(
  config: IntegrationRuntimeConfig,
  payload: IntegrationEventPayload
): Promise<void> {
  const url = config.webhookUrl;
  if (!url) return;
  // TASK-567: the shared policy allowlists hooks.slack.com and blocks
  // redirects before any bytes are sent.
  const result = await postWithRetry({
    url,
    body: JSON.stringify(formatSlackMessage(payload)),
    provider: "slack",
  });
  await recordIntegrationHealth("slack", {
    ok: result.ok,
    lastError: result.ok ? null : toHealthCode(result),
  });
}
