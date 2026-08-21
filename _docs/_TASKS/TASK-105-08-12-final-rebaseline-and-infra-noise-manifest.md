# TASK-105-08-12: Final Rebaseline and Infra-Noise Manifest
# FileName: TASK-105-08-12-final-rebaseline-and-infra-noise-manifest.md

**Priority:** High  
**Category:** QA + Docs  
**Estimated Effort:** Small  
**Dependencies:** TASK-105-08-01..11  
**Parent Task:** TASK-105-08  
**Status:** ⏳ To Do

---

## Overview

Land last. Document the 17 zero-executable infrastructure-noise files with an
`exclude-with-reason` disposition, run the final canonical coverage rebaseline, assert
the final totals, and prepare the handoff evidence for `TASK-105-09`. No product code and
no test code is edited here.

## Scope

The 17 zero-executable files (`lines.total === 0` in the artifact). Verified at HEAD:
each is a type-only contract or a pure re-export barrel/facade, i.e. true infra noise.

| File | Disposition (exclude-with-reason) |
|---|---|
| `core/admin/ui/audit/types.ts` | type-only contract |
| `core/admin/ui/authoring/index.ts` | re-export barrel |
| `core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx` | re-export facade |
| `core/admin/ui/media/types.ts` | type-only contract |
| `core/admin/ui/menus/types.ts` | type-only contract |
| `core/admin/ui/pages/PageEditor.tsx` | re-export facade (TASK-481-02-L02) |
| `core/admin/ui/pages/editorControls/index.ts` | re-export barrel |
| `core/admin/ui/plugins/types.ts` | type-only contract |
| `core/admin/ui/roles/types.ts` | type-only contract |
| `core/admin/ui/security/types.tsx` | type-only contract |
| `core/admin/ui/setup/steps/stepTypes.ts` | type-only contract |
| `core/admin/ui/store/types.ts` | type-only contract |
| `core/admin/ui/users/types.ts` | type-only contract |
| `core/services/assistant/providers/providerTypes.ts` | type-only contract |
| `core/services/customScreens/customScreenSchemas.ts` | re-export barrel |
| `core/services/customScreens/screenDocumentContracts.ts` | type-only contract |
| `core/services/customScreens/screenDocumentOps.ts` | re-export barrel |

Disposition rule (matches TASK-105-10 and the TASK-105-06 `index.ts` disposition): these
files cost nothing to the aggregate (`0/0` covered/total, pct vacuous). They are recorded
as `exclude-with-reason` in this contract/coverage manifest, NOT added to
`coverage.exclude`. No `/* istanbul ignore */` is added to any source file.

## Single-Writer File Ownership

- This leaf does NOT write any source or test file. It owns this contract file and the
  closure evidence.
- It reads `coverage/vitest/coverage-summary.json`, `scripts/analyze-vitest-gaps.ts`,
  and `scripts/run-vitest-coverage.ts`. Board/changelog sync remains the orchestrator's
  closure job (`TASK-105-09`), never this leaf's.

## Pseudocode

```ts
// 1. Fresh canonical rebaseline (owned by this leaf):
//    bun scripts/run-vitest-coverage.ts
//
// 2. Re-derive the gap inventory and assert the closure contract:
//    bun scripts/analyze-vitest-gaps.ts
//
// 3. Assert:
//    - files with executable lines === 668
//    - files below 100% lines === 0
//    - files at 100% lines === 668
//    - uncovered lines === 0
//    - zero-executable files === 17 (the manifest above, unchanged)
//    - total lines pct === 100.00
//
// 4. Report statements/functions and branch honestly (a covered line can still have
//    only one branch taken or share a line across statements, so stmts/funcs/branch
//    may remain < 100 after lines hit 100). Record all four numbers for
//    TASK-105-09 rather than gating on stmts/funcs/branch.
```

Verification commands (read-only):

```bash
bun scripts/run-vitest-coverage.ts
bun scripts/analyze-vitest-gaps.ts
# confirm the "FILES ... at 100% lines" and "Uncovered lines total: 0" lines
```

## Validation Gates

- `bun scripts/run-vitest-coverage.ts` (must complete with exit 0)
- `bun scripts/analyze-vitest-gaps.ts` (assert the numbers above)
- `git diff --check`
- line-count gate: no file is added/modified by this leaf beyond this contract.

## 1000-Line Rule

Not applicable to this leaf; it produces no code. The final rebaseline must be run after
all split-first constraints from leaves 01–11 have landed.

## Security Contract

Test-only, no API surface. Coverage-manifest/docs change only.

## Acceptance Criteria

1. Final rebaseline shows `100.00` lines with `0` uncovered lines and `0` files below
   100% lines among the 668 executable-line files.
2. The 17 infra-noise files are documented with `exclude-with-reason`, with no
   `coverage.exclude` widening and no istanbul-ignore additions.
3. Before/after totals (`82.02 / 73.81 / 81.94 / 85.43` → `100.00` lines with `0`
   uncovered; stmts/funcs/branch reported honestly, not gated) are captured for
   `TASK-105-09`.
4. Closure evidence is recorded; board/changelog sync is left to the orchestrator.
