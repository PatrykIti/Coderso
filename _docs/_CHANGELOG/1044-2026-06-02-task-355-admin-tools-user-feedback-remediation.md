# 1044 - TASK-355 Admin Tools user feedback remediation

Date: 2026-06-02
Version: Unreleased
Tasks: TASK-355

## Key Changes

### Admin Tools UX

- Refined SEO Manager, Analytics, Backups, and Redirects cached-first revisit
  behavior so cached data renders immediately instead of forcing a foreground
  wait when fresh cache exists.
- Updated Backups copy and controls around internal CMS-managed artifacts:
  concise `Create` action, shared confirm dialogs, neutral queued styling,
  selected-row state, bulk delete, toasts, and clearer local download/restore
  messaging.
- Kept Import / Export download loading scoped per export card; one card can be
  `Preparing...` without locking the other download buttons.
- Replaced Redirects single-row native browser confirms with the shared
  destructive confirmation dialog used by the rest of the admin UI.

### Cache And Runtime Proof

- Hardened Backups browser cache patching: create sanitizes rows before cache
  write, delete patches only safe pages, pagination-sensitive pages are
  invalidated, and local filesystem artifact paths/download content are never
  stored.
- Recorded TASK-355 HTTP E2E evidence for admin auth/CSRF, internal backup
  create/download/delete, Import / Export redirects export preview/apply, and
  SEO Manager save rendering into public HTML title, description, canonical,
  and robots metadata.
- Reconciled Claude CLI review findings with code and reports. Fresh Playwright
  browser proof could not be rerun because Chromium installation hung before
  the executable was available.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/backups.test.tsx tests/vitest/ui/backups-page-wave.test.tsx tests/vitest/admin/backupsClient.test.ts tests/vitest/ui/import-export.test.tsx tests/vitest/ui/redirects-page-leaf.test.tsx tests/vitest/ui/seo-manager.test.tsx tests/vitest/ui/analytics.test.tsx tests/vitest/assistant/operation-policy-admin-surfaces.test.ts tests/vitest/ui/dialogs.test.tsx`
- `set -a && source .env && set +a && bun test --parallel=1 tests/integration/routes/backups.test.ts tests/integration/routes/importExport.test.ts tests/integration/routes/seo.test.ts tests/unit/backups/backupService.test.ts tests/unit/tools/importExport.test.ts tests/unit/seo/seoService.test.ts tests/integration/runtime/pages-runtime.test.ts`
- `set -a && source .env && set +a && bun .tmp/task-355-http-e2e.ts`
- Claude CLI review with `claude --print --permission-mode bypassPermissions`
