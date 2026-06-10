# TASK-420: Page Templates Surface Rewrite
# FileName: TASK-420_Page_Templates_Surface_Rewrite.md

**Priority:** Medium
**Category:** Pages / Templates
**Estimated Effort:** Large
**Dependencies:** TASK-418-06-L03
**Status:** ⏳ To Do

---

## Overview

Rewrite the old reusable template surface into a dedicated **Page Templates**
surface. Page Templates are reusable Page v2 templates built from `sections[]`
and `PageBlockV2` blocks, edited with a Page Editor-like authoring experience,
and inserted or applied to Pages. The legacy Advanced Widgets/widget-template
surface and its Page-template-facing code must be removed instead of kept. This
CMS has no active user data dependency for that surface, so the implementation
may delete old UI/routes/code and rebuild the feature correctly on Page v2
contracts.

Current frozen boundary:

- Public Pages use the Page v2 `sections[]` / `PageBlockV2` contract.
- Reusable Page templates must also use the Page v2 `sections[]` /
  `PageBlockV2` contract.
- The old Advanced Widgets/widget-template UI is not a fallback. Remove it from
  the Page Templates path and delete the corresponding obsolete code where this
  task owns the surface.
- No Page Templates route, editor, preview, assistant context, or public runtime
  may accept `WidgetBlock[]`.

---

## Sub-Tasks

- [ ] TASK-420-01: Audit reusable template IA and current usage.
- [ ] TASK-420-02: Design Page-template storage preview and replacement contract.
- [ ] TASK-420-03: Implement Page Templates admin rewrite closure.

---

## Implementation Pseudocode

```ts
function planPageTemplatesSurfaceRewrite(currentAdvancedWidgetsSurface) {
  const removalPlan = auditObsoleteWidgetTemplateSurface(currentAdvancedWidgetsSurface);
  const pageTemplatesShape = definePageTemplatesSurface({
    removeLegacyWidgetTemplateSurface: true,
    deleteObsoleteCode: true,
    documentContract: "page-v2",
    editorModel: "page-editor-v2"
  });
  return {
    routes: buildAdminRoutePlan(pageTemplatesShape),
    dataContracts: buildStorageAndPreviewContract(pageTemplatesShape),
    removalPlan
  };
}

function createPageTemplate(template) {
  return normalizePageTemplateDocument(template.document);
}
```

Expected data flow:

- Audit existing widget-template routes/code before removal so every deleted
  entry point has an intentional Page Templates replacement or is proven
  obsolete.
- Introduce a Page Templates admin surface that uses Page v2 schemas and a Page
  Editor-like section/block authoring workflow.
- Do not overload existing widget-template rows with mixed document contracts;
  Page Templates storage is Page v2-only.
- Remove the legacy widget-template editor from the user-facing path.
- Admin navigation, prefetch, cache keys, preview routes, revisions, assistant
  context, and release notes must name Page Templates explicitly.

Error handling:

- Reject mixed contracts in one stored template row.
- Page Template previews fail closed if a document references unsupported Page
  blocks or if a legacy widget template is accidentally passed into Page v2
  preview.
- Obsolete legacy route hits after removal return an explicit not-found or
  retired-surface error instead of silently rendering old editors.

Mandatory drift and smoke workflow:

- Run read-only Claude drift audits before implementation and before closure
  with no artificial token, cost, or task-budget constraints in the prompt.
- Invoke Claude with `--permission-mode plan --effort xhigh --tools Read,Grep,Bash`
  and wait up to 25 minutes for each pass, for example by wrapping the CLI in a
  1500-second command timeout.
- The audit prompt must include repo path, HEAD, dirty-worktree context, task
  IDs, no-edit instruction, and severity-ordered findings with concrete
  file/line references.
- Do not send secrets, raw `.env`, credentials, provider keys, sensitive logs,
  or unredacted user data to Claude.
- Browser validation must use the `playwright-cli` command, not MCP browser
  tooling.
- Start the dev server through the `coderso-dev-core-host` helper for browser
  validation.
- Load credentials and local runtime settings from `.env` before DB,
  settings-backed, server, or Playwright validation commands with
  `set -a && source .env && set +a`.

Regression-test shape:

- Existing widget-template create/update/preview/revision behavior must be
  removed or explicitly retired for the Page Templates path.
- New Page-template tests cover strict Page v2 validation, preview rendering,
  route registration, cache invalidation, assistant surface context, and
  replacement behavior.
- Admin navigation and route prefetch tests cover the final IA decision.

---

## Security Contract

- **Endpoint visibility:** internal admin endpoints only; public preview/read
  routes stay token-gated or published-read-only.
- **Auth model:** existing admin session for admin writes and preview token
  validation for previews.
- **RBAC:** existing widget/template/page permissions must be mapped before any
  new route family is exposed.
- **CSRF:** admin writes require the existing CSRF behavior.
- **Rate-limit bucket:** existing admin and preview buckets unless a new route
  family needs a stricter bucket.
- **Validation:** Page-template documents must use Page v2 validation and reject
  unknown fields; legacy widget-template payloads must be rejected by Page
  Templates routes.
- **Anti-abuse controls:** no mixed-contract rendering, no public write endpoint,
  no secret-bearing settings in browser cache or preview payloads, no legacy
  widget-template editor exposure on the Page Templates path, and previews must
  preserve token redaction.

---

## Testing Requirements

- Existing widget-template Bun route/service/preview/revision suites, updated or
  removed to prove the obsolete surface is gone from Page Templates.
- New Page-template Vitest/Bun suites for pure schema/UI and runtime route
  behavior.
- Admin route/prefetch/cache tests for navigation changes.
- Real browser smoke through `coderso-dev-core-host` plus `playwright-cli` for
  any admin route, preview route, or public runtime behavior changed by this
  task.
- Read-only Claude drift audits as described above, repeated until no
  unresolved drift remains or remaining items are split into explicit follow-up
  tasks with rationale.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/WIDGETS.md`
- `_docs/CMS_SPEC.md`
- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_SITE_BUILDER.md` if assistant surfaces change.
