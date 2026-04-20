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

Business value:
- Editors get one coherent admin screen, not one screen per fragment.
- Business-specific modules can add field groups without duplicate surfaces.
- Future presets can share admin UX composition.

## Sub-Tasks

- `TASK-190-06-01_Admin_Screen_Layout_Composer.md`
- `TASK-190-06-02_Admin_Bindings_Routes_and_Permission_Safety.md`

## Architecture

New owner files:

- `core/services/assistant/blueprints/blueprintAdminSurfaceComposer.ts`
- `core/services/assistant/blueprints/blueprintBindingComposer.ts`
- `tests/vitest/assistant/blueprint-admin-surface-composer.test.ts`

Touched existing files:

- `core/services/assistant/blueprints/catalogFamilyBlueprint.ts`
- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionExecutorService.ts`

## Acceptance Criteria

1. Admin screen sections merge by group key.
2. Field bindings reference merged schema fields.
3. Duplicate block ids are stable and deterministic.
4. Missing fields produce conflicts, not invalid bindings.
5. Existing custom-screen upsert behavior remains backward-compatible.

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
- Action plan schema tests.
- Bun executor tests for custom screen upsert with composed sections.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/_TASKS/README.md`
