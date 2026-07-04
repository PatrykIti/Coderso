# TASK-488-01: Product Variant Editor
# FileName: TASK-488-01-Product-Variant-Editor.md

**Parent Task:** TASK-488
**Priority:** Medium
**Category:** Commerce / Admin UI
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Add a variant authoring surface to the product editor. The product draft already
carries `variants: CommerceVariant[]` (`commerceEditorModel.ts`) and
`toCommerceProductInput` already forwards them to the gated product write path,
but `CommerceEditorSections.tsx` renders no variant control. This subtask adds
the pure model helpers for variant mutation/serialization (L01) and the variant
editor card UI that uses them (L02).

The backend already validates and persists variants
(`commerceService.normalizeVariantList`, `commerceVariantSchema`); this subtask
only fills the missing client editor — no new backend.

## Sub-Tasks

| ID                | Title                          | Effort | Status     |
| ----------------- | ------------------------------ | ------ | ---------- |
| TASK-488-01-L01   | Variant draft model helpers    | Small  | ⏳ To Do   |
| TASK-488-01-L02   | Variant editor card UI         | Medium | ⏳ To Do   |

## Dependencies

- None. The product POST/PATCH path, `CommerceVariant` type, and
  `commerceVariantSchema` validation already exist and are unchanged.
- L02 depends on L01 (the card consumes the model helpers).

## Testing Requirements

- Vitest lane only.
- L01: pure unit tests for the model helpers (`tests/vitest/`).
- L02: render + interaction test for the card (`tests/vitest/ui-integration/`)
  and an assertion in `tests/vitest/ui/commerce-page.test.tsx` that the card
  renders.
- No DB changes; no migration artifacts.
