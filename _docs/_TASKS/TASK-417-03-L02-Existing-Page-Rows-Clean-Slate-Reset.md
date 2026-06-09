# TASK-417-03-L02: Existing Page Rows Clean Slate Reset
# FileName: TASK-417-03-L02-Existing-Page-Rows-Clean-Slate-Reset.md

**Parent Subtask:** TASK-417-03
**Priority:** High
**Category:** Pages / Migration Policy
**Estimated Effort:** Medium
**Dependencies:** TASK-417-03-L01
**Status:** ⏳ To Do

---

## Overview

Implement the agreed clean-slate data disposition: stored versionless or v1 Page
data is reset to an empty v2 document when read, restored, duplicated, or
rendered. Fresh admin/API writes reject legacy/versionless payloads with
`page_document_invalid`. No Pages v1 renderer remains after TASK-417 closes.

---

## Security Contract

- **Endpoint visibility:** internal Pages service and public read render paths.
- **Auth model:** admin routes remain session-authenticated; public rendering
  remains read-only.
- **RBAC:** admin route layer enforces existing permissions.
- **CSRF:** admin write routes remain CSRF protected.
- **Rate-limit bucket:** existing admin/public preview buckets.
- **Validation:** legacy/versionless data is not accepted as a write payload and
  is normalized to empty v2 only when reading existing stored rows.
- **Anti-abuse controls:** no public write endpoint is introduced.

---

## Sub-Tasks

- [ ] Add one owner helper for legacy reset diagnostics.
- [ ] Use it in services, runtime, revisions, duplicate, and restore paths.
- [ ] Ensure v1 `blocks[]` cannot be submitted as fresh admin write payload.
- [ ] Keep reset diagnostics out-of-band and never persist them in
  `currentData`, `publishedData`, revision snapshots, or public HTML.
- [ ] Add tests that existing rows become empty v2 documents without invoking a
  v1 renderer.

---

## Implementation Pseudocode

```ts
export function normalizeStoredPageDocumentV2ForRead(input: unknown): {
  document: PageDocumentV2;
  diagnostics: PageDocumentReadDiagnostics;
} {
  if (isLegacyOrVersionlessPageDocument(input)) {
    return {
      document: createDefaultPageDocumentV2(),
      diagnostics: { legacyReset: true },
    };
  }
  return { document: normalizePageDocumentV2(input), diagnostics: {} };
}

export function isLegacyOrVersionlessPageDocument(input: unknown): boolean {
  return isRecord(input) && (Array.isArray(input.blocks) || input.schemaVersion === 1);
}
```

Expected data flow:

- Runtime normalizes legacy stored data to empty v2.
- Admin editor loads empty v2 for old rows.
- Fresh write validation rejects v1 `blocks[]`.
- Diagnostics are logged or surfaced only as non-persisted metadata.
- All callers destructure `{ document, diagnostics }`; callers never treat the
  wrapper result as a Page document.

Error handling:

- Legacy reset is intentional and diagnostic, not a migration failure.
- Malformed v2 data remains invalid and should not be silently reset unless it
  is clearly legacy/versionless.
- Diagnostics must not be added as a top-level Page document field.

Regression-test shape:

- Bun tests seed `currentData`/`publishedData` with v1 `blocks[]`, then assert
  service reads, preview, public render, duplicate, and restore produce v2 empty
  documents.

---

## Testing Requirements

- `set -a && source .env && set +a` before DB-backed tests when
  `DATABASE_URL` is available.
- Targeted Bun Pages route/runtime tests.
- Targeted Vitest normalization tests.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/CMS_API.md`
