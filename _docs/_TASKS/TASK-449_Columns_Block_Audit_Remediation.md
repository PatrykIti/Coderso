# TASK-449: Columns Block Audit Remediation
# FileName: TASK-449_Columns_Block_Audit_Remediation.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** None for the persistence fix; TASK-421 (dedicated controls), TASK-423 (responsive runtime) for the closure verification sweep
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-11

---

## Overview

Remediation family for the `columns` block based on
`_docs/AUDIT/columns-2026-06-10.md` (verdict **BROKEN · high**) and
`_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md` §3.3.

Audit findings:

1. **HIGH — `columns` does not survive a save.** Insert reliably produces a
   live block in-session (`s=1/b=1`, toolbar `columns tools`), but after
   Save + reopen the editor shows `s=0/b=0` and the published front renders
   "This page has no content yet." (`sectionTypes=[]`, `blockTypes=[]`).
   Reproduced twice on clean pages (`711205bf`, `21f9dba9`). Sibling layout
   blocks `container` and `group` persisted in the same session, so this is a
   columns-specific serialization/normalization failure (slots `column:1..4`).
2. Shared inspector control drift (`Width/Align/Distribution` native selects,
   `Column gap`/`Radius` number inputs, colors raw hex, `Visible` yes/no
   select) — widget implementation is owned by TASK-421; this family verifies
   the columns panels after TASK-421 lands.

Reproduction status at HEAD `ae9dcc44` (2026-06-11 drift audit): the audited
drop (reproduced live twice on 2026-06-10) is **not** reproducible at the pure
schema layer. An empirical bun round trip of a default-inserted `columns`
block — including explicit empty slots and overflow slot keys — through
`normalizePageDocumentV2ForWrite` → `normalizeStoredPageDocumentV2ForRead` →
`toPublishedPageDocumentV2` preserves the block, and the payloads pass route
Ajv validation (`core/server/validation/pageSchemas.ts`). Candidate layers for
the live drop: the editor save/autosave payload (`PageEditor.tsx`
`autosavePage` ~1537 / `updatePage` ~1550), the stale-CSRF save-failure plus
cache-event rehydration path (`PageEditor.tsx` ~1520–1554), the publish flow,
or the bug is already fixed — a fresh live reproduction at HEAD is required.

Scope of this family:

- Reproduce the drop in the live editor path and locate the exact layer
  (TASK-449-01), then fix where the `columns` block (or its host section) is
  dropped in the save → store → reopen → publish path. **Hard gate:** the fix
  contract (TASK-449-02) may only be written against the layer identified by
  TASK-449-01; no persistence change lands without a fresh failing
  reproduction (or an explicit "no longer reproducible at HEAD" record).
- Keep the round-trip regression contract test covering **every** editor
  insertable block type with default props as a permanent guard, so no other
  block can silently vanish the way `columns` (and the empty `list`, see
  TASK-442) did. The guard passes today at the schema layer — it pins current
  behavior; it is not the failing reproduction.
- Closure verification: insert → configure (count/gap/distribution) → nest
  children into `column:N` slots → save → reopen → publish → front renders
  columns with children; columns panels show dedicated TASK-421 controls.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes; existing internal admin page
  save/autosave/publish routes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** fix stays inside the `pageDocumentV2.ts` schema-first
  contract (reject-unknown preserved); no loosening of slot validation.
- **Anti-abuse controls:** not applicable.

---

## Sub-Tasks

- [x] TASK-449-01: Columns round-trip reproduction and contract freeze
      (reproduction-first hard gate).
- [x] TASK-449-01-L01: Reproduce the columns save drop across write/read/
      publish and the live admin flow; record the first layer that drops the
      block, or record that it no longer reproduces at HEAD.
- [x] TASK-449-02: Columns persistence and slot round-trip implementation
      (fix only the layer identified by TASK-449-01).
- [x] TASK-449-02-L01: Fix the identified layer and land the
      all-insertable-block round-trip guard (green today; pins behavior).
- [x] TASK-449-03: Validation, nested slots, controls, and closure.

---

## Implementation Pseudocode

```ts
// 1) Permanent regression guard (passes today at HEAD ae9dcc44 — it pins
//    current schema-layer behavior and is NOT the failing reproduction):
test("every editor-insertable block round-trips write/read normalization", () => {
  for (const type of editorInsertableBlockTypes) {
    const doc = buildMinimalDocumentWithBlock(type, pageBlockDefaultProps[type]);
    const written = normalizePageDocumentV2ForWrite(doc);
    const read = normalizeStoredPageDocumentV2ForRead(written);
    expect(blockTypesOf(read)).toContain(type);          // green today — pin
    const published = toPublishedPageDocumentV2(written);
    expect(blockTypesOf(published)).toContain(type);
  }
});

// 2) Verified current behavior (do NOT re-implement it): normalizeBlockSlots
//    (core/services/pages/pageDocumentV2.ts:1425-1503) already keeps empty
//    slot arrays ({ "column:1": [] } stays valid persisted state), accepts
//    the static columns slot key list independent of props.count, preserves
//    overflow children non-destructively, and never drops the block; the
//    payloads also pass route Ajv validation.
// 3) Fix shape is intentionally open until TASK-449-01 identifies the
//    failing layer: live editor save/autosave payload (PageEditor.tsx
//    :1537/:1550), stale-CSRF save failure + cache-event rehydration
//    (PageEditor.tsx ~1520-1554), publish flow, or already fixed (then only
//    the guard above lands). TASK-449-02 writes the fix contract against
//    that identified layer only.
```

Expected data flow:

- Editor document → `updatePage`/`autosavePage` → write normalization keeps
  the columns block (with or without children) → DB → read normalization →
  editor reopen shows `s=1/b=1` → publish → runtime renders
  `data-page-block="columns"` with per-slot children.

Error handling:

- Keep machine-readable `page_document_invalid`-style errors for genuinely
  malformed input; default editor output must never be classified invalid.
- No production fallback added just to satisfy tests (AGENTS.md rule); fix the
  contract owner.

Regression-test shape:

- Vitest domain tests: all-insertable-types round trip; columns slots round
  trip with children in `column:1`/`column:2`; count shrink keeps overflow
  children non-destructively. These pass today at the schema layer and are
  kept as permanent pins of current behavior.
- Bun runtime test: publish + render page with columns (runtime lane owns
  `Bun.serve` route behavior).
- Live smoke: audit script replay on `coderso-dev-core-host` (insert, save,
  reopen, publish, curl front for `data-page-block="columns"`).

---

## Testing Requirements

- New Vitest suite (Bun-free): `tests/vitest/pages/page-document-v2-block-roundtrip.test.ts`.
- Relevant Bun runtime/page render suites for the touched contract.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` + `playwright-cli` live verification.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if slot normalization semantics are clarified.
- `_docs/_TASKS/README.md` board + statistics sync.
- `_docs/_CHANGELOG/` entry on completion referencing the audit file.

---

## Progress Notes

TASK-449-01/-01-L01 (reproduction) and TASK-449-02/-02-L01 (fix + guard) are Done (2026-06-11); TASK-449-03 closure sweep was blocked on TASK-421/TASK-423 at the time of this note; both landed in Phase 1 and the sweep completed 2026-06-11 (see Family Completion below).

## Family Completion

Family completed 2026-06-11: reproduction proved the audited drop was a stale-cache artifact, the block-agnostic dropper was fixed (monotonic rehydration guard), the all-insertable-block round-trip guard pins the schema layer, and the TASK-449-03 live sweep passed 16/16 with dedicated controls and responsive delivery in place.
