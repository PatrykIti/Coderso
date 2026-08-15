// TASK-491-02-L02: pure Slack message formatting contract. Bun-free lane:
// imports only the pure formatter module (no `db/client` or runtime coupling);
// delivery + health persistence lives in the Bun lane
// (tests/integration/routes/integrationDelivery.test.ts).
import { describe, expect, test } from "vitest";

import { formatSlackMessage } from "../../../core/services/integrations/slackFormat";
import type { IntegrationEventPayload } from "../../../core/services/integrations/integrationEventDispatch";

const payload = (
  event: IntegrationEventPayload["event"],
  resource: IntegrationEventPayload["resource"]
) =>
  ({
    event,
    occurredAt: new Date().toISOString(),
    resource,
  }) satisfies IntegrationEventPayload;

describe("formatSlackMessage", () => {
  test("entry.published formats an Entry published message with the resource title", () => {
    expect(
      formatSlackMessage(
        payload("entry.published", { type: "entry", id: "entry-1", title: "First post" })
      )
    ).toEqual({ text: ":rocket: Entry published: First post" });
  });

  test("page.published formats a Page published message with the resource title", () => {
    expect(
      formatSlackMessage(payload("page.published", { type: "page", id: "page-1", title: "About" }))
    ).toEqual({ text: ":rocket: Page published: About" });
  });

  test("form.submission formats a Form submission message with the resource title", () => {
    expect(
      formatSlackMessage(
        payload("form.submission", { type: "form-submission", id: "sub-1", title: "Contact" })
      )
    ).toEqual({ text: ":rocket: Form submission: Contact" });
  });

  test("falls back to the resource id when the title is missing", () => {
    expect(
      formatSlackMessage(payload("entry.published", { type: "entry", id: "entry-42" }))
    ).toEqual({
      text: ":rocket: Entry published: entry-42",
    });
  });

  test("returns a single { text } key (plain Slack text shape, no attachments)", () => {
    const message = formatSlackMessage(
      payload("page.published", { type: "page", id: "page-7", title: "Pricing" })
    );
    expect(Object.keys(message)).toEqual(["text"]);
  });
});
