# 998 - TASK-343 Claude cross-check

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343, TASK-343-11, TASK-343-15, TASK-343-19, TASK-343-21, TASK-343-25, TASK-343-26, TASK-343-28, TASK-343-31

## Key Changes

- Re-ran the `TASK-343` task-vs-report-vs-code audit with Claude Code in
  headless read-only mode.
- Fixed the remaining doc-level drift found by that independent pass:
  pseudocode shape/type mismatches, missing `contentList.tsx` ownership for
  Posts Feed rendering, the Content List umbrella classification, and the Hero
  MediaPicker evidence citation.
- Preserved the `31` leaf-family routing while making implementation guidance
  match current source/test ownership more closely.

## Validation

- `claude -p` read-only audits for `TASK-343-01..31`
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit`
