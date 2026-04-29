# 773 - Markdown Pre-commit Format Guard

- Date: 2026-04-29
- Version: Unreleased
- Tasks: none

## Key Changes

### Developer Tooling

- Removed `.md` and `.mdx` from the staged-file Prettier formatter used by
  `bun run precommit`.
- Kept Prettier active for code/config assets while preventing automatic
  widening of kanban tables and structural docs tables.

### Documentation Repair

- Repaired markdown table formatting in the currently touched task docs after
  the staged formatter widened them.
- Protected architecture diagrams, repository trees, package layouts, manifest
  JSON, and code examples with fenced code blocks.

## Validation

- `git diff --check` - PASS.
- `git diff --cached --check` - PASS.
- `bun scripts/format-staged.ts` - PASS; only the staged TypeScript formatter
  file was selected, staged Markdown files were ignored.
- `bun run precommit:check` - PASS.
- `bun run precommit` - PASS.
