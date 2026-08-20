// TASK-493-03-L01: GSC server-side auth client (Bun lane). Covers the JWT
// assertion mint against a stubbed token endpoint, the low-level v3 `request`
// helper (Bearer header + machine-readable error codes), and the v1
// `inspectUrl` normalization. Outbound fetch + a real `integrations` table
// read place this suite in the Bun lane.
import { afterAll, expect, test } from "bun:test";
import { generateKeyPairSync } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { integrations } from "../../../core/db/schema";
import {
  getGscClient,
  mintAccessToken,
  type GscServiceAccount,
} from "../../../core/services/seo/gscClient";
import {
  encryptSecret,
  hasValidSecretMasterKey,
} from "../../../core/services/security/secretStore";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const hasMasterKey = hasValidSecretMasterKey();
const testIfDb = hasDb ? test : test.skip;
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
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GSC_V3_BASE = "https://searchconsole.googleapis.com/webmasters/v3/";
const URL_INSPECTION_ENDPOINT =
  "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const serviceAccount = (): GscServiceAccount => ({
  type: "service_account",
  project_id: "task-493-test",
  private_key_id: "task-493-key-id",
  private_key: privateKey,
  client_email: "gsc-test@task-493.iam.gserviceaccount.com",
  client_id: "123456789",
  token_uri: TOKEN_ENDPOINT,
});

const serviceAccountJson = JSON.stringify(serviceAccount());

type FetchCall = { url: string; init?: RequestInit };

const withStubbedFetch = async <T>(
  handler: (url: string, init?: RequestInit) => { status: number; body: unknown },
  fn: () => Promise<T>
): Promise<{ result: T; calls: FetchCall[] }> => {
  const originalFetch = globalThis.fetch;
  const calls: FetchCall[] = [];
  globalThis.fetch = (async (request: Request | string, init?: RequestInit) => {
    const url = typeof request === "string" ? request : request.url;
    calls.push({ url, init });
    const { status, body } = handler(url, init);
    return new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  try {
    return { result: await fn(), calls };
  } finally {
    globalThis.fetch = originalFetch;
  }
};

type GscRowSnapshot = { config: unknown; status: string; healthStatus: string } | null;

let gscSnapshot: GscRowSnapshot = null;
let gscExisted = false;

const seedGscRow = async (config: Record<string, unknown>) => {
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
    config,
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

const tokenHandler = (url: string) =>
  url === TOKEN_ENDPOINT
    ? {
        status: 200,
        body: { access_token: "ya29.test-access-token", expires_in: 3600, token_type: "Bearer" },
      }
    : { status: 500, body: { error: "unexpected endpoint" } };

const decodePart = (part: string) =>
  JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as Record<string, unknown>;

test("mintAccessToken exchanges a signed RS256 JWT assertion for an access token", async () => {
  const { result, calls } = await withStubbedFetch(tokenHandler, async () =>
    mintAccessToken(serviceAccount(), `https://www.googleapis.com/auth/webmasters.readonly`)
  );

  expect(result).toBe("ya29.test-access-token");
  expect(calls).toHaveLength(1);
  expect(calls[0]?.url).toBe(TOKEN_ENDPOINT);
  expect(calls[0]?.init?.method).toBe("POST");
  const headers = calls[0]?.init?.headers as Record<string, string> | undefined;
  expect(headers?.["Content-Type"]).toBe("application/x-www-form-urlencoded");
  expect(typeof calls[0]?.init?.body).toBe("string");

  const body = String(calls[0]?.init?.body);
  const form = new URLSearchParams(body);
  expect(form.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer");
  const assertion = form.get("assertion");
  expect(assertion).toBeDefined();

  const [headerPart, claimsPart, signaturePart] = String(assertion).split(".");
  expect(headerPart).toBeDefined();
  expect(claimsPart).toBeDefined();
  expect(signaturePart).toBeDefined();

  const header = decodePart(headerPart as string);
  expect(header).toEqual({ alg: "RS256", typ: "JWT" });

  const claims = decodePart(claimsPart as string);
  expect(claims.iss).toBe("gsc-test@task-493.iam.gserviceaccount.com");
  expect(claims.scope).toBe("https://www.googleapis.com/auth/webmasters.readonly");
  expect(claims.aud).toBe(TOKEN_ENDPOINT);
  expect(typeof claims.iat).toBe("number");
  expect(claims.exp).toBe((claims.iat as number) + 3600);

  const { verify } = await import("node:crypto");
  const valid = verify(
    "RSA-SHA256",
    Buffer.from(`${headerPart}.${claimsPart}`, "utf8"),
    publicKey,
    Buffer.from(signaturePart as string, "base64url")
  );
  expect(valid).toBe(true);
});

test("mintAccessToken surfaces gsc_token_failed:<status> on a non-ok token endpoint", async () => {
  await expect(
    withStubbedFetch(
      () => ({ status: 400, body: { error: "invalid_grant" } }),
      () => mintAccessToken(serviceAccount(), "https://www.googleapis.com/auth/webmasters.readonly")
    )
  ).rejects.toThrow("gsc_token_failed:400");
});

test("mintAccessToken rejects a malformed service account", async () => {
  const bad = { ...serviceAccount(), client_email: "" };
  await expect(
    mintAccessToken(bad, "https://www.googleapis.com/auth/webmasters.readonly")
  ).rejects.toThrow("gsc_credential_invalid");
});

testIfDb("getGscClient throws gsc_not_configured with no saved config", async () => {
  await seedGscRow({});
  try {
    await expect(getGscClient()).rejects.toThrow("gsc_not_configured");
  } finally {
    await restoreGscRow();
  }
});

testIfDbAndKey("getGscClient throws gsc_credential_invalid on malformed SA JSON", async () => {
  await seedGscRow({
    serviceAccountJson: encryptSecret("{ not valid json"),
    siteUrl: SITE_URL,
  });
  try {
    await expect(getGscClient()).rejects.toThrow("gsc_credential_invalid");
  } finally {
    await restoreGscRow();
  }
});

testIfDbAndKey(
  "request sends the Bearer header and surfaces gsc_request_failed:<status>",
  async () => {
    await seedGscRow({
      serviceAccountJson: encryptSecret(serviceAccountJson),
      siteUrl: SITE_URL,
    });
    try {
      const calls: FetchCall[] = [];
      await withStubbedFetch(
        (url, init) => {
          calls.push({ url, init });
          return url === TOKEN_ENDPOINT
            ? { status: 200, body: { access_token: "ya29.test-access-token" } }
            : { status: 403, body: { error: { message: "forbidden" } } };
        },
        async () => {
          const client = await getGscClient();
          await expect(
            client.request("POST", "sites/https%3A%2F%2Fexample.com%2F/searchAnalytics/query", {
              startDate: "2024-01-01",
              endDate: "2024-01-07",
              dimensions: ["query"],
            })
          ).rejects.toThrow("gsc_request_failed:403");
        }
      );

      const v3Call = calls.find((call) => call.url.startsWith(GSC_V3_BASE));
      expect(v3Call).toBeDefined();
      const headers = v3Call?.init?.headers as Record<string, string> | undefined;
      expect(headers?.Authorization).toBe("Bearer ya29.test-access-token");
      expect(headers?.["Content-Type"]).toBe("application/json");
    } finally {
      await restoreGscRow();
    }
  }
);

testIfDbAndKey("request returns parsed JSON and null on 204", async () => {
  await seedGscRow({
    serviceAccountJson: encryptSecret(serviceAccountJson),
    siteUrl: SITE_URL,
  });
  try {
    const calls: FetchCall[] = [];
    await withStubbedFetch(
      (url, init) => {
        calls.push({ url, init });
        if (url === TOKEN_ENDPOINT) {
          return { status: 200, body: { access_token: "ya29.test-access-token" } };
        }
        if (init?.method === "DELETE") {
          return { status: 204, body: null };
        }
        return { status: 200, body: { rows: [{ clicks: 5 }] } };
      },
      async () => {
        const client = await getGscClient();

        const data = await client.request(
          "POST",
          "sites/https%3A%2F%2Fexample.com%2F/searchAnalytics/query",
          { startDate: "2024-01-01", endDate: "2024-01-07" }
        );
        expect(data).toEqual({ rows: [{ clicks: 5 }] });

        const nullData = await client.request(
          "DELETE",
          "sites/https%3A%2F%2Fexample.com%2F/sitemaps/x"
        );
        expect(nullData).toBeNull();
      }
    );

    const v3Call = calls.find((call) => call.url.startsWith(GSC_V3_BASE));
    expect(v3Call).toBeDefined();
    const headers = v3Call?.init?.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBe("Bearer ya29.test-access-token");
    expect(headers?.["Content-Type"]).toBe("application/json");
  } finally {
    await restoreGscRow();
  }
});

testIfDbAndKey("inspectUrl POSTs to the v1 endpoint and returns a normalized result", async () => {
  await seedGscRow({
    serviceAccountJson: encryptSecret(serviceAccountJson),
    siteUrl: SITE_URL,
  });
  try {
    const calls: FetchCall[] = [];
    const inspectionUrl = "https://example.com/page";
    await withStubbedFetch(
      (url, init) => {
        calls.push({ url, init });
        if (url === TOKEN_ENDPOINT) {
          return { status: 200, body: { access_token: "ya29.test-access-token" } };
        }
        return {
          status: 200,
          body: {
            inspectionResult: {
              indexingState: "INDEXED",
              coverageState: "Submitted and indexed",
              verdict: "PASS",
              pageFetchState: "SUCCESSFUL",
              robotsTxtState: "ALLOWED",
              googleCanonical: "https://example.com/page",
              userCanonical: "https://example.com/page",
              lastCrawledTime: "2024-01-02T03:04:05.000Z",
            },
          },
        };
      },
      async () => {
        const client = await getGscClient();
        const result = await client.inspectUrl(inspectionUrl);
        expect(result).toEqual({
          url: inspectionUrl,
          indexingState: "INDEXED",
          coverageState: "Submitted and indexed",
          verdict: "PASS",
          pageFetchState: "SUCCESSFUL",
          robotsTxtState: "ALLOWED",
          googleCanonical: "https://example.com/page",
          userCanonical: "https://example.com/page",
          lastCrawledAt: new Date("2024-01-02T03:04:05.000Z"),
        });
      }
    );

    const inspectCall = calls.find((call) => call.url === URL_INSPECTION_ENDPOINT);
    expect(inspectCall).toBeDefined();
    expect(inspectCall?.init?.method).toBe("POST");
    const headers = inspectCall?.init?.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBe("Bearer ya29.test-access-token");
    expect(headers?.["Content-Type"]).toBe("application/json");
    expect(JSON.parse(String(inspectCall?.init?.body))).toEqual({
      inspectionUrl,
      siteUrl: SITE_URL,
    });
  } finally {
    await restoreGscRow();
  }
});

testIfDbAndKey(
  "inspectUrl surfaces gsc_request_failed:<status> on a non-ok v1 response",
  async () => {
    await seedGscRow({
      serviceAccountJson: encryptSecret(serviceAccountJson),
      siteUrl: SITE_URL,
    });
    try {
      await withStubbedFetch(
        (url) =>
          url === TOKEN_ENDPOINT
            ? { status: 200, body: { access_token: "ya29.test-access-token" } }
            : { status: 429, body: { error: { message: "quota exceeded" } } },
        async () => {
          const client = await getGscClient();
          await expect(client.inspectUrl("https://example.com/page")).rejects.toThrow(
            "gsc_request_failed:429"
          );
        }
      );
    } finally {
      await restoreGscRow();
    }
  }
);
