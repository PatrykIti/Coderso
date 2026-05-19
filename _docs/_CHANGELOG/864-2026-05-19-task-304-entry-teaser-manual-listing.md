# 864. TASK-304 Entry Teaser manual listing contract

Date: 2026-05-19
Version: Unreleased
Tasks: TASK-304

## Key Changes

### Entry Teaser listing mode
- Entry Teaser listing mode now supports deterministic manual row selection via persisted listing targets instead of silently coercing `manual` back to `latest`.
- Runtime resolution preserves legacy manual/latest/featured entry behavior while adding listing-specific manual targeting.

## Validation

- `bun test tests/unit/widgets/entryTeaser.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/entry-teaser-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
