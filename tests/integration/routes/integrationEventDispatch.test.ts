// TASK-491-02-L01: outbound integration event dispatch core (Bun lane).
// Covers the shared retry-POST transport (mocked fetch), the dispatcher with
// stub deps, and the real mutation seams (entry/page publish + form submit)
// driving a real dispatch to a seeded Slack integration with a stubbed fetch.
import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { integrations } from "../../../core/db/schema";
import { createPage, publishPage } from "../../../core/services/pages/pageService";
import { createEntry, publishEntry } from "../../../core/services/content/entryService";
import { createContentType } from "../../../core/services/content/typeService";
import { createForm } from "../../../core/services/forms/formsService";
import { submitForm } from "../../../core/services/forms/submissionService";
import {
  hasValidSecretMasterKey,
  encryptSecret,
} from "../../../core/services/security/secretStore";
import { postWithRetry } from "../../../core/services/webhooks/retryPost";
import { emitIntegrationEvent } from "../../../core/services/integrations/integrationEventDispatch";
import type { IntegrationEventPayload } from "../../../core/services/integrations/integrationEventDispatch";
import {
  createActor,
  pageData,
  testIfDb,
  trackContentEntry,
  trackContentType,
  trackPage,
} from "../runtime/pages-runtime-test-support";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const hasMasterKey = hasValidSecretMasterKey();

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const SLACK_TEST_URL = "https://hooks.slack.com/services/TASK491/test-token-abc";

let slackSnapshot: { config: unknown; status: string; healthStatus: string } | null = null;
let slackExisted = false;

const seedSlackConfig = async (config: Record<string, unknown>) => {
  const [row] = await db.select().from(integrations).where(eq(integrations.id, "slack"));
  slackExisted = Boolean(row);
  slackSnapshot = row
    ? {
        config: row.config,
        status: row.status,
        healthStatus: row.healthStatus,
      }
    : null;
  if (slackExisted) {
    await db.delete(integrations).where(eq(integrations.id, "slack"));
  }
  await db.insert(integrations).values({
    id: "slack",
    config,
    status: "connected",
    healthStatus: "unknown",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};

const restoreSlackRow = async () => {
  if (slackExisted && slackSnapshot) {
    await db.update(integrations).set(slackSnapshot).where(eq(integrations.id, "slack"));
  } else {
    await db.delete(integrations).where(eq(integrations.id, "slack"));
  }
  slackExisted = false;
  slackSnapshot = null;
};

afterAll(async () => {
  if (hasDb) {
    await restoreSlackRow();
  }
});

const withFetch = async <T>(
  impl: (request: Request | string, init?: RequestInit) => Promise<Response>,
  fn: () => Promise<T>
): Promise<{ result: T; calls: Array<{ url: string; init?: RequestInit }> }> => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (request: Request | string, init?: RequestInit) => {
    calls.push({ url: typeof request === "string" ? request : request.url, init });
    return impl(request, init);
  }) as typeof fetch;
  try {
    const result = await fn();
    // The mutation seams dispatch fire-and-forget (emitIntegrationEventSafe);
    // wait for the first delivery attempt while the stub is still installed so
    // the real Slack/Zapier URL is never hit.
    await waitFor(() => calls.length > 0);
    return { result, calls };
  } finally {
    globalThis.fetch = originalFetch;
  }
};

// The mutation seams dispatch fire-and-forget (emitIntegrationEventSafe), so
// tests must poll for the async delivery instead of assuming it finished by
// the time the mutation returned.
const waitFor = async (
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 25000,
  intervalMs = 25
) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("waitFor_timeout");
};

// --- retry transport -------------------------------------------------------

test("postWithRetry succeeds on attempt 1 and fires onAttempt once", async () => {
  const states: string[] = [];
  const { result, calls } = await withFetch(
    async () => new Response("ok", { status: 200 }),
    async () =>
      postWithRetry({
        url: "https://example.test/hook",
        body: "{}",
        attempts: 3,
        baseDelayMs: 0,
        onAttempt: (state) => {
          states.push(`${state.attempt}:${state.ok ? "ok" : "fail"}`);
        },
      })
  );

  expect(result.ok).toBe(true);
  expect(result.attempts).toBe(1);
  expect(result.responseCode).toBe(200);
  expect(result.lastError).toBeNull();
  expect(states).toEqual(["1:ok"]);
  expect(calls).toHaveLength(1);
  expect(calls[0]?.init?.method).toBe("POST");
});

test("postWithRetry retries with backoff until an attempt succeeds", async () => {
  let fetchCalls = 0;
  const states: string[] = [];
  const { result } = await withFetch(
    async () => {
      fetchCalls += 1;
      return fetchCalls < 3
        ? new Response("fail", { status: 500 })
        : new Response("ok", { status: 200 });
    },
    async () =>
      postWithRetry({
        url: "https://example.test/hook",
        body: "{}",
        attempts: 3,
        baseDelayMs: 0,
        onAttempt: (state) => {
          states.push(`${state.attempt}:${state.ok ? "ok" : "fail"}:final=${state.finalAttempt}`);
        },
      })
  );

  expect(result.ok).toBe(true);
  expect(result.attempts).toBe(3);
  expect(result.responseCode).toBe(200);
  expect(states).toEqual(["1:fail:final=false", "2:fail:final=false", "3:ok:final=true"]);
});

test("postWithRetry fails after exhausting attempts", async () => {
  const { result } = await withFetch(
    async () => new Response("fail", { status: 500 }),
    async () =>
      postWithRetry({
        url: "https://example.test/hook",
        body: "{}",
        attempts: 3,
        baseDelayMs: 0,
      })
  );

  expect(result.ok).toBe(false);
  expect(result.attempts).toBe(3);
  expect(result.responseCode).toBe(500);
  expect(result.lastError).toBe("HTTP 500");
});

test("postWithRetry honors timeout/abort", async () => {
  const { result } = await withFetch(
    (_request, init) =>
      new Promise<Response>((resolve, reject) => {
        // A realistic fetch impl: the abort signal rejects the in-flight call.
        init?.signal?.addEventListener("abort", () => {
          reject(Object.assign(new Error("The operation was aborted."), { name: "AbortError" }));
        });
        setTimeout(() => resolve(new Response("late", { status: 200 })), 200);
      }),
    async () =>
      postWithRetry({
        url: "https://example.test/hook",
        body: "{}",
        attempts: 1,
        timeoutMs: 20,
        baseDelayMs: 0,
      })
  );

  expect(result.ok).toBe(false);
  expect(result.attempts).toBe(1);
  expect(result.lastError).toBeTruthy();
});

// --- dispatcher with stub deps ---------------------------------------------

const makeStubDeps = (overrides: {
  slack?: Record<string, string | null> | null;
  zapier?: Record<string, string | null> | null;
}) => {
  const calls: { target: "slack" | "zapier"; payload: IntegrationEventPayload }[] = [];
  const deps = {
    getIntegrationRuntimeConfig: async (id: string) =>
      id === "slack" ? (overrides.slack ?? null) : (overrides.zapier ?? null),
    deliverSlack: async (
      config: Record<string, string | null>,
      payload: IntegrationEventPayload
    ) => {
      calls.push({ target: "slack", payload });
    },
    deliverZapier: async (
      config: Record<string, string | null>,
      payload: IntegrationEventPayload
    ) => {
      calls.push({ target: "zapier", payload });
    },
  };
  return { deps, calls };
};

test("emitIntegrationEvent dispatches to slack and zapier with a normalized payload", async () => {
  const { deps, calls } = makeStubDeps({
    slack: { webhookUrl: "https://hooks.slack.test/x", defaultChannel: "#ops" },
    zapier: { hookUrl: "https://hooks.zapier.test/y" },
  });

  await emitIntegrationEvent(
    "entry.published",
    { type: "entry", id: "entry-1", title: "First post", slug: "first-post" },
    deps
  );

  expect(calls).toHaveLength(2);
  const targets = calls.map((call) => call.target).sort();
  expect(targets).toEqual(["slack", "zapier"]);

  for (const call of calls) {
    expect(call.payload.event).toBe("entry.published");
    expect(call.payload.resource).toEqual({
      type: "entry",
      id: "entry-1",
      title: "First post",
      slug: "first-post",
    });
    expect(new Date(call.payload.occurredAt).getTime()).not.toBeNaN();
  }
});

test("emitIntegrationEvent only dispatches to configured targets", async () => {
  const slackOnly = makeStubDeps({ slack: { webhookUrl: "https://hooks.slack.test/x" } });
  await emitIntegrationEvent(
    "page.published",
    { type: "page", id: "page-1", title: "About", slug: "about" },
    slackOnly.deps
  );
  expect(slackOnly.calls.map((call) => call.target)).toEqual(["slack"]);
  expect(slackOnly.calls[0]?.payload.resource.title).toBe("About");

  const none = makeStubDeps({ slack: null, zapier: null });
  await emitIntegrationEvent(
    "form.submission",
    { type: "form-submission", id: "sub-1", title: "Contact" },
    none.deps
  );
  expect(none.calls).toHaveLength(0);
});

test("emitIntegrationEvent no-ops for unknown events", async () => {
  let reads = 0;
  const deps = {
    getIntegrationRuntimeConfig: async () => {
      reads += 1;
      return null;
    },
    deliverSlack: async () => {
      throw new Error("should_not_be_called");
    },
    deliverZapier: async () => {
      throw new Error("should_not_be_called");
    },
  };
  await emitIntegrationEvent("unknown.event" as never, { type: "entry", id: "x" }, deps);
  expect(reads).toBe(0);
});

test("emitIntegrationEvent swallows adapter errors (never rejects outward)", async () => {
  const deps = {
    getIntegrationRuntimeConfig: async () => ({ webhookUrl: "https://hooks.slack.test/x" }),
    deliverSlack: async () => {
      throw new Error("adapter exploded");
    },
    deliverZapier: async () => {
      throw new Error("adapter exploded");
    },
  };
  await expect(
    emitIntegrationEvent("page.published", { type: "page", id: "page-1" }, deps)
  ).resolves.toBeUndefined();
});

// --- mutation seams (DB-backed) ---------------------------------------------

testIfDb(
  "publishEntry emits entry.published to the seeded Slack webhook",
  async () => {
    if (!hasMasterKey) {
      console.warn("skipping encrypted slack seam: no master key");
      return;
    }
    const actor = await createActor();
    const type = await createContentType({
      name: `Dispatch entry ${randomUUID()}`,
      slug: `dispatch-entry-${randomUUID()}`,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["title"],
        properties: { title: { type: "string" } },
      },
    });
    trackContentType(type.id);
    const entry = await createEntry(type.id, {
      title: "Dispatch entry title",
      slug: `dispatch-entry-${randomUUID()}`,
      data: { title: "Dispatch entry title" },
      authorId: actor.id,
    });
    trackContentEntry(entry.id);

    await seedSlackConfig({ webhookUrl: encryptSecret(SLACK_TEST_URL) });

    try {
      const { result, calls } = await withFetch(
        async () => new Response("ok", { status: 200 }),
        async () => publishEntry(entry.id, actor.id)
      );

      expect(result?.id).toBe(entry.id);
      await waitFor(() => calls.length > 0);
      expect(calls).toHaveLength(1);
      expect(calls[0]?.url).toBe(SLACK_TEST_URL);
      const body = JSON.parse(calls[0]?.init?.body as string) as { text: string };
      expect(body.text).toBe(":rocket: Entry published: Dispatch entry title");
    } finally {
      await restoreSlackRow();
    }
  },
  30000
);

testIfDb(
  "publishPage emits page.published to the seeded Slack webhook",
  async () => {
    if (!hasMasterKey) {
      console.warn("skipping encrypted slack seam: no master key");
      return;
    }
    const actor = await createActor();
    const slug = `/dispatch-page-${randomUUID()}`;
    const page = await createPage({
      title: "Dispatch page title",
      slug,
      authorId: actor.id,
      data: pageData("Dispatch page title"),
    });
    trackPage(page?.id);
    if (!page?.id) throw new Error("missing_dispatch_page");

    await seedSlackConfig({ webhookUrl: encryptSecret(SLACK_TEST_URL) });

    try {
      const { result, calls } = await withFetch(
        async () => new Response("ok", { status: 200 }),
        async () => publishPage(page.id as string, actor.id, pageData("Dispatch page title"))
      );

      expect(result?.id).toBe(page.id);
      await waitFor(() => calls.length > 0);
      expect(calls).toHaveLength(1);
      expect(calls[0]?.url).toBe(SLACK_TEST_URL);
      const body = JSON.parse(calls[0]?.init?.body as string) as { text: string };
      expect(body.text).toBe(":rocket: Page published: Dispatch page title");
    } finally {
      await restoreSlackRow();
    }
  },
  30000
);

testIfDb(
  "submitForm emits form.submission after the transaction commits",
  async () => {
    if (!hasMasterKey) {
      console.warn("skipping encrypted slack seam: no master key");
      return;
    }
    const form = await createForm({
      name: `Dispatch form ${randomUUID()}`,
      slug: `dispatch-form-${randomUUID()}`,
    });
    if (!form) throw new Error("form_create_failed");

    await seedSlackConfig({ webhookUrl: encryptSecret(SLACK_TEST_URL) });

    try {
      const { result, calls } = await withFetch(
        async () => new Response("ok", { status: 200 }),
        async () => submitForm(form.id, {})
      );

      expect(result?.id).toBeTruthy();
      await waitFor(() => calls.length > 0);
      expect(calls).toHaveLength(1);
      expect(calls[0]?.url).toBe(SLACK_TEST_URL);
      const body = JSON.parse(calls[0]?.init?.body as string) as { text: string };
      expect(body.text).toBe(`:rocket: Form submission: ${form.name}`);
    } finally {
      await restoreSlackRow();
    }
  },
  30000
);

testIfDb(
  "a failing delivery does not fail the publish mutation and records health",
  async () => {
    if (!hasMasterKey) {
      console.warn("skipping encrypted slack seam: no master key");
      return;
    }
    const actor = await createActor();
    const type = await createContentType({
      name: `Dispatch failure entry ${randomUUID()}`,
      slug: `dispatch-failure-${randomUUID()}`,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["title"],
        properties: { title: { type: "string" } },
      },
    });
    trackContentType(type.id);
    const entry = await createEntry(type.id, {
      title: "Dispatch failure title",
      slug: `dispatch-failure-${randomUUID()}`,
      data: { title: "Dispatch failure title" },
      authorId: actor.id,
    });
    trackContentEntry(entry.id);

    await seedSlackConfig({ webhookUrl: encryptSecret(SLACK_TEST_URL) });

    // Keep the throwing fetch stub installed for the WHOLE retry + health write,
    // so the retry transport never falls back to a real network call.
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = async () => {
      fetchCalls += 1;
      throw new Error("network unreachable");
    };
    try {
      const result = await publishEntry(entry.id, actor.id);

      expect(result?.id).toBe(entry.id);
      await waitFor(async () => {
        const [row] = await db.select().from(integrations).where(eq(integrations.id, "slack"));
        return row?.healthStatus === "issue";
      });
      const [row] = await db.select().from(integrations).where(eq(integrations.id, "slack"));
      expect(row?.healthStatus).toBe("issue");
      expect(row?.lastError).toBe("delivery_failed");
      expect(row?.lastCheckedAt).toBeTruthy();
      expect(fetchCalls).toBeGreaterThan(0);
    } finally {
      globalThis.fetch = originalFetch;
      await restoreSlackRow();
    }
  },
  30000
);
