# TASK-174: LLM Guide Resource Operations and Active Context
# FileName: TASK-174_LLM_Guide_Resource_Operations_and_Active_Context.md

**Priority:** High
**Category:** Assistant/Core + Admin/UI + Resource Operations
**Estimated Effort:** Large
**Dependencies:** TASK-170, TASK-172, TASK-173
**Status:** In Progress (2026-04-12)

---

## Overview

Turn `LLM Guide` into a safe admin resource operator for user-requested edits and deletes across Coderso/admin resources.

This task is broader than assistant-created cleanup. The assistant must be able to help with resources created by the assistant and resources created manually by the user, as long as the target is resolved from trusted admin context or server-side resource catalogs and the mutation goes through typed actions, dry-run, review, permissions, CSRF, audit, and idempotency.

Product examples:
- "I am on Pages > Contact; change the CTA label in this page widget."
- "I am editing a page that uses a widget template; inspect that template and update the right widget config."
- "Delete the two Screens whose names start with House Projects."
- "Hide this form from public submissions."
- "Update this listing card layout."

## Sub-Tasks

- `TASK-174-01_Provenance_Undo_Manifest_and_Persistence.md`
- `TASK-174-02_Active_Admin_Surface_Context_and_Inspection.md`
  - `TASK-174-02-01_Active_Page_Canvas_Context.md`
  - `TASK-174-02-02_Active_Widget_Template_Context.md`
  - `TASK-174-02-03_Active_Custom_Screen_Context.md`
  - `TASK-174-02-04_Server_Side_Context_Hydration_and_Redaction.md`
- `TASK-174-03_Resource_Delete_Adapters.md`
  - `TASK-174-03-01_Custom_Screen_Delete_Action.md`
  - `TASK-174-03-02_Page_Delete_Action.md`
  - `TASK-174-03-03_Widget_Template_Delete_Action.md`
  - `TASK-174-03-04_Content_Type_and_Entry_Delete_Actions.md`
  - `TASK-174-03-05_Listing_Query_and_Template_Delete_Actions.md`
  - `TASK-174-03-06_Form_Delete_or_Archive_Action.md`
  - `TASK-174-03-07_Menu_and_SEO_Delete_Actions.md`
- `TASK-174-04_Resource_Edit_and_Widget_Patch_Adapters.md`
  - `TASK-174-04-01_Page_Metadata_and_Settings_Edit_Actions.md`
  - `TASK-174-04-02_Page_Widget_Block_Patch_Actions.md`
  - `TASK-174-04-03_Widget_Template_Edit_Actions.md`
  - `TASK-174-04-04_Custom_Screen_Edit_Actions.md`
  - `TASK-174-04-05_Content_Form_Listing_Menu_SEO_Edit_Actions.md`
- `TASK-174-05_Widget_Template_and_Page_Canvas_Context_Bridge.md`
  - `TASK-174-05-01_Template_Section_Reference_Inspection.md`
  - `TASK-174-05-02_Page_Instance_vs_Template_Target_Resolution.md`
- `TASK-174-06_Admin_Resource_Operations_Review_UI.md`
  - `TASK-174-06-01_Resource_Operation_Review_UI_States.md`
- `TASK-174-07_Security_Gates_Docs_and_Closure.md`

## Architecture

The system has one canonical path:

`admin context/resource catalog -> typed plan -> dry-run -> review -> execute -> audit/idempotency/provenance`

There must not be a separate legacy flow for solution kits, screens, pages, widgets, or templates.

Resource operation families:
- delete: remove or archive selected resources after a reviewable dry-run,
- edit: patch selected resources and widget configs,
- inspect: hydrate enough active-screen/page/template context for precise planning,
- undo: use provenance where available to reverse assistant-created/assistant-mutated work,
- rollback: delegate site-kit rollback to the existing solution-kit rollback service.

Target resolution rules:
- Active admin route and selected resource are advisory hints, not authorization.
- Server-side resource catalogs are the source of truth for target ids.
- Client-side canvas snapshots can describe current UI state but must be rehydrated/validated server-side before execution.
- Provider/client-supplied ids cannot bypass route/domain checks.
- Ambiguous matches return `needs_input`.

Active context requirements:
- On `Pages > :id`, assistant context must include page id, slug/title, current blocks summary, selected block id if available, and page template key.
- On `Widgets > Templates > :id`, context must include template id/name/status, block summary, and template settings summary.
- On pages containing `template-section` blocks, the assistant must be able to inspect the referenced widget template through server-side template catalog/details before editing nested widget config.
- On `Coderso > Screens`, context must include custom screen id/name/content type, blocks, bindings, mode/capabilities, and selected entry if applicable.
- All context must be bounded, redacted, deterministic, and safe for provider planning packages.

## Pseudocode

```ts
const context = await buildAssistantOperationContext({
  route,
  runtimeSnapshot,
  includeResourceCatalog: true,
  includeActiveSurface: true,
});

const plan = planResourceOperation({
  prompt,
  context,
});

const preview = await dryRunAssistantActionPlan({ plan });
await requireReview(preview);
await executeAssistantActionPlan({ plan, idempotencyKey, actorId });
```

## Files to Change

- `core/admin/ui/assistant/useAssistantAdminContext.ts`
- `core/admin/ui/pages/PageEditor.tsx`
- `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx`
- `core/admin/ui/custom-screens/*`
- `core/admin/services/assistantClient.ts`
- `core/services/assistant/adminContextTypes.ts`
- `core/services/assistant/adminContextService.ts`
- `core/services/assistant/adminContextCatalogs.ts`
- `core/services/assistant/adminContextCatalogNormalizer.ts`
- `core/services/assistant/providerPlanningContext.ts`
- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/services/assistant/actionExecutionStore.ts`
- `core/services/assistant/actionUndo*`
- relevant domain service modules for pages, widget templates, custom screens, content types, entries, listings, forms, menus, SEO, and site kits
- `core/server/routes/assistantRoutes.ts`

## Security Contract

- Visibility: internal-only admin endpoints under `/admin/api/assistant/*`.
- Auth model: existing admin session.
- RBAC:
  - plan/dry-run requires read permissions for the targeted resource family,
  - execute requires write/delete permissions for every mutated family,
  - publish/public-surface changes require publish or family-specific permissions where the existing domain contract requires them.
- CSRF: all POST plan/dry-run/execute/cleanup routes require admin CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation:
  - all action schemas reject unknown fields,
  - active context schemas reject unknown client fields,
  - server rehydrates target resources before execution.
- Anti-abuse:
  - no public write endpoint,
  - no autonomous mutation without review/confirm,
  - no arbitrary DB paths or arbitrary code execution,
  - ambiguous target matches return `needs_input`,
  - destructive operations must include public/data-loss warnings in dry-run.
- Idempotency:
  - every execute requires `idempotencyKey`,
  - replay/conflict remains actor/plan/hash scoped,
  - cleanup/undo operations must be replay-safe.
- Secret handling:
  - active context, canvas snapshots, template details, audit metadata, provider packages, and idempotency payloads must be redacted,
  - no form submissions, provider keys, API keys, cookies, CSRF tokens, access logs, or secret-like settings in browser cache/provider payloads.

## Implementation Order

1. Keep existing provenance persistence from `TASK-174-01`.
2. Add active admin surface context and server-side inspection for pages, custom screens, and widget templates.
3. Expand delete adapters beyond `custom-screen.delete`.
4. Expand edit/patch adapters for pages, page widgets, widget templates, custom screens, entries, forms, listings, menus, and SEO.
5. Add widget-template/page-canvas bridge for template-section inspection and nested widget edits.
6. Add/refresh admin review UI for edit/delete/cleanup operations.
7. Revalidate security/performance/docs and close the wave.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest:
  - active context builder and redaction,
  - planner target resolution,
  - schema rejection,
  - page/widget/template patch helpers,
  - admin review UI states.
- Bun:
  - route validation and per-action permissions,
  - executor adapters,
  - DB-backed idempotency and provenance,
  - security/performance gates for assistant operations.
- DB-backed tests must load env first:
  - `set -a && source .env && set +a && bun test ...`

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- relevant `docs/` assistant/admin corpus pages
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entries for completed leaves

## Acceptance Criteria

1. Assistant can safely plan, dry-run, review, and execute edits/deletes for supported resources created by either the assistant or the user.
2. Assistant can use active admin surface context to understand the current page/screen/template and its widget configuration before planning.
3. Assistant can inspect widget templates referenced by page/template-section blocks through server-side resource details before editing.
4. Destructive operations remain reviewable, idempotent, RBAC/CSRF-protected, audited, and conflict-aware.
5. No separate legacy operation path is introduced.

## Progress Notes

- 2026-04-12: Completed `TASK-174-01`; fresh assistant action executions now persist sanitized undo manifest items for later cleanup/operation planning.
- 2026-04-12: Completed `TASK-174-03-01`; custom screen delete requests can now produce executable reviewed `custom-screen.delete` plans when targets are resolved from server-side resource catalog context.
- 2026-04-13: Completed `TASK-174-02-01`; the assistant receives bounded active page canvas context from `PageEditor`.
- 2026-04-13: Completed `TASK-174-02-02`; the assistant receives bounded active widget template context from `WidgetTemplateEditorPage`.
- 2026-04-13: Completed `TASK-174-02-03`; the assistant receives bounded active custom screen context from custom screen builder/list/editor surfaces.
- 2026-04-13: Completed `TASK-174-02-04`; active surface context is server-hydrated before planning and included in redacted provider planning packages.
- 2026-04-13: Completed `TASK-174-03-02`; active page deletion is available as reviewed `page.delete`.
- 2026-04-13: Completed `TASK-174-03-03`; active widget template deletion is available as reviewed `widget-template.delete`.
- 2026-04-13: Completed `TASK-174-03-04`; active entry deletion and guarded content type deletion are available as reviewed typed actions.
- 2026-04-13: Completed `TASK-174-03-05`; listing query/template deletion is available as reviewed typed actions with page/widget-template reference conflict checks.
- 2026-04-14: Completed `TASK-174-03-06`; form delete/archive is available as reviewed typed actions with submission-retention protection.
- 2026-04-14: Completed `TASK-174-03-07`; menu item and SEO document deletion are available as reviewed typed actions.
- 2026-04-14: Completed `TASK-174-04-01`; active page metadata/settings updates are available as reviewed `page.update` typed actions.
- 2026-04-14: Completed `TASK-174-04-02`; selected page widget block data patching is available as reviewed `page.widget.patch` typed actions.
- 2026-04-14: Completed `TASK-174-04-03`; reusable widget template metadata/settings and selected block patching are available as reviewed typed actions.
- 2026-04-14: Completed `TASK-174-04-04`; custom screen metadata/sidebar/binding and selected block patching are available as reviewed typed actions.
