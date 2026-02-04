# TASK-048-07: Field Layout & Grouping UX
# FileName: TASK-048-07_Field_Layout_and_Grouping_UX.md

**Priority:** 🟡 Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-048-01, TASK-048-02  
**Status:** ✅ **Done** (2026-02-04)

---

## Overview

Add WordPress‑like layout controls for entry fields:
- group fields into **sections**
- optionally place fields into **custom tabs**
- control **width** (full/half)
- control **display density** (default/compact)

This should be fully managed from the UI with no JSON editing.

---

## Sub-Tasks

1. **Schema meta support**
   - Extend `ContentField` with layout metadata
   - Persist layout in `xFieldConfig.layout`
   - Parse layout from schema on load

2. **Content Type Editor UI**
   - Add layout controls (tab, section, width, display)
   - Keep UI beginner‑friendly with small helper text

3. **Entry Editor layout**
   - Build dynamic tabs from field layout metadata
   - Render section headers inside each tab
   - Use width to build grid (full/half)
   - Use display option for compact inputs

4. **Tests**
   - Unit test schema mapping preserves layout metadata
   - UI test for layout controls in FieldEditor

---

## Implementation Checklist

| File | Change |
|------|--------|
| `core/admin/ui/content-types/SchemaBuilder.tsx` | extend ContentField type |
| `core/admin/ui/content-types/schemaMapping.ts` | write/read layout meta |
| `core/admin/ui/content-types/FieldEditor.tsx` | add layout controls |
| `core/admin/ui/entries/EntryEditor.tsx` | dynamic tabs + sections |
| `core/admin/ui/entries/FieldRenderer.tsx` | compact display support |
| `tests/unit/ui/schema-mapping.test.ts` | layout meta round‑trip |
| `tests/unit/ui/field-editor-layout.test.tsx` | layout controls render |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test`

---

## Documentation Updates Required

Update:
- `_docs/CONTENT_FIELDS.md`
- `_docs/CONTENT_TYPES_SPEC.md`

---

## Changelog

Add `_docs/_CHANGELOG/<next>-YYYY-MM-DD-field-layout-grouping.md` and link TASK-048-07.
