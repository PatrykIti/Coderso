# TASK-485-02-L04: Catalog route + security tests (Bun)
# FileName: TASK-485-02-L04-Catalog-Route-And-Security-Tests.md

**Parent Subtask:** TASK-485-02
**Priority:** High
**Category:** Store / Plugins / Tests
**Estimated Effort:** Small
**Dependencies:** TASK-485-02-L01, TASK-485-02-L02, TASK-485-02-L03.
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Bun route/security tests for the catalog API, plus a Vitest slice for
  the service normalize/error taxonomy.
- **Owning module(s) to create-or-extend:**
  - **Create** `tests/integration/routes/storeCatalog.test.ts` (Bun).
  - **Create** `tests/vitest/services/storeCatalogService.test.ts` (Vitest).
  - **Extend** `tests/security/pluginStore.test.ts` (Bun) with `store:browse`
    gating + no-secret-payload assertions (file also extended in subtask 05).
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md`, `_docs/SECURITY_SPEC.md`.
- **Out of scope:** lifecycle tests (subtask 03), UI tests (subtask 04).

---

## Security Contract

Test-only leaf. Asserts the L02 contract: `store:browse` required on all three
routes; payloads exclude `download`/`signature`/`checksum`; `store_not_configured`
when `STORE_BASE_URL` is unset; param-validation rejects malformed `name`/`version`.

---

## Implementation Pseudocode

```ts
// tests/integration/routes/storeCatalog.test.ts  (Bun)
// Build a fake router capturing (path, permission, handler) like the existing
// tests/integration/routes/pluginsRoutes.test.ts does. Mock core/store/client.
test("registers GET /store/catalog* with store:browse", () => { /* assert perms per route */ });
test("list maps registry summaries to secret-free VM (no download/signature/checksum)", async () => {});
test("detail rejects bad :name with store_param_invalid/400", async () => {});
test("returns store_not_configured/503 when STORE_BASE_URL is unset", async () => {});
test("maps upstream 404 to store_plugin_not_found/404", async () => {});

// tests/vitest/services/storeCatalogService.test.ts  (Vitest)
test("normalizeCatalogItem bounds tags and drops unknown keys");
test("normalizeCatalogVersion: releaseType from release.type; compatible=false when assertMetadataCompatibility throws");
```

**Regression intent:** prove the admin never receives store secrets and that an
unconfigured/unavailable store degrades to a stable code instead of a 500.

---

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types`.
- **Bun lane:** `bun test tests/integration/routes/storeCatalog.test.ts`;
  `bun test tests/security/pluginStore.test.ts`.
- **Vitest lane:**
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/services/storeCatalogService.test.ts`.
- State in the closeout if any command was skipped or could not run.
