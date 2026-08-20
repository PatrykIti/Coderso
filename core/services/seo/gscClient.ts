/**
 * Google Search Console (GSC) server-side auth client (TASK-493-03-L01).
 *
 * Reads the encrypted `google-search-console` integration credential (a Google
 * service-account JSON key), exchanges it at Google's OAuth token endpoint for
 * a short-lived access token via a signed RS256 JWT assertion (RFC 7523), and
 * exposes low-level `request` and `inspectUrl` helpers against the Search
 * Console v3 and v1 URL Inspection APIs.
 *
 * Security: the service-account JSON and the minted access token are secrets.
 * They are decrypted only inside `getGscClient`, held in memory for the
 * lifetime of the client, and must never reach a response body, cache, audit
 * metadata, or log. Only `siteUrl` and HTTP status codes are exposed. Callers
 * (03-L02 sync, 02-L02 sitemap submission) map the machine-readable domain
 * codes (`gsc_not_configured`, `gsc_credential_invalid`, `gsc_request_failed`,
 * `gsc_token_*`) at their route boundary via `mapSeoError`.
 */

import { createPrivateKey, sign } from "node:crypto";

import { getIntegrationRuntimeConfig } from "../integrations/integrationsService";
import { normalizeIndexingState, type SeoIndexingState } from "./seoSearchPerformanceTypes";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GSC_V3_BASE = "https://searchconsole.googleapis.com/webmasters/v3/";
const URL_INSPECTION_ENDPOINT =
  "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";

/** Minimal service-account key shape used by the JWT assertion mint. */
export type GscServiceAccount = {
  type: string;
  project_id?: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  token_uri?: string;
};

/**
 * Normalized result of a v1 URL Inspection call. Unknown or missing fields
 * degrade to null / `UNKNOWN` so downstream persistence (03-L02) can always
 * store a complete `seo_indexed_pages` row.
 */
export type GscInspectionResult = {
  url: string;
  indexingState: SeoIndexingState;
  coverageState: string | null;
  verdict: string | null;
  pageFetchState: string | null;
  robotsTxtState: string | null;
  googleCanonical: string | null;
  userCanonical: string | null;
  lastCrawledAt: Date | null;
};

export type GscClient = {
  request: (method: string, path: string, body?: unknown) => Promise<unknown>;
  inspectUrl: (url: string) => Promise<GscInspectionResult>;
  siteUrl: string;
};

const base64UrlEncode = (input: string | Buffer): string =>
  Buffer.from(input).toString("base64url");

const nullableString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

/**
 * Mint a Google OAuth access token from a service-account key using a signed
 * RS256 JWT assertion. Exported for tests so the token endpoint can be
 * stubbed; production callers go through `getGscClient`. `scope` is the full
 * Google auth scope URL (e.g. `https://www.googleapis.com/auth/webmasters.readonly`).
 */
export async function mintAccessToken(sa: GscServiceAccount, scope: string): Promise<string> {
  if (typeof sa.client_email !== "string" || sa.client_email.length === 0) {
    throw new Error("gsc_credential_invalid");
  }
  if (typeof sa.private_key !== "string" || sa.private_key.length === 0) {
    throw new Error("gsc_credential_invalid");
  }

  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const claims = base64UrlEncode(
    JSON.stringify({
      iss: sa.client_email,
      scope,
      aud: TOKEN_ENDPOINT,
      iat: now,
      exp: now + 3600,
    })
  );
  const signingInput = `${header}.${claims}`;

  let signature: string;
  try {
    const privateKey = createPrivateKey(sa.private_key);
    signature = base64UrlEncode(sign("RSA-SHA256", Buffer.from(signingInput, "utf8"), privateKey));
  } catch {
    throw new Error("gsc_credential_invalid");
  }
  const assertion = `${signingInput}.${signature}`;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  let res: Response;
  try {
    res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch {
    throw new Error("gsc_token_failed");
  }

  if (!res.ok) {
    throw new Error(`gsc_token_failed:${res.status}`);
  }

  let data: { access_token?: unknown };
  try {
    data = (await res.json()) as { access_token?: unknown };
  } catch {
    throw new Error("gsc_token_invalid");
  }
  if (typeof data.access_token !== "string" || data.access_token.length === 0) {
    throw new Error("gsc_token_invalid");
  }
  return data.access_token;
}

/**
 * Normalize a raw v1 URL Inspection response into the documented domain shape.
 * `indexingState` is coerced through the shared `normalizeIndexingState` helper
 * so the result is directly persistable into `seo_indexed_pages`.
 */
export function normalizeInspectionResult(payload: unknown, url: string): GscInspectionResult {
  const raw =
    payload && typeof payload === "object"
      ? ((payload as { inspectionResult?: Record<string, unknown> }).inspectionResult ?? {})
      : {};

  const lastCrawledAt = nullableString(raw.lastCrawledTime);
  const parsedDate = lastCrawledAt ? new Date(lastCrawledAt) : null;

  return {
    url,
    indexingState: normalizeIndexingState(nullableString(raw.indexingState)),
    coverageState: nullableString(raw.coverageState),
    verdict: nullableString(raw.verdict),
    pageFetchState: nullableString(raw.pageFetchState),
    robotsTxtState: nullableString(raw.robotsTxtState),
    googleCanonical: nullableString(raw.googleCanonical),
    userCanonical: nullableString(raw.userCanonical),
    lastCrawledAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
  };
}

/**
 * Build a GSC client for the configured `google-search-console` integration.
 * `scope` defaults to the read-only Webmasters scope; the sitemap submission
 * flow (02-L02) passes `"webmasters"` for write access.
 */
export async function getGscClient(scope = "webmasters.readonly"): Promise<GscClient> {
  const cfg = await getIntegrationRuntimeConfig("google-search-console");
  if (!cfg?.serviceAccountJson || !cfg?.siteUrl) {
    throw new Error("gsc_not_configured");
  }

  let sa: GscServiceAccount;
  try {
    sa = JSON.parse(cfg.serviceAccountJson) as GscServiceAccount;
  } catch {
    throw new Error("gsc_credential_invalid");
  }

  const token = await mintAccessToken(sa, `https://www.googleapis.com/auth/${scope}`);
  const siteUrl = cfg.siteUrl;

  async function request(method: string, path: string, body?: unknown): Promise<unknown> {
    const res = await fetch(`${GSC_V3_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`gsc_request_failed:${res.status}`);
    }
    if (res.status === 204) {
      return null;
    }
    return res.json();
  }

  async function inspectUrl(url: string): Promise<GscInspectionResult> {
    const res = await fetch(URL_INSPECTION_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inspectionUrl: url, siteUrl }),
    });
    if (!res.ok) {
      throw new Error(`gsc_request_failed:${res.status}`);
    }
    return normalizeInspectionResult(await res.json(), url);
  }

  return { request, inspectUrl, siteUrl };
}
