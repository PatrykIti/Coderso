# 771 - TASK-220 ESLint 9 React Hooks Compiler Cleanup

- Date: 2026-04-29
- Version: Unreleased
- Tasks: TASK-220, TASK-220-01, TASK-220-01-01, TASK-220-01-02, TASK-220-02, TASK-220-02-01, TASK-220-02-02, TASK-220-02-03, TASK-220-03, TASK-220-03-01, TASK-220-03-02, TASK-220-03-03, TASK-220-04, TASK-220-04-01, TASK-220-04-02, TASK-220-04-03, TASK-220-05, TASK-220-05-01, TASK-220-05-02, TASK-220-05-03, TASK-220-06, TASK-220-06-01, TASK-220-06-02, TASK-220-06-03, TASK-220-07, TASK-220-07-01, TASK-220-07-02

## Key Changes

### Admin UI Tooling

- Closed the ESLint 9 / React Hooks Compiler cleanup family with the full
  `eslint-plugin-react-hooks` recommended preset still enabled.
- Recorded the closure state for the original 113 React Hooks/Compiler lint
  findings: `bun --cwd core lint` now passes with `0` findings.
- Updated every TASK-220 parent, subtask, and leaf status to
  `Done (2026-04-29)`.

### Documentation

- Synchronized TASK-220 board rows and closure notes with the final lint,
  typecheck, and DB-backed regression evidence.
- Kept the remediation policy explicit: no broad React Hooks rule disables and
  no production fallbacks added only for tests.

## Validation

- `bun --cwd core lint` - PASS.
- `bun --cwd core lint:types` - PASS.
- `bun run lint:repo:types` - PASS.
- `set -a && source .env && set +a && bun test tests/unit/content/entryService.test.ts` - PASS (`9` pass, `0` fail).
