# TASK-485-02-L01: storeCatalogService domain (wrap registry, normalize, error codes)
# FileName: TASK-485-02-L01-Store-Catalog-Service.md

**Parent Subtask:** TASK-485-02
**Priority:** High
**Category:** Store / Plugins / Domain Service
**Estimated Effort:** Medium
**Dependencies:** None hard (wraps `core/store/client.ts`).
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** A domain service that turns the external registry responses into a
  stable admin **catalog view-model** and owns the catalog error taxonomy, so the
  routes (L02) and client (L03) stay thin. Only **real** store fields are
  surfaced — no invented `securityScore`/`downloads`/`status` (those existed only
  in the mock `StoreCatalogItem`).
- **Owning module(s) to create-or-extend:**
  - **Create** `core/services/store/storeCatalogService.ts` (schema/VM owner +
    `normalizeCatalogItem` / `normalizeCatalogMetadata` + `StoreCatalogError`).
  - **Reuse** `core/store/client.ts` (`fetchPluginList`, `fetchPluginDetails`,
    `fetchMetadata`), `core/store/verifier.ts` (`assertMetadataCompatibility`),
    `core/plugins/compat.ts`.
- **Source-of-truth docs:** `_docs/STORE_SPEC.md`, `_docs/CMS_API.md`,
  `_docs/CODERSO_PLUGIN_CONTRACT.md`, `_docs/SDK_SPEC.md`.
- **Out of scope:** the HTTP routes (L02), caching/client (L03), install
  (subtask 03). This service performs **no** install/write — read-only catalog.

---

## Security Contract

- **Endpoint visibility:** none here (pure service); consumed by an internal
  route in L02.
- **Auth/RBAC/CSRF:** enforced by the L02 route (`store:browse`); the service is
  permission-agnostic but must be invoked only from gated routes.
- **Validation:** the service is the **schema owner** for the catalog VM. It must
  defensively normalize untrusted external store JSON: coerce/whitelist fields,
  drop unknown keys, bound `tags`/`versions` array lengths, and never pass raw
  external objects through to the client.
- **Secret/PII handling:** the catalog VM must **exclude** the raw
  `files.download` URL, `signature.keyId`, and `checksum` from list responses
  (those are install-internal). For the version-metadata response, expose only
  what the UI needs (`version`, `apiVersion`, `coreVersion`, `release.type`,
  `security.scanStatus`, derived `compatible`) — never `STORE_PUBLIC_KEY` or the
  download URL to the client. No store secret is read here.
- **Error mapping:** missing `STORE_BASE_URL` → `store_not_configured`;
  upstream non-2xx / network → `store_unavailable`; unknown plugin/version →
  `store_plugin_not_found`. These domain codes are mapped to `ApiError` at the
  route boundary (L02), not here.

---

## Implementation Pseudocode

```ts
// core/services/store/storeCatalogService.ts
import { fetchPluginList, fetchPluginDetails, fetchMetadata } from "../../store/client";
import { assertMetadataCompatibility } from "../../store/verifier";
import type { StorePluginSummary, StoreMetadata } from "../../store/client";

export const STORE_NOT_CONFIGURED = "store_not_configured";
export const STORE_UNAVAILABLE = "store_unavailable";
export const STORE_PLUGIN_NOT_FOUND = "store_plugin_not_found";

export class StoreCatalogError extends Error {
  constructor(public readonly code: string, public readonly status = 502) {
    super(code);
    this.name = "StoreCatalogError";
  }
}

export type CatalogItem = {
  name: string;
  latestVersion: string;
  description?: string;
  tags: string[];           // bounded
};

export type CatalogVersion = {
  version: string;
  apiVersion: string;
  coreVersion: string;
  releaseType: "normal" | "security";
  scanStatus?: string;      // from metadata.security.scanStatus (real)
  compatible: boolean;      // derived from assertMetadataCompatibility, NOT invented
};

export type CatalogDetail = CatalogItem & { versions: CatalogVersion[] };

const MAX_TAGS = 12;

function isConfigured() {
  return Boolean(process.env.STORE_BASE_URL);
}

function wrapUpstream<T>(run: () => Promise<T>): Promise<T> {
  if (!isConfigured()) throw new StoreCatalogError(STORE_NOT_CONFIGURED, 503);
  return run().catch((err) => {
    if (err instanceof StoreCatalogError) throw err;
    const msg = err instanceof Error ? err.message : "";
    if (/_404$/.test(msg)) throw new StoreCatalogError(STORE_PLUGIN_NOT_FOUND, 404);
    throw new StoreCatalogError(STORE_UNAVAILABLE, 502);
  });
}

export function normalizeCatalogItem(s: StorePluginSummary): CatalogItem {
  return {
    name: s.name,
    latestVersion: s.latestVersion,
    description: s.description,
    tags: Array.isArray(s.tags) ? s.tags.slice(0, MAX_TAGS) : [],
  };
}

function isCompatible(meta: StoreMetadata): boolean {
  try { assertMetadataCompatibility(meta); return true; } catch { return false; }
}

export function normalizeCatalogVersion(meta: StoreMetadata): CatalogVersion {
  return {
    version: meta.version,
    apiVersion: meta.apiVersion,
    coreVersion: meta.coreVersion,
    releaseType: meta.release?.type === "security" ? "security" : "normal",
    scanStatus: meta.security?.scanStatus,
    compatible: isCompatible(meta),
  };
}

export async function listCatalog(): Promise<CatalogItem[]> {
  return wrapUpstream(async () =>
    (await fetchPluginList()).map(normalizeCatalogItem));
}

export async function getCatalogDetail(name: string): Promise<CatalogDetail> {
  return wrapUpstream(async () => {
    const summary = await fetchPluginDetails(name);
    const latestMeta = await fetchMetadata(name, summary.latestVersion);
    return {
      ...normalizeCatalogItem(summary),
      versions: [normalizeCatalogVersion(latestMeta)], // expand to known versions when the registry exposes a version list
    };
  });
}

export async function getCatalogVersion(name: string, version: string): Promise<CatalogVersion> {
  return wrapUpstream(async () => normalizeCatalogVersion(await fetchMetadata(name, version)));
}
```

**Data flow:** route → `listCatalog()/getCatalogDetail()/getCatalogVersion()` →
registry client (`core/store/client.ts`, already TTL-cached) → `normalize*` →
secret-free VM. **Error handling:** `wrapUpstream` converts config/network/404
into `StoreCatalogError(code,status)`; the route maps it via `mapStoreError`.

**Regression-test shape (Vitest, in L03 suite / or a service test):**
`normalizeCatalogItem` bounds tags + drops unknown keys; `normalizeCatalogVersion`
sets `releaseType` from `release.type`, `compatible=false` when
`assertMetadataCompatibility` throws; `listCatalog` throws `store_not_configured`
when `STORE_BASE_URL` is unset.

---

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types`.
- **Vitest** (pure service, mock `core/store/client`): normalize truth tables +
  error taxonomy (covered in L04's service slice or a dedicated
  `tests/vitest/services/storeCatalogService.test.ts`).
- Note: the **route** that calls this service is tested in the Bun lane (L04).
