# 433. TASK-105 Listings Editor and Binding Branch Follow-Up

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-04

## Key Changes

### QA / Admin UI
- Expanded `ListingEditorPage` Vitest coverage for query-not-found handling and generic preview failure paths.
- Expanded `BindingEditor` Vitest coverage for condition reordering and blank fallback normalization.

### Validation
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/ui/listings-cluster-wave.test.tsx`
  - `tests/vitest/ui/listing-binding-editor.test.tsx`
- Targeted coverage re-check showed:
  - `ListingEditorPage.tsx` -> `89.79%` lines / `72.26%` branches
  - `BindingEditor.tsx` -> `94.02%` lines / `75.86%` branches
