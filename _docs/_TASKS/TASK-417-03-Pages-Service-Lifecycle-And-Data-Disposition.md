# TASK-417-03: Pages Service Lifecycle And Data Disposition
# FileName: TASK-417-03-Pages-Service-Lifecycle-And-Data-Disposition.md

**Parent Task:** TASK-417
**Priority:** High
**Category:** Pages / Services / Persistence
**Estimated Effort:** Large
**Dependencies:** TASK-417-02
**Status:** ✅ Done

---

## Overview

Cut Pages service persistence, autosave, publish, revisions, duplicate, and
navigation semantics to the v2 document model. Stored versionless/v1 Page rows
are intentionally reset to empty v2 documents when read by admin, snapshotted
for revisions/autosave, published without a fresh payload, restored, duplicated,
rendered publicly, or previewed because this CMS has no production users yet.
Fresh admin/API writes reject legacy/versionless payloads with
`page_document_invalid`.

---

## Security Contract

- **Endpoint visibility:** internal `/admin/api/pages*` service calls only.
- **Auth model:** session auth enforced by route layer.
- **RBAC:** `content:read`, `content:write`, and `content:publish` enforced by
  route layer.
- **CSRF:** admin write routes remain protected by the shared CSRF middleware.
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** services accept only data already validated by Pages schemas,
  then normalize through the v2 owner before persistence.
- **Anti-abuse controls:** no public write endpoint is introduced; preview token
  creation remains unchanged.

---

## Sub-Tasks

- [x] TASK-417-03-L01: Create, update, autosave, publish, and revisions v2.
- [x] TASK-417-03-L02: Existing Page rows clean-slate reset.

---

## Testing Requirements

- Bun DB-backed route/service tests for create/update/autosave/publish/restore,
  duplicate, navigation listing, and cache invalidation.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/PAGE_MODEL.md`
- `_docs/PREVIEW_SPEC.md`
