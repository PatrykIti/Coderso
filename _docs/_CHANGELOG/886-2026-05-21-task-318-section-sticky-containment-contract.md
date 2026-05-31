# 886. TASK-318 section sticky containment contract

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-318

## Key Changes

### Shared section runtime

- `SectionBlock` no longer applies the sticky-blocking clip to the same wrapper
  that owns slotted child widgets.
- Decorative background, border, radius, and overlay clipping now render in an
  inset surface layer while the live child-content flow stays unclipped.

### Tests and docs

- Added focused shared proof in the Section Vitest suite and a consumer proof
  for sticky Navigation rendered inside Section.
- Updated Section and Navigation source-of-truth docs, task board, and task
  closeout notes so the old routed sticky blocker no longer points to an open
  shared owner.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run precommit`
