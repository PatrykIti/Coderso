# 761 - TASK-230 Bun Testing Lane Workflow Contract

- Date: 2026-04-28
- Version: Unreleased
- Tasks: TASK-230

## Key Changes

### Testing Lanes

- Renamed the GitHub Actions job from `bun-coverage-baseline` to `bun-lane` so
  it matches the existing `vitest-lane` naming model.
- Added an explicit Bun test step before the Bun coverage step in the CI lane.
- Renamed the curated Bun helper to `scripts/run-bun-lane.ts` and split it into
  `--test`, `--coverage`, and `--all` modes.
- Added `test:bun:lane` while keeping `test:coverage:bun` on the same curated
  route/plugin/perf suite selection.
- Passed optional `DATABASE_URL` into `bun-lane` so DB-backed route suites can
  run when the repository secret is configured.

## Validation

- Passed:
  - `DATABASE_URL= bun scripts/run-bun-lane.ts --test`
  - `DATABASE_URL= bun scripts/run-bun-lane.ts --coverage`
  - `DATABASE_URL= bun run test:bun:lane`
  - `DATABASE_URL= bun run test:coverage:bun`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `ruby -e 'require "yaml"; YAML.load_file(".github/workflows/testing-lanes.yml"); puts "testing-lanes.yml YAML OK"'`
  - `git diff --check`
