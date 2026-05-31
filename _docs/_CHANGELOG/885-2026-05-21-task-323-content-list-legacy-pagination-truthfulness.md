# 885. TASK-323 content list legacy pagination truthfulness

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-323

## Key Changes

### Shared content-list runtime

- Legacy `content-list` pagination now treats `load-more` cumulatively instead
  of slicing only the current page.
- Legacy `view-all` now ignores stale `cl.<blockId>.page` params and always
  resolves from the first bounded slice.

### Tests and documentation

- Added shared resolver proof in the Bun-owned `contentListResolver` suite for
  cumulative `load-more` and stale-`view-all` suppression.
- Updated the Content List widget doc, report evidence, task board, and task
  closeout notes so the old TASK-262 residual no longer points at an open
  follow-up.

## Validation

- `bun test tests/unit/content/contentListResolver.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit`
- `bun run gates:coderso`
