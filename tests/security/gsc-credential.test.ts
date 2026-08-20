// TASK-493-03-L01 security lane: a saved GSC service-account credential must
// never appear in `listIntegrations()` / `getIntegration()` output. Seeds an
// encrypted `google-search-console` row (fixture scope: only the row it
// creates, restored afterwards), then asserts the secret field summary is
// masked (`value: null`, `configured: true`) and that neither the raw SA JSON
// nor its private key material leaks anywhere in the serialized summaries.
import { afterAll, expect, test } from "bun:test";
import { generateKeyPairSync } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../core/db/client";
import { integrations } from "../../core/db/schema";
import {
  getIntegration,
  listIntegrations,
} from "../../core/services/integrations/integrationsService";
import { encryptSecret, hasValidSecretMasterKey } from "../../core/services/security/secretStore";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const hasMasterKey = hasValidSecretMasterKey();
const testIfDbAndKey = hasDb && hasMasterKey ? test : test.skip;

async function canConnect(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const SITE_URL = "https://example.com/";

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const serviceAccountJson = JSON.stringify({
  type: "service_account",
  project_id: "task-493-sec",
  private_key_id: "task-493-sec-key",
  private_key: privateKey,
  client_email: "gsc-sec-test@task-493.iam.gserviceaccount.com",
  client_id: "987654321",
  token_uri: "https://oauth2.googleapis.com/token",
});

type GscRowSnapshot = { config: unknown; status: string; healthStatus: string } | null;

let gscSnapshot: GscRowSnapshot = null;
let gscExisted = false;

const seedGscRow = async () => {
  const [row] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.id, "google-search-console"));
  gscExisted = Boolean(row);
  gscSnapshot = row
    ? {
        config: row.config,
        status: row.status,
        healthStatus: row.healthStatus,
      }
    : null;
  if (gscExisted) {
    await db.delete(integrations).where(eq(integrations.id, "google-search-console"));
  }
  await db.insert(integrations).values({
    id: "google-search-console",
    config: {
      serviceAccountJson: encryptSecret(serviceAccountJson),
      siteUrl: SITE_URL,
    },
    status: "connected",
    healthStatus: "unknown",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};

const restoreGscRow = async () => {
  if (!gscSnapshot) {
    await db.delete(integrations).where(eq(integrations.id, "google-search-console"));
    return;
  }
  await db
    .update(integrations)
    .set(gscSnapshot)
    .where(eq(integrations.id, "google-search-console"));
};

afterAll(async () => {
  if (!hasDb) return;
  await restoreGscRow();
});

const findField = (fields: Array<{ key: string }>, key: string) =>
  fields.find((field) => field.key === key);

testIfDbAndKey("a saved GSC credential never appears in integration summaries", async () => {
  await seedGscRow();
  try {
    const summary = await getIntegration("google-search-console");
    expect(summary).not.toBeNull();
    expect(summary?.name).toBe("Google Search Console");
    expect(summary?.category).toBe("Analytics");
    expect(summary?.scopes).toEqual(["seo:read", "search-console:read"]);

    const secretField = findField(summary?.fields ?? [], "serviceAccountJson");
    expect(secretField).toBeDefined();
    expect(secretField).toMatchObject({
      key: "serviceAccountJson",
      type: "secret",
      secret: true,
      required: true,
      value: null,
      configured: true,
    });

    const siteField = findField(summary?.fields ?? [], "siteUrl");
    expect(siteField).toMatchObject({
      key: "siteUrl",
      type: "text",
      secret: false,
      value: SITE_URL,
      configured: true,
    });

    const serialized = JSON.stringify(summary);
    expect(serialized).toContain(SITE_URL);
    expect(serialized).not.toContain("BEGIN PRIVATE KEY");
    expect(serialized).not.toContain("gsc-sec-test@task-493.iam.gserviceaccount.com");
    expect(serialized).not.toContain("task-493-sec-key");
    expect(serialized).not.toContain("service_account");
  } finally {
    await restoreGscRow();
  }
});

testIfDbAndKey("listIntegrations masks the GSC credential too", async () => {
  await seedGscRow();
  try {
    const all = await listIntegrations();
    const summary = all.find((item) => item.id === "google-search-console");
    expect(summary).toBeDefined();

    const serialized = JSON.stringify(all);
    expect(serialized).not.toContain("BEGIN PRIVATE KEY");
    expect(serialized).not.toContain("gsc-sec-test@task-493.iam.gserviceaccount.com");

    const secretField = findField(summary?.fields ?? [], "serviceAccountJson");
    expect(secretField).toMatchObject({ value: null, configured: true, secret: true });
  } finally {
    await restoreGscRow();
  }
});
