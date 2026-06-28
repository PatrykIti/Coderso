# TASK-485-05-L01: Security + perf gates (Bun)
# FileName: TASK-485-05-L01-Security-And-Perf-Gates.md

**Parent Subtask:** TASK-485-05
**Priority:** High
**Category:** Store / Plugins / Security & Perf
**Estimated Effort:** Small
**Dependencies:** TASK-485-02 (catalog routes), TASK-485-03 (lifecycle routes).
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** A consolidated security gate over the entire new surface and a perf
  check that catalog browsing is cache-bounded (no per-render fan-out to the
  external store).
- **Owning module(s) to create-or-extend:**
  - **Create/extend** `tests/security/pluginStore.test.ts` (Bun).
  - **Extend** `tests/security/codersoSecurityGate.test.ts` (route-visibility +
    permission buckets for the new routes).
  - **Create** `tests/perf/storeCatalogCache.test.ts` (Bun) if a budget is asserted.
- **Source-of-truth docs:** `_docs/SECURITY_SPEC.md`, `_docs/STORE_SPEC.md`,
  `_docs/TESTING_STRATEGY.md`.
- **Out of scope:** UI tests (subtask 04), happy-path lifecycle (subtask 03-L03).

---

## Security Contract

Test-only leaf asserting the whole-task contract:

- **RBAC matrix:** `GET /plugins` → `plugins:read`; `GET /store/catalog*` →
  `store:browse`; `POST /plugins/install|:name/update|:name/uninstall|:name/
  enabled` + `PUT /plugins/:name/policy` → `plugins:manage`. A role missing the
  permission is rejected (403) on each.
- **Route visibility:** all new routes resolve under `/admin/api/*` — **none** is
  reachable on the public surface (assert via the gate's visibility buckets).
- **CSRF:** all lifecycle writes require a CSRF token (reject without it).
- **Pipeline integrity:** install/update cannot succeed with a bad
  signature/checksum or incompatible core version (re-asserts subtask-03 mapping
  at the security boundary).
- **No-secret payloads:** catalog + installed + lifecycle responses contain no
  `download` URL, `signature`, `checksum`, or `STORE_PUBLIC_KEY`.

---

## Implementation Pseudocode

```ts
// tests/security/pluginStore.test.ts  (Bun)
describe("RBAC", () => {
  it("GET /store/catalog requires store:browse (403 otherwise)");
  it("POST /plugins/install requires plugins:manage (403 otherwise)");
  it("GET /plugins requires plugins:read");
});
describe("CSRF", () => {
  it("install/update/uninstall/enabled/policy rejected without CSRF token");
});
describe("Pipeline", () => {
  it("install with tampered checksum -> store_checksum_mismatch (no DB row)");
});
describe("No-secret payloads", () => {
  it("catalog + installed responses omit download/signature/checksum/public key");
});

// tests/perf/storeCatalogCache.test.ts  (Bun)
it("repeated catalog browse hits the TTL cache (one upstream fetch within METADATA_TTL_MS)");
```

**Regression intent:** a single gate that fails loudly if any new route is
mis-scoped, public-exposed, CSRF-exempt, or leaks store secrets.

---

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types`.
- **Bun lane (mandatory):**
  - `set -a && source .env && set +a`
  - `bun test tests/security/pluginStore.test.ts`
  - `bun test tests/security/codersoSecurityGate.test.ts`
  - `bun test tests/perf/storeCatalogCache.test.ts` (if added)
- State in the closeout if any command was skipped or could not run.
