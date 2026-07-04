# TASK-438-01: Text Contract And Audit Freeze
# FileName: TASK-438-01-Text-Contract-And-Audit-Freeze.md

**Parent Task:** TASK-438
**Priority:** High
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-422, TASK-424, TASK-451-02
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Freeze the Text-block remediation contract from `_docs/AUDIT/text-2026-06-10.md`,
including inline-edit ownership, typography ownership, toolbar-label
verification, and truthful `plain`/`rich` behavior. Toolbar-label derivation is
owned by TASK-451-02-L01 (`resolveToolbarTargetLabel`); this family only
verifies the `Text tools` fallback.

The rich-text reproduction gate is closed: `pageTextFormats` is defined in
`core/services/pages/pageDocumentV2.ts:148`, normalization falls back to
`plain` at `pageDocumentV2.ts:2100-2102`, and the `case "text"` branch now
routes `format: "rich"` through sanitized rich output in
`core/services/pages/pageRendererV2.tsx:1424-1426` plus
`renderTextBlock` at `pageRendererV2.tsx:677-700`.

---

## Sub-Tasks

- [x] TASK-438-01-L01: Text inline-edit, typography, format truthfulness, and
      toolbar labeling.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Text runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
