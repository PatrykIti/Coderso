# 1308 - TASK-467 Admin Bundle Heavy Chunk Hardening

**Date:** 2026-08-18
**Version:** Unreleased
**Tasks:** TASK-467, TASK-467-01, TASK-467-02, TASK-467-03, TASK-467-03-L01, TASK-467-03-L02, TASK-467-03-L03, TASK-467-03-L04, TASK-467-03-L04-L01

## Key Changes

### TASK-467 Admin Bundle Heavy Chunk Hardening (family)
- Split the heavy admin shell / custom-screens / widget-registry bundle graph
  so the admin SPA no longer loads every widget editor up front, without
  raising Vite's chunk warning limit.

### TASK-467-01 Extract Lightweight Custom Screens Cache Invalidation
- Added a memory-invalidator registry to the lightweight `customScreensCache`
  owner (which `assistantClient` already imports instead of the full client),
  so assistant mutations clear every registered in-memory Custom Screens cache
  plus the browser storage keys.

### TASK-467-02 Split Browser Custom Screens Client
- Kept list/sidebar/cache imports lightweight and moved full Custom Screen
  definition normalization into editor-only modules.

### TASK-467-03 Lazy Split Widget Editor Registry
- `TASK-467-03-L01` widened the editor contract types to
  `WidgetEditorComponent` / `WidgetEditorBundle` so metadata registry access
  can accept `React.lazy` editor components while preserving the required
  editor object shape.
- `TASK-467-03-L02` replaced the eager widget editor barrel with a typed lazy
  editor bundle loader map, removing every widget editor module from the
  registry metadata chunk.
- `TASK-467-03-L03` routed wizard, visual, and advanced editor rendering
  through a shared `WidgetEditorOutlet` with local Suspense, a visible lazy
  fallback, a bounded error boundary, and a retry action.
- `TASK-467-03-L04` added bundle-split evidence guards:
  `scripts/check-admin-bundle.ts` now fails when any dynamic raw JS chunk is at
  or above 500 kB unless a non-TASK-467 owner is explicitly documented, and
  `scripts/adminBundleReport.ts` reports registry split evidence
  (`registry-*` chunk bytes, largest dynamic chunk, TASK-467-owned chunks,
  widget editor chunks). `tests/vitest/admin/adminBundleReport.test.ts` and
  `tests/README.md` document the budget semantics.
- `TASK-467-03-L04-L01` documented the lazy node-import exemption with build
  verification.

### Runtime smoke evidence (TASK-467-03-L04 closure)
- New reusable `task-467` runtime-smoke adapter registered in the shared
  `scripts/runtime-smoke` runner (13 fixed adapters). It creates a uniquely
  scoped admin identity + role per run through a DB worker, authenticates the
  browser as that per-run admin (never a seeded shared account), and drives the
  real admin Widget Library drawer (`/advanced/widgets`) through 7 distinct
  scenarios that assert the visible lazy contract:
  1. wizard lazy fallback mounts with `role="status"` + geometry,
  2. visual color control changes the surface preview computed style,
  3. advanced editor mounts with writable controls and visible sections,
  4. editor shell follows dark mode with sections still visible,
  5. visual editor stays usable at a 390×844 mobile viewport without overflow,
  6. chunk failure shows the bounded error state and retry mounts the editor,
  7. visual color survives a lazy editor round trip through Advanced.
- Each scenario emits a receipt with computed styles, geometry, DOM state,
  console-error delta, and a PNG screenshot; the suite proves cleanup by
  removing the worker admin, its sessions, audit rows, and access logs
  (identity + receipts absent after the run).
- Runner infrastructure fixes landed with the adapter: the launcher now
  realpaths the canonical `node_modules` before comparing worktree paths
  (fixes worktree launches), control-character handling uses a loop instead of
  a regex, and the task-467 worker-operation validators use the strict
  exact-shape guards.
- The adapter authenticates as the per-run worker admin (isolation from shared
  admin session caps) and paces the later scenario boots across the per-user
  `/auth` rate-limit window, so the SPA's `/auth/me` + `/auth/install/status`
  boot calls never trip a 429 mid-suite.

## Validation

- `bun test tests/unit/runtime-smoke/task-467-adapter.test.ts
  tests/unit/runtime-smoke/cli-registry.test.ts
  tests/unit/runtime-smoke/visible-evidence.test.ts` — 27 pass / 0 fail.
- `bun run lint:repo` (root `tsc --noEmit`) green.
- Runtime smoke `bun scripts/runtime-smoke.ts run --suite task-467 --profile
  fast` — Result PASS, Cleanup PASS: 7/7 scenarios green, 7 PNG screenshots,
  0 console errors, worker admin + sessions + audit/access rows fully removed
  (identitiesAbsent + receiptsAbsent true).
- Full gate set at closure: `bun run lint` green; full `test:bun` lane green
  except two isolated pre-existing environment artifacts (both re-run and
  confirmed outside this family's dependency shape): the
  `submissionExportJob` scheduler test is DB-slow on this machine (passes with
  a 30 s budget at 5.2 s vs the default 5 s cap) and
  `npmBundledDependencySecurityPatch` resolves `node_modules` through the
  worktree's symlink to the primary shared store (passes in a real checkout).
  Two closure gates this family introduced were fixed during the run and are
  green: the board Statistics `Done` figure (3524, fresh physical-file count,
  `taskGraphIntegrity` 6/6) and the Bun lane manifest row for
  `tests/unit/runtime-smoke/task-467-adapter.test.ts` (`bunLaneManifest`
  16/16). Full `test:vitest` green; `gates:coderso` green; `precommit:check`
  green. `scan:security:strict` is blocked only by 4 pre-existing semgrep
  findings in untouched committed files (`backupCrypto.ts` GCM tag length,
  `renderPublicEntry.tsx`/`renderPublicPage.tsx` GA4 inline script,
  `task-511.ts` HTTP probe), all other scanners green (bun-audit, trivy
  vuln/config/secret, gitleaks history+worktree), and a direct semgrep run
  over all 11 new task-467 files reports 0 findings. The 4 pre-existing
  findings are recorded as a repo-wide strict-gate follow-up, not a TASK-467
  regression.
