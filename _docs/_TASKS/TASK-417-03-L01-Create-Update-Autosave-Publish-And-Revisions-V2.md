# TASK-417-03-L01: Create Update Autosave Publish And Revisions V2
# FileName: TASK-417-03-L01-Create-Update-Autosave-Publish-And-Revisions-V2.md

**Parent Subtask:** TASK-417-03
**Priority:** High
**Category:** Pages / Services
**Estimated Effort:** Large
**Dependencies:** TASK-417-02-L03
**Status:** ⏳ To Do

---

## Overview

Move Pages service lifecycle operations to the v2 document owner while
preserving audit, cache invalidation, preview, revision retention, restore, and
navigation semantics.

---

## Security Contract

- **Endpoint visibility:** internal `/admin/api/pages*` service calls.
- **Auth model:** enforced by route layer.
- **RBAC:** enforced by route layer.
- **CSRF:** enforced by admin write middleware before routes.
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** route-validated data is normalized through the v2 owner before
  persistence.
- **Anti-abuse controls:** no public write endpoint is introduced.

---

## Sub-Tasks

- [ ] Replace `preparePageData` with a v2 normalizer path.
- [ ] Replace `toPublishedData` with v2 publication sanitization.
- [ ] Update revision snapshots to store v2 data.
- [ ] Preserve `settings.showInNav`, `settings.template`, collection links,
  revision retention, and cache invalidation.
- [ ] Update duplicate/restore to keep v2 shape.

---

## Implementation Pseudocode

```ts
function preparePageDataForWrite(data: PageData, template?: string): PageDocumentV2 {
  const withTemplate = applyTemplate(data, template);
  return normalizePageDocumentV2ForWrite(withTemplate);
}

function prepareStoredPageDataForRead(data: PageData): PageDocumentV2 {
  return normalizeStoredPageDocumentV2ForRead(data).document;
}

function toPublishedData(data: PageDocumentV2): PageDocumentV2 {
  return toPublishedPageDocumentV2(data);
}

async function publishPage(id: string, userId: string, data?: PageData) {
  const nextData = data
    ? preparePageDataForWrite(data)
    : prepareStoredPageDataForRead(page.currentData as PageData);
  await createRevisionTx(tx, id, buildRevisionSnapshot(page, { data: nextData }), userId, "publish");
  await tx.update(pages).set({
    currentData: nextData,
    publishedData: toPublishedData(nextData),
    status: "published",
  });
}
```

Expected data flow:

- Fresh payload writes pass through `preparePageDataForWrite`.
- Fresh payload writes reject legacy/versionless `blocks[]`.
- Stored existing data reads use the read adapter and may clean-slate reset
  legacy rows.
- Publish stores normalized current data and sanitized published data.
- Restore returns v2 `currentData` even when restoring an old versionless
  autosave/publish snapshot.

Error handling:

- Invalid v2 data throws `page_document_invalid`.
- Missing pages throw `page_not_found`.
- Revision restore/discard guards keep existing machine-readable errors.

Regression-test shape:

- Bun service/route tests cover create/update/autosave/publish/revisions,
  duplicate, restore, unpublish, navigation listing, cache invalidation, and
  old snapshot reset.

---

## Testing Requirements

- `set -a && source .env && set +a` before DB-backed tests when
  `DATABASE_URL` is available.
- Targeted Bun Pages service and route tests.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/PAGE_MODEL.md`
