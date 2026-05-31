# 980 - Gallery Mosaic contract truthfulness

Date: 2026-05-27
Version: Unreleased
Tasks: TASK-339, TASK-339-08

## Key Changes

- Synchronized the Gallery Mosaic widget contract to the richer sectioned
  Wizard, Visual, and Advanced editor UI that now ships in the admin.
- Upgraded Gallery Mosaic Wizard into a real starter seed for layout and item
  count, while keeping title/configured-media context read-only before daily
  editing starts.
- Replaced the old mutating Advanced flow with Hero-style read-only runtime,
  style, accessibility, and contract diagnostics, and fixed shared field
  labeling so Gallery comboboxes/textboxes now follow the same accessibility
  pattern as Hero.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx tests/vitest/widgets/galleryMosaic.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/widgets/editorContract.test.ts tests/vitest/ui/entry-teaser-editor-wave.test.tsx tests/vitest/widgets/entryTeaser.test.tsx tests/vitest/ui/link-destination-field.test.tsx`
- Claude Playwright snapshot review returned `NO BLOCKERS`
