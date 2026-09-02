# TASK-105-08-10: SDK and Custom Screens Service
# FileName: TASK-105-08-10-sdk-and-custom-screens-service.md

**Priority:** High  
**Category:** QA + Coverage  
**Estimated Effort:** Medium  
**Dependencies:** TASK-105-08-09 (the narrowly scoped recovery test follows the
reconciled remaining order; source files are read-only and this leaf only writes tests)
**Parent Task:** TASK-105-08  
**Status:** ✅ Done (2026-09-02)
**Started:** 2026-08-22  
**Initial Implementation Complete:** 2026-08-22 (`1a8550b5`)
**Recovery Pending:** One source-proven reachable fallback seam, then family rebaseline and a
changelog entry that explicitly includes this leaf.
**Recovery Complete Receipt:** Once the post-L09 proxy regression has landed and its
targeted Vitest, ESLint, TypeScript, diff, and line-count gates pass, record its commit,
test path, and commands here. That receipt—not terminal family status—satisfies the L10
dependency for TASK-105-08-13 and TASK-105-08-12.

**RECOVERY COMPLETE (2026-08-26):** The proxy regression test has landed and all five
gates pass. Commit: pending the family closure commit on `feat/task-105-final-vitest-coverage`
(no per-leaf commit; single-writer dirty worktree handoff).
- Test path: `tests/vitest/customScreens/customScreenDefinitionNormalizerResidual.test.ts`
  (test `normalizeCustomScreenDefinitionForRead recovers a v2 listView whose columns getter
  throws`; Proxy defined locally per contract).
- Seam exercised: `core/services/customScreens/customScreenDefinitionNormalizer.ts:358`
  recovery catch — a v2 definition with a `Proxy` `listView` whose `columns` getter throws
  reaches the catch and returns the default v2 list view (asserted: schemaVersion 4,
  non-empty default columns, default `updatedAt`/`desc` sort, rowTemplate present).
- Gates (all pass, verified by orchestrator against local output):
  - Vitest: `export TMPDIR=/tmp && set -a && . ./.env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/customScreens/customScreenDefinitionNormalizerResidual.test.ts` → 9/9 passed.
  - ESLint: `./node_modules/.bin/eslint tests/vitest/customScreens/customScreenDefinitionNormalizerResidual.test.ts --max-warnings=0` → exit 0.
  - TypeScript: `./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false` → 0 diagnostics in this file (163 pre-existing in other active streams' files; none attributable to this leaf).
  - Diff: `git diff --check -- tests/vitest/customScreens/customScreenDefinitionNormalizerResidual.test.ts` → clean.
  - Line count: 212 ≤ 1000.

## Implementation Notes and Residual Evidence

Implemented by delegated agent (9router:ds/deepseek-v4-flash), verified independently by
the orchestrator against local files and command output. Test-only: 15 new suites
(`tests/vitest/customScreens/*`) + 5 extended suites; 14/19 target files at 100% lines.

Residual set: exactly 6 lines across 4 files, all verified genuinely unreachable through
the public API (each confirmed by reading the source):

| File:Line | Evidence |
|---|---|
| `bindingResolver.ts:148-150` (3) | `resolveWidgetDefinition` returns `null` (retired types) or `LEGACY_WIDGET_PLACEHOLDER` whose `bindingTargets` is the literal `[]` (line 46-50), so `(widget?.bindingTargets ?? [])` is always empty and the `forEach` body (148-150) cannot run. |
| `screenDocumentMutations.ts:85` (1) | `sameSiblingList` final `return false` fallthrough: the sole caller (`moveScreenBlockTo`, line 129) guards `target.kind === "section-index" \|\| target.kind === "slot-index"` before calling, and both branches return inside; the fallthrough is dead. |
| `screenDocumentReadNormalizer.ts:285` (1) | Length-mismatch throw in `collectNormalizedUnsupportedButtonIds`: `repairLegacyScreenRecordForRead` is 1:1 block-preserving (only `.map` over arrays, value-level repair), so `repairedBlocks.length === normalizedBlocks.length` always; verified via `normalizeUniqueIds` + section-wrap analysis. |
| `screenEntryPresentationOverrideContract.ts:204` (1) | Catch-all `throw invalidOverride()` in `normalizeOverrideValue`: `propPath` is validated by `normalizePropPath` against exactly the 5 enum values (`image`, `mediaAssetId`, `textSize`, `textEmphasis`, `tone`; lines 9-13), and all 5 are handled above the throw (mediaPropPathSet + the three owned-enum branches). |

`customScreenDefinitionNormalizer.ts:359` is not a residual: the exported read normalizer
accepts unknown input, and a v2 definition with a `Proxy` `listView` whose `columns` getter
throws reaches this recovery catch. Add a focused regression test after leaf 09 (the
reconciled remaining order), assert the default v2 list view is returned, and keep the
throwing proxy local to the test. These six lines join the 22 documented residuals from
TASK-105-08-01/02; the provisional documented genuinely-unreachable set is 28 across 13
files. No `coverage.exclude` widening and no istanbul-ignore anywhere (owner rule).

---

## Overview

Close every line gap in `core/services/customScreens/**` (19 files) and verify the SDK
lane. **Seed correction (verified against the artifact):** `packages/sdk/src/**` is
already at `100%` LINES on all four files (`client.ts` 1/1, `pluginManifest.ts` 69/69,
`server.ts` 1/1, `shared.ts` 1/1). The SDK has NO line residual in this wave; only
`pluginManifest.ts` carries a branch/statement residual (`90.80` stmts / `88.31` branch /
`100.00` func), which is a non-blocking follow-up for `TASK-105-09`, not a line-closure
target. Test-only: no API surface, no production change.

## Scope

Uncovered-line budget: **161** across 19 files (current covered/total + line%):

| File | Covered/Total | Line% |
|---|---|---:|
| `bindingResolver.ts` | 85/107 | 79.4% |
| `capabilities.ts` | 36/38 | 94.7% |
| `customScreenBindingNormalizer.ts` | 93/97 | 95.9% |
| `customScreenDefinitionNormalizer.ts` | 94/106 | 88.7% |
| `customScreenEditorViewNormalizer.ts` | 52/57 | 91.2% |
| `customScreenLegacyAdapters.ts` | 53/61 | 86.9% |
| `customScreenListViewNormalizer.ts` | 131/136 | 96.3% |
| `customScreenNormalizationPrimitives.ts` | 127/131 | 96.9% |
| `customScreenService.ts` | 96/97 | 99.0% |
| `relatedEntryResolver.ts` | 31/33 | 93.9% |
| `screenDocumentBindingOps.ts` | 17/18 | 94.4% |
| `screenDocumentDataNormalizer.ts` | 180/186 | 96.8% |
| `screenDocumentFactories.ts` | 34/38 | 89.5% |
| `screenDocumentMutations.ts` | 129/136 | 94.9% |
| `screenDocumentNormalizer.ts` | 74/77 | 96.1% |
| `screenDocumentReadNormalizer.ts` | 145/153 | 94.8% |
| `screenDocumentTree.ts` | 57/62 | 91.9% |
| `screenEntryPresentationOverrideContract.ts` | 102/105 | 97.1% |
| `screenEntryPresentationOverrides.ts` | 103/162 | 63.6% |

## Single-Writer File Ownership

- This leaf is the SOLE writer of the 19 source files above and of its test files under
  `tests/vitest/customScreens/*` and `tests/vitest/sdk/*`.
- CARVE-IN: `tests/vitest/admin/custom-screen-schemas.test.ts` (930 lines) tests
  `core/services/customScreens/**` normalizers, so THIS leaf owns it (extending it is
  permitted), NOT TASK-105-08-01. It stays in `tests/vitest/admin/` for now; the
  single writer is this leaf either way.
- Existing suites it may extend (owned by this leaf): `bindingResolver.test.ts`,
  `capabilities.test.ts`, `customScreenService.test.ts`, `relatedEntryResolver.test.ts`,
  `customScreenSummaryContract.test.ts`, `customScreenBackfill.test.ts`,
  `screen-document-*.test.ts`, `screenDocumentOps.test.ts`, and SDK suites
  `tests/vitest/sdk/pluginManifest.test.ts`, `client.test.ts`, `server.test.ts`,
  `exports.test.ts`, `hookContext.test.ts`. (`shared.test.ts` does NOT exist; create
  it as a new suite only if a shared SDK contract needs one.)
- New focused suites for the residual lines. No other leaf may edit these test files.

## Pseudocode

These modules are Bun-free pure logic. Mock seams are limited to injected deps (none for
most normalizers); no React render is needed.

```ts
import { describe, it, expect } from "vitest";
import { bindingResolver } from "@/services/customScreens/bindingResolver";

// fixture: a valid screen document + a table of binding shapes (field, block, prop,
// mode variants) that each resolve to an expected value or a documented fallback.
```

Assertion shape per module:

1. `screenEntryPresentationOverrides` (59 uncovered): table-driven over every override
   source (contract-driven, per-entry, per-collection) and every merge/priority/fallback
   branch.
2. `bindingResolver` (22 uncovered): every binding shape and every miss/fallback branch.
3. Normalizers (`customScreenDefinitionNormalizer`, `customScreenLegacyAdapters`,
   `customScreenEditorViewNormalizer`, `customScreenListViewNormalizer`,
   `customScreenBindingNormalizer`, `screenDocumentReadNormalizer`,
   `screenDocumentDataNormalizer`, `screenDocumentNormalizer`,
   `customScreenNormalizationPrimitives`): table-driven over every default, clamp,
   legacy-adapter, and reject-unknown branch; assert round-trip byte-identity on
   no-override documents where the contract requires it. For the L10 recovery, supply a
   v2 `Proxy` list view whose `columns` getter throws and assert the catch returns the
   default list view rather than leaking the exception.
4. Document ops (`screenDocumentMutations`, `screenDocumentBindingOps`,
   `screenDocumentFactories`, `screenDocumentTree`, `screenDocumentReadNormalizer`):
   each mutation/factory/tree branch and its error mapping.
5. SDK: confirm each SDK file stays at 100% lines; optionally add `pluginManifest.ts`
   branch hardening only if time permits (record the branch residual honestly otherwise).

Work order (worst first): `screenEntryPresentationOverrides` (59), `bindingResolver` (22),
`customScreenDefinitionNormalizer` (12), `customScreenLegacyAdapters` (8),
`customScreenEditorViewNormalizer` (5), then each remaining 1–7 line gap.

## Validation Gates

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/tsc -p packages/sdk/tsconfig.json --noEmit`
- `./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false`; attribute
  every reported dirty-worktree diagnostic to its named owner before advancing this leaf.
- targeted Vitest, one file per invocation:
  `export TMPDIR=/tmp && set -a && . ./.env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/customScreens/bindingResolver.test.ts`
- `git diff --check`
- line-count gate ≤ 1000 per added/modified file.

## 1000-Line Rule

`tests/vitest/admin/custom-screen-schemas.test.ts` (930, owned by this leaf) is near
the gate; split before extending. `tests/vitest/admin/customScreensClient.test.ts`
(925) is owned by TASK-105-08-01 and is NOT this leaf's concern. Any new suite
crossing 1000 lines splits by responsibility.

## Security Contract

Test-only, no API surface.

## Acceptance Criteria

1. All reachable lines in the 19 customScreens service files reach `100%` coverage.
   The six enumerated source-proven unreachable residual lines are reconciled by
   TASK-105-08-12; no coverage configuration or ignore directive may be used to change
   that result.
2. SDK files remain at `100%` lines; the `pluginManifest.ts` branch residual is reported
   honestly (and hardened opportunistically).
3. Round-trip byte-identity is pinned where a no-override document contract requires it.

## Closure (2026-09-02)

Deliverable complete on tree evidence: commits 1a8550b5 "TASK-105-08-10: custom screens service + SDK coverage" and 1782ef86 "test(task-105): close 08-04 custom screens UI and 08-10 service coverage".
Owned service/SDK suites are committed and green in the canonical run; root tsc --noEmit exits 0 with zero diagnostics.
Residual disposition: the 08-10 attribution in TASK-105-08-12 is 4 files / 6 lines.
Canonical artifact: TASK-105-08-12 Closure Evidence (2026-09-01) — 99.26% lines, 291 uncovered / 87 files, canonical run 1186 files / 10444 tests / 0 failures.
