# TASK-420-02: Page Template Storage Preview And Replacement Contract
# FileName: TASK-420-02-Page-Template-Storage-Preview-And-Replacement-Contract.md

**Parent Task:** TASK-420
**Priority:** Medium
**Category:** Pages / Templates / Contracts
**Estimated Effort:** Large
**Dependencies:** TASK-420-01
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-11

---

## Overview

Design the concrete storage, preview, validation, route, and deletion contract
for the Page Templates rewrite. Page Templates is the target surface and must be
Page v2-only. Legacy widget-template storage/routes/UI are obsolete in this
path and must be removed or rejected, not preserved.

---

## Implementation Pseudocode

```ts
function designPageTemplateContract(recommendation) {
  const storage = defineStorageModel({
    documentContract: "page-v2-section-block-contract",
    noMixedWidgetBlocks: true
  });
  const preview = definePreviewRoute({
    targetType: "page-template",
    tokenGated: true
  });
  const deletion = defineObsoleteSurfaceDeletion({
    removeWidgetTemplateRoutes: true,
    removeWidgetTemplateEditor: true,
    rejectWidgetBlockPayloads: true
  });
  return { storage, preview, deletion };
}
```

Expected data flow:

- Page-template documents use Page v2 validation and store `sections[]`, not
  `WidgetBlock[]`.
- Existing widget-template rows/routes/UI are not retained for this product
  surface.
- Preview tokens and runtime rendering must make the target type and document
  contract explicit.
- Replacement plans must specify the deleted route/file families and the new
  Page Templates route/file families.

Error handling:

- Reject attempts to store `sections[]` in widget-template rows.
- Reject attempts to preview `WidgetBlock[]` templates through Page Templates
  preview routes.
- Fail closed when Page-template documents contain unsupported Page blocks or
  unresolved data-bound blocks.
- Specify where obsolete route handlers/components are deleted and where
  Page-template validation rejects non-Page v2 payloads.

Regression-test shape:

- Schema tests for strict Page-template payloads and unknown field rejection.
- Preview route tests for target-type separation and token validation.
- Replacement tests proving obsolete widget-template entry points are gone or
  return explicit retired/not-found responses.
- Boundary tests proving Page Templates reject `WidgetBlock[]`.
- Run read-only Claude drift audits with `--permission-mode plan --effort xhigh
  --tools Read,Grep,Bash`, no artificial budget in prompts, and up to 25 minutes
  of wait time per pass. Do not send `.env` contents or secrets.

---

## Security Contract

- **Endpoint visibility:** internal admin writes and token-gated previews only.
- **Auth model:** existing admin session for writes; preview tokens for previews.
- **RBAC:** define explicit Page Templates permissions or map to existing page
  permissions before route exposure.
- **CSRF:** admin writes require existing CSRF behavior.
- **Rate-limit bucket:** existing admin and preview buckets unless a new stricter
  bucket is specified.
- **Validation:** Page-template payloads must use Page v2 schemas with strict
  reject-unknown behavior; `WidgetBlock[]` payloads are rejected.
- **Anti-abuse controls:** no mixed-contract rendering, no public writes, token
  redaction in preview labels/logs, and no secret settings in browser cache.

---

## Testing Requirements

- Vitest schema/service contract tests for pure Page-template helpers.
- Bun route/preview tests for runtime target behavior if routes are introduced.
- Replacement/deletion tests for obsolete route and UI removal.
- Read-only Claude drift audits before and after contract changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/WIDGETS.md`
- `_docs/CMS_API.md` if routes are introduced.
- `_docs/PREVIEW_SPEC.md` if preview target types change.

---

## Completion Notes

Completed 2026-06-11: frozen contract recorded in _docs/PAGE_MODEL.md ("Page Templates (Reusable Page v2 Templates) - TASK-420-02 Frozen Contract"); claims verified line-by-line against landed owners; determinism gaps fixed in the docs.
