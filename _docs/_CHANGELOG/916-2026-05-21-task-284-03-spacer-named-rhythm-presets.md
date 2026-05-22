# 916. TASK-284-03 Spacer named rhythm presets

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-284, TASK-284-03

## Key Changes

### Spacer preset contract

- Spacer now ships three transient rhythm presets: `Card gap` (`8/6/4`), `Section gap` (`16/12/8`), and `Hero gap` (`24/20/16`).
- Preset state is derived from exact normalized height triplets only; manual height edits clear the matched preset without adding a persisted `preset` field.
- Spacer continues to store and render only `height` plus `showGuideInEditor`; no preset-specific runtime marker or repo-level preset storage was introduced.

### Fixed-mode truthfulness

- In `responsive`, applying a preset writes the full desktop/tablet/mobile triplet through the existing Spacer data model.
- In `fixed`, preset clicks update desktop height only and preserve the saved tablet/mobile heights from the shared TASK-256-05-03 contract.
- Wizard and Visual now expose the same preset chooser above direct height editing, while Advanced stays technical and unchanged.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx tests/vitest/ui/spacer-editor-wave.test.tsx tests/vitest/ui/widget-template-editor.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `bun run gates:coderso`
- `bun run scan:security:strict` (fails locally because `semgrep`, `trivy`, and `gitleaks` are not installed in `$PATH`; `bun audit` still ran inside the same command)
- `bun run precommit`
