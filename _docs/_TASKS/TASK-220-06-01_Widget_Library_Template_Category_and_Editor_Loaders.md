# TASK-220-06-01: Widget Library, Template Category, and Editor Loaders
# FileName: TASK-220-06-01_Widget_Library_Template_Category_and_Editor_Loaders.md

**Priority:** High
**Category:** Widgets + Admin Cache
**Estimated Effort:** Large
**Dependencies:** TASK-220-06, TASK-220-03-01
**Status:** In Progress (2026-04-27)

---

## Overview

Fix Widget template editor flows that still rely on mount effects for template
loading and category loading/defaulting. Shared widget list hook, library
selection, category drawer, and create dialog findings are owned by earlier
leaves and should be treated as dependencies, not primary ownership here.

## Finding Inventory

Primary findings owned by this leaf from the 2026-04-27 ESLint 9 / React Hooks Compiler baseline. Re-run TASK-220-01-01 before implementation if line numbers drift.

| File | Line | Rule | Current trigger | Fix direction |
|------|------|------|-----------------|---------------|
| core/admin/ui/widgets/WidgetTemplateEditorPage.tsx | 588 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void loadTemplate();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/widgets/WidgetTemplateEditorPage.tsx | 624 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refreshCategories({ force: true, background: true }).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/widgets/WidgetTemplateEditorPage.tsx | 636 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setCategory(templateCategories[0].name);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |

## Sub-Tasks

- [ ] Refactor template editor load/category refresh so effects do not
  synchronously set state.
- [ ] Move default category selection into initialization or reducer transitions.
- [ ] Preserve compatibility with the shared widget list/library behavior fixed
  by TASK-220-03-01 and TASK-220-03-02.

## Files to Change

Primary source ownership for this leaf:

- `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx`
- `tests/vitest/ui/widget-template*.test.tsx`
- `tests/vitest/admin/widgetTemplatesClient.test.ts`

Coordination note: `useWidgetTemplates.ts` belongs to TASK-220-03-01,
`WidgetLibraryPage.tsx` belongs to TASK-220-03-02,
`WidgetCreateDialog.tsx` belongs to TASK-220-04-01, and
`WidgetTemplateCategoryDrawer.tsx` belongs to TASK-220-04-02.

## Security Contract

- Visibility: internal Widgets admin UI.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: existing widget/template read/write permissions.
- CSRF: existing writes unchanged.
- Rate-limit bucket: existing admin read/write buckets.
- Reject-unknown validation: widget/template route schemas remain source of
  truth.
- Anti-abuse: template delete/duplicate/category flows must keep confirmations,
  conflict handling, and cache-bus invalidation.
- Secret handling: widget template cache must not include secrets.

## Pseudocode

```ts
const selectedCategory = resolveValidCategory(requestedCategory, categories);

// Keep requested user intent in state. Derive the valid category for render
// instead of repairing category state after categories load.
```

## Testing Requirements

- Widget template cache hydrates immediately when present.
- Template editor load/category refresh does not foreground flicker on cached
  data.
- Widget Library visible selection remains scoped to current rows.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if widget cache behavior
  changes.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Listed Widget files are free of React Hooks Compiler findings.
2. Widget template list/detail/category cache behavior remains unchanged or is
   documented if intentionally changed.
3. Existing Widget Library parity tests remain green.
