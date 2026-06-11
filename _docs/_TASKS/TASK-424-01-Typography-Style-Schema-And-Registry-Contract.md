# TASK-424-01: Typography Style Schema And Registry Contract
# FileName: TASK-424-01-Typography-Style-Schema-And-Registry-Contract.md

**Parent Task:** TASK-424
**Priority:** High
**Category:** Admin UI / Pages / Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-421
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-11

---

## Overview

Freeze the Page-owner contract for typography fields and their registry
descriptors before wiring any new inspector UI. This subtask owns the
schema/normalizer/defaults layer for `fontFamily`, `fontSize`, `fontWeight`,
`lineHeight`, `letterSpacing`, and the shared organization of text-style
controls across sections and text-bearing blocks. Per the audit's same-leaf
rule and the 4-layer rule (`_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md:175-182`)
it also owns the renderer mapping for those fields in
`core/services/pages/pageRendererV2.tsx` (`toPageBlockStyle`,
pageRendererV2.tsx:262), so the fields paint on both the editor canvas and the
published front instead of becoming dead controls.

---

## Sub-Tasks

- [x] TASK-424-01-L01: Add normalized typography fields and shared text-control
      descriptors to the Pages owner.

---

## Testing Requirements

- New Vitest coverage for typography style ownership and registry metadata.
- Renderer regression coverage for the typography style-to-CSS emission in
  `core/services/pages/pageRendererV2.tsx`.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/DESIGN_TOKENS.md`

---

## Completion Notes

Completed 2026-06-11: schema/normalizers/JSON-schema + token CSS value maps owned by pageDocumentV2; typography-capable block set frozen; legacy docs render byte-identical when fields are null.
