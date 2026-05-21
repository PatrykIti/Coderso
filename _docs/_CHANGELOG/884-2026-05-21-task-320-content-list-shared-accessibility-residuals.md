# 884. TASK-320 content list shared accessibility residuals

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-320

## Key Changes

### Shared content renderer

- `ContentListBlock` now renders readable semantic date metadata through
  `<time dateTime="...">` for valid runtime dates instead of flattening the
  date into ISO-only text.
- Shared CTA output now exposes contextual accessible naming from the visible
  CTA label plus the item title for both `content-list` and `posts-feed`
  consumers without changing visible copy.

### Tests and documentation

- Added shared renderer proof in the shipped Bun compatibility suite for
  `content-list` and in the public Vitest renderer suite for both
  `content-list` and `posts-feed`.
- Updated the shared Content List widget doc, TASK-320 closeout notes, task
  board, and Posts Feed report matrix so the accessibility residuals no longer
  route to an open follow-up.

## Validation

- `bun test tests/unit/widgets/contentList.test.tsx`
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`
