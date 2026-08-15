/**
 * Pure Slack message formatting (TASK-491-02-L02).
 *
 * Bun-free: no runtime imports beyond the payload type, so the Vitest lane
 * owns the format contract while the Bun lane owns delivery + health
 * persistence (`deliverSlack` in `slackDelivery.ts`).
 */
import type { IntegrationEventPayload } from "./integrationEventDispatch";

export function formatSlackMessage(payload: IntegrationEventPayload): { text: string } {
  const label =
    payload.event === "entry.published"
      ? "Entry published"
      : payload.event === "page.published"
        ? "Page published"
        : "Form submission";
  const name = payload.resource.title ?? payload.resource.id;
  return { text: `:rocket: ${label}: ${name}` };
}
