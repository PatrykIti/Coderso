# TASK-347: Admin Tools Playwright Audit Reports
# FileName: TASK-347_Admin_Tools_Playwright_Audit_Reports.md

**Priority:** Medium
**Category:** QA + Admin UI + Documentation
**Estimated Effort:** Medium
**Dependencies:** TASK-001
**Status:** Done (2026-05-31)

---

## Overview

Audit the CMS admin Tools section through real browser interaction and source
review, then publish report files that classify what worked, what failed, why it
failed, and how to fix each issue.

The audited Tools entries are:

- Search
- SEO Manager
- Analytics
- Backups
- Import / Export
- Redirects

## Sub-Tasks

- Review the Tools sidebar route list and related admin page/client/route source
  files.
- Open the local admin UI with Playwright and click each Tools entry.
- Exercise visible controls for each Tools page, including filters, dialogs,
  selects, forms, export/import flows, table actions, and pagination controls.
- Cross-check observed UI behavior against source code.
- Record one overview report and one per-tool report under
  `_docs/PLAYWRIGHT/31-05-2026-tools/`.
- Update the task board and changelog.

## Implementation Pseudocode

```text
discoverToolsRoutes()
for each route in toolsRoutes:
  open route through admin sidebar
  wait for route shell and page-specific heading
  click every visible action/control that is safe in a local audit
  capture API status, visible UI state, console errors, and side effects
  inspect related source files for handlers, schemas, and placeholders
  write report section:
    worked[]
    failed[] with reason and fix path
    data/environment notes
```

Data flow:

- Playwright drives the admin browser UI.
- API responses are used only to verify UI-triggered operations and cleanup
  temporary redirect data.
- Source review confirms whether failures are empty-fixture behavior, UI-only
  controls, or missing end-to-end contracts.

Error handling:

- If the preferred dev host is unavailable, test the same local app through the
  reachable localhost host and document the hostname gap.
- If login credentials are stale, use a temporary backend-created admin session
  without resetting shared credentials.
- If a destructive UI cleanup path is unavailable, document the persistent side
  effect instead of deleting unrelated data.

## Security Contract

No production API routes are added or changed.

- Endpoint visibility: unchanged.
- Auth model: unchanged; reports document use of an isolated temporary admin
  session for local testing.
- RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged.
- Secret handling: no session tokens, passwords, provider keys, or privileged
  settings are written to the report files.

## Testing Requirements

- Real Playwright browser pass across all Tools routes.
- Focused Playwright follow-up checks for Analytics settling, Search no-results,
  and Redirect CRUD/accessibility console output.
- Source review of related admin UI, API client, and server route files.
- Repository lint/typecheck validation after docs are written.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-tools/README.md`
- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_TOOLS_SECTION_OVERVIEW.md`
- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_SEARCH.md`
- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_SEO_MANAGER.md`
- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_ANALYTICS.md`
- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_BACKUPS.md`
- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_IMPORT_EXPORT.md`
- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_REDIRECTS.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/1034-2026-05-31-admin-tools-playwright-audit-reports.md`
- `_docs/_CHANGELOG/README.md`

## Completion Notes (2026-05-31)

- All six Tools routes were exercised through the local admin UI.
- Reports were written for the overall section and every individual Tools page.
- Claude CLI was attempted outside its sandbox but could not be used because its
  API authentication failed with `401 Invalid authentication credentials`.
- Playwright and code review identified UI-only controls, uncontrolled option
  groups, placeholder pagination, and one Redirect drawer accessibility wiring
  issue.
- A follow-up explorer audit found no missing sidebar Tools coverage, no missing
  per-tool report files, and no missing clicked/worked/failed/fix sections.
- A deeper follow-up pass on 2026-06-01 added real fixture coverage after the
  first report set was found too shallow:
  - Search found a published test page.
  - SEO Manager persisted title/description to `seoDocuments`, but the public
    page HTML did not contain those values.
  - Analytics surfaced the published page in top content.
  - Backups created only a queued row with no artifact.
  - Import / Export roundtripped a valid JSON bundle and restored the original.
  - Redirects created an admin row, but the public runtime still returned 404.
- Test fixtures from the deeper pass were cleaned up directly after evidence
  capture where the UI/API had no cleanup path.
- Claude CLI was retried through the correct non-interactive stdin flow and
  still failed on its own API authentication with
  `401 Invalid authentication credentials`.
- After Claude authentication was restored, Claude CLI was rerun outside the
  Codex sandbox with `--dangerously-skip-permissions`; it reused a logged-in
  Playwright session and clicked through all six Tools routes for a user-facing
  UX review.
- The Claude UX addendum was added under
  `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_CLAUDE_UX_REVIEW.md`.
- The temporary admin user created only for the isolated Playwright login was
  removed after the pass.
- A local setup issue was discovered during that run: the seed-admin script
  hashes the bootstrap password without the pepper-aware `hashPassword` helper,
  while login verification uses the pepper-aware path.
- The local security session policy was verified at `maxPerUser: 30`.
- Validation passed:
  - `git diff --check` after the deep-pass report updates
  - `bun --cwd core lint` after the deep-pass report updates
  - `bun --cwd core lint:types` after the deep-pass report updates
  - `git diff --check` after the Claude UX addendum
  - `bun run precommit` after the Claude UX addendum
