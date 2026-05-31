# 893. TASK-285 Split Layout widget followups

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-285, TASK-285-01, TASK-285-02, TASK-285-03, TASK-285-04, TASK-285-05, TASK-285-06

## Key Changes

### Split Layout mobile and ratio truthfulness

- Split Layout now owns an optional `ratio.mobile` field with tablet fallback, so `keep` mode no longer silently borrows the tablet ratio.
- Wizard and Visual preset changes now consume the landed shared atomic patch path while Split Layout adds breakpoint disclosure, preset-override state, and graphical variant miniatures.
- Reverse-on-mobile helper copy now explains the phone-order effect truthfully for both `stack` and `keep` modes.

### Split Layout editor guidance and diagnostics

- Visual replaces the redundant `Pane slots` copy with actionable `Pane content` guidance tied to Structure and insert controls.
- Preview-only empty panes now explain how to add content without leaking admin-only placeholder copy into public runtime.
- Advanced is now a read-only responsive diagnostics surface with normalized breakpoint, gap, and alignment summaries instead of duplicating Visual controls.

### Split Layout spacing and closure sync

- Gap labels now include rem/px scale context, while legacy serialized `"0"` values still normalize through the canonical zero-gap control state.
- Updated the Split Layout report, widget docs, task board, and task files to close the family explicitly on top of the already-landed TASK-256 shared contracts.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/splitLayout.test.tsx tests/vitest/ui/split-layout-editor-wave.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `git diff --check`
- `bun run precommit`
- `bun run scan:security:strict` (current local environment is missing `semgrep`, `trivy`, and `gitleaks`; `bun audit` still completed inside the same command)
