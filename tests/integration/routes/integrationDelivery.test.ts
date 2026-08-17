// TASK-491-02-L02: Slack/Zapier delivery adapters + health persistence (Bun
// lane). Drives the real adapters with a mocked `fetch`, and asserts the
// `integrations` health columns flip exactly as the delivery outcome dictates:
// success -> healthy + lastError null; failure -> issue + machine code (never
// the webhook URL); missing URL -> silent no-op (no fetch, no health write).
// The pure message format contract lives in the Vitest lane
// (tests/vitest/integrations/slackFormat.test.ts).
import { afterAll, expect } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { integrations } from "../../../core/db/schema";
import { deliverSlack } from "../../../core/services/integrations/slackDelivery";
import { deliverZapier } from "../../../core/services/integrations/zapierDelivery";
import type { IntegrationEventPayload } from "../../../core/services/integrations/integrationEventDispatch";
import { testIfDb } from "../runtime/pages-runtime-test-support";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const SLACK_URL = "https://hooks.slack.com/services/TASK491/delivery-token";
const ZAPIER_URL = "https://hooks.zapier.com/hooks/catch/TASK491/delivery-token";

type IntegrationRow = typeof integrations.$inferSelect;

const snapshots = new Map<string, IntegrationRow | null>();

const seedRow = async (id: string, config: Record<string, string | null>) => {
  const [row] = await db.select().from(integrations).where(eq(integrations.id, id));
  snapshots.set(id, row ?? null);
  if (row) {
    await db.delete(integrations).where(eq(integrations.id, id));
  }
  await db.insert(integrations).values({
    id,
    config,
    status: "connected",
    healthStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};

const restoreRow = async (id: string) => {
  const snapshot = snapshots.get(id);
  if (snapshot === undefined) return;
  if (snapshot) {
    await db.update(integrations).set(snapshot).where(eq(integrations.id, id));
  } else {
    await db.delete(integrations).where(eq(integrations.id, id));
  }
  snapshots.delete(id);
};

afterAll(async () => {
  if (!hasDb) return;
  for (const id of [...snapshots.keys()]) {
    await restoreRow(id);
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
    return { result: await fn(), calls };
  } finally {
    globalThis.fetch = originalFetch;
  }
};

const eventPayload = (
  overrides: Partial<IntegrationEventPayload> = {}
): IntegrationEventPayload => ({
  event: "entry.published",
  occurredAt: new Date().toISOString(),
  resource: { type: "entry", id: "entry-1", title: "First post", slug: "first-post" },
  ...overrides,
});

const readRow = async (id: string) => {
  const [row] = await db.select().from(integrations).where(eq(integrations.id, id));
  return row;
};

testIfDb(
  "deliverSlack posts the formatted message and records healthy",
  async () => {
    if (!hasDb) return;
    await seedRow("slack", { webhookUrl: SLACK_URL });

    const payload = eventPayload();
    const { calls } = await withFetch(
      async () => new Response("ok", { status: 200 }),
      async () => deliverSlack({ webhookUrl: SLACK_URL }, payload)
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(SLACK_URL);
    const body = JSON.parse(calls[0]?.init?.body as string) as { text: string };
    expect(body).toEqual({ text: ":rocket: Entry published: First post" });

    const row = await readRow("slack");
    expect(row?.healthStatus).toBe("healthy");
    expect(row?.lastError).toBeNull();
    expect(row?.lastCheckedAt).toBeTruthy();
  },
  30000
);

testIfDb(
  "deliverZapier posts the raw event payload and records healthy",
  async () => {
    if (!hasDb) return;
    await seedRow("zapier", { hookUrl: ZAPIER_URL });

    const payload = eventPayload({
      event: "page.published",
      resource: { type: "page", id: "page-1", title: "About", slug: "about" },
    });
    const { calls } = await withFetch(
      async () => new Response("ok", { status: 200 }),
      async () => deliverZapier({ hookUrl: ZAPIER_URL }, payload)
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(ZAPIER_URL);
    const body = JSON.parse(calls[0]?.init?.body as string) as IntegrationEventPayload;
    expect(body).toEqual(payload);

    const row = await readRow("zapier");
    expect(row?.healthStatus).toBe("healthy");
    expect(row?.lastError).toBeNull();
    expect(row?.lastCheckedAt).toBeTruthy();
  },
  30000
);

testIfDb(
  "a missing webhook URL is a silent no-op for both adapters",
  async () => {
    if (!hasDb) return;
    await seedRow("slack", { webhookUrl: null });
    await seedRow("zapier", { hookUrl: null });

    const { calls } = await withFetch(
      async () => new Response("should_not_be_called", { status: 500 }),
      async () => {
        await deliverSlack({}, eventPayload());
        await deliverZapier({}, eventPayload());
      }
    );

    expect(calls).toHaveLength(0);

    const slackRow = await readRow("slack");
    expect(slackRow?.healthStatus).toBe("unknown");
    expect(slackRow?.lastCheckedAt).toBeNull();
    expect(slackRow?.lastError).toBeNull();

    const zapierRow = await readRow("zapier");
    expect(zapierRow?.healthStatus).toBe("unknown");
    expect(zapierRow?.lastCheckedAt).toBeNull();
    expect(zapierRow?.lastError).toBeNull();
  },
  30000
);

testIfDb(
  "a failing delivery records issue with a machine code, never the URL",
  async () => {
    if (!hasDb) return;
    await seedRow("slack", { webhookUrl: SLACK_URL });

    await withFetch(
      async () => new Response("fail", { status: 500 }),
      async () => deliverSlack({ webhookUrl: SLACK_URL }, eventPayload())
    );

    const row = await readRow("slack");
    expect(row?.healthStatus).toBe("issue");
    expect(row?.lastError).toBe("http_500");
    expect(row?.lastError).not.toContain(SLACK_URL);
    expect(row?.lastError).not.toContain("hooks.slack.com");
    expect(row?.lastCheckedAt).toBeTruthy();
  },
  30000
);

testIfDb(
  "a non-allowlisted slack host is rejected without fetching (TASK-567)",
  async () => {
    if (!hasDb) return;
    await seedRow("slack", { webhookUrl: "https://169.254.169.254/hook" });

    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      return new Response("ok", { status: 200 });
    }) as typeof fetch;
    try {
      await deliverSlack({ webhookUrl: "https://169.254.169.254/hook" }, eventPayload());
      const row = await readRow("slack");
      expect(row?.healthStatus).toBe("issue");
      expect(row?.lastError).toBe("egress_host_forbidden");
      expect(row?.lastError).not.toContain("169.254.169.254");
      expect(fetchCalls).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
      await restoreRow("slack");
    }
  },
  30000
);

testIfDb(
  "a non-allowlisted zapier host is rejected without fetching (TASK-567)",
  async () => {
    if (!hasDb) return;
    await seedRow("zapier", { hookUrl: "https://hooks.attacker.test/hook" });

    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      return new Response("ok", { status: 200 });
    }) as typeof fetch;
    try {
      await deliverZapier({ hookUrl: "https://hooks.attacker.test/hook" }, eventPayload());
      const row = await readRow("zapier");
      expect(row?.healthStatus).toBe("issue");
      expect(row?.lastError).toBe("egress_host_forbidden");
      expect(row?.lastError).not.toContain("attacker.test");
      expect(fetchCalls).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
      await restoreRow("zapier");
    }
  },
  30000
);

testIfDb(
  "a timeout delivery records issue with the timeout code",
  async () => {
    if (!hasDb) return;
    await seedRow("zapier", { hookUrl: ZAPIER_URL });

    await withFetch(
      async () => {
        // Mirrors the abort path postWithRetry produces when its timeout fires:
        // fetch rejects with an AbortError whose message carries the abort code.
        throw Object.assign(new Error("The operation was aborted."), { name: "AbortError" });
      },
      async () => deliverZapier({ hookUrl: ZAPIER_URL }, eventPayload())
    );

    const row = await readRow("zapier");
    expect(row?.healthStatus).toBe("issue");
    expect(row?.lastError).toBe("timeout");
    expect(row?.lastError).not.toContain(ZAPIER_URL);
  },
  30000
);
