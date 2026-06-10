# TASK-420: Page Templates Surface Migration
# FileName: TASK-420_Page_Templates_Surface_Migration.md

**Priority:** Medium
**Category:** Pages / Templates / Widgets
**Estimated Effort:** Large
**Dependencies:** TASK-418-06-L03
**Status:** ⏳ To Do

---

## Overview

Evaluate and implement the product migration from the legacy Advanced Widgets
template editor to a dedicated Page Templates surface if reusable Page section
and Page shell templates should replace widget-template editing. This task is a
follow-up created by TASK-418-06-L03 so TASK-418 can freeze the current
boundary without silently expanding into an editor migration.

Current frozen boundary:

- Public Pages use the Page v2 `sections[]` / `PageBlockV2` contract.
- Widget templates, custom screens, and detail pages keep the legacy
  `WidgetBlock[]` contract.
- Advanced Widgets remains the reusable widget-template editor until this task
  explicitly changes that product surface.

---

## Sub-Tasks

- [ ] TASK-420-01: Audit reusable template IA and current usage.
- [ ] TASK-420-02: Design Page-template storage preview and migration contract.
- [ ] TASK-420-03: Implement Page Templates admin migration closure.

---

## Implementation Pseudocode

```ts
function planPageTemplatesSurfaceMigration(currentAdvancedWidgetsSurface) {
  const reusableTemplateNeeds = auditReusableTemplateUseCases();
  const migrationShape = chooseMigrationShape({
    keepWidgetTemplates: true,
    addPageTemplates: reusableTemplateNeeds.requiresPageSections
  });
  return {
    routes: buildAdminRoutePlan(migrationShape),
    dataContracts: buildStorageAndPreviewContract(migrationShape),
    migrationSteps: buildNonDestructiveMigrationSteps(migrationShape)
  };
}

function migrateReusableTemplateIfApproved(template) {
  if (template.contract === "legacy-widget-block-contract") {
    return preserveLegacyWidgetTemplate(template);
  }
  return normalizePageTemplateDocument(template.document);
}
```

Expected data flow:

- Audit existing widget-template usage before changing routes, previews, or
  storage.
- Keep legacy `WidgetBlock[]` templates renderable and editable unless a
  migration step creates explicit Page-template replacements.
- New Page-template storage, if introduced, must use Page v2 schemas and not
  overload existing widget-template rows with mixed document contracts.
- Admin navigation, prefetch, cache keys, preview routes, revisions, assistant
  context, and release notes must name the chosen surface explicitly.

Error handling:

- Reject mixed contracts in one stored template row.
- Migration previews fail closed if a Page template references unsupported Page
  blocks or if a legacy widget template is accidentally passed into Page v2
  preview.
- Preserve legacy reads during phased migration; destructive conversion requires
  an explicit operator action and rollback plan.

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

- Existing widget-template create/update/preview/revision tests stay green.
- New Page-template tests cover strict Page v2 validation, preview rendering,
  route registration, cache invalidation, assistant surface context, and
  migration/rollback behavior.
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
  unknown fields; legacy widget templates must keep widget schema validation.
- **Anti-abuse controls:** no mixed-contract rendering, no public write endpoint,
  no secret-bearing settings in browser cache or preview payloads, and previews
  must preserve token redaction.

---

## Testing Requirements

- Existing widget-template Bun route/service/preview/revision suites.
- New Page-template Vitest/Bun suites for pure schema/UI and runtime route
  behavior if a Page-template surface is introduced.
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
