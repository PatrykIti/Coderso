# TASK-048-08: Entry Workflow & Validation UX
# FileName: TASK-048-08_Entry_Workflow_and_Validation_UX.md

**Priority:** 🟡 Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-048-01, TASK-048-04  
**Status:** ✅ **Done** (2026-02-04)

---

## Overview

Improve the entry editor workflow with WordPress‑like validation cues:
- publish checklist with actionable requirements
- required field highlights
- clearer scheduling validation

---

## Sub-Tasks

1. **Checklist logic**
   - Evaluate title/slug, required fields, schedule date
   - Provide blocking issues for publish

2. **Entry editor UX**
   - Show publish checklist in metadata panel
   - Highlight missing required fields in cards
   - Block publish when checklist has critical issues

3. **Tests**
   - Unit tests for checklist evaluation

---

## Implementation Checklist

| File | Change |
|------|--------|
| `core/admin/ui/entries/entryChecklist.ts` | checklist evaluation helper |
| `core/admin/ui/entries/EntryEditor.tsx` | blocking publish + missing field highlight |
| `core/admin/ui/entries/EntryMetadataPanel.tsx` | checklist UI |
| `tests/unit/ui/entry-checklist.test.ts` | checklist unit tests |
| `_docs/CONTENT_EDITOR_UX.md` | workflow checklist docs |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test`

---

## Documentation Updates Required

Update:
- `_docs/CONTENT_EDITOR_UX.md`

---

## Changelog

Add `_docs/_CHANGELOG/149-2026-02-04-entry-workflow-validation.md` and link TASK-048-08.
