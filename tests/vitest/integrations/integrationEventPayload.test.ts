import { describe, expect, it } from "vitest";

import {
  normalizeIntegrationEventPayload,
  type IntegrationEventPayload,
} from "../../../core/services/integrations/integrationEventDispatch";

describe("normalizeIntegrationEventPayload", () => {
  it("sets occurredAt and preserves the resource type from the event", () => {
    const payload = normalizeIntegrationEventPayload("entry.published", {
      type: "entry",
      id: "entry-1",
      title: "  Hello World  ",
      slug: "hello-world",
    });
    expect(payload.event).toBe("entry.published");
    expect(payload.resource.type).toBe("entry");
    expect(payload.resource.id).toBe("entry-1");
    expect(payload.resource.title).toBe("Hello World");
    expect(payload.resource.slug).toBe("hello-world");
    expect(typeof payload.occurredAt).toBe("string");
    expect(new Date(payload.occurredAt).getTime()).not.toBeNaN();
  });

  it("maps each event to its fixed resource type", () => {
    const entry = normalizeIntegrationEventPayload("entry.published", {
      type: "entry",
      id: "1",
    });
    expect(entry.resource.type).toBe("entry");

    const page = normalizeIntegrationEventPayload("page.published", {
      type: "page",
      id: "2",
    });
    expect(page.resource.type).toBe("page");

    const submission = normalizeIntegrationEventPayload("form.submission", {
      type: "form-submission",
      id: "3",
    });
    expect(submission.resource.type).toBe("form-submission");
  });

  it("clamps fields: drops empty optional strings and non-string ids", () => {
    const payload = normalizeIntegrationEventPayload("page.published", {
      type: "page",
      id: 123 as unknown as string,
      title: "   ",
      slug: "",
    });
    expect(payload.resource.id).toBe("");
    expect(payload.resource.title).toBeUndefined();
    expect(payload.resource.slug).toBeUndefined();
  });

  it("never includes unknown resource fields (whitelist shape)", () => {
    const payload = normalizeIntegrationEventPayload("form.submission", {
      type: "form-submission",
      id: "sub-1",
      title: "Contact form",
      // @ts-expect-error unknown fields are not part of the contract
      email: "user@example.com",
    }) as IntegrationEventPayload & { resource: { email?: string } };
    expect(payload.resource.email).toBeUndefined();
    expect(payload.resource).toEqual({
      type: "form-submission",
      id: "sub-1",
      title: "Contact form",
    });
  });
});
