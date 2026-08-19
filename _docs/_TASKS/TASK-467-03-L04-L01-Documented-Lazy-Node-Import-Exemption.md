# TASK-467-03-L04-L01: Documented Lazy Node Import Exemption With Build Verification
# FileName: TASK-467-03-L04-L01-Documented-Lazy-Node-Import-Exemption.md

**Parent Subtask:** TASK-467-03-L04
**Priority:** High
**Category:** Validation / Security Boundary / Bundle
**Estimated Effort:** Small
**Dependencies:** TASK-467-03-L03
**Status:** ✅ Done
**Started:** 2026-08-18
**Completed:** 2026-08-18
**Changelog:** 1308 (pinned; closure only)

---

## Overview

Resolve the pre-existing `check:admin-boundary` failure recorded in the
TASK-467-03-L04 disposition (post-closure audit of TASK-9999/TASK-478,
blossom 2026-08-18, MEDIUM). The gate must pass before TASK-467 can close:
this leaf fixes the type-only `typeof import(...)` analyzer false positive and
documents the single guarded lazy `node:dns/promises` import that the browser
build provably eliminates, with a concrete owner and this follow-up as the
tracking record.

## Scope

- `scripts/adminBoundaryReport.ts`: stop scanning `typeof import(...)` as a
  dynamic browser edge (type-only query, zero runtime bytes).
- `scripts/adminBoundaryReport.ts`: add a narrowly-scoped, documented
  `AdminBoundaryDynamicNodeExemption` for
  `core/services/network/outboundHttpPolicy.ts`. Static `node:` imports in any
  module and dynamic `node:` imports in any non-listed module still hard-fail.
- `tests/vitest/admin/adminBoundaryReport.test.ts`: regression tests for the
  type-only skip and the exemption fail-closed behavior.
- Build verification: prove the built admin bundle contains zero `node:dns`
  bytes after `bun --cwd core build:admin`.

## Implementation Pseudocode

```ts
// scripts/adminBoundaryReport.ts
// 1. Type-only skip in resolveAdminBoundaryImportEdges:
//    for each dynamicImportPattern match: if the source prefix before
//    `import(` ends with `typeof `, skip the edge (zero runtime bytes).
// 2. Exemption record:
//    { moduleRepoPath: "core/services/network/outboundHttpPolicy.ts",
//      reason: "guarded lazy node:dns/promises resolver (TASK-567), server
//               delivery transport only; browser build dead-code-eliminates",
//      owner: "TASK-567 (outbound egress policy)",
//      followUp: this task }
// 3. In analyzeAdminBoundary forbidden-package branch: skip the violation
//    only when edge.kind === "dynamic" && specifier starts with "node:" &&
//    importer repo path equals the exemption moduleRepoPath.
// 4. Regression tests: typeof import not flagged; exempt module lazy node
//    import passes; same module static node import fails; non-exempt module
//    dynamic node import fails.
```

## Validation Evidence

- `bun run check:admin-boundary` passes: `877 browser-reachable files scanned`,
  0 violations (was 2 violations on HEAD: :304 type-only `typeof import` and
  :306 guarded lazy `await import`, both `node:dns/promises`).
- `bun --cwd core build:admin` then bundle inspection: zero `node:dns`,
  `node:dns/promises`, `dns/promises`, and `lookup` occurrences across all 409
  built chunks; the pure `validateOutboundUrl` code ships inside
  `AdminShell-*.js` with the resolver branch eliminated.
- `tests/vitest/admin/adminBoundaryReport.test.ts` 9/9 pass.

## Security Contract

- **Endpoint visibility:** no endpoints.
- **Auth model / RBAC / CSRF / rate limit:** unchanged.
- **Reject unknown validation:** unchanged.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** exemption record and reports contain no credentials,
  cookies, tokens, or private payloads. The exemption applies ONLY to
  dynamic `node:` specifiers in the single listed module; static `node:`
  imports and all other dynamic `node:` imports fail closed.
- **Scanner-config recording:** owner (`TASK-567 outbound egress policy`),
  reason (build-verified browser absence), expiry (re-verify at any change to
  the boundary contract or the module's imports; tracked at the quarterly
  TASK-9999 review), ticket (this task, changelog 1308).

## Acceptance Criteria

1. `bun run check:admin-boundary` exits 0.
2. Type-only `typeof import(...)` never produces a dynamic browser edge.
3. Static `node:` imports and non-exempt dynamic `node:` imports still fail.
4. Build output verified to contain zero `node:dns` bytes.
