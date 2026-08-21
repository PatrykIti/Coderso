# TASK-105-08: Final Per-File 100% Gap Closure
# FileName: TASK-105-08_Final_Per_File_100_Gap_Closure.md

**Priority:** High  
**Category:** QA + Coverage  
**Estimated Effort:** Large  
**Dependencies:** TASK-105-01..07 (all terminal; TASK-105-06 was superseded by TASK-580, changelog 1323, on 2026-08-21)  
**Status:** ⏳ To Do (2026-08-21 FAZA 0 rebaseline)

---

## Overview

Close every remaining per-file gap so each Vitest-owned file with executable lines
reaches `100%` lines. "Where applicable" means the zero-executable infrastructure-noise
files are documented with an `exclude-with-reason` disposition, never gamed.

This is the final substantive coverage wave of `TASK-105` before the QA/docs/changelog
closure in `TASK-105-09`. It is test-only: no API routes, no production behavior change,
no schema/contract change. The only file-system surgery is the split of four oversized
test modules and the `tests/RUNNER_OWNERSHIP.md` rewrite, both owned by `TASK-105-08-11`.

## Fresh Canonical Baseline (2026-08-21, HEAD 998e4ed8)

Source: `bun scripts/run-vitest-coverage.ts` at `7029fb7e` (baseline numbers
re-verified identical at HEAD `998e4ed8`); artifact
`coverage/vitest/coverage-summary.json`; re-derived here from
`bun scripts/analyze-vitest-gaps.ts` (script exists in `scripts/`).

- `% Stmts`: `82.02`
- `% Branch`: `73.81`
- `% Funcs`: `81.94`
- `% Lines`: `85.43`
- files with executable lines: `668`
- files at `100%` lines: `261`
- files below `100%` lines: `407`
- uncovered lines total: `5777`
- zero-executable files (infra-noise candidates): `17`
- lane fact: `958` Vitest test files (`.test.ts` / `.test.tsx`) under `tests/vitest/`

## Gap Inventory (cluster → files / uncovered lines)

Generated from `bun scripts/analyze-vitest-gaps.ts`. Every cluster below is owned by
exactly one leaf. Sum of leaf budgets = `5777` (verified).

| Cluster | Files below 100% | Uncovered lines | Owning leaf |
|---|---:|---:|---|
| `core/admin/services/**` | 40 | 869 | TASK-105-08-01 |
| `core/admin/utils/**` | 7 | 62 | TASK-105-08-01 |
| `core/admin/ui/settings/**` | 27 | 552 | TASK-105-08-02 |
| `core/admin/ui/content-types/**` | 21 | 787 | TASK-105-08-03 |
| `core/admin/ui/custom-screens/**` | 38 | 448 | TASK-105-08-04 |
| `core/admin/ui/menus/**` | 17 | 286 | TASK-105-08-05 |
| `core/admin/ui/dashboard/**` | 6 | 58 | TASK-105-08-05 |
| `core/admin/ui/kits/**` | 4 | 148 | TASK-105-08-05 |
| `core/admin/ui/media/**` | 11 | 223 | TASK-105-08-06 |
| `core/admin/ui/commerce/**` | 11 | 161 | TASK-105-08-06 |
| `core/admin/ui/search/**` | 5 | 85 | TASK-105-08-06 |
| `core/services/assistant/**` | 25 | 299 | TASK-105-08-07 |
| `core/admin/ui/assistant/**` | 9 | 169 | TASK-105-08-07 |
| `core/admin/ui/pages/**` | 20 | 153 | TASK-105-08-08 |
| `core/admin/ui/posts/**` | 20 | 140 | TASK-105-08-08 |
| `core/admin/ui/entries/**` | 16 | 84 | TASK-105-08-08 |
| `core/admin/ui/forms/**` | 9 | 24 | TASK-105-08-08 |
| `core/admin/ui/listings/**` | 11 | 67 | TASK-105-08-08 |
| `core/admin/ui/themes/**` | 1 | 2 | TASK-105-08-08 |
| `core/admin/ui/booking/**` | 1 | 1 | TASK-105-08-08 |
| `core/admin/ui/audit/**` | 4 | 10 | TASK-105-08-08 |
| misc `core/admin/ui/**` (auth, backups, setup, users, seo, popups, redirects, site, security, roles, reviews, store, import-export, contexts, analytics, authoring, layouts, preview, plugins, shared) | 85 | 988 | TASK-105-08-09 |
| `core/services/customScreens/**` | 19 | 161 | TASK-105-08-10 |
| `packages/sdk/src/**` | 0 (already 100% lines) | 0 | TASK-105-08-10 |

Worst files, top 20 by uncovered lines (full file lists live in each leaf's Scope):

| Uncovered | File | Covered/Total | Branch |
|---:|---|---|---:|
| 226 | `core/admin/ui/content-types/ContentTypeEditor.tsx` | 75/301 | 21.4% |
| 160 | `core/admin/services/bookingClient.ts` | 86/246 | 11.8% |
| 129 | `core/admin/ui/media/MediaLibraryPage.tsx` | 439/568 | 66.8% |
| 127 | `core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx` | 135/262 | 38.7% |
| 122 | `core/admin/services/listingsClient.ts` | 55/177 | 23.6% |
| 109 | `core/admin/ui/kits/hooks/useSolutionKitRuns.ts` | 0/109 | 0.0% |
| 106 | `core/admin/ui/assistant/AssistantPanel.tsx` | 306/412 | 64.0% |
| 98 | `core/admin/ui/content-types/DetailTemplateEditorPage.tsx` | 240/338 | 61.5% |
| 98 | `core/admin/ui/menus/MenuEditorPage.tsx` | 309/407 | 68.5% |
| 87 | `core/admin/ui/content-types/SchemaBuilderPage.tsx` | 63/150 | 40.3% |
| 85 | `core/admin/ui/content-types/FieldEditor.tsx` | 17/102 | 25.4% |
| 75 | `core/admin/ui/settings/SecuritySettingsPage.tsx` | 139/214 | 61.0% |
| 71 | `core/admin/ui/backups/BackupsPage.tsx` | 183/254 | 54.5% |
| 71 | `core/admin/ui/site/SiteSettingsPage.tsx` | 137/208 | 50.0% |
| 69 | `core/admin/services/formsClient.ts` | 85/154 | 38.6% |
| 68 | `core/admin/services/solutionKitsClient.ts` | 85/153 | 41.8% |
| 68 | `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` | 1043/1111 | 84.7% |
| 67 | `core/admin/ui/commerce/hooks/useCommerceCatalog.ts` | 23/90 | 6.9% |
| 64 | `core/admin/ui/redirects/RedirectsPage.tsx` | 117/181 | 40.0% |
| 64 | `core/admin/ui/users/UsersRolesPage.tsx` | 312/376 | 77.0% |

## Pre-existing HEAD Blocker (resolved)

`tests/vitest/pages/task-539-renderer-effects-and-geometry.test.tsx` pinned absolute
line receipts that went stale after the merged HEAD grew (TASK-580 / S3 growth). The
orchestrator re-pinned them mechanically as commit `3298577c`
(`test(vitest): re-pin task-539 renderer line receipts to merged HEAD lengths`), which
is test-only and does not change the coverage baseline. Confirmed: at authoring time the
file is clean (`git ls-files -v` reports `H`); the canonical baseline remains the
`7029fb7e` run.

## Oversized Test Files (line gate ≤ 1000)

The following Vitest files exceed the 1000-line hard gate and MUST be split by cohesive
responsibility (each part independently runnable) BEFORE any gap-filling extends them.
Splitting is owned by `TASK-105-08-11`.

| File | Lines |
|---|---:|
| `tests/vitest/ui/menu-design-editor.test.tsx` | 2711 |
| `tests/vitest/ui/users-roles-page-wave.test.tsx` | 1132 |
| `tests/vitest/ui/bookingPageFixtures.tsx` (fixture module) | 1123 |
| `tests/vitest/assistant/blueprint-action-assembler.test.ts` | 1050 |

Watch list: `37` Vitest test/fixture files sit in the `900–1000` line band (seed said
`~38`; verified `37`). Any gap-filling that would push one of these over `1000` lines
must split it first, not extend it.

## Child Leaf Table

Leaf IDs are fixed by the TASK-105-08 program plan. Land order reflects the split-first
dependency: `TASK-105-08-11` must land first because leaves 05/07/08/09 extend the four
files it splits.

| Land order | Leaf | Scope | Uncovered-line budget |
|---:|---|---|---:|
| 1 | `TASK-105-08-11` | split 4 oversized test files + rewrite `tests/RUNNER_OWNERSHIP.md` | n/a (test split) |
| 2 | `TASK-105-08-01` | `core/admin/services/**` + `core/admin/utils/**` | 931 |
| 3 | `TASK-105-08-02` | `core/admin/ui/settings/**` | 552 |
| 4 | `TASK-105-08-03` | `core/admin/ui/content-types/**` | 787 |
| 5 | `TASK-105-08-04` | `core/admin/ui/custom-screens/**` | 448 |
| 6 | `TASK-105-08-05` | menus + dashboard + kits | 492 |
| 7 | `TASK-105-08-06` | media + commerce + search | 469 |
| 8 | `TASK-105-08-07` | `core/services/assistant/**` + `core/admin/ui/assistant/**` | 468 |
| 9 | `TASK-105-08-08` | pages + posts + entries + forms + listings + themes + booking + audit | 481 |
| 10 | `TASK-105-08-09` | misc `core/admin/ui/**` clusters | 988 |
| 11 | `TASK-105-08-10` | `packages/sdk/src/**` (line-complete) + `core/services/customScreens/**` | 161 |
| 12 | `TASK-105-08-12` | final rebaseline + infra-noise manifest | n/a (closure) |

Total product line budget: `5777`.

## Single-Writer File Ownership

- Each source file under `core/` or `packages/sdk/` has exactly ONE writer leaf; all
  other leaves may only READ (import) it. Source modules are never edited by this wave
  except where a split-first rule is documented in the owning leaf (none expected: the
  wave is test-only).
- Each test file is owned by exactly one leaf. The leaf creates new suites and may extend
  existing suites that already belong to its cluster; it never edits another leaf's test
  file. Ownership is by NAMED suite or named source module: a directory glob in one leaf
  does NOT give it a non-settings/non-cluster suite in that directory, and the carve-outs
  listed in the leaves (e.g. `custom-screen-schemas.test.ts` -> TASK-105-08-10,
  `mediaClient.test.ts` -> TASK-105-08-01, `entryEditor.test.tsx` -> TASK-105-08-08,
  `api-keys.test.tsx` -> TASK-105-08-02, `analytics-settings-entries-seo-leafs.test.tsx`
  -> TASK-105-08-02, `menu-document-css-*.test.ts` -> TASK-105-08-05) are authoritative.
- Only `TASK-105-08-11` edits `tests/RUNNER_OWNERSHIP.md` and the four oversized test
  files it splits. Only `TASK-105-08-12` documents the infra-noise manifest and runs the
  final rebaseline; it does not edit product or test code.
- Leaves MUST NOT touch `_docs/_TASKS/README.md`, `_docs/_CHANGELOG/*`, or any other
  task/changelog file. Board sync is the orchestrator's closure job (`TASK-105-09`).

## Gates

Per leaf:

- Every suite that calls `render()` MUST declare `// @vitest-environment happy-dom`
  as its first line (lane default is `node`; 263 of 404 `tests/vitest/ui/*` entries
  carry an `@vitest-environment` pragma — 262 happy-dom + 1 node — of which 9 are
  non-test helper/fixture files).

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted Vitest, one file per invocation:
  `export TMPDIR=/tmp && set -a && . ./.env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts <file>`
- `git diff --check`
- line-count gate: every added/modified production or test file ≤ 1000 lines (split-first,
  never extend an oversized file)

At closure (`TASK-105-08-12`):

- `bun scripts/run-vitest-coverage.ts` fresh rebaseline
- rewrite `tests/RUNNER_OWNERSHIP.md` (owned by `TASK-105-08-11` before final rebaseline)
- re-verify `tests/bun-lane-manifest.json` if any test-file list changed

## Explicit Anti-Cheat

- No `coverage.exclude` expansion beyond the 17 documented zero-executable infra-noise
  files.
- No `/* istanbul ignore */` abuse; ignore comments are allowed only for a documented
  machine-generated or genuinely unreachable line, each with a code comment reason.
- No file is removed from Vitest ownership to satisfy the metric.
- Branch/statement hardening is in-scope where it rides along, but the closure metric of
  this wave is `100%` LINES per file; residual branch-only gaps are reported honestly to
  `TASK-105-09`.

## Progress Notes

- 2026-08-21: FAZA 0 rebaseline. TASK-105-06 superseded by TASK-580 (changelog 1323).
  Canonical baseline `82.02 / 73.81 / 81.94 / 85.43` at `7029fb7e` (re-verified at
  `998e4ed8`). task-539 line-receipt re-pin landed as `3298577c` (test-only, no
  baseline impact). Leaf family authored; implementation not started.
- 2026-08-21: pre-implementation audit round (vole 01-06, dragon 07-12, humpback
  reconcile) returned 0 HIGH and 11 MEDIUM + 13 LOW, all evidence-backed. All MEDIUM
  contract contradictions fixed in place: named-suite ownership replacing blanket
  directory globs (contentUi, site, analytics, settings), carve-outs/in for
  `custom-screen-schemas.test.ts` (-> 105-08-10), `mediaClient.test.ts` (-> 105-08-01),
  `entryEditor.test.tsx` (-> 105-08-08), `api-keys.test.tsx` (-> 105-08-02),
  `analytics-settings-entries-seo-leafs.test.tsx` (-> 105-08-02),
  `menu-document-css-*.test.ts` (-> 105-08-05); nonexistent seams corrected
  (`customScreensEntryOverridesClient` -> real clients, `dashboardWidgetRegistry` ->
  `@/ui/dashboard/widgetRegistry`); SDK `shared.test.ts` marked as not-existing;
  leaf-12 gate reworded to lines-100% with stmts/funcs/branch reported honestly;
  happy-dom pragma mandated for render() suites; HEAD label updated to `998e4ed8`.
  Reconcile re-audit follows before implementation starts.

## Sub-Tasks

1. `TASK-105-08-01-admin-services-and-utils.md`
2. `TASK-105-08-02-settings.md`
3. `TASK-105-08-03-content-types.md`
4. `TASK-105-08-04-custom-screens-ui.md`
5. `TASK-105-08-05-menus-dashboard-kits.md`
6. `TASK-105-08-06-media-commerce-search.md`
7. `TASK-105-08-07-assistant.md`
8. `TASK-105-08-08-pages-posts-entries-forms-listings-themes-booking-residual.md`
9. `TASK-105-08-09-misc-admin-ui.md`
10. `TASK-105-08-10-sdk-and-custom-screens-service.md`
11. `TASK-105-08-11-oversized-test-splits-and-runner-docs.md`
12. `TASK-105-08-12-final-rebaseline-and-infra-noise-manifest.md`

## Acceptance Criteria

1. Every Vitest-owned file with executable lines reaches `100%` lines; the 17
   zero-executable infra-noise files are documented with `exclude-with-reason`.
2. No file is removed from ownership just to satisfy the metric.
3. The four oversized test files are split and each part stays independently runnable.
4. `tests/RUNNER_OWNERSHIP.md` reflects the post-widget-removal lane.
5. Final canonical rebaseline is captured with before/after totals for `TASK-105-09`.

## Testing Requirements

- per-leaf targeted `vitest` runs (one file per invocation)
- `bun --cwd core lint` and `bun --cwd core lint:types` on every touched contract
- final `bun scripts/run-vitest-coverage.ts`

## Documentation Updates Required

- `tests/RUNNER_OWNERSHIP.md` (owned by `TASK-105-08-11`)
- `tests/bun-lane-manifest.json` re-verification if test-file lists change
- `_docs/_TASKS/README.md` and `_docs/_CHANGELOG/*` (orchestrator closure, NOT a leaf)
