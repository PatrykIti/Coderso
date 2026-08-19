# TASK-493-03-L01: GSC Credential & Server-Side Auth Client
# FileName: TASK-493-03-L01-Gsc-Credential-And-Auth-Client.md

**Parent Subtask:** TASK-493-03
**Priority:** High
**Category:** Tools / SEO
**Estimated Effort:** Medium
**Dependencies:** Integrations registry + secret store
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Register a `google-search-console` Integration whose credential is an
  encrypted secret, and build a **server-side** auth client that turns that
  credential into a short-lived Google access token plus a low-level
  `request(method, path)` helper against the GSC API. No client ever sees the
  credential or token.
- **Owning module(s) to create-or-extend:**
  - `core/services/integrations/registry.ts` (**extend** — append a
    `google-search-console` entry to `INTEGRATIONS` with `category: "Analytics"`,
    `scopes: ["seo:read", "search-console:read"]` (a **descriptive label**, not
    `permissionCatalog` RBAC — no `seo:*` permission exists), and `secret`-typed
    fields).
  - `core/services/seo/gscClient.ts` (**create** — `getGscClient()` reads the
    decrypted config via
    `getIntegrationRuntimeConfig("google-search-console")`, mints a token, and
    returns `{ request, siteUrl }`; throws `gsc_not_configured` when unset).
- **Source-of-truth docs:** `_docs/SECURITY_SPEC.md` (secret handling, outbound),
  `_docs/CMS_API.md` (integration listing), `_docs/SEARCH_SPEC.md`.
- **Out of scope:** fetching/persisting search data (L02); sitemap submission
  (02-L02); any UI for entering the credential (the generic Integrations settings
  UI already renders `secret` fields — no new UI needed).

### Credential model

Service-account flow (recommended, server-to-server, no interactive OAuth):

- `serviceAccountJson` — **secret** (full SA JSON key; required).
- `siteUrl` — **text** (the verified GSC property, e.g.
  `https://example.com/` or `sc-domain:example.com`; required).

The client builds a signed JWT assertion and exchanges it at Google's token
endpoint for an access token scoped to
`https://www.googleapis.com/auth/webmasters.readonly` (read) — submission
(02-L02) needs `https://www.googleapis.com/auth/webmasters`.

---

## Security Contract

- **Endpoint visibility:** n/a directly — the credential is managed through the
  **existing** internal `PATCH /settings/integrations/:id`
  (`integrationsRoutes.ts`, `settings:write`); this leaf adds **no new route**.
- **Auth model:** session admin for credential management (inherited from the
  integrations route).
- **RBAC:** `settings:write` to set the credential, `settings:read` to view
  status (both inherited from `integrationsRoutes.ts`). The encrypted secret is
  never returned (`toFieldSummary` already returns `value: null` for `secret`
  fields — verified in `integrationsService.ts:103`).
- **CSRF:** inherited from the integrations write route.
- **Rate-limit bucket:** `admin_write` (inherited) for credential writes; the
  outbound token mint is server-to-Google (not rate-limit-bucketed).
- **Validation:** `ensureKnownKeys` in `integrationsService.ts:168` already
  rejects unknown config keys for the definition (reject-unknown). The SA JSON is
  parsed/validated **server-side**; a malformed key throws `gsc_credential_invalid`.
- **Anti-abuse:** n/a (no public surface).
- **Secret/PII handling — critical:** the SA JSON and minted access token are
  **secrets**. They are encrypted at rest (`encryptSecret`), decrypted only
  inside `getGscClient` server-side, and must never reach a response body, the
  admin cache, audit metadata, or logs. Log only non-secret context
  (`siteUrl`, status codes). The token is held in-memory for the request and may
  be cached in-process with its expiry, never persisted.

---

## Implementation Pseudocode

```ts
// core/services/integrations/registry.ts — append to INTEGRATIONS
{
  id: "google-search-console",
  name: "Google Search Console",
  description: "Pull indexed-page status and search performance (impressions, clicks, queries).",
  category: "Analytics",
  // descriptive label only — NOT permissionCatalog RBAC (no seo:* permission exists)
  scopes: ["seo:read", "search-console:read"],
  fields: [
    { key: "serviceAccountJson", label: "Service Account JSON", type: "secret", required: true,
      placeholder: '{ "type": "service_account", ... }' },
    { key: "siteUrl", label: "Property URL", type: "text", required: true,
      placeholder: "https://example.com/ or sc-domain:example.com" },
  ],
}
```

```ts
// core/services/seo/gscClient.ts
export async function getGscClient(scope = "webmasters.readonly") {
  const cfg = await getIntegrationRuntimeConfig("google-search-console");
  if (!cfg?.serviceAccountJson || !cfg?.siteUrl) throw new Error("gsc_not_configured");
  let sa: ServiceAccount;
  try { sa = JSON.parse(cfg.serviceAccountJson); }
  catch { throw new Error("gsc_credential_invalid"); }

  const token = await mintAccessToken(sa, `https://www.googleapis.com/auth/${scope}`); // signed JWT -> token endpoint
  const base = "https://searchconsole.googleapis.com/webmasters/v3/"; // Search Analytics + sitemaps
  const inspectBase = "https://searchconsole.googleapis.com/v1/";

  async function request(method: string, path: string, body?: unknown) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`gsc_request_failed:${res.status}`);
    return res.status === 204 ? null : res.json();
  }

  async function inspectUrl(url: string) {
    // URL Inspection is a v1 endpoint (~2000/day quota), not v3 Search Analytics.
    const res = await fetch(`${inspectBase}urlInspection/index:inspect`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inspectionUrl: url, siteUrl: cfg.siteUrl }),
    });
    if (!res.ok) throw new Error(`gsc_request_failed:${res.status}`);
    return normalizeInspectionResult(await res.json()); // normalized { indexingState, verdict, ... }
  }

  return { request, inspectUrl, siteUrl: cfg.siteUrl };
}
```

**Data flow:** admin saves credential via existing integrations route → encrypted
at rest → `getGscClient` decrypts server-side → mints token → returns
`request`/`inspectUrl`/`siteUrl` to callers (L02 sync uses `request` for Search
Analytics and `inspectUrl` for URL Inspection; 02-L02 submit uses `request`).

**Error handling:** domain codes `gsc_not_configured`, `gsc_credential_invalid`,
`gsc_request_failed:<status>`; callers map at their route boundary
(`mapSeoError`).

**Regression-test shape:**
- Registry: `getIntegrationDefinition("google-search-console")` returns the
  definition; secret field summarises with `value: null`, `configured` reflects
  presence.
- Client: `getGscClient` throws `gsc_not_configured` with no config; mints a
  token against a stubbed token endpoint; `request` sets the Bearer header and
  surfaces `gsc_request_failed:<status>` on non-2xx; `inspectUrl` POSTs to the
  v1 `urlInspection/index:inspect` endpoint with the Bearer header and returns a
  normalized inspection result (surfaces `gsc_request_failed:<status>` on
  non-2xx).
- Secret leak: a saved credential never appears in `listIntegrations()` /
  `getIntegration()` output.

---

## Testing Requirements

- **Bun** (`tests/integration/integrations/gscClient.test.ts`) — token mint +
  `request` against a stubbed Google endpoint (outbound fetch ⇒ Bun lane).
- **Bun security** (`tests/security/gsc-credential.test.ts`) — credential never
  in integration summaries/logs.
- `bun run lint` + `bun run typecheck`.
