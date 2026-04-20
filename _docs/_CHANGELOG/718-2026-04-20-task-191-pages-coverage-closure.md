# 718. TASK-191 pages coverage closure

Date: 2026-04-20
Version: unreleased
Tasks: TASK-191, TASK-191-05

## Key Changes

### QA / CMS Pages

- Completed the Pages coverage hardening wave across Bun and Vitest lanes.
- Added route/security, public runtime/preview, admin client cache, and Page
  Builder branch coverage without changing product contracts.
- Recorded final coverage and validation status in the task board and changelog.

## Validation

- `set -a && source .env && set +a && bun test tests/unit/pages tests/integration/routes/pages.test.ts tests/integration/runtime/pages-runtime.test.ts tests/unit/security/csrf.test.ts tests/unit/security/rateLimit.test.ts tests/security/codersoSecurityGate.test.ts`
- `set -a && source .env && set +a && bun run vitest run --config vitest.config.ts tests/vitest/admin/pagesClient.test.ts tests/vitest/pageBuilder tests/vitest/ui/page-editor-shell-wave.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/page-preview.test.tsx`
- `set -a && source .env && set +a && bun run test:coverage`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Coverage Snapshot

- Full Vitest lane: `74.85%` lines / `61.98%` branches.
- `core/admin/services/pagesClient.ts`: `100%` lines / `76.36%` branches.
- `core/admin/ui/pages/*`: `95.81%` lines / `83.10%` branches.
- `core/admin/ui/pages/builder/*`: `96.99%` lines / `83.29%` branches.
