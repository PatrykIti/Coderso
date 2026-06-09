# TASK-417-02: Pages V2 Document Domain And Schema
# FileName: TASK-417-02-Pages-V2-Document-Domain-And-Schema.md

**Parent Task:** TASK-417
**Priority:** High
**Category:** Pages / Domain / Validation
**Estimated Effort:** Large
**Dependencies:** TASK-417-01
**Status:** ⏳ To Do

---

## Overview

Create the Pages-owned v2 document contract instead of reusing `WidgetBlock`.
The module must be Bun-free and own schema, defaults, atomic block definitions,
normalization, responsive cascade merge, and machine-readable errors.

---

## Security Contract

- **Endpoint visibility:** affects internal `/admin/api/pages*` payload
  validation through owned schemas, but this child does not register routes.
- **Auth model:** inherited from Pages routes in TASK-417-03.
- **RBAC:** inherited from Pages routes in TASK-417-03.
- **CSRF:** inherited from Pages routes in TASK-417-03.
- **Rate-limit bucket:** existing admin bucket through route callers.
- **Validation:** v2 schema rejects unknown root, section, block, props, and
  responsive override fields.
- **Anti-abuse controls:** no public write endpoint is introduced.

---

## Sub-Tasks

- [ ] TASK-417-02-L01: Document types, defaults, and atomic catalog.
- [ ] TASK-417-02-L02: Normalization, responsive cascade, and legacy reset.
- [ ] TASK-417-02-L03: Admin API validation and Page error mapping.

---

## Testing Requirements

- Targeted Vitest tests for Bun-free v2 schema, defaults, normalizers, cascade
  merge, reset adapter, and error codes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/CMS_API.md`
