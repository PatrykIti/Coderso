# 959 - Listing Filters editor drift cleanup

Date: 2026-05-25
Version: Unreleased
Tasks: TASK-336-19

## Key Changes

### Widgets

- Cleaned the `listing-filters` Wizard / Visual / Advanced contract after the
  TASK-336-19 re-audit.
- Removed raw facet ID, field path, option value, parent value, sort value, CSS
  token, and runtime JSON payload authoring from ordinary widget editing.
- Replaced Wizard field and sort-field typing with selected listing-query field
  pickers and generated sort keys from field/direction.
- Kept option match values and taxonomy hierarchy keys support-owned until
  runtime metrics can provide safe suggestions.
- Preserved legacy support-owned custom field bindings until an author
  intentionally replaces them with a safe listing-query field.
- Converted Visual surface colors to swatch-only controls and replaced Advanced
  payload output with human source/runtime/metric summaries.

### QA

- Updated Listing Filters editor-wave and widget contract coverage for
  support-owned values, field pickers, swatch-only colors, read-only Advanced,
  and no raw JSON payload.
- Refreshed strict Listing Filters Playwright evidence with zero admin
  failures, public failures, fixture gaps, or metadata gaps.
- Added a focused Playwright probe for post-setup `Run setup again` Wizard to
  prove no raw technical inputs and no writable support-owned option/value
  paths.
- Verified with `bun run test:vitest -- tests/vitest/ui/listing-filters-editor-wave.test.tsx tests/vitest/widgets/listingFilters.test.tsx tests/vitest/widgets/editorContract.test.ts tests/vitest/widgets/listingRuntimeScript.test.ts`.
- Claude read-only UX review found no high blockers; the two medium findings
  were fixed before this entry was finalized.

### Docs

- Updated Listing Filters widget docs, TASK-336-19 status notes, the shared
  widget contract notes, and the Playwright targeted-rerun index.
