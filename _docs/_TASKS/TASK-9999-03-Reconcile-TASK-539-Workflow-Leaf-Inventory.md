# TASK-9999-03: Reconcile TASK-539 Workflow Leaf Inventory

# FileName: TASK-9999-03-Reconcile-TASK-539-Workflow-Leaf-Inventory.md

**Parent Task:** TASK-9999
**Priority:** Low
**Category:** Docs / Workflow Tooling Hygiene
**Estimated Effort:** Small
**Dependencies:** none (TASK-545-owned migration to un-pin 539 workflow bytes is a prerequisite, not a dependency)
**Status:** ⏳ To Do
**Deferred From:** TASK-539-08-L01 (changelog 1318 closeout, 2026-08-20)

---

## Why this is deferred (exact evidence)

The five-lens post-audit of TASK-539-08-L01 (lens 5, 2026-08-20) found two LOW
workflow-tooling items that cannot be fixed inside the 539 closure leaf:

1. `_docs/_workflows/task-539-fix.mjs` and `_docs/_workflows/task-539-implement.mjs`
   seed a stale 18-leaf inventory: the implement workflow's `phases`/land-order
   strings, `ORCHESTRATOR_DIRTY` list, and `LEAVES` table omit TASK-539-02-L03
   entirely, and both scripts' `changelog-pins` lens scopes say "18 leaves".
2. `_docs/_workflows/task-539-implement.mjs` `FINAL_LENS_INPUTS.evidence` points
   at `_docs/_workflows/_smoke/TASK-539`, which does not exist; the real evidence
   lives under `_docs/_workflows/_smoke/evidence/task-539/` plus top-level
   `task-539-*.png` files.

**Why the leaf cannot fix them:** the TASK-545-01-L02 static workflow contract
(`tests/unit/workflows/workflowStaticContractCore.ts:164-187`,
`assertBytesEqualGitShowHead`) pins every tracked workflow file, including
`_docs/_workflows/task-539-fix.mjs` and `task-539-implement.mjs`, to byte
identity with `HEAD` and zero unstaged changes. Editing those bytes fails the
repository-wide workflow gate (`bun run test` → `tests/unit/workflows/...`),
which a 539 closure must keep green. A fix therefore requires a TASK-545-owned
workflow-contract change (un-pin or migrate the 539 workflow files) that is
outside the 539-08-L01 sole-writer scope.

**Deferral-safety proof (both conditions of the TASK-9999 rule):**

- Zero user-visible UI, UX, or accessibility effect: both scripts live under
  `_docs/_workflows/` and are orchestrator-only tooling. They are never shipped,
  bundled, rendered, or reachable from any public or admin surface.
- Zero data, security, privacy, auth, RBAC, API, persistence, migration,
  performance, reliability, or test-integrity impact: the scripts are not
  executed by product code, by CI gates, or by the repository test matrix
  (`bun run test` runs the TASK-545 contract *over* the workflow files, not the
  workflow files themselves). The TASK-539 implementation and closure were
  driven by the exact targeted/aggregate gate inventory in
  `TASK-539-08-L01`, which does not depend on the workflow's internal leaf
  tables; the family line-limit checks (`--check-task-family-line-limit`)
  count physical files and pass independently of the `LEAVES` table content.
  The workflow pipeline has already run to completion; it is not re-executed
  for closure.

## Execution-ready pseudocode

Prerequisite: a TASK-545-owned change un-pins or migrates
`_docs/_workflows/task-539-fix.mjs` and `_docs/_workflows/task-539-implement.mjs`
(update `workflowStaticContractCore` expectations or the owning manifest), OR
this leaf lands together with that migration so the byte-identity gate stays
green in one commit.

```ts
// 1. task-539-implement.mjs
//    - phases: insert { title: "539-02-L03" } after { title: "539-02-L02" }.
//    - COMMON land order: "02-L01 -> 02-L02 -> 02-L03 -> 03-L05 -> ...".
//    - ORCHESTRATOR_DIRTY: add
//      "_docs/_TASKS/TASK-539-02-L03-Regenerate-Kit-Artifact-And-Color-Expectations.md"
//      after the 02-L02 entry.
//    - LEAVES table: add after the 539-02-L02 entry:
//      {
//        id: "539-02-L03",
//        contract: `${TASKS}/TASK-539-02-L03-Regenerate-Kit-Artifact-And-Color-Expectations.md`,
//        allowed: [
//          "_docs/_DEMO/projekty-domow.site.json",
//          "tests/vitest/kits/projekty-domow-package.test.ts",
//          "tests/vitest/kits/projekty-domow-pages.test.ts",
//          "tests/vitest/kits/projekty-domow-runtime-rendering.test.tsx",
//        ],
//      }
//    - changelog lens scope: "parent + 8 children + 19 leaves".
//    - FINAL_LENS_INPUTS.evidence: replace
//      ["_docs/_workflows/_smoke/TASK-539"] with
//      ["_docs/_workflows/_smoke/evidence/task-539",
//       "_docs/_workflows/_smoke/task-539-05-front-full-bleed-paint.png",
//       "_docs/_workflows/_smoke/task-539-05-mobile-gradient-override.png",
//       "_docs/_workflows/_smoke/task-539-06-footer-rescan.png",
//       "_docs/_workflows/_smoke/task-539-07-reduced-motion.png",
//       "_docs/_workflows/_smoke/task-539-08-timeline-glow-divider.png",
//       "_docs/_workflows/_smoke/task-539-09-narrow-dark.png",
//       "_docs/_workflows/_smoke/task-539-09-narrow-light.png"].
// 2. task-539-fix.mjs
//    - land-order string: "02-L01 -> 02-L02 -> 02-L03 -> 03-L05 -> ...".
//    - changelog-pins lens scope: "parent + 8 children + 19 leaves".
// 3. Validation
//    - node --check on both files.
//    - bun test tests/unit/workflows/workflowStaticContract*.test.ts (or the
//      owning TASK-545 suite) green.
//    - Confirm the 539 workflow byte-identity expectations match the new bytes.
```

## Acceptance

- Both workflow scripts enumerate 19 leaves, include TASK-539-02-L03 in
  phases/land order/`ORCHESTRATOR_DIRTY`/`LEAVES`, and the evidence lens input
  resolves to real on-disk paths.
- The TASK-545 static workflow contract suite passes with the new bytes.
- A fresh post-implementation lens confirms the change is tooling-only.

## Deferral audit trail

- Source task: TASK-539-08-L01 (changelog 1318) linked this leaf at closure.
- Lens evidence: `_docs/_workflows/task-539-fix.mjs` (land order ~line 59,
  changelog-pins ~line 77); `_docs/_workflows/task-539-implement.mjs`
  (phases ~line 67, COMMON ~lines 107-109, ORCHESTRATOR_DIRTY ~lines 117-118,
  LEAVES ~lines 187-210, changelog ~line 519, evidence ~line 552).
- TASK-545 pin evidence: `tests/unit/workflows/workflowStaticContractCore.ts:164-187`.
- No duplicate leaf found in the existing TASK-9999 backlog (searched
  2026-08-20: `TASK-9999-01*`, `TASK-9999-02*` cover TASK-540/559/547 items only).
