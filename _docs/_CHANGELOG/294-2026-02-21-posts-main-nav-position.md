# 294 - Posts moved to Main navigation

- **Date:** 2026-02-21
- **Version:** 0.1.294
- **Tasks:** TASK-055, TASK-054

## Key Changes

### Admin Navigation IA
- Moved `Posts` out of the `Coderso` sidebar group and placed it in `Main`, directly after `Pages`.
- Updated `core/admin/ui/navigation/sidebarConfig.ts` to expose `Posts` as a top-level item.
- Updated `core/admin/ui/navigation/codersoModules.ts` so `posts` no longer contributes a Coderso nav item.

### Posts UI Context
- Updated posts screens breadcrumbs from `Coderso / Posts` to `Content / Posts`.
- Updated posts screens active nav context to the new top-level posts nav intent.

### Test Coverage
- Updated and validated navigation tests:
  - `tests/unit/ui/coderso-modules.test.ts`
  - `tests/unit/ui/admin-nav.test.tsx`
  - posts editor/list smoke unit tests.

### Documentation Sync
- Updated `_docs/ARCHITECTURE.md` and `_docs/CODERSO_MODULES.md` to reflect that Posts is top-level and not part of the Coderso group navigation.

## Tests and Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/ui/coderso-modules.test.ts tests/unit/ui/admin-nav.test.tsx tests/unit/ui/posts-list.test.tsx tests/unit/ui/post-block-editor-shell.test.tsx tests/unit/ui/post-editor-page.test.tsx`

## Result
- Sidebar IA now matches content ownership expectations: `Posts` is treated as core editorial content, while `Coderso` remains focused on advanced custom-content modules.
