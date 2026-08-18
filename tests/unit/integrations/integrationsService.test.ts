import { afterAll, beforeAll, expect, test } from "bun:test";
import { sql, inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { integrationRequests, integrations } from "../../../core/db/schema";
import {
  getIntegrationRuntimeConfig,
  listIntegrations,
  requestIntegration,
  updateIntegration,
} from "../../../core/services/integrations/integrationsService";
import { hasValidSecretMasterKey } from "../../../core/services/security/secretStore";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const hasMasterKey = hasValidSecretMasterKey();

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const touchedIntegrationIds = ["slack", "openrouter", "resend"] as const;
const cleanupRequests: string[] = [];
let originalIntegrations: Array<typeof integrations.$inferSelect> = [];

beforeAll(async () => {
  if (!hasDb) return;
  originalIntegrations = await db
    .select()
    .from(integrations)
    .where(inArray(integrations.id, [...touchedIntegrationIds]));
});

afterAll(async () => {
  if (!hasDb) return;
  if (cleanupRequests.length > 0) {
    await db.delete(integrationRequests).where(inArray(integrationRequests.id, cleanupRequests));
  }
  await db.delete(integrations).where(inArray(integrations.id, [...touchedIntegrationIds]));
  if (originalIntegrations.length > 0) {
    await db.insert(integrations).values(originalIntegrations);
  }
});

testIfDb("update and list integrations", async () => {
  const config: Record<string, string | null> = {
    defaultChannel: "#content-updates",
  };
  if (hasMasterKey) {
    config.webhookUrl = "https://hooks.slack.com/services/test";
  }

  const updated = await updateIntegration("slack", { config });

  expect(updated.id).toBe("slack");
  expect(updated.status).toBe(hasMasterKey ? "connected" : "disconnected");

  const list = await listIntegrations();
  const match = list.find((item) => item.id === "slack");
  expect(match).not.toBeNull();
});

testIfDb("request integration stores request", async () => {
  const request = await requestIntegration({
    name: `HubSpot ${Date.now()}`,
    website: "https://www.hubspot.com",
    notes: "Need CRM sync",
  });
  cleanupRequests.push(request.id);

  expect(request.name).toContain("HubSpot");
  expect(request.status).toBe("pending");
});

testIfDb("openrouter runtime config resolves decrypted secret values", async () => {
  const config: Record<string, string | null> = {
    baseUrl: "https://openrouter.ai/api/v1",
    siteUrl: "https://cms.example.com",
    appName: "Coderso Assistant",
  };
  if (hasMasterKey) {
    config.apiKey = "sk-or-v1-test";
  }

  const updated = await updateIntegration("openrouter", { config });

  const runtime = await getIntegrationRuntimeConfig("openrouter");
  expect(runtime).not.toBeNull();
  expect(runtime?.baseUrl).toBe("https://openrouter.ai/api/v1");
  expect(runtime?.siteUrl).toBe("https://cms.example.com");
  expect(runtime?.appName).toBe("Coderso Assistant");

  if (hasMasterKey) {
    expect(runtime?.apiKey).toBe("sk-or-v1-test");
    expect(updated.status).toBe("connected");
  } else {
    expect(runtime?.apiKey ?? null).toBeNull();
    expect(updated.status).toBe("disconnected");
  }
});

testIfDb(
  "resend integration stores only redacted api key summaries and rejects unknown fields",
  async () => {
    const reset = await updateIntegration("resend", { config: { apiKey: null } });

    const list = await listIntegrations();
    const definition = list.find((item) => item.id === "resend");

    expect(definition).toBeTruthy();
    expect(definition?.category).toBe("Communication");
    expect(definition?.scopes).toEqual(["email:send"]);
    expect(definition?.fields).toEqual([
      {
        key: "apiKey",
        label: "API Key",
        type: "secret",
        required: true,
        secret: true,
        value: null,
        configured: false,
      },
    ]);

    await expect(
      updateIntegration("resend", { config: { baseUrl: "https://evil.test" } })
    ).rejects.toThrow("integration_config_invalid");

    if (!hasMasterKey) {
      return;
    }

    const updated = await updateIntegration("resend", {
      config: { apiKey: "re_testSecretValue123456" },
    });

    expect(updated.status).toBe("connected");
    expect(updated.fields[0]?.configured).toBe(true);
    expect(updated.fields[0]?.value).toBeNull();
    expect(JSON.stringify(updated)).not.toContain("re_testSecretValue123456");

    const runtime = await getIntegrationRuntimeConfig("resend");
    expect(runtime?.apiKey).toBe("re_testSecretValue123456");

    const cleared = await updateIntegration("resend", { config: { apiKey: null } });
    expect(cleared.status).toBe("disconnected");
    expect(cleared.fields[0]?.configured).toBe(false);

    const clearedRuntime = await getIntegrationRuntimeConfig("resend");
    expect(clearedRuntime?.apiKey).toBeNull();
  }
);

testIfDb("TASK-567 config-time: slack rejects a non-allowlisted webhook URL", async () => {
  if (!hasMasterKey) return;
  await expect(
    updateIntegration("slack", { config: { webhookUrl: "https://evil.example.com/hook" } })
  ).rejects.toThrow("integration_url_invalid");
  await expect(
    updateIntegration("slack", { config: { webhookUrl: "https://hooks.slack.com/services/ok" } })
  ).resolves.toMatchObject({ id: "slack" });
});
