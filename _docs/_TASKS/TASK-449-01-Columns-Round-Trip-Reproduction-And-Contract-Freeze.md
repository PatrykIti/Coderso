# TASK-449-01: Columns Round-Trip Reproduction And Contract Freeze
# FileName: TASK-449-01-Columns-Round-Trip-Reproduction-And-Contract-Freeze.md

**Parent Task:** TASK-449
**Priority:** High
**Category:** Pages / Page Editor V2 / Contract
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-11

---

## Overview

Reproduce the `columns` disappearance deterministically and freeze the owning
contract before changing persistence logic. At HEAD `ae9dcc44` (2026-06-11
drift audit) the pure schema layer is verified green: an empirical bun round
trip of default, empty-slot, and overflow-slot columns through
`normalizePageDocumentV2ForWrite` → `normalizeStoredPageDocumentV2ForRead` →
`toPublishedPageDocumentV2` preserves the block, and the payloads pass route
Ajv validation. The audited live drop from `_docs/AUDIT/columns-2026-06-10.md`
(reproduced twice on 2026-06-10) therefore sits outside that layer — or is
already fixed. This subtask owns a fresh reproduction against the live editor
path (save/autosave payload, stale-CSRF save failure + cache-event
rehydration around `PageEditor.tsx:1520-1554`, publish flow) and records the
first layer that drops the block, or records explicitly that the drop no
longer reproduces at HEAD. **Hard gate:** the fix contract (TASK-449-02) may
only be written against the layer identified here.

---

## Sub-Tasks

- [x] TASK-449-01-L01: Reproduce columns save drop across write/read/publish.

## Implementation Pseudocode

```ts
// Schema-layer pin (verified green at HEAD ae9dcc44 — keep as a regression
// pin; it is NOT the failing reproduction):
test("columns survives write/read/publish round-trip", () => {
  const document = buildMinimalPageWithColumns();
  const written = normalizePageDocumentV2ForWrite(document);
  const stored = normalizeStoredPageDocumentV2ForRead(written);
  const published = toPublishedPageDocumentV2(written);

  expect(findBlockTypes(stored)).toContain("columns");   // passes today
  expect(findBlockTypes(published)).toContain("columns"); // passes today
});

// Live-path reproduction (the actual deliverable): replay editor insert →
// autosavePage/updatePage (PageEditor.tsx:1537/:1550) → route Ajv validation
// → pageService.preparePageData → DB → reopen via cache/detail fetch,
// including the stale-CSRF save-failure + cache-event rehydration path
// (PageEditor.tsx:1520-1554) → publish. Record the first layer that drops
// the block, or record "not reproducible at HEAD".
```

Expected data flow:

- Capture the exact default editor output for an inserted `columns` block.
- Prove where the block disappears in the live path (the pure schema layer
  and route validation are already verified green), or prove it no longer
  disappears at HEAD.
- Freeze the slot-shape and count-shrink expectations (current behavior:
  empty slot arrays kept, overflow children preserved) before implementation.

Error handling:

- Keep genuine malformed-input errors machine-readable.
- Default editor-produced data must not be classified invalid.

Regression-test shape:

- Vitest round-trip coverage for default and populated columns blocks
  (green today — pins current schema-layer behavior), plus recorded
  live-path reproduction evidence.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** fix must stay within `pageDocumentV2.ts` reject-unknown rules.
- **Anti-abuse controls:** not applicable.

---

## Testing Requirements

- New Vitest coverage pinning the default `columns` round-trip (green today).
- Live admin-flow reproduction evidence (including the stale-CSRF +
  cache-rehydration path) or an explicit "not reproducible at HEAD" record.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if slot semantics are clarified

---

## Completion Notes

Reproduction executed live on 2026-06-11 (evidence: `.tmp/phase0/columns-repro.md`,
`.tmp/phase0/cap-columns-autosave.json`). Verdict: the columns-specific drop is
**not reproducible at HEAD** on the clean editor path — autosave/save/publish
payloads, stored `currentData`, reopen, and the published front all keep the
block; pages source is byte-identical to the audited tree (`git log
1fb8604a..HEAD -- core/services/pages core/admin/ui/pages core/server` is
empty), so the audited verdict was a method/environment artifact. The
reproduction instead captured a real block-agnostic dropper: a stale/empty
cached `pages:detail` record plus a `pageDetail` cacheBus broadcast replaces
the live document via the rehydration effect (`PageEditor.tsx:1520-1532`,
guarded only by `hasUnsavedChanges`), reaching the audit's exact end state
(editor `s=0/b=0`, published empty front). That layer was recorded as the
TASK-449-02 fix target. Secondary gaps (autosave revisions never promoted to
`currentData`, no SPA unsaved-navigation guard, mount-path trust of a
TTL-fresh poisoned cache) were split to follow-up TASK-454.
