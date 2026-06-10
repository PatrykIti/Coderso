# TASK-420-02: Page Template Storage Preview And Migration Contract
# FileName: TASK-420-02-Page-Template-Storage-Preview-And-Migration-Contract.md

**Parent Task:** TASK-420
**Priority:** Medium
**Category:** Pages / Templates / Contracts
**Estimated Effort:** Large
**Dependencies:** TASK-420-01
**Status:** ⏳ To Do

---

## Overview

Design the concrete storage, preview, validation, migration, and rollback
contract for Page Templates if TASK-420-01 confirms that a Page v2 reusable
template surface is needed.

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
  const migration = defineMigrationPlan({
    preserveLegacyWidgetTemplates: true,
    rollback: "non-destructive"
  });
  return { storage, preview, migration };
}
```

Expected data flow:

- Page-template documents, if introduced, use Page v2 validation and store
  `sections[]`, not `WidgetBlock[]`.
- Existing widget-template rows remain readable/editable through the legacy
  surface.
- Preview tokens and runtime rendering must make the target type and document
  contract explicit.
- Migration plans must be additive first, with rollback and no mixed-contract
  rows.

Error handling:

- Reject attempts to store `sections[]` in widget-template rows.
- Reject attempts to preview legacy `WidgetBlock[]` templates through Page v2
  preview routes.
- Fail closed when Page-template documents contain unsupported Page blocks or
  unresolved data-bound blocks.
- Specify where `pageTemplateBoundary` guards must be wired at legacy surface
  entry points so widget-template, custom-screen, and detail-page runtimes cannot
  accidentally receive Page v2 `sections[]` once migration code exists.

Regression-test shape:

- Schema tests for strict Page-template payloads and unknown field rejection.
- Preview route tests for target-type separation and token validation.
- Migration tests for legacy preservation and rollback.
- Boundary tests proving legacy runtime entry points reject Page v2 documents
  once the contract introduces migration-time enforcement.
- Run read-only Claude drift audits with `--permission-mode plan --effort xhigh
  --tools Read,Grep,Bash`, no artificial budget in prompts, and up to 25 minutes
  of wait time per pass. Do not send `.env` contents or secrets.

---

## Security Contract

- **Endpoint visibility:** internal admin writes and token-gated previews only.
- **Auth model:** existing admin session for writes; preview tokens for previews.
- **RBAC:** map existing page/widget/template permissions explicitly before
  route exposure.
- **CSRF:** admin writes require existing CSRF behavior.
- **Rate-limit bucket:** existing admin and preview buckets unless a new stricter
  bucket is specified.
- **Validation:** Page-template payloads must use Page v2 schemas with strict
  reject-unknown behavior; legacy widget templates keep widget schemas.
- **Anti-abuse controls:** no mixed-contract rendering, no public writes, token
  redaction in preview labels/logs, and no secret settings in browser cache.

---

## Testing Requirements

- Vitest schema/service contract tests for pure Page-template helpers.
- Bun route/preview tests for runtime target behavior if routes are introduced.
- Migration/rollback tests for data preservation.
- Read-only Claude drift audits before and after contract changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/WIDGETS.md`
- `_docs/CMS_API.md` if routes are introduced.
- `_docs/PREVIEW_SPEC.md` if preview target types change.
