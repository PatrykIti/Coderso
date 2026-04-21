# 720. TASK-193 pages bun route timeout stabilization

Date: 2026-04-21
Version: unreleased
Tasks: TASK-193

## Key Changes

### QA/CMS Pages

- Stabilized the DB-backed Pages route lifecycle Bun test by setting an explicit
  per-test timeout for the existing create/update/autosave/publish/preview/
  restore/discard/duplicate/unpublish/delete coverage.
- Kept the existing route coverage breadth and audit assertions unchanged.
- Made no production Pages route or API contract changes.

## Validation

- `set -a && source .env && set +a && bun test tests/integration/routes/pages.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `set -a && source .env && set +a && bun run test:bun`
