# TASK-174-05: Widget Template and Page Canvas Context Bridge
# FileName: TASK-174-05_Widget_Template_and_Page_Canvas_Context_Bridge.md

**Priority:** High
**Category:** Assistant/Core + Widgets + Pages
**Estimated Effort:** Large
**Dependencies:** TASK-174-02, TASK-174-04
**Status:** To Do

---

## Overview

Allow the assistant to inspect and reason about widget templates referenced by page canvas blocks before planning edits.

When a page contains a template-backed block such as `template-section`, the assistant should be able to load the referenced widget template details server-side, summarize available nested widgets/config, and then plan a safe typed edit to either the page block instance or the reusable template, depending on user intent.

## Sub-Tasks

- `TASK-174-05-01_Template_Section_Reference_Inspection.md`
- `TASK-174-05-02_Page_Instance_vs_Template_Target_Resolution.md`

## Architecture

The assistant needs a "context bridge":
- page canvas -> template-section block -> widget template id,
- widget template id -> template record/details -> nested blocks summary,
- selected block -> config schema/known editor surface when available,
- operation target:
  - page block instance only,
  - reusable widget template,
  - custom screen widget block.

Questions to ask when ambiguous:
- "Should I change only this page instance or the reusable template?"
- "Which block in the template should I edit?"
- "Should this affect every page that uses the template?"

## Pseudocode

```ts
const page = await loadPage(activePageId);
const templateRefs = findTemplateSectionRefs(page.currentData.blocks);
const templates = await loadWidgetTemplates(templateRefs);

return summarizeOperationContext({ page, templateRefs, templates });
```

## Files to Change

- `core/services/assistant/adminContextCatalogs.ts`
- `core/services/assistant/adminContextCatalogNormalizer.ts`
- `core/services/assistant/providerPlanningContext.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/widgets/widgetTemplateService.ts`
- `core/admin/ui/pages/PageEditor.tsx`
- `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx`
- `tests/vitest/assistant/*`
- `tests/unit/assistant/*`

## Security Contract

- Visibility: internal planning context only.
- Auth model: existing admin session.
- RBAC: loading page/template details requires existing `content:read` / `widgets:read` permissions.
- CSRF: plan route remains POST + CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: context bridge payload rejects unknown fields.
- Anti-abuse:
  - no public write endpoint,
  - template inspection is read-only until a typed action is reviewed/executed,
  - target ids are rehydrated server-side.
- Idempotency: not applicable for inspection; execute actions remain idempotent.
- Secret handling: template/page block summaries are redacted and bounded.

## Testing Requirements

- Vitest:
  - template-section reference extraction,
  - nested template summary redaction,
  - ambiguity prompts for page instance vs reusable template.
- Bun:
  - service-level template detail hydration if DB/domain service is used.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion.

## Acceptance Criteria

1. Assistant can inspect page canvas blocks and referenced widget templates from active context.
2. Assistant asks whether to edit the page instance or the reusable template when the prompt is ambiguous.
3. Template inspection remains read-only and redacted until reviewed typed execution.
