# 1043 - TASK-354 Cross Tools remediation closure

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-354, TASK-354-01, TASK-354-02, TASK-354-03, TASK-354-04, TASK-354-05

## Key Changes

### Cross Tools Guard

- Added `scripts/tools-audit-matrix.ts`, a machine-readable matrix for Search,
  SEO Manager, Analytics, Backups, Import / Export, and Redirects.
- The matrix validates route coverage, observable control effects, disabled
  reasons, cause-specific empty states, async-state ownership, runtime-effect
  evidence, fixture plans, cleanup plans, report sections, per-task closure IDs,
  and stale report classifications.
- Documented the matrix runbook in the Tools Playwright README and reconciled
  the overview plus Claude UX reports to the final TASK-348 through TASK-354
  closure state.
- Added bounded Backups polling while queued/running backup rows or unhealthy
  external-worker state exist; polling stops when the queue is no longer active.

### Auth Bootstrap

- Replaced direct Argon2 hashing in `seedAdmin` with a seed helper that delegates
  to the shared pepper-aware `hashPassword` path used by login verification.
- Added seed-admin password tests for no-pepper and peppered environments plus a
  static guard against reintroducing direct Argon2 hashing in the seed script.
- Updated developer setup docs to make the `AUTH_PASSWORD_PEPPER` relationship
  explicit for `db:seed:admin`.

## Validation

- `bun test tests/unit/auth/seedAdminPassword.test.ts`
- `bun test tests/unit/tools/toolsAuditMatrix.test.ts`
- `bun test tests/unit/tools/packageScripts.test.ts`
- `bun scripts/tools-audit-matrix.ts --validate`
- `bun run test:vitest -- tests/vitest/ui/search-page.test.tsx tests/vitest/ui/search-results.test.tsx tests/vitest/ui/search-navigation.test.tsx tests/vitest/ui/seo-manager.test.tsx tests/vitest/ui/analytics.test.tsx tests/vitest/ui/backups.test.tsx tests/vitest/ui/backups-page-wave.test.tsx tests/vitest/ui/import-export.test.tsx tests/vitest/ui/redirects.test.tsx tests/vitest/ui/redirects-page-leaf.test.tsx`
- Claude CLI read-only review of TASK-354 changes: no blockers.
- Focused Playwright CLI matrix route smoke for Search, SEO Manager, Analytics,
  Backups, Import / Export, and Redirects after Vite optimize cache refresh:
  all six routes reached expected UI anchors with zero browser console
  errors/warnings. Temporary proof user/session was removed.
- Scoped DB seed smoke with `AUTH_PASSWORD_PEPPER`, followed by password
  verification and cleanup of the temporary seeded user.
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
