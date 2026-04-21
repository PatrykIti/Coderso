# TASK-190-06: Admin Surface Composer
# FileName: TASK-190-06_Admin_Surface_Composer.md

**Priority:** High
**Category:** Assistant/Core + Admin UX + Custom Screens
**Estimated Effort:** Large
**Dependencies:** TASK-190-03, TASK-190-04
**Status:** To Do

---

## Overview

Build an admin surface composer for custom screens and record review layouts.
The composer should combine fields contributed by multiple capabilities into a
stable editor-friendly admin screen.

This slice must reuse the current `Coderso/Screens` contract rather than create
an assistant-only variant of admin screens. Composed admin surfaces still land
in the existing custom-screen model: screen-only widgets come from
`custom-screen-builder`, bindings follow the current shared binding contract,
and derived screen mode/capabilities remain owned by the current
`resolveCustomScreenCapabilities(...)` helper.

Business value:
- Editors get one coherent admin screen, not one screen per fragment.
- Business-specific modules can add field groups without duplicate surfaces.
- Future presets can share admin UX composition.
- Collection authors get one workspace that ties together canonical collection
  resources plus linked secondary modules instead of a second parallel workflow
  for hybrid outcomes.

## Sub-Tasks

- `TASK-190-06-01_Admin_Screen_Layout_Composer.md`
- `TASK-190-06-02_Admin_Bindings_Routes_and_Permission_Safety.md`
- `TASK-190-06-03_Collection_Workspace_and_Template_Editor.md`

## Architecture

New owner files:

- `core/services/assistant/blueprints/blueprintAdminSurfaceComposer.ts`
- `core/services/assistant/blueprints/blueprintBindingComposer.ts`
- `core/admin/ui/collections/CollectionWorkspacePage.tsx`
- `core/admin/ui/collections/DetailTemplateEditorPage.tsx`
- `tests/vitest/assistant/blueprint-admin-surface-composer.test.ts`
- `tests/vitest/ui/collection-workspace.test.tsx`

Touched existing files:

- `core/services/assistant/blueprints/catalogFamilyBlueprint.ts`
- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/admin/ui/assistant/useAssistantAdminContext.ts`
- `core/services/assistant/activeSurfaceHydration.ts`
- `core/server/validation/assistantActionSchemas.ts`
- `core/services/customScreens/capabilities.ts`
- `core/admin/ui/widgets/registry.ts`
- `core/admin/utils/adminPaths.ts`
- `core/admin/ui/navigation/sidebarConfig.ts`

## Acceptance Criteria

1. Admin screen sections merge by group key.
2. Field bindings reference merged schema fields.
3. Duplicate block ids are stable and deterministic.
4. Missing fields produce conflicts, not invalid bindings.
5. Existing custom-screen upsert behavior remains backward-compatible.
6. Collection workspace links or embeds the existing editors for fields,
   entries, canonical list page, canonical detail template, canonical
   filters/cards, forms, admin screen, SEO/routes, preview, and any linked
   secondary resources.
7. Detail template editing reuses the Page Builder shell instead of creating a
   second incompatible editor stack.
8. Composed admin screens use the current `custom-screen-builder` widget surface
   plus shared layout primitives already allowed there; they do not bypass
   current surface scoping.
9. The resulting composed screen still yields a valid derived mode/capability
   state through the current custom-screen capability helper instead of a new
   parallel mode heuristic.
10. If collection workspace becomes assistant-visible for follow-up prompts, it
    extends the current admin-context / `activeSurface` seams rather than a new
    route-to-surface workflow.
11. Detail Template editing, if assistant-visible, uses the same technical
    `detail-page` resource kind as action/policy/catalog slices instead of
    inventing a second `detail-template` transport type.

## Security Contract

- Visibility: internal admin planning only.
- Auth model: existing assistant session.
- RBAC: custom screen writes require current content/custom screen permissions.
- CSRF: unchanged.
- Rate-limit bucket: existing assistant bucket.
- Reject-unknown validation: custom screen blocks and bindings pass strict schema.
- Anti-abuse: bindings cannot expose raw entry secret values.
- Secret handling: secret-like fields are redacted or excluded.

## Testing Requirements

- Vitest composer unit tests.
- Vitest collection workspace and detail template editor UI tests.
- Vitest assistant admin-context tests when workspace/detail-page surface
  integration changes.
- Action plan schema tests.
- Bun executor tests for custom screen upsert with composed sections.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/_TASKS/README.md`
