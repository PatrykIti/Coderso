# 1297 - TASK-575 Commerce Rename Variant Attribute Collision Guard

**Date:** 2026-08-18
**Version:** Unreleased
**Tasks:** TASK-575

## Key Changes

### Commerce
- `commerceEditorModel.ts` gains `validateRenameVariantAttributeKey`: a rename
  to a key that already exists (after trim, excluding the original key) is
  rejected with `attribute_key_collision` before any state mutation.
- The editor surfaces the collision as an inline alert (light and dark mode)
  and keeps the previous attribute list untouched; a pure trim of a key does
  not produce a false collision, and a unique rename preserves the attribute
  values.

## Validation
- `bun --cwd core lint` + `lint:types` green; commerce editor model tests
  (collision reject, trim no-false-collision, unique rename preserves
  values) green.
- Runtime smoke (`wf575smoke`): draft product with color=red, size=L; rename
  color -> size rejected inline with "Attribute key \"size\" already
  exists." and no state change; unique rename color -> farba preserves
  values; alert readable in dark mode. 0 console errors. Screenshots in
  `_docs/_workflows/_smoke/evidence/task-575/wf575smoke/`.
