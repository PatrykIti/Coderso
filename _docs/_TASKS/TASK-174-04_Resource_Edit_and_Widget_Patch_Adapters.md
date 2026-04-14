# TASK-174-04: Resource Edit and Widget Patch Adapters
# FileName: TASK-174-04_Resource_Edit_and_Widget_Patch_Adapters.md

**Priority:** High
**Category:** Assistant/Core + Editing
**Estimated Effort:** Large
**Dependencies:** TASK-174-02
**Status:** To Do

---

## Overview

Expand `LLM Guide` from setup-only mutations into user-requested edits of existing resources.

The assistant should be able to update pages, widgets, widget template blocks, custom screens, entries, forms, listings, menus, and SEO metadata when the target is resolved from active context/resource catalog and the mutation goes through typed actions.

## Sub-Tasks

- `TASK-174-04-01_Page_Metadata_and_Settings_Edit_Actions.md`
- `TASK-174-04-02_Page_Widget_Block_Patch_Actions.md`
- `TASK-174-04-03_Widget_Template_Edit_Actions.md`
- `TASK-174-04-04_Custom_Screen_Edit_Actions.md`
- `TASK-174-04-05_Content_Form_Listing_Menu_SEO_Edit_Actions.md`

## Architecture

Initial edit action families:
- `page.update`: title/slug/status/settings-level edits,
- `page.widget.patch`: expand beyond top-level upsert to selected block data patches and safe delete/reorder where supported,
- `widget-template.update`: metadata/status/settings/block tree updates,
- `widget-template.block.patch`: selected block data patch inside a reusable template,
- `custom-screen.update`: metadata/status/sidebar config/block/binding updates,
- `custom-screen.widget.patch`: selected screen block data patch,
- `entry.update`: schema-known field edits,
- `form.update`: metadata/settings/status edits,
- `listing-query.update`: bounded query/filter/sort updates,
- `listing-template.update`: card/layout/config edits,
- `menu.item.update`: selected menu item changes,
- `seo.document.update`: SEO field edits.

## Progress Notes

- 2026-04-14: Completed `TASK-174-04-01`; `page.update` edits active page metadata/settings while preserving unrelated page data.

Patch rules:
- schema-first and reject unknown fields,
- patch one targeted block/resource at a time unless the user explicitly asks for batch changes,
- preserve unrelated data,
- load current state server-side before preview/execution,
- show before/after summaries in dry-run,
- block unsupported widget types or unknown config paths.

## Pseudocode

```ts
const target = resolveOperationTarget({ prompt, activeContext, catalog });
const patch = buildTypedPatch({ target, requestedChange });

return {
  type: target.actionType,
  input: {
    id: target.id,
    expectedFingerprint: target.fingerprint,
    patch,
  },
};
```

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionExecutorService.ts`
- page, widget template, custom screen, entry, form, listing, menu, SEO domain services as required
- `tests/vitest/assistant/*`
- `tests/unit/assistant/*`

## Security Contract

- Visibility: internal execute only through assistant action execute flow.
- Auth model: existing admin session.
- RBAC: execute requires each resource family's write permission.
- CSRF: execute endpoint remains CSRF-protected.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: strict edit schemas reject unknown fields and unknown config paths.
- Anti-abuse:
  - no public write endpoint,
  - no arbitrary code execution,
  - no blind string replacement across whole JSON trees,
  - target must be resolved from active context/resource catalog.
- Idempotency: execute requires `idempotencyKey`.
- Secret handling: editor snapshots and provider packages must be redacted.

## Testing Requirements

- Vitest:
  - pure patch builders,
  - schema rejection,
  - active context target resolution.
- Bun:
  - page/widget/custom-screen/template edit adapters,
  - route permission checks,
  - idempotency replay/conflict.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion.

## Acceptance Criteria

1. Assistant can edit supported user-created and assistant-created resources through typed reviewed actions.
2. Page canvas and widget template patches preserve unrelated blocks/config.
3. Unsupported widget/config paths return `needs_input` or conflicts rather than applying broad rewrites.
4. All edits remain RBAC/CSRF/idempotency/audit covered.
