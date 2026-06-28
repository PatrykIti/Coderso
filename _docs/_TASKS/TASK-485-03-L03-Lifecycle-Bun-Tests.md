# TASK-485-03-L03: Lifecycle + security Bun tests (install→upgrade→rollback→uninstall)
# FileName: TASK-485-03-L03-Lifecycle-Bun-Tests.md

**Parent Subtask:** TASK-485-03
**Priority:** High
**Category:** Store / Plugins / Tests
**Estimated Effort:** Medium
**Dependencies:** TASK-485-03-L01, TASK-485-03-L02.
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Prove the lifecycle end-to-end through the **real verified pipeline**
  in the Bun lane (plugin install/upgrade/rollback/uninstall is runtime-kernel +
  fs + DB → Bun is mandatory, not Vitest).
- **Owning module(s) to create-or-extend:**
  - **Create** `tests/integration/plugins/pluginLifecycle.test.ts` (Bun).
  - **Extend** `tests/integration/routes/pluginsRoutes.test.ts` (Bun — write
    routes: RBAC, reject-unknown, error mapping).
  - **Extend** `tests/security/pluginStore.test.ts` (Bun — `plugins:manage` +
    CSRF on writes, no-secret payloads).
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md`, `_docs/STORE_SPEC.md`,
  `_docs/SECURITY_SPEC.md`.
- **Out of scope:** UI tests (subtask 04), catalog tests (subtask 02-L04).

---

## Security Contract

Test-only leaf, asserting the subtask-03 contract: the signature/checksum/
compatibility pipeline cannot be bypassed; tampered packages are rejected with the
mapped code; uninstall is path-confined to `DEFAULT_PLUGINS_DIR`; writes require
`plugins:manage` + CSRF; responses contain no `integrity`/`signature`/store URL.

---

## Implementation Pseudocode

```ts
// tests/integration/plugins/pluginLifecycle.test.ts  (Bun)
// Setup: a fixture store (local HTTP server via Bun.serve OR a mocked
// core/store/client) serving a signed metadata + a checksum-matching zip + an
// ed25519 STORE_PUBLIC_KEY env. Use a temp runtimeDir.

beforeAll(() => { /* set STORE_BASE_URL, STORE_PUBLIC_KEY; set -a source .env */ });

test("install: valid signed package -> registry row created, audit plugins.install");
test("install: tampered checksum -> store_checksum_mismatch (no row, no files)");
test("install: bad signature -> store_signature_invalid");
test("install: incompatible coreVersion -> plugin_incompatible/409");
test("upgrade: install v1 then v2 -> row.version === v2, audit plugins.update");
test("rollback: re-install v1 over v2 (force) -> row.version === v1");
test("update blocked by policy 'manual' (non-security release) -> plugin_update_skipped");
test("uninstall: removes runtime dir + deletes row + cascades plugin_settings + audit plugins.uninstall");
test("uninstall: refuses a name resolving outside DEFAULT_PLUGINS_DIR");
test("policy: setPolicy round-trips via plugin_settings; out-of-enum rejected");

// tests/integration/routes/pluginsRoutes.test.ts  (extend, Bun)
test("write routes registered with plugins:manage");
test("install rejects unknown body field (.strict) -> 400");
test("update skipped maps to plugin_update_skipped/409");
```

**Regression intent:** this is the guard that "install actually verifies" — the
mock page could 'install' anything; the real pipeline must reject tampered or
incompatible packages and must persist a registry row + audit trail.

---

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types`.
- **Bun lane (mandatory):**
  - `set -a && source .env && set +a`
  - `bun test tests/integration/plugins/pluginLifecycle.test.ts`
  - `bun test tests/integration/routes/pluginsRoutes.test.ts`
  - `bun test tests/security/pluginStore.test.ts`
- Use `Bun.serve`/`Bun.file` for the fixture store if a real HTTP roundtrip is
  exercised; otherwise mock `core/store/client`. State any skipped command in the
  closeout.
