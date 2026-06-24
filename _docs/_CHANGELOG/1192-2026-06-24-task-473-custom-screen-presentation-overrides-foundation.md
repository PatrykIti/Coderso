# 1192 - TASK-473 Custom Screen Presentation Overrides Foundation

**Date:** 2026-06-24
**Version:** Unreleased
**Tasks:** TASK-473, TASK-473-01, TASK-473-02, TASK-473-04

## Key Changes

### Custom Screens

- Added `custom_screen_entry_presentation_overrides` storage for per-screen,
  per-entry presentation overrides outside `content_entries.data`.
- Added the `screenEntryPresentationOverrides` service owner with strict
  reject-unknown normalization, bounded presentation values, replace-scoped
  writes, lazy DB repository defaults, and machine-readable
  `custom_screen_override_*` errors.
- Added internal admin override routes:
  `GET /admin/api/custom-screens/:screenId/entries/:entryId/overrides` and
  `PATCH /admin/api/custom-screens/:screenId/entries/:entryId/overrides`.
  Reads require `content:read`; writes require `content:write` and the existing
  global admin CSRF middleware.
- Added stale target filtering and cleanup helpers for removed blocks/fields,
  while screen and entry deletes are handled by FK cascade.

### Docs And Board

- Updated `_docs/CMS_API.md`, `_docs/CMS_SPEC.md`, and `_docs/DATA_MODEL.md`
  for the storage/API lifecycle contract.
- Moved TASK-473-01, TASK-473-02, and TASK-473-04 to Done. TASK-473 remains In
  Progress because TASK-473-03 is blocked by TASK-474-03.
- External Claude/subagent consultation was not run because there was no
  explicit user approval for external-agent audit; implementation used local
  source/task review and required validation lanes.

## Validation

- `bun run test:vitest -- tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts`
  - Passed: 6 tests.
- `set -a && source .env && set +a && bun test tests/integration/routes/customScreensRoutes.test.ts`
  - Passed: 3 tests.
- `bun run test:vitest -- tests/vitest/customScreens`
  - Passed: 33 tests across 6 files.
- `bun --cwd core lint`
  - Passed.
- `bun --cwd core lint:types`
  - Passed.
- `bun --cwd core build:admin`
  - Passed; Vite reported existing chunk-size warnings.
- `bun run check:admin-boundary`
  - Passed.
- `bun run check:admin-bundle`
  - Passed; report written to `.tmp/admin-bundle-report.json`.
- `bun run gates:coderso`
  - Passed all configured gates; report written to
    `.tmp/coderso-release-gates.json`.
- `bun run scan:security`
  - Advisory scan completed. Semgrep, Trivy config, Trivy secret, and Gitleaks
    were clean. Bun audit and Trivy vulnerability scanning reported existing
    high dependency advisories for `nodemailer`, `ws`, `vite`, and `undici`.
- `git diff --check`
  - Passed.
- `bun run precommit`
  - Passed.
- `set -a && source .env && set +a && bun run test:bun`
  - Passed: 1132 tests, 1 skipped live OpenAI route test.
- `bun run test:vitest`
  - Passed: 4196 tests across 687 files.
- `bun run db:migrate`
  - Passed locally before smoke testing and applied the 0063 override table
    migration to the dev database.
- `playwright-cli -s=task473-smoke run-code --filename .tmp/task-473-smoke.js`
  - Passed against `http://127.0.0.1:5173/admin` after authenticated storage
    state load. The smoke created a scoped content type, entry, and active
    custom screen, loaded the record editor with no console/page errors,
    exercised GET/PATCH/GET/clear for entry presentation overrides, verified the
    override did not leak into entry data, and verified fixture cleanup.
