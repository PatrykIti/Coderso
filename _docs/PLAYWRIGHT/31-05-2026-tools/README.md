# Tools UI Playwright Audit - 31-05-2026

This folder contains the manual-plus-Playwright audit reports for the CMS admin
Tools area.

## Scope

The audit covered every entry currently exposed under Tools in the admin
sidebar:

- Search (`/admin/search`)
- SEO Manager (`/admin/seo`)
- Analytics (`/admin/analytics`)
- Backups (`/admin/backups`)
- Import / Export (`/admin/tools/import-export`)
- Redirects (`/admin/redirects`)

## Reports

- [Tools section overview](REPORT_TOOLS_SECTION_OVERVIEW.md)
- [Search](REPORT_SEARCH.md)
- [SEO Manager](REPORT_SEO_MANAGER.md)
- [Analytics](REPORT_ANALYTICS.md)
- [Backups](REPORT_BACKUPS.md)
- [Import / Export](REPORT_IMPORT_EXPORT.md)
- [Redirects](REPORT_REDIRECTS.md)
- [Claude UX review](REPORT_CLAUDE_UX_REVIEW.md)

## Matrix Guard

TASK-354 adds a machine-readable matrix for the six Tools routes:

```bash
bun scripts/tools-audit-matrix.ts --validate
```

The guard validates route coverage, report files, resolved finding sections,
observable control effects, empty-state next actions, async-state ownership, and
runtime-effect evidence for SEO, Backups, and Redirects.

## Method

- Browser automation used Playwright against the running local admin UI.
- A deeper follow-up pass on 2026-06-01 created real test data instead of only
  clicking static controls:
  - a published page fixture for Search, SEO Manager, and Analytics,
  - a manual backup through the Backups dialog,
  - an Import / Export JSON roundtrip through the file input,
  - a redirect created through the Redirects drawer and checked against the
    public runtime.
- The test session used `http://localhost:5173/admin` because
  `coderso-b.localhost` did not resolve in Node/Playwright in this environment.
- The credential note available during the task was stale for this checkout, so
  the audit used a temporary backend-created admin session instead of resetting
  the shared admin password.
- Claude CLI was initially attempted outside its sandbox, but its own API
  authentication failed with `401 Invalid authentication credentials`.
- After Claude authentication was restored on 2026-06-01, Claude CLI was rerun
  outside the Codex sandbox with `--dangerously-skip-permissions` and a
  logged-in Playwright session. That pass clicked through all Tools routes and
  produced the dedicated UX addendum linked above.
- TASK-354-06 follow-up on 2026-06-02 used `coderso-dev-core-host` and an HTTP E2E
  script against `http://localhost:3000` after Playwright Chromium installation
  hung in this environment. The pass verified admin auth/CSRF, Backups internal
  artifact create/download/delete, Import / Export redirects export plus
  preview/apply, and SEO Manager saves rendering into public HTML title,
  description, canonical, and robots metadata. Claude CLI also reviewed the
  TASK-354-06 diff and its actionable backup cache findings were fixed.

## Deep-Pass Outcome

- Search found a real published page fixture.
- SEO Manager saves now render into public page HTML after TASK-349.
- Analytics showed the published page fixture in API top content and UI top
  content.
- Backups now creates CMS-managed local JSON artifacts, serializes include
  options, paginates real rows, hydrates list/schedule cache, enables local
  download when complete, and keeps restore disabled until a restore contract
  exists after TASK-351.
- Import / Export successfully downloaded, previewed, applied, verified, and
  restored a valid JSON bundle. TASK-352 later closed the malformed menu-id
  drift: preview/apply now reject invalid UUIDs with mapped validation errors
  before database persistence.
- Redirects now execute enabled admin rows in public runtime, reject unsafe
  destinations, expose confirmed delete, and use truthful empty/pagination
  states after TASK-353.
- TASK-354-06 tightened cache parity and UX polish after user feedback:
  Backups and Redirects use concise create/delete flows, Backups gained
  selection and bulk delete, backup list cache patching now redacts local paths
  and selectively invalidates pagination-sensitive pages, Import / Export
  per-card loading is regression-tested, and SEO/Backups/Import-Export were
  physically verified through the running CMS HTTP stack.
- Claude's later UX pass independently flagged the same rough edges from a user
  perspective: unclear empty states, queued backups with disabled actions,
  incomplete Search suggestions, missing Import / Export error details, and
  zero-result pagination/CTA gaps.
