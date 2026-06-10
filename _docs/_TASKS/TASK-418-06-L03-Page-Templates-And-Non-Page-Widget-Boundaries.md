# TASK-418-06-L03: Page Templates And Non Page Widget Boundaries
# FileName: TASK-418-06-L03-Page-Templates-And-Non-Page-Widget-Boundaries.md

**Parent Subtask:** TASK-418-06
**Priority:** High
**Category:** Pages / Templates / Widget Boundaries
**Estimated Effort:** Medium
**Dependencies:** TASK-418-05, TASK-418-06-L01
**Status:** ✅ Done
**Started:** 2026-06-10
**Completed:** 2026-06-10

---

## Overview

Define how the new Pages v2 section/block contract flows into Page templates
without accidentally breaking non-Page widget-template, custom-screen, or
detail-page surfaces. This leaf does not rewrite the Advanced Widgets section;
it freezes the boundary and prepares TASK-420 to delete/replace the obsolete
widget-template editing surface with Page Templates.

---

## Implementation Pseudocode

```ts
function resolvePageTemplateInput(pageDocument) {
  return {
    kind: "page-v2",
    document: normalizePageDocumentRead(pageDocument),
    renderMode: "public-page"
  };
}

function assertNonPageWidgetBoundary(surface) {
  if (surface.kind === "widget-template" || surface.kind === "custom-screen" || surface.kind === "detail-page") {
    return "legacy-widget-block-contract";
  }
  return "page-v2-section-block-contract";
}

function createFollowupTaskIfNeeded() {
  return {
    title: "Page Templates Surface Rewrite",
    scope: "delete obsolete Advanced > Widgets page-template editing and build Page Templates"
  };
}
```

Expected data flow:

- Public Pages use Page v2 templates and section/block documents.
- Non-Page widget surfaces stay isolated from Page v2 Page Templates work.
- Advanced Widgets UI replacement/removal is TASK-420 scope rather than being
  silently expanded into TASK-418.

Error handling:

- Boundary tests fail if fresh/cross-surface Page v2 blocks are sent to
  widget-template runtime or legacy widget blocks are sent to Page v2 template
  inputs.
- Stored legacy Page rows keep the existing compatibility behavior from
  `_docs/PAGE_MODEL.md`: read/render paths non-destructively reset them to an
  empty v2 document instead of hydrating old widget-template blocks.
- Follow-up scope is documented when the Page Templates rewrite is intentionally
  deferred.

Regression-test shape:

- Page template preview consumes v2 documents.
- Widget-template/custom-screen/detail-page tests still pass on legacy widget
  block data.
- Follow-up task exists for deleting/replacing the Advanced Widgets
  widget-template path.

---

## Security Contract

- **Endpoint visibility:** existing internal template/widget admin endpoints and
  public Page reads only; no new public write endpoint.
- **Auth model:** existing admin session for admin template/widget surfaces.
- **RBAC:** existing permissions for content/widget/template surfaces.
- **CSRF:** existing admin write CSRF behavior.
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** Page templates use Page v2 validation; non-Page widget
  surfaces keep their existing widget schemas.
- **Anti-abuse controls:** no cross-surface secret leakage or weaker plugin route
  permissions.

---

## Testing Requirements

- Boundary regression tests for Page runtime vs widget-template/custom-screen/
  detail-page runtime.
- Targeted admin/template tests if template UI changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- Follow-up task under `_docs/_TASKS/` if Page Templates rewrite is deferred.

---

## Completion Notes

- Added `core/services/pages/pageTemplateBoundary.ts` as the Pages-owned helper
  for Page v2 template input and non-Page legacy widget surface contracts.
- `renderPublicPageV2RuntimeHtml` now resolves Page v2 template input through
  that helper while preserving the existing stored legacy Page row reset path.
- Added boundary tests for Page v2 template input, fresh legacy `blocks[]`
  rejection, non-Page `WidgetBlock[]` surfaces, and Page v2 documents rejected
  at widget-template/custom-screen/detail-page boundaries.
- Created follow-up `TASK-420` with physical child tasks for the Advanced
  Widgets/widget-template to Page Templates surface rewrite, so TASK-418 does
  not silently expand into a product/editor replacement.
- Local pre-implementation audit found and corrected one task-contract
  ambiguity: fresh cross-surface boundary failures are required, but stored
  legacy Page rows keep the documented non-destructive read/render reset
  behavior.
- Claude read-only drift audit ran with `--permission-mode plan --effort xhigh
  --tools Read,Grep,Bash` and a 1500-second command timeout. The first pass
  found a stale changelog next-number pointer and noted that obsolete-surface
  removal/replacement is TASK-420 scope; the pointer was fixed and that
  ownership was added to TASK-420-02/TASK-420-03 acceptance. The second pass
  reported no unresolved drift.

## Validation

- `bun run test:vitest -- tests/vitest/pages/page-template-boundary.test.ts tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/pages/page-document-v2.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/runtime/pages-runtime.test.ts tests/integration/routes/widgetTemplatePreview.test.ts tests/integration/runtime/detail-page-runtime-lite.test.ts`
- `bun run test:vitest -- tests/vitest/pages/page-template-boundary.test.ts tests/vitest/ui/custom-screens-page.test.tsx tests/vitest/ui/detail-template-editor.test.tsx tests/vitest/ui/useWidgetTemplates.test.tsx`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `git diff --check`
