# 1101 - TASK-407 site-builder intake registry

Date: 2026-06-05
Version: Unreleased
Tasks: TASK-407, TASK-407-02, TASK-407-02-L01

## Key Changes

### Assistant intake contract

- Added service-owned `AssistantSiteBuilderIntake*` types for guided
  Basic/Advanced sessions, canonical step ids, generic facts, answers, review
  states, and registry errors.
- Added backend-owned registries for modes, page roles, menu presets, hero
  presets, homepage section roles, media policy options, and review states.
- Kept the vocabulary generic so later adapters can map many industries and site
  shapes onto reusable roles instead of hardcoded one-off profiles.

### Safety and docs

- Added fail-closed lookup helpers for unknown mode, step, option-registry, and
  option ids.
- Documented the guided intake vocabulary and media policy split in
  `_docs/ASSISTANT_SITE_BUILDER.md`.
- Synchronized TASK-407 board status for the completed TASK-407-02-L01 leaf and
  the now in-progress TASK-407-02 workstream.

### QA

- Added Bun-free Vitest coverage for registry uniqueness, mode coverage, generic
  option registries, unknown-id failure, and pure-service imports.
- Validation passed:
  - `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/assistantSiteBuilderIntakeRegistry.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `git diff --check`
  - `bun run precommit`
