# TASK-439-01: Button Contract And Audit Freeze
# FileName: TASK-439-01-Button-Contract-And-Audit-Freeze.md

**Parent Task:** TASK-439
**Priority:** High
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-422, TASK-424
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Freeze the Button-block remediation contract from
`_docs/AUDIT/button-2026-06-10.md`, especially the shared label-edit path and
truthful runtime behavior for variant, size, and target. The accent scope is
cited from `_docs/AUDIT/_cross-parity-2026-06-10.md` (Public runtime note) and
`_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md` §3.8 — not from the button audit,
which has no accent finding. This family owns fixing the accent application so
the button visibly consumes `--coderso-section-accent` (emitted from
`section.style.accent` at `core/services/pages/pageRendererV2.tsx:255-268`,
consumed by the button branch at `pageRendererV2.tsx:1427-1448`) on the
published front; the audit observed computed slate/transparent at accent
`#00ff00` before closure. TASK-426 (Hero) delegates the accent->button binding
fix to this family and only re-verifies the hero-side flow afterwards.

---

## Sub-Tasks

- [x] TASK-439-01-L01: Button label, runtime truthfulness, and dedicated
      controls.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Button runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if Button semantics change
