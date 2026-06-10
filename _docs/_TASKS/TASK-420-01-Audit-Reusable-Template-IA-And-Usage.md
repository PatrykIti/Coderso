# TASK-420-01: Audit Reusable Template IA And Usage
# FileName: TASK-420-01-Audit-Reusable-Template-IA-And-Usage.md

**Parent Task:** TASK-420
**Priority:** Medium
**Category:** Pages / Templates / Product IA
**Estimated Effort:** Medium
**Dependencies:** TASK-420
**Status:** ⏳ To Do

---

## Overview

Audit the existing reusable template IA before the Page Templates rewrite. The
output must identify every Advanced Widgets/widget-template route, cache key,
preview target, assistant surface, and source file that should be deleted or
replaced by the new Page Templates surface. The result is not a product choice
between legacy and Page Templates; Page Templates is the target.

---

## Implementation Pseudocode

```ts
function auditReusableTemplateUsage() {
  const obsoleteWidgetTemplateRoutes = scanAdminRoutes("widget-template");
  const previewContracts = scanPreviewTargets(["widget-template", "page-template", "page"]);
  const assistantSurfaces = scanAssistantActiveSurfaces();
  const runtimeReferences = scanRuntimeTemplateReferences();
  return {
    obsoleteWidgetTemplateRoutes,
    previewContracts,
    assistantSurfaces,
    runtimeReferences,
    removalChecklist: buildRemovalChecklist()
  };
}
```

Expected data flow:

- Inventory obsolete widget-template routes, preview routes, cache keys, revision
  flows, assistant actions, and template-section runtime references.
- Identify every place that assumes `WidgetBlock[]` so TASK-420-02/03 can
  delete or replace it for Page Templates.
- Identify Page v2 use cases that need reusable `sections[]` templates.
- Produce a concrete removal/replacement checklist and acceptance criteria for
  TASK-420-02.

Error handling:

- Treat unknown or mixed template contracts as blockers, not inputs.
- Record open product questions as explicit follow-up bullets instead of
  assuming an implementation path.

Regression-test shape:

- Add documentation or audit tests only when automated checks can prevent route
  or contract drift.
- No production rewrite runs in this audit leaf.
- Run read-only Claude drift audit with `--permission-mode plan --effort xhigh
  --tools Read,Grep,Bash`, no artificial budget in the prompt, and up to 25
  minutes of wait time. Do not send `.env` contents or secrets.

---

## Security Contract

- **Endpoint visibility:** no new endpoints.
- **Auth model:** no auth changes.
- **RBAC:** audit existing page/widget/template permissions only.
- **CSRF:** no writes.
- **Rate-limit bucket:** no route changes.
- **Validation:** document current Page v2 validation owners and obsolete
  `WidgetBlock[]` assumptions that must be removed from Page Templates.
- **Anti-abuse controls:** no production data mutation and no secret-bearing
  payload capture in audit evidence.

---

## Testing Requirements

- Targeted static/contract checks if route or cache maps are touched.
- Read-only Claude drift audit with repo path, HEAD, dirty-worktree context,
  task IDs, no-edit instruction, and severity-ordered file/line findings.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/PAGE_MODEL.md`
- TASK-420 acceptance notes.
