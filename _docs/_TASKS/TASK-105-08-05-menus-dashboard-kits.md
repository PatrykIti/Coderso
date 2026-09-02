# TASK-105-08-05: Menus, Dashboard, and Kits UI
# FileName: TASK-105-08-05-menus-dashboard-kits.md

**Priority:** High
**Category:** QA + Coverage
**Estimated Effort:** Very Large
**Dependencies:** TASK-105-08-11 implementation-complete split receipt; TASK-105-08-16 terminal `r4` fast-smoke and durable archive-hash receipt
**Parent Task:** TASK-105-08
**Status:** ✅ Done
**Completed:** 2026-09-01

---

## Overview

This is a coordination parent for the final Vitest line-coverage work around menu,
dashboard, and solution-kit admin UI. The L16 `r4` receipt authorizes the family to
start, but it does not prove any menu, dashboard, or kit behavior. The family starts
with the strictly ordered menu and dashboard source-repair children, completes L02, then
consumes the separately owned TASK-105-08-01-S01 four-path browser-parity receipt. The
L03-L01 card child lands next, immediately before its L03 parent executes the test-only
solution-kit coverage body. The family then continues to one shared runtime-smoke leaf.

All existing product modules named below are **read-only coverage targets**, except for
four source-repair scopes. `TASK-105-08-05-L01-L01` may edit exactly
`MenuEditorPage.tsx`, the new `menuEditorItemState.ts`, and `MenuListPage.tsx` to remove
its source-proven dead coverage paths while preserving product contracts. Its only
intended user-visible correction is that an invalid menu timestamp renders its raw input
instead of `Invalid Date`. `TASK-105-08-05-L01-L02`, strictly after L01-L01, may edit
only `MenuItemDrawer.tsx` to remove or refactor the redundant `handleSave` null guard
dominated by the component's no-item return; it preserves all public drawer/inspector
behavior. `TASK-105-08-05-L02-L01`, strictly after L01's validated receipt, may edit only
`DashboardBuilder.tsx` and `widgetRegistry.ts` to remove or refactor their source-proven
unreachable exhaustive defaults and empty-catalog branch, plus its new public
permission-filtered-catalog suite. It preserves the reducer, registry, cache, dirty-draft,
and presentational permission contracts. `TASK-105-08-05-L03-L01`, immediately after L02
and before test-only L03, may edit exactly `core/admin/ui/kits/SolutionKitCard.tsx` and
`tests/vitest/ui/solution-kit-card-parity.test.tsx`. After the separately owned
TASK-105-08-01-S01 browser ID-parity repair, it adds the sixth typed card visual and removes
the now-redundant fallback while preserving the five existing mappings and public card behavior.
No source-repair leaf changes an API route, schema, migration, cache policy, permission rule,
or persistence behavior. `MenuEditorPage.tsx` is already 1,081 physical lines, so L01-L01
must cohesively split it to at most 1,000 lines; no child may evade that hard file-size gate.

The prior 492-line budget and percentages were a historical coverage snapshot, not an
acceptance receipt. Each executable child must measure its named target set afresh;
TASK-105-08-12 remains the sole owner of the canonical whole-lane rebaseline.

## Coverage Targets and Source-Repair Exceptions

| Cluster | Targets | Executable modules |
|---|---|---:|
| Menus | `MenuAppearancePanel`, `MenuCreateDialog`, `MenuDesignEditor`, `MenuDesignEditorBarPanel`, `MenuDesignEditorBlockFields`, `MenuDesignEditorBlockPanel`, `MenuDesignEditorBrandNavControls`, `MenuDesignEditorCanvas`, `MenuDesignEditorControls`, `MenuDesignEditorPage`, `MenuEditorPage`, `MenuItemDrawer`, `MenuItemForm`, `MenuItemRow`, `MenuListPage`, `MenuTree`, `SiteShellDialog` | 17 |
| Menu repair helper | `menuEditorItemState` — sole source writer: `TASK-105-08-05-L01-L01`; separate scoped V8 100%-line proof | 1 |
| Existing menu-target repair | `MenuItemDrawer` — sole source writer: `TASK-105-08-05-L01-L02`; separately proven before L01 repeats the original target | 0 additional |
| Dashboard | `DashboardBuilder`, `DashboardWidgetHost`, `SecurityStatusCard`, `SiteHealthCard`, `WidgetConfigForm`, `widgetRegistry` | 6 |
| Existing dashboard-target repair | `DashboardBuilder`, `widgetRegistry` — sole source writer: `TASK-105-08-05-L02-L01`; separately proven before L02 repeats both original targets | 0 additional |
| Solution kits | `SolutionKitCard`, `SolutionKitsPage`, `hooks/useSolutionKitRuns`, `hooks/useSolutionKits` | 4 |
| Existing solution-kit-target repair | `SolutionKitCard` — sole source writer: `TASK-105-08-05-L03-L01`; separately proven before L03 repeats the original target | 0 additional |

The source paths are respectively under `core/admin/ui/menus/`,
`core/admin/ui/dashboard/`, and `core/admin/ui/kits/`. A child may read those modules
and use their public seams, but it may edit only the exact paths assigned in its own
contract. The original inventory remains 27 named source targets; the mandatory helper
creates a 28th target path. The L01-L01 receipt proves 100% lines for its three source
paths (`MenuEditorPage`, `menuEditorItemState`, and `MenuListPage`) separately. L01-L02
separately proves `MenuItemDrawer`, which remains one of the original 17 targets rather
than a 29th path; L01's final test-only receipt repeats all 17. Do not claim that the
historical 27-target accounting covers the new helper or double-counts the drawer repair.
L02-L01 separately proves `DashboardBuilder` and `widgetRegistry`, which remain two of the
original six dashboard targets; L02's final test-only receipt repeats all six without
double-counting either repair. L03-L01 separately proves `SolutionKitCard`, which remains
one of the original four solution-kit targets; L03's final test-only receipt repeats all four
without claiming either L03-L01 writer path or double-counting the repaired card.

TASK-105-08-01-S01 is an external prerequisite, not a 29th L05 coverage target. After L02 it
exclusively owns `core/admin/services/solutionKitsClient.ts`,
`core/admin/services/solutionKitSelection.ts`,
`tests/vitest/admin/solutionKitsClient.coverage.test.ts`, and
`tests/vitest/admin/solutionKitSelection.test.ts`. Its validated receipt must include the
individual Vitest and scoped-V8 rows, exact-path ESLint, `bun --cwd core lint`, and
`bun run check:admin-boundary` results; captured core `lint:types` and root-TSC statuses with
zero diagnostics on all four owned paths; the exact `SolutionKitCard.tsx` path/code/message as
`transitional_cross_owner` for L03-L01; scoped and global diff checks; physical line counts;
and a fresh read-only audit. The intermediate compiler commands are attribution receipts and
must not be reported as globally green. No L05 leaf may write those four paths.

## Verified Dirty Starting Baseline

At `18a45f06`, before any L05 implementation, the shared tree contains exactly these
23 L05-shaped artifacts. They are adopted by the child shown below; no child may assume
that an unlisted dirty file belongs to it merely because it sits in `tests/vitest/ui/`.
L02-L01's two source paths and L03-L01's card source were clean at that baseline. Their
direct suites are new, strictly owned paths rather than unlisted inherited drafts.

| Child | Starting artifacts |
|---|---|
| L01 menus coverage | Modified: `menu-design-editor-block-fields.test.tsx`, `menu-design-editor-controls.test.tsx`, `menu-item-form.test.tsx`, `menu-list-page-actions.test.tsx`, `menu-tree.test.tsx`, `menuDesignEditorFixtures.tsx`, `site-shell-dialog.test.tsx`. New: `menu-appearance-panel.test.tsx`, `menu-create-dialog.test.tsx`, `menu-design-editor-canvas-units.test.tsx`, `menu-editor-page-flows.test.tsx`. |
| L01-L01 menu source repair | Exact transferred test writers: modified `menu-editor-validation.test.ts`; new `menu-list-page-flows.test.tsx`. Exact source writers: `core/admin/ui/menus/MenuEditorPage.tsx`, new `core/admin/ui/menus/menuEditorItemState.ts`, and `core/admin/ui/menus/MenuListPage.tsx`. |
| L01-L02 menu-item-drawer repair | Exact transferred test writer: new `menu-item-drawer.test.tsx`. Exact source writer: `core/admin/ui/menus/MenuItemDrawer.tsx`. |
| L02-L01 dashboard unreachable-branch repair | Clean baseline source writers: `core/admin/ui/dashboard/DashboardBuilder.tsx` and `core/admin/ui/dashboard/widgetRegistry.ts`. New exact test writer: `tests/vitest/ui/dashboard-builder-catalog-permissions.test.tsx`. |
| L02 dashboard | New: `dashboard-builder-residuals.test.tsx`, `site-health-card.test.tsx`, `widget-config-form.test.tsx`. |
| L03-L01 solution-kit card parity | Clean baseline source writer: `core/admin/ui/kits/SolutionKitCard.tsx`. New exact test writer: `tests/vitest/ui/solution-kit-card-parity.test.tsx`. |
| L03 solution kits | New: `tests/vitest/kits/use-solution-kit-runs.test.tsx`, `tests/vitest/kits/use-solution-kits.test.tsx`, `tests/vitest/ui/solution-kits-page-flow.test.tsx`. |

## Child-Level Root TypeScript Attribution

The cross-family matrix in TASK-105-08 continues to use L05 for this whole family. For
this subtask family, only the fully qualified IDs below are valid diagnostic owners; they
must not be confused with TASK-105-08-L01/L02/L03.

The pre-implementation root command is:

~~~bash
./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false
~~~

The verified root TypeScript snapshot from the overall parent is: the command exited 2 with 183
diagnostics across 42 test files at HEAD `18a45f06` plus the current dirty TASK-105 tree. Within
that snapshot, exactly 3 diagnostics are assigned to three L05 paths by path, not by ambiguous
shorthand. The exact current L05 path inventory is:

- `tests/vitest/kits/use-solution-kit-runs.test.tsx`
- `tests/vitest/ui/site-health-card.test.tsx`
- `tests/vitest/ui/widget-config-form.test.tsx`

| Child owner | Assigned diagnostic paths |
|---|---|
| TASK-105-08-05-L01-L01 | None at the audited baseline; a fresh root command must attribute zero diagnostics to its three exact source paths and two exact test paths. |
| TASK-105-08-05-L01-L02 | None at the audited baseline; a fresh root command must attribute zero diagnostics to its exact source path and transferred test path. |
| TASK-105-08-05-L01 | None at the audited baseline; a fresh root command must attribute zero diagnostics to its five exact test paths. |
| TASK-105-08-05-L02-L01 | None at the audited baseline; a fresh root command must attribute zero diagnostics to `DashboardBuilder.tsx`, `widgetRegistry.ts`, and `dashboard-builder-catalog-permissions.test.tsx`. |
| TASK-105-08-05-L02 | tests/vitest/ui/site-health-card.test.tsx; tests/vitest/ui/widget-config-form.test.tsx |
| TASK-105-08-01-S01 | External gate after L02: zero diagnostics on its exact four browser source/test paths; the expected card path/code/message is recorded separately as `transitional_cross_owner` for L03-L01 and is not a globally clean compiler receipt. |
| TASK-105-08-05-L03-L01 | Consumes the S01 handoff and must attribute zero diagnostics to `core/admin/ui/kits/SolutionKitCard.tsx` and `tests/vitest/ui/solution-kit-card-parity.test.tsx`, including explicit clearance of the same transitional signature. |
| TASK-105-08-05-L03 | tests/vitest/kits/use-solution-kit-runs.test.tsx |

An active child may advance only when a fresh root command has zero diagnostics on every
path in its own row. Every remaining diagnostic must retain an owner in this table or the
parent TASK-105-08 attribution matrix. If a diagnostic path or count changes, stop, update
this table from the fresh command output, and obtain a fresh contract audit before another
child advances.

## Land Order and Single-Writer Rules

1. `TASK-105-08-05-L01-L01` — menu source split and dead-path repair.
2. `TASK-105-08-05-L01-L02` — menu-item drawer dead-guard repair.
3. `TASK-105-08-05-L01` — menus coverage reconciliation after both source-repair gates.
4. `TASK-105-08-05-L02-L01` — dashboard exhaustive-default repair.
5. `TASK-105-08-05-L02` — dashboard coverage after its source-repair gate.
6. `TASK-105-08-01-S01` — external four-path browser ID-parity repair after L02.
7. `TASK-105-08-05-L03-L01` — immediate L03 child and solution-kit card parity repair.
8. `TASK-105-08-05-L03` — test-only solution-kits coverage after the card repair gate.
9. `TASK-105-08-05-L04` — registered shared-platform runtime smoke.

The leaves land strictly in that order: `L01-L01 source repair → L01-L02 drawer repair → L01
coverage → L02-L01 exhaustive-default repair → L02 → S01 browser parity → L03-L01 card parity
→ L03 → L04`. L01 remains `🚧 In Progress`
as the coordination/coverage task and may not issue its final test-only V8 receipt until both
source-repair children have supplied their scoped source/static receipts. L02-L01 may not
start before L01's validated original-17-target receipt, and L02 may not begin its test-only
reconciliation until L02-L01 has supplied its scoped source/static receipt. S01 may not enter
this family sequence until L02 has a validated receipt. L03-L01 then requires the separately
owned S01 four-path receipt and fresh audit; test-only L03 may not begin until L03-L01 supplies
its two-path source/static receipt and fresh combined audit. Workflow registration or task
status alone never substitutes for any receipt and never advances a status.
L04's passing smoke
receipt may unlock L06 while the terminal family receipt waits for L12's canonical rebaseline
and changelog 1325. At an audited leaf start,
the task-graph orchestrator may make only the current
`To Do → In Progress` transition and its exact board statistics delta. `TASK-105-09` is the
named terminal documentation closure owner: it alone writes the bounded L05 receipts,
terminal statuses, and board synchronization after those prerequisites pass. The parent owns
no source or test path itself; during authoring it owns this coordination contract and the
orchestrator-only workflow trace `_docs/_workflows/task-105-08-05-implement.mjs`. That trace
records this shared-tree baseline, the sequential child gates, and collision guards for the
active L14/L16 runtime-smoke streams; no implementation leaf may edit it. Each child lists the
exact files it may create or edit.
`site-shell-card-actions.test.tsx` and all auth, backup, redirect, media, commerce, entry,
form, listing, theme, booking, audit, and assistant suites remain outside this family under
the parent reconciliation table.

`tests/vitest/admin/dashboardWidgetRegistry.test.ts` is explicitly assigned to L02,
as required by TASK-105-08-01. `tests/vitest/site/menu-document-css-*.test.ts` is
explicitly assigned to L01. `menu-editor-validation.test.ts` and
`menu-list-page-flows.test.tsx` are exclusively L01-L01 test writers, then read-only
coverage consumers for L01. `menu-item-drawer.test.tsx` is exclusively the L01-L02 test
writer, then a read-only coverage consumer for L01.
`dashboard-builder-catalog-permissions.test.tsx` is exclusively the L02-L01 test writer, then a
read-only coverage consumer for L02. `core/admin/ui/kits/SolutionKitCard.tsx` and
`tests/vitest/ui/solution-kit-card-parity.test.tsx` are exclusively L03-L01 source/test writers,
then read-only coverage inputs for L03. L03 remains test-only with exactly these five candidates:
`tests/vitest/kits/use-solution-kit-runs.test.tsx`,
`tests/vitest/kits/use-solution-kits.test.tsx`,
`tests/vitest/ui/solution-kits-page-flow.test.tsx`,
`tests/vitest/ui/solution-kits-page.test.tsx`, and
`tests/vitest/ui-integration/solution-kits-restyle.test.tsx`; the direct card-parity suite is
not a sixth L03 candidate. No directory-wide ownership claim is valid.

The S01 browser parity paths are carved out of TASK-105-08-01's broad parent ownership while
S01 is active and are registered here only to prevent a cross-family collision. S01 is the sole
writer of its exact four paths; neither the broad TASK-105-08-01 parent nor any L05 leaf may edit
them concurrently. The superseded L03-L02 child is historical and owns no path or receipt.

The shared-worktree forbidden-path guard is exact: L01-L01, L01-L02, L02-L01, S01, and L03-L01
declare their complete writer-path sets, so their candidates fail closed on duplicates, missing
paths, unexpected paths, or paths claimed by another repair leaf. L01, L02, and L03 have no invented wildcard
registry, but each still fails if it claims an exact-repair path. Every active leaf invokes
`assertTask105L05CandidatePathsAreCollisionFree()` with its precise candidate set before editing
and from its final writer set; L03's final set must equal all five registered paths rather than
a subset. `--verify` is only a structural/status gate: it checks the exact L02 → S01 → L03-L01
→ L03 order, canonical H1/FileName/immediate-parent metadata, exact registered writer sets, and
allowed status syntax. It does not prove or fabricate receipts, infer them from statuses, or
change statuses. L04's complete writer list, including its eleven generated Bun rows and the
operator-only cookbook target, is registered in this workflow. It may not regenerate the shared
Bun manifest while L14/L16 rows are dirty: immediately before classify it must run
`node _docs/_workflows/task-105-08-05-implement.mjs --assert-l04-classify-preconditions`, which
requires the exact two L14/L16 rows committed at `HEAD`, preserves every `HEAD` row plus the
current six inherited L04 dirty rows, and rejects another dirty addition. Immediately after the
generator it runs `--assert-l04-manifest-projection`, which requires every prior semantic row to
remain and exactly eleven L04 `A`/no-conflict/non-global rows to be added. No manual manifest
editing, row absorption, or concurrent handoff is allowed; preserve all dirty handoff/L04 rows
until their owners or the generator handle them and use an isolated worktree rather than absorb a
concurrent change.

## File-Size Rules

Every added or modified production, test, fixture, or runtime-smoke module must be at most
1,000 physical lines. L01-L01 must specifically prove `MenuEditorPage.tsx`,
`menuEditorItemState.ts`, and `MenuListPage.tsx` are each at most 1,000 lines after the
split. L01-L02 must prove both `MenuItemDrawer.tsx` and its transferred direct suite meet the
same cap. L02-L01 must prove `DashboardBuilder.tsx`, `widgetRegistry.ts`, and its direct
permission-filtered-catalog suite meet the same cap. L03-L01 must prove
`SolutionKitCard.tsx` and `solution-kit-card-parity.test.tsx` meet the same cap. The inherited
watch list is mandatory:

- `tests/vitest/ui/menu-editor-page-flows.test.tsx` is 942 lines. Do not append to it;
  put remaining behavior in `menu-editor-page-residuals.test.tsx` or another coherently
  named, independently runnable suite.
- `tests/vitest/ui/menu-design-editor-block-fields.test.tsx` is 851 lines. Split it by
  control responsibility before any extension that could approach the cap.
- `tests/vitest/services/menu-document-v2-devices.test.ts` is 946 lines. It is
  read-only in-place: create a cohesive `menu-document-v2-devices-residual.test.ts`
  suite before adding any behavior, rather than extending this near-cap file.
- `tests/vitest/kits/full-site-install-planner.test.ts` is 902 lines. It is read-only
  unless L03 first creates a cohesive split contract for a required extension.
- `_docs/_workflows/lib/smoke-evidence.mjs` is the current 812-line compatibility facade. L04
  preserves its prior cohesive evidence-files extraction; the retained facade, extracted module,
  and the narrowly extended `tests/unit/workflows/smokeEvidenceDriver.test.ts` must each remain
  at most 1,000 lines.

The pre-split `menu-design-editor.test.tsx` no longer exists. Its current hand-off
pieces are the named `structure`, `canvas`, `brand-nav`, `block-fields`, and `controls`
suites plus `menuDesignEditorFixtures.tsx`, as recorded in `tests/RUNNER_OWNERSHIP.md`.

## Cross-Leaf Behavior Contracts

- `MenuEditorPage()` takes no `menuId` prop. It derives the menu ID from
  `useAdminRouter()` and uses the cached menu/page clients plus
  `replaceMenuItems` and `updateMenu`. Tests must mock those real seams.
- L01-L01 moves only record-centric descendants, payload building, move helpers, and XOR
  validation into `menuEditorItemState.ts`; existing `MenuEditorPage` exports remain stable
  through re-exports. The client continues to reject zero/both link variants before save, and
  the server remains authoritative for the same XOR rule. Its page-precedence payload builder
  is defensive normalization, not permission to persist an ambiguous item.
- L01-L01 makes the private menu-list cache-event refresh forced and background-only without
  changing mount cancellation, initial foreground loading, cache hydration, or error behavior.
  `formatDate` explicitly returns an invalid input unchanged instead of relying on an
  unreachable `Date` exception path.
- L01-L02 removes or refactors only the redundant `MenuItemDrawerContent.handleSave` null
  guard dominated by the no-item return. Both `useState` calls and the `helperText` `useMemo`
  remain before that return; only the non-hook save handler moves after it. Its direct suite uses
  the exported `MenuItemDrawer` and `MenuItemInspector` seams to preserve blank-label,
  page-required, URL-required, save/close/delete, and inspector
  slot/live-change/switch/Advanced/remove behavior with exact normalized callback arguments; it
  never mounts private content helpers.
- L02-L01 removes or refactors only `DashboardBuilder`'s exhaustive private-reducer default,
  its source-proven impossible empty-catalog branch, and `isWidgetDataEmpty`'s exhaustive
  `never` fallback. It preserves every declared action and data-kind result, does not add
  emitted dead fallback code, and proves through `DashboardBuilder` that `can={() => false}`
  hides protected cards while retaining zero-permission cards—never a private reducer/registry
  seam or an `as never` payload.
- L03-L01 adds only the explicit `local-service-business` `Boxes`/muted-tone entry to the typed
  `SolutionKitCard` visual record and removes its redundant generic fallback. It preserves the
  five existing mappings, markup, active state, badges, button wording, and typed select callback;
  its direct public rendered-card suite remains outside L03's five test-only candidates.
- `SolutionKitsPage` is a read-only catalog/detail/selection surface. Its single
  product CTA opens the reviewed LLM Guide handoff. It must not gain direct apply,
  rollback, cancel, or polling UI merely to satisfy coverage.
- `useSolutionKitRuns` owns forced list/detail refresh, selection retention,
  `apply`, and `rollback` state transitions. It has no polling interval or cancel
  operation; hook tests cover the shipped behavior rather than inventing one.
- The runtime smoke may exercise existing internal writes only through their real
  browser paths and task-scoped synthetic fixtures. It must preserve the existing
  session/RBAC/CSRF contracts and must not call solution-kit apply or rollback. L03-L01 changes
  only deterministic Admin card presentation after strict browser ID validation is repaired.

## Security Contract

No endpoint, authentication, authorization, CSRF, rate-limit, schema, cache policy, or
persistence contract changes are authorized by L01-L01, L01-L02, L02-L01, L03-L01, or the
test-only L01/L02/L03 leaves. The
menu source-repair leaves keep the existing internal menu session/RBAC/CSRF contract and
server-side XOR enforcement intact. L02-L01 keeps dashboard's existing internal-admin session,
RBAC, CSRF, rate-limit, and server-side reject-unknown contracts intact; its `can` predicate is
presentational defence in depth only. L04 exercises existing local internal-admin flows only:
menu writes remain session-authenticated with `menus:write` and CSRF;
dashboard settings stay behind their existing admin permissions and CSRF; solution-kit
smoke stays read-only and uses only the reviewed assistant handoff. Reports, screenshots,
fixtures, and task receipts must not contain credentials, tokens, raw user data, or
private database payloads. L04's operator-only cleanup runbook is a local maintenance procedure,
not an endpoint or recovery API: it uses fresh lock/identity/absence proofs, accepts no HMAC or
secret material, and cannot turn a failed session into a receipt or manifest.

## Testing Requirements

Every executable child must run its listed Vitest tests one file per invocation, then:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/eslint --max-warnings=0 <every lintable JS/TS/TSX/MJS child-owned
  changed path>`; do not pass JSON, Markdown, generated manifests, or evidence files to ESLint
  and keep the exact lintable path list in the child contract.
- `bun run check:admin-boundary` for children that change `core/admin/**`; S01 must retain its
  four-path Admin-boundary receipt before L03-L01 or L03 can advance.
- `./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false`,
  with zero diagnostics on the active child and a path-by-path attribution for all others
- `git diff --check`
- a line-count check over every added or modified production/test/fixture/runtime module
- `node --check _docs/_workflows/task-105-08-05-implement.mjs` after any workflow-trace edit
- L01-L01, L01-L02, L02-L01, L03-L01, L01, L02, and L03 each run the reproducible
  child-scoped V8 command in
  their own contract. L01-L01's three-target command is the separate proof for its new helper;
  L01-L02's one-target command proves the original `MenuItemDrawer` repair; L02-L01's
  two-target command proves the original `DashboardBuilder`/`widgetRegistry` repair; L03-L01's
  one-target command separately proves the repaired `SolutionKitCard`; L01's
  final test-only command retains the original 17-target menu inventory. Each command passes only
  that child's explicit source-target list through CLI coverage.include arguments, then parses
  its JSON summary and proves 100% lines for every listed target. This diagnostic evidence
  neither edits permanent coverage configuration nor replaces the L12 canonical whole-lane
  rebaseline.
- Before L03-L01 edits, its collision helper receives exactly
  `core/admin/ui/kits/SolutionKitCard.tsx` and
  `tests/vitest/ui/solution-kit-card-parity.test.tsx`. L03 remains test-only and invokes the
  same helper with all five exact candidate tests listed under Single-Writer Rules at both
  pre-edit and final handoff; it may not claim a subset or either L03-L01 writer path.
- Before S01 edits, the workflow guard receives exactly its two browser modules and two direct
  admin suites. Its compiler receipt must retain the exact card diagnostic as
  `transitional_cross_owner`; L03-L01 must clear the same signature before L03.
- L04 has no Vitest source-target list and is explicitly excluded from the scoped V8 gate.
  It instead runs its named Bun/registry/evidence-session tests and one quiescent-tree,
  shared-entry smoke command. It may not create a task-local server, worker, browser,
  cleanup, or report loop.

### Authoring Validation Receipt

The L05 authoring pass recorded a successful task-graph integrity receipt in the dirty
worktree without staging the shared index. The temporary index includes task files only so
the graph inventory can see newly authored, intentionally unstaged task records:

```bash
task_graph_tmp="$(mktemp -d /tmp/task105-l05-task-graph.XXXXXX)" || exit 1
task_graph_index="$task_graph_tmp/index"
cp "$(git rev-parse --git-path index)" "$task_graph_index"
GIT_INDEX_FILE="$task_graph_index" git add --intent-to-add -- _docs/_TASKS/TASK-*.md
GIT_INDEX_FILE="$task_graph_index" bun test --timeout 60000 \
  tests/unit/workflows/taskGraphIntegrity.test.ts
```

`GIT_INDEX_FILE` must remain set only for those two commands; never stage the shared index.
This is authoring validation evidence, not an implementation-leaf writer scope or a substitute
for a leaf's own validation receipts.

## Documentation Updates Required

Implementers return bounded structured receipts to the orchestrator. L04 is the sole writer
of its generated tests/bun-lane-manifest.json rows, the runtime-smoke inventory in
tests/README.md, and the operator-only manual-cleanup runbook section in
docs/develop/runtime-smoke-cookbook.md. It waits for L14/L16 to commit/freeze the shared
manifest handoff, preserves every resulting row, and adds only these eleven owned Bun rows:
adapter, descriptors, cleanup, output manifest, evidence-session, auth, worker operations,
recovery receipt, recovery DB, `smokeEvidenceFilesystem`, and runner redaction. It fails closed
if preclassification is not frozen or regeneration would add/change an unowned row. The cookbook
procedure has no HMAC/secret input and cannot create a receipt or manifest. After a terminal
passing L04 smoke, the orchestrator is also the sole writer of the canonical evidence manifest.json.

TASK-105-08-12 owns only the canonical final rebaseline and its evidence handoff.
`TASK-105-09` is the sole terminal documentation closure owner: after L12 it writes the
S01, L01-L01, L01-L02, L02-L01, L03-L01, and L01–L04 receipts/statuses, preserves the terminal
L03-L02 supersession/successor record, writes the L05 parent status, and performs the
corresponding board synchronization plus top-level TASK-105/TASK-105-08 family changelog work.
Changelog **1325** is reserved for that closure now, but its index row/file remain absent until
the family is terminal. The closure owner re-reads the changelog index immediately before
writing to verify that reservation. No implementation leaf may stage, commit, alter task-board
rows, or reuse changelog 1324.

## Sub-Tasks

- [x] `TASK-105-08-05-L01-menus-coverage-reconciliation.md`
  - [x] `TASK-105-08-05-L01-L01-menu-source-split-and-dead-path-repair.md`
  - [x] `TASK-105-08-05-L01-L02-menu-item-drawer-dead-guard-repair.md`
- [x] `TASK-105-08-05-L02-dashboard-coverage.md`
  - [x] `TASK-105-08-05-L02-L01-dashboard-exhaustive-default-repair.md`
- [x] External prerequisite: `TASK-105-08-01-S01-Solution-Kit-ID-Parity.md`
- [x] `TASK-105-08-05-L03-solution-kits-coverage.md`
  - [x] `TASK-105-08-05-L03-L01-solution-kit-card-parity.md`
  - [x] `TASK-105-08-05-L03-L02-Solution-Kit-Card-Parity.md` — superseded by L03-L01;
    historical and non-blocking
- [x] `TASK-105-08-05-L04-runtime-smoke.md`

## Acceptance Criteria

1. Each of the 27 original named source targets, plus the L01-L01-owned
   `menuEditorItemState` helper (28 target paths total), has an independently reproducible
   scoped 100%-line receipt without a permanent coverage-config or ignore change. L01-L02
   separately proves its `MenuItemDrawer` repair, and L02-L01 separately proves its
   `DashboardBuilder`/`widgetRegistry` repair, while L03-L01 separately proves its
   `SolutionKitCard` repair, without double-counting existing targets.
2. The fail-closed solution-kit receipt chain is exactly L02 → S01 → L03-L01 → L03. S01
   records zero diagnostics on its four paths plus the exact open `transitional_cross_owner`
   card signature; L03-L01 clears it; L03 changes exactly its five registered test paths.
3. The root TypeScript attribution has zero L05-owned diagnostics before this family
   advances to L06.
4. The registered L04 smoke passes five distinct real admin flows with visible-effect,
   accessibility, console, screenshot, and cleanup receipts.
5. TASK-105-08-12 later confirms the result through the canonical whole-lane rebaseline.

## Family Closure Receipt (TASK-105-09, 2026-09-01)

Status written by the contracted terminal documentation closure owner after
changelog 1325 and the canonical L12 rebaseline; the contract prose above is
unchanged.

- Land order held: `L01-L01 -> L01-L02 -> L01 -> L02-L01 -> L02 -> S01 -> L03-L01
  -> L03 -> L04`; every leaf's bounded receipt is recorded in its own file and each
  names the receipt artifact it consumed.
- All four required acceptance outcomes are met: scoped 100%-line receipts for the
  28 target paths (17 original menu targets + `menuEditorItemState` + the separate
  drawer, dashboard, and card repair proofs), the exact fail-closed
  `L02 -> S01 -> L03-L01 -> L03` chain with the transitional card diagnostic cleared,
  zero L05-owned root-TSC diagnostics, and the five-flow registered L04 smoke
  (`task105-l05-fast-20260901-official-r2`, cleanup PASS, zero console errors).
- Canonical confirmation: the 2026-09-01 whole-lane artifact reports zero uncovered
  lines across all `37` tracked `core/admin/ui/{menus,dashboard,kits}/` files; the
  only family entry left in the residual ledger is the zero-executable
  `core/admin/ui/menus/types.ts` infra-noise record.
- `TASK-105-08-05-L03-L02` stays `⏭️ Superseded` (parent `L03`, successor
  `L03-L01`, no receipt) and is named only in changelog 1325.
