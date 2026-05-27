# 985 - Product Compare contract truthfulness

Date: 2026-05-27
Version: Unreleased
Tasks: TASK-339, TASK-339-13

## Key Changes

- Synchronized the Product Compare widget contract to the richer sectioned
  Wizard, Visual, and Advanced editor UI that now ships in the admin.
- Moved Product Compare variant ownership into a widget-owned `Variant and
  structure` Visual section instead of leaving it in the shared wrapper.
- Added Hero-style read-only Advanced framing plus a contract summary while
  preserving preview refresh as a diagnostics-only action.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/product-compare-editor-wave.test.tsx tests/vitest/ui/product-compare-admin-preview.test.tsx tests/vitest/widgets/productCompare.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/widgets/editorContract.test.ts`
- Claude Playwright snapshot review returned `NO BLOCKERS`
