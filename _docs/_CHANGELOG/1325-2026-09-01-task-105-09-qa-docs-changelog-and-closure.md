# 1325. TASK-105-09 QA, Docs, Changelog, and Closure — TASK-105-08 Terminal Documentation Sync

**Date:** 2026-09-01
**Version:** Unreleased
**Tasks:** TASK-105, TASK-105-08, TASK-105-08-01, TASK-105-08-01-S01, TASK-105-08-02,
TASK-105-08-03, TASK-105-08-04, TASK-105-08-05, TASK-105-08-05-L01,
TASK-105-08-05-L01-L01, TASK-105-08-05-L01-L02, TASK-105-08-05-L02,
TASK-105-08-05-L02-L01, TASK-105-08-05-L03, TASK-105-08-05-L03-L01,
TASK-105-08-05-L03-L02, TASK-105-08-05-L04, TASK-105-08-06, TASK-105-08-07,
TASK-105-08-08, TASK-105-08-08-L07, TASK-105-08-09, TASK-105-08-10,
TASK-105-08-11, TASK-105-08-12, TASK-105-08-13, TASK-105-08-14, TASK-105-08-15,
TASK-105-08-16, TASK-105-09

## Key Changes

### Fresh canonical whole-lane artifact (2026-09-01)
- `bun scripts/run-vitest-coverage.ts` (attempt 2, canonical, 276.98s) produced
  `coverage/vitest/coverage-summary.json` with `1186` test files and `10444` tests
  passed, zero failures. Totals: statements `96.23` (`43518/45221`), branches
  `87.05` (`31184/35822`), functions `98.86` (`11711/11845`), lines `99.26`
  (`39427/39718`) — `291` uncovered executable lines across `698` tracked source
  files (`594` at `100%` lines, `87` below, `17` zero-executable).
- The exact per-line residual ledger (all 291 lines, 87 files, attributed per owning
  leaf contract) is published in `TASK-105-08-12` under
  `## Closure Evidence — Fresh Canonical Artifact (2026-09-01)`; no zero-residual
  claim is made and `coverage.exclude` was not widened.
- Attempt 1 of the same command failed on a full-load contention timeout in
  `tests/vitest/pages/legacy-widget-block.test.tsx:150` (the wrapper's 15000ms
  per-test budget; no artifact emitted) and passed unchanged on rerun — the same
  failure mode as the 2026-08-29 whole-lane rerun already noted on the board. It is
  recorded as infra contention, not a product or assertion defect.
- Baseline comparison (against the on-disk retained artifact
  `coverage/vitest-full/coverage-summary.json`, 2026-08-26T15:29Z): lines
  `98.48 -> 99.26` (+0.78), statements `95.45 -> 96.23`, branches `86.34 -> 87.05`,
  functions `98.00 -> 98.86`, uncovered lines `600 -> 291` (−309), tracked files
  `686 -> 698` (12 new posts-editor split modules, 0 removals; 48 files improved,
  0 regressed). Older prose quoting `98.54%` lines / `577` uncovered (and
  `95.50/86.38/98.08`) never matched that artifact and is superseded by this entry.
- `tests/bun-lane-manifest.json` regenerated 2026-09-01 at `451` rows, including the
  three DB-free `task105-l08` runtime-smoke rows (bucket A).

### Terminal menus / dashboard / solution-kits family (`TASK-105-08-05`)
- Ordered source repairs landed in the contracted sequence
  `L01-L01 -> L01-L02 -> L01 -> L02-L01 -> L02 -> S01 -> L03-L01 -> L03 -> L04`:
  - `L01-L01` split record-centric menu-editor logic into the new
    `core/admin/ui/menus/menuEditorItemState.ts` and repaired the dead cache-refresh
    and `formatDate` paths; scoped V8 proved `MenuEditorPage.tsx` `320/320`,
    `MenuListPage.tsx` `168/168`, `menuEditorItemState.ts` `77/77` lines.
  - `L01-L02` removed the redundant `MenuItemDrawer` save null guard and transferred
    the direct public suite `tests/vitest/ui/menu-item-drawer.test.tsx` (9 tests,
    489 lines) driving the exported `MenuItemDrawer` and `MenuItemInspector` seams
    (blank-label, page-required, URL-required, save/close/delete, inspector
    live-change/switch/Advanced/remove); scoped V8 proved `MenuItemDrawer.tsx` at
    `100%` lines.
  - `L01` closed the menus reconciliation: `23` direct suites / `264` tests green and
    the original `17`-target menu inventory at `100%` lines
    (`MenuAppearancePanel`, `MenuCreateDialog`, the `MenuDesignEditor*` family,
    `MenuEditorPage`, `MenuListPage`, `MenuItemDrawer`, and the rest of the
    registered set).
  - `L02-L01` removed `DashboardBuilder`'s exhaustive private-reducer default, the
    impossible empty-catalog branch, and `widgetRegistry`'s `never` fallback, and
    added the public permission-filtered-catalog suite
    `tests/vitest/ui/dashboard-builder-catalog-permissions.test.tsx` proving
    `can={() => false}` hides protected cards while zero-permission cards remain
    (direct `1/1`; `DashboardBuilder.tsx` and `widgetRegistry.ts` at `100%` lines;
    zero owned-path TypeScript diagnostics).
  - `L02` closed the dashboard reconciliation: `85` public tests green with scoped V8
    at `100%` lines for all six registered source targets (`DashboardBuilder`,
    `DashboardWidgetHost`, `SecurityStatusCard`, `SiteHealthCard`,
    `WidgetConfigForm`, `widgetRegistry`).
  - `TASK-105-08-01-S01` delivered the exact four-path solution-kit browser ID-parity
    repair (`solutionKitsClient.ts`, `solutionKitSelection.ts`,
    `solutionKitsClient.coverage.test.ts`, `solutionKitSelection.test.ts`): direct
    Vitest `24/24` + `8/8`, scoped V8 `32/32` with both source rows at `100%` lines,
    six server-side IDs kept as authority, and the transitional browser/card
    divergence recorded as `transitional_cross_owner` on `SolutionKitCard.tsx`.
  - `L03-L01` cleared that exact diagnostic: explicit `local-service-business`
    `Boxes`/muted-tone card mapping, redundant generic fallback removed, direct
    regression `1/1`, `SolutionKitCard.tsx` at `100%` lines, post-audit
    `PASS`/`CLEAN` with `0 HIGH / 0 MEDIUM / 0 LOW`.
  - `L03` closed the solution-kits coverage body test-only: `31/31` tests across the
    five registered suites, with `100%` lines on `SolutionKitCard.tsx` (`6/6`),
    `SolutionKitsPage.tsx` (`34/34`), `useSolutionKitRuns.ts` (`109/109`), and
    `useSolutionKits.ts` (`28/28`).
  - The historical duplicate `L03-L02` remains `⏭️ Superseded` (parent `L03`,
    successor `L03-L01`) with no implementation receipt.
- `L04` registered the `task-105-l05` shared-platform runtime smoke and completed the
  real browser acceptance run on this host: official session
  `task105-l05-fast-20260901-official-r2` — `pass: true`, `serverUp: true`, five
  scenarios (`menu-structure-save-publish-parity`,
  `menu-design-appearance-visible-effect`, `dashboard-edit-configure-save`,
  `dashboard-dirty-remote-stale`, `solution-kit-select-reviewed-handoff`), cleanup
  PASS, zero console errors, suite `180687` ms. Evidence:
  `_docs/_workflows/_smoke/evidence/task-105/task105-l05-fast-20260901-official-r2/`.

### Pages/posts runtime smoke acceptance (`TASK-105-08-08-L07`)
- `task-105-l08` (its own suite identity, no `task-105-l05` imports) completed the
  fast-profile acceptance run `task105-l08-fast-20260901-r44`: `pass: true`,
  `serverUp: true`, 5/5 scenarios (`page-deep-section-insert-visible-layer`,
  `page-device-override-reset-publish-front-parity`,
  `post-block-inspector-save-publish-front-parity`,
  `post-classic-edit-preview-focus-visible`,
  `post-richtext-command-slash-transition-visible`), `failures: []`,
  `consoleErrors: []`, 5 screenshots with sha256, suite `183.1 s` + cleanup `9.7 s`.
  Evidence: `_docs/_workflows/_smoke/evidence/task-105/task105-l08-fast-20260901-r44/`.
- The 2026-09-01 5-lens post-audit outcomes are recorded in the leaf: evidence
  integrity CLEAN, test realness CLEAN, no diagnostic debris, final gates re-run on
  the final tree (registration lane `434/434`, vitest green, ESLint
  `--max-warnings=0`, `lint:repo:types`, adapter build, all files under the
  1,000-line cap).

### Product defects found and fixed while closing (collateral of the campaign)
- Shared vite dep-cache race: the admin (`core/vite.config.ts`) and site
  (`core/vite.site.config.ts`) dev servers shared one dep cache, so the second boot
  re-optimized and deleted the live cache, producing stale `?v=` requests,
  `504 Outdated Optimize Dep`, and a dead `PageEditor` lazy route. Fixed with
  dedicated caches (`task105-admin` / `task105-site`) and pinned by
  `tests/vitest/tooling/task-105-08-08-vite-cache-dir-split.test.ts` (4 tests,
  mutation-verified in both directions).
- Collateral repair of that split, attributed honestly: the task-488 and task-490
  `admin-spa-warm` readiness probes (`scripts/runtime-smoke/adapters/task-488/host.ts`,
  `scripts/runtime-smoke/adapters/task-490/host.ts`) hardcoded the old
  `node_modules/.vite/deps/` dep-URL layout; their `ADMIN_DEP_URL` regexes now
  tolerate the split-cache `/@fs/` form Vite serves when the deps dir falls outside
  `root` (verified against both URL forms plus a negative dep-less control).
- Posts editor preview focus chain and slash-menu blur-unmount: the shell/preview
  focus behavior is pinned end-to-end by the `post-classic-edit-preview-focus-visible`
  smoke scenario above and by the posts-shell residual suite
  (`tests/vitest/ui/task-105-08-08-post-shell-residual.test.tsx`), and the
  slash-insert-chain suite pins the `SlashCommandMenu`
  `onMouseDown -> preventDefault` fix directly (happy-dom cannot observe the blur
  path, so the chain alone could not catch that regression).

### Canonical rebaseline and draft disposition leaves
- `TASK-105-08-12` published the fresh canonical artifact, the 17-record
  infra-noise revalidation (all `lines.total === 0`, no config widening), and the
  291-line residual ledger; its receipt explicitly hands status/board/changelog work
  to this closure entry.
- `TASK-105-08-13` recorded the disposition of all 17 inherited assistant drafts as
  `retain and repair` (`17/17` repaired-keep, no case weakened, no skip/todo/only
  markers); the orchestrator re-verification ran each owned suite individually green
  with `--max-warnings=0` ESLint.

### Closure state and what remains
- Terminal after this entry: `TASK-105-08-05` and its physical leaves
  (`L01`, `L01-L01`, `L01-L02`, `L02`, `L02-L01`, `L03`, `L03-L01`, `L04`), external
  prerequisite `TASK-105-08-01-S01`, `TASK-105-08-12`, and `TASK-105-08-13`.
  `TASK-105-08-11` (changelog 1326) and `TASK-105-08-07` (changelog 1324) were
  already terminal.
- Still open under `TASK-105-08` in this tree: the remaining coverage leaves
  (`08-01`–`08-10` parents and their residual children, `08-14`–`08-16`), whose
  residual lines are enumerated file-by-file in the `TASK-105-08-12` ledger; they
  keep their own contracts and terminal handoffs. `TASK-105` itself stays In
  Progress: `TASK-105-11` (legacy migration cleanup, including `11-03-05`,
  `11-03-08`, and closure leaf `11-04`) is open, and the delivery-branch merge
  decision belongs to the user.

### Validation
- Documentation-only change: no production, test, fixture, runtime-smoke, evidence,
  manifest, or coverage-configuration file was touched by this entry.
- `git diff --check` clean for the touched docs. Static/coverage/smoke evidence is
  inherited from the recorded receipts cited above (`TASK-105-08-12` canonical run,
  the two smoke `report.json` files, and the per-leaf scoped V8 receipts); the
  canonical artifact was not re-run, so the published totals remain byte-stable.
- No staging, commits, or task-status inference from receipts alone; every status
  flip in this entry is backed by the named receipt or artifact.
