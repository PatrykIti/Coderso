# TASK-442: List Block Audit Remediation
# FileName: TASK-442_List_Block_Audit_Remediation.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-422
**Status:** 🚧 In Progress
**Started:** 2026-06-11

---

## Overview

Remediate the List-block findings from `_docs/AUDIT/list-2026-06-10.md`. A
populated list renders correctly. The audit observed live (2026-06-10) that a
freshly inserted default empty list turned into an empty page after save, but
at HEAD `ae9dcc44` (2026-06-11 drift audit) that drop is **not** reproducible
at the pure schema layer: an empirical bun round trip of a default empty list
(`items: []`, `ordered: false`) through `normalizePageDocumentV2ForWrite` →
`normalizeStoredPageDocumentV2ForRead` → `toPublishedPageDocumentV2` preserves
the section and block. The audited symptom therefore sits in the live editor
path — save/autosave payload, the stale-CSRF save-failure + cache-event
rehydration path (`PageEditor.tsx:1520-1554`), or the publish flow — or is
already fixed and needs fresh live reproduction at HEAD. Reproduction-first is
a hard gate: the persistence fix may only be written against the layer the
reproduction identifies. The catalog-wide all-insertable-types round-trip
guard (which includes `list` and passes today) is owned by TASK-449-02-L01;
this family owns the list-specific empty-state contract, the live-flow
reproduction, and the list editing surfaces. The block also inherits the
shared dedicated-control drift highlighted by the audit, including but not
limited to the `ordered` toggle path plus the remaining layout/style/background
and visibility control collapse owned through `TASK-421`.

---

## Sub-Tasks

- [x] TASK-442-01: Reproduction-first empty-list persistence and
      ordered-control contract.
- [ ] TASK-442-01-L01: Reproduce the empty-list drop in the live admin flow
      (or record it no longer reproduces at HEAD), preserve a freshly
      inserted list through save/publish, and adopt inline/dedicated controls
      for items and ordered state.
- [ ] TASK-442-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- List persistence/runtime coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if empty-state semantics are clarified
- `_docs/_TASKS/README.md`

---

## Progress Notes

TASK-442-01 (contract freeze + reproduction) is Done (2026-06-11); persistence pins landed and the shared dropper fix shipped via TASK-449-02. TASK-442-01-L01 surface adoption remains gated on TASK-421/TASK-422.
