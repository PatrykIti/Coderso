# TASK-534-01: Interactivity MODEL + Runtime Clauses (switcher/scrollHint block types, panel slots, gallery filter props, magnetic/noiseOverlay style keys)

# FileName: TASK-534-01-Interactivity-Model-And-Runtime-Clauses.md

**Parent Task:** TASK-534
**Priority:** High
**Category:** Schema (JSON model) / Site Render (runtime) / Security
**Estimated Effort:** Large
**Status:** ⏳ To Do

---

## Scope

Foundation subtask. Sole writer of `core/services/pages/pageDocumentV2.ts` (all
model additions, in DISJOINT intra-subtask regions) and the **TASK-534 clause
region** of `core/services/pages/pageEffectsRuntime.ts` (the appended
switcher/filter/magnetic runtime clauses). Defines the shared vocabulary every
534 consumer imports read-only: the two new `pageBlockTypes` members (`switcher`,
`scrollHint`), the six `panel:1..6` slot keys, the gallery filter props, the
`magnetic`/`noiseOverlay` present-only flags, their enums/clamps, and the runtime
IIFE clauses. Lands FIRST; 534-02/03/04 import its exports read-only.

## Leaves

| Leaf | Scope |
|------|-------|
| **534-01-L01** | `pageBlockTypes` + `pageBlockSlotKeys` + `pageBlockPropKeys` + `pageBlockDefaultProps` + capability sets + gallery filter props + block normalize + JSON schema (switcher, scrollHint, gallery, panel slots) |
| **534-01-L02** | `PageBlockStyleV2.magnetic` + `PageSectionStyleV2.noiseOverlay` + `PageEffectsV2.noiseOverlay` style-key model + normalize + JSON schema |
| **534-01-L03** | `pageEffectsRuntime.ts` TASK-534 runtime clauses (switcher toggle, gallery filter, magnetic hover) |
| **534-01-L04** | Model + runtime static-shape Vitest tests (round-trip, reject-unknown, byte-identity, runtime string assertions) |

## Coordination

- `pageDocumentV2.ts` = 534-01 only; L01 (block-type/slots/props region) and L02
  (style-key region) edit DISJOINT symbols. All writes wrapped in labelled
  `// ── TASK-534 … ──` regions (parent coordination guard) so 531/532/533
  worktrees merge additively.
- `pageEffectsRuntime.ts` = the appended TASK-534 clause fence ONLY (after the 522
  `[data-block-tilt]` clause `:97-120`, before `}catch(e){}` `:121`).
- Hard Invariants 1/5/6/7/8 (present-only, no schemaVersion bump, reject-unknown +
  fail-soft/closed, one runtime script, customSvg-pattern block-type land) are
  enforced here first.
