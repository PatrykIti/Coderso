# 1024 - TASK-343-11 Team truthfulness

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343-11, TASK-343

## Key Changes

### Widgets / Runtime

- Changed Team member names from `h4` to `h3` headings so member cards follow
  the section title hierarchy without changing card layout or accessible
  `article` labels.

### Admin UI

- Preserved the portable profile handle when switching a saved LinkedIn social
  link to another known platform, preventing `github.com/in` style corruption.
- Made Wizard Spotlight transitions non-destructive. Wizard now changes only
  the variant; intentional member-count reductions remain in Visual with the
  existing destructive confirmation.
- Reworded the add-member helper to state that new members are appended after
  the current list.

### QA / Docs

- Added renderer and editor regressions for member heading level, LinkedIn to
  GitHub handle preservation, and non-destructive Wizard Spotlight transitions.
- Updated Team widget docs, Playwright report notes, task board, and TASK-343
  parent tracking.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/team.test.tsx tests/vitest/ui/team-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun scripts/playwright-widget-contract-smoke.ts --widget team --session task-343-11-team-auth-rerun --admin http://localhost:5173/admin --front http://localhost:3000 --strict --output-json .tmp/task-343-11-team-widget-smoke-auth-rerun.json --output-md .tmp/task-343-11-team-widget-smoke-auth-rerun.md`
- `playwright-cli -s=task-343-11-team-public-heading run-code --filename .tmp/task-343-11-team-public-heading-smoke.js`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-11
  diff review; no blockers)

The first strict smoke attempt ran public Team successfully but failed admin
auth because Playwright credentials were not provided. After restarting
`coderso-dev-core-host` once for the known first-start blank-page/hung-probe
state and passing credentials via environment variables, the strict Team smoke
passed with `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
`metadataGaps=0`.
