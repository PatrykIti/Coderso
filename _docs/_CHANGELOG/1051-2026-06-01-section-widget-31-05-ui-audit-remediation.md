# 1051 - Section widget 31-05 UI audit remediation

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-361, TASK-361-01, TASK-361-02, TASK-361-03

## Key Changes

- Hardened Section public inline CSS by allowlisting renderable color values for
  heading, background, gradient, border, and overlay fields.
- Added page-service widget-block validation before page create/update/autosave
  snapshots and publish, so invalid Section enum payloads fail before
  persistence or publication.
- Completed builder metadata for Section Region controls with stable paths for
  Add Region, region rows, and writable region-label inputs.
- Updated Section docs, the 31-05 Playwright report, task board, and task
  closure notes.

## Validation

- `bun test tests/unit/pages/pageWidgetData.test.ts`
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/clearableStyle.test.ts tests/vitest/widgets/section.test.tsx tests/vitest/ui/section-editor-wave.test.tsx`
- `set -a && source .env && set +a && bun test tests/integration/routes/pages.test.ts --test-name-pattern "page routes reject invalid Section widget payloads before persistence"`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p` read-only diff review for TASK-361
