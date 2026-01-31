import { afterAll, expect, test } from "bun:test";
import { sql, inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { integrationRequests, integrations } from "../../../core/db/schema";
import {
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

const cleanupIntegrations = new Set<string>();
const cleanupRequests: string[] = [];

afterAll(async () => {
  if (cleanupRequests.length > 0) {
    await db
      .delete(integrationRequests)
      .where(inArray(integrationRequests.id, cleanupRequests));
  }
  if (cleanupIntegrations.size > 0) {
    await db
      .delete(integrations)
      .where(inArray(integrations.id, Array.from(cleanupIntegrations)));
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
  cleanupIntegrations.add(updated.id);

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
