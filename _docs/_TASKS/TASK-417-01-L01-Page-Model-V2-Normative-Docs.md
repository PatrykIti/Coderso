# TASK-417-01-L01: Page Model V2 Normative Docs
# FileName: TASK-417-01-L01-Page-Model-V2-Normative-Docs.md

**Parent Subtask:** TASK-417-01
**Priority:** High
**Category:** Pages / Documentation
**Estimated Effort:** Medium
**Dependencies:** TASK-417-01
**Status:** ✅ Done

---

## Overview

Promote the Pages v2 model from the UX redesign spec into the normative product
docs before implementation. The docs must state that Pages use
`schemaVersion: 2` and root `sections[]`; stored legacy `blocks[]` Pages reset
to an empty v2 document on admin read, revision snapshot, autosave snapshot,
no-payload publish, restore, duplicate, public render, and preview paths, while
fresh legacy admin/API writes are rejected because this is an intentional
clean-slate cutover.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** not applicable.
- **RBAC:** not applicable.
- **CSRF:** not applicable.
- **Rate-limit bucket:** not applicable.
- **Validation:** document the future strict reject-unknown v2 schema.
- **Anti-abuse controls:** not applicable.

---

## Sub-Tasks

- [x] Retitle `_docs/PAGE_MODEL.md` from v1-only to Pages v2.
- [x] Document root fields, sections, atomic blocks, responsive overrides,
  publication sanitization, and legacy reset policy.
- [x] State that `title` remains owned by the Page row/API payload and is not a
  field inside `data`.
- [x] Update `_docs/CMS_SPEC.md`, `_docs/CMS_API.md`, `_docs/PREVIEW_SPEC.md`,
  `_docs/ASSISTANT_SITE_BUILDER.md`, and `docs/develop/content-and-widgets.md`
  to point to the v2 contract.
- [x] Keep the redesign HTML/spec positioned as UX reference material.

---

## Implementation Pseudocode

```json
{
  "schemaVersion": 2,
  "seo": {},
  "settings": {},
  "sections": [
    {
      "id": "sec_hero",
      "type": "hero",
      "name": "Hero",
      "variant": "split",
      "layout": {},
      "style": {},
      "spacing": {},
      "visibility": {},
      "responsive": { "tablet": {}, "mobile": {} },
      "blocks": [{ "id": "blk_heading", "type": "heading", "props": {} }]
    }
  ]
}
```

Expected data flow:

- Admin payload examples use `data.schemaVersion = 2` and `data.sections`.
- Admin payload examples keep `title` outside `data`.
- Preview docs state that preview reads v2 `currentData`.
- Public docs state that published pages read v2 `publishedData`.
- Legacy/versionless `blocks[]` examples are either removed from Pages docs or
  explicitly marked as retired v1 examples.

Error handling:

- Docs must name `page_document_invalid` and `page_document_unknown_field` as
  expected machine-readable API error families.
- Docs must name `legacyReset` as the out-of-band stored-read diagnostic for
  legacy/versionless Page data reset.

Regression-test shape:

- Documentation-only validation is `git diff --check`.
- The next task-contract audit must verify that no source-of-truth doc still
  presents `blocks[]` as the active Pages model.

---

## Testing Requirements

- `git diff --check`
- Read-only task drift audit after docs are updated.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/PREVIEW_SPEC.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `docs/develop/content-and-widgets.md`
