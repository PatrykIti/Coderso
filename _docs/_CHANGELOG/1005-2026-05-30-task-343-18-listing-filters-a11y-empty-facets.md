# 1005 - TASK-343-18 Listing Filters a11y and empty facets

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343, TASK-343-18

## Key Changes

- Added stable accessible names for the Listing Filters public region and form,
  plus deterministic search input `id`/label/autocomplete semantics.
- Made empty checkbox/radio/taxonomy facets show author-facing runtime/data
  ownership guidance in the main canvas instead of rendering silently empty
  controls.
- Replaced technical `support-owned` editor copy with stable-key,
  read-only-binding, and safe-option-list wording while preserving match-value
  safety.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/listingFilters.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/listing-filters-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-18
  drift review: no blockers)
