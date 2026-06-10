# TASK-449: Columns Block Audit Remediation
# FileName: TASK-449_Columns_Block_Audit_Remediation.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** None for the persistence fix; TASK-421 (dedicated controls), TASK-423 (responsive runtime) for the closure verification sweep
**Status:** ⏳ To Do

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

Scope of this family:

- Find and fix where the `columns` block (or its host section) is dropped in
  the save → store → reopen → publish path.
- Add a round-trip regression contract test covering **every** editor
  insertable block type with default props, so no other block can silently
  vanish the way `columns` (and the empty `list`, see TASK-442) did.
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

- [ ] Reproduce the drop with a minimal script and locate the exact layer:
      editor save payload (`PageEditor.tsx` ~1537/1550 `autosavePage`/
      `updatePage`), write normalization (`normalizePageDocumentV2ForWrite`),
      slot normalization (`normalizeBlockSlots`, `pageDocumentV2.ts`
      ~1432–1502), active-slot resolution (`getPageBlockActiveSlotKeys`,
      ~459–466), read normalization (`normalizeStoredPageDocumentV2ForRead`,
      consumed by `normalizePageData`, `PageEditor.tsx:530`), or publish
      (`toPublishedPageDocumentV2`).
- [ ] Fix the root cause so a default-inserted `columns` block (empty slots)
      round-trips save/reopen/publish exactly like `container`/`group`.
- [ ] Add the all-block-types round-trip regression test (Vitest, Bun-free
      domain lane) plus a columns-specific slots round-trip case.
- [ ] Closure verification sweep per the audit method (live browser), after
      TASK-421 lands for the control checks.

---

## Implementation Pseudocode

```ts
// 1) Reproduction harness (test-first):
test("every editor-insertable block round-trips write/read normalization", () => {
  for (const type of editorInsertableBlockTypes) {
    const doc = buildMinimalDocumentWithBlock(type, pageBlockDefaultProps[type]);
    const written = normalizePageDocumentV2ForWrite(doc);
    const read = normalizeStoredPageDocumentV2ForRead(written);
    expect(blockTypesOf(read)).toContain(type);          // columns fails today
    const published = toPublishedPageDocumentV2(written);
    expect(blockTypesOf(published)).toContain(type);
  }
});

// 2) Likely fix shape (confirm against reproduction):
//    normalizeBlockSlots currently `continue`s/strips slot entries and may
//    reject or empty the columns block when default slots are empty or when
//    slot keys beyond props.count are present. The fix must:
const normalizeBlockSlots = (input, type, mode, path, depth, context) => {
  const allowedSlots = pageBlockCapabilities[type].slots;
  // keep empty slot arrays as valid (slots: { "column:1": [] } must not
  // invalidate or drop the block), and
  // clamp slot keys to getPageBlockActiveSlotKeys(block) non-destructively
  // (preserve overflow children when count shrinks, per deterministic
  // non-destructive adapter rule in AGENTS.md) — do not throw in write mode
  // for editor-produced defaults.
};
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
  children non-destructively.
- Bun runtime test: publish + render page with columns (runtime lane owns
  `Bun.serve` route behavior).
- Live smoke: audit script replay on `coderso-dev-core-host` (insert, save,
  reopen, publish, curl front for `data-page-block="columns"`).

---

## Testing Requirements

- New Vitest suite (Bun-free): `tests/vitest/services/page-document-v2-block-roundtrip.test.ts`.
- Relevant Bun runtime/page render suites for the touched contract.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` + `playwright-cli` live verification.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if slot normalization semantics are clarified.
- `_docs/_TASKS/README.md` board + statistics sync.
- `_docs/_CHANGELOG/` entry on completion referencing the audit file.
