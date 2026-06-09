# TASK-418-06-L03: Page Templates And Non Page Widget Boundaries
# FileName: TASK-418-06-L03-Page-Templates-And-Non-Page-Widget-Boundaries.md

**Parent Subtask:** TASK-418-06
**Priority:** High
**Category:** Pages / Templates / Widget Boundaries
**Estimated Effort:** Medium
**Dependencies:** TASK-418-05, TASK-418-06-L01
**Status:** ⏳ To Do

---

## Overview

Define how the new Pages v2 section/block contract flows into Page templates
without accidentally breaking non-Page widget-template, custom-screen, or
detail-page surfaces. This leaf does not migrate the Advanced Widgets section;
it freezes the boundary and prepares a follow-up task if Page Templates replace
the old widget-template editing surface.

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
    title: "Template Editor Page Templates Contract Migration",
    scope: "replace Advanced > Widgets page-template editing with Page Templates surface"
  };
}
```

Expected data flow:

- Public Pages use Page v2 templates and section/block documents.
- Non-Page widget surfaces keep legacy `WidgetBlock[]` until a dedicated
  migration task changes them.
- If Advanced Widgets UI needs a Page Templates replacement, create a separate
  task rather than expanding TASK-418 silently.

Error handling:

- Boundary tests fail if Page v2 blocks are sent to widget-template runtime or
  legacy widget blocks are sent to Page v2 runtime.
- Follow-up scope is documented when migration is intentionally deferred.

Regression-test shape:

- Page template preview consumes v2 documents.
- Widget-template/custom-screen/detail-page tests still pass on legacy widget
  block data.
- Follow-up task exists if the Advanced Widgets section must change.

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
- Follow-up task under `_docs/_TASKS/` if Page Templates migration is deferred.
