# TASK-418-05: Nested Container And Slot Architecture
# FileName: TASK-418-05-Nested-Container-And-Slot-Architecture.md

**Parent Task:** TASK-418
**Priority:** High
**Category:** Pages / Document Model / Runtime / Admin UI
**Estimated Effort:** Very Large
**Dependencies:** TASK-418-02, TASK-418-03, TASK-418-04
**Status:** ✅ Done
**Started:** 2026-06-10
**Completed:** 2026-06-10

---

## Overview

Add controlled nesting through container-capable blocks with named slots. This
is the architectural answer to flexible services/pages without returning to
large specialized widgets. Sections stay top-level; nested composition happens
inside blocks such as container, columns, group, stack, tabs, accordion, or
card-like slot owners.

The first implementation slice freezes only `container`, `columns`, and `group`
as Page layout blocks. Other slot-owner examples remain future extensions until
a dedicated task adds their props, slot matrix, editor affordances, runtime
rendering, and tests.

---

## Security Contract

- **Endpoint visibility:** existing internal Pages writes; public rendering
  remains read-only.
- **Auth model:** existing admin session for writes; public reads unchanged.
- **RBAC:** existing Pages permissions.
- **CSRF:** existing admin write CSRF behavior.
- **Rate-limit bucket:** existing admin/public buckets.
- **Validation:** recursive blocks must enforce max depth, slot capability
  allowlists, strict unknown-field rejection, and safe normalization.
- **Anti-abuse controls:** prevent cycles and unbounded tree size; no public
  write endpoint.

---

## Sub-Tasks

- [x] TASK-418-05-L01: Recursive Page block contract and normalizer.
- [x] TASK-418-05-L02: Container blocks inserter and layers editing.
- [x] TASK-418-05-L03: Recursive runtime renderer and responsive cascade.

---

## Testing Requirements

- Vitest pure tests for recursive normalization, max depth, slot capabilities,
  path operations, and responsive cascade.
- Vitest UI tests for nested selection and slot insertion.
- Bun runtime tests for recursive public rendering.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md`
- `_docs/CMS_SPEC.md`

---

## Closeout Notes

- TASK-418-05 is complete: the Pages v2 document model supports bounded slots,
  the admin editor can author nested layout blocks through Layers/canvas paths,
  and public/preview runtime rendering now recurses through layout slots with
  nested responsive cascade.
- `container`, `columns`, and `group` are runtime-real insertable layout blocks
  but remain assistant-gated until TASK-418-06-L02 aligns nested active-surface
  paths and blueprint emission.
