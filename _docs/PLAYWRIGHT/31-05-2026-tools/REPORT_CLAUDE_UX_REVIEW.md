# Claude UX Review - Admin Tools

Date: 2026-06-01
Reviewer: Claude CLI, launched outside the Codex sandbox with
`--dangerously-skip-permissions`
UI session: `claude-tools-ux-fast-2026-06-01`

## TASK-355 Claude Follow-Up - 2026-06-02

Claude CLI was rerun with:

```bash
claude --print --permission-mode bypassPermissions "You are reviewing a Coderso CMS patch in /home/coder/project/Coderso-b..."
```

The follow-up reviewed the working-tree diff and supporting server/service
code. It did not run tests. Findings and resolution:

- Physical proof gap: addressed by the TASK-355 HTTP E2E pass on the running CMS
  (`http://localhost:3000`) for SEO public HTML, Backups create/download/delete,
  and Import / Export preview/apply. Fresh Playwright browser proof could not be
  rerun because Chromium installation hung before the executable was available.
- Backup delete cache correctness: fixed. Delete now patches only cache pages
  that can stay correct and invalidates query/page caches whose pagination can
  shift.
- Backup cache redaction: fixed. Created backup rows are sanitized before being
  written into browser cache.
- Backup worker false warning heuristic: fixed. New queued/running rows no
  longer force `healthy=false` immediately; the server-owned age-aware worker
  state remains authoritative.
- Dead BackupsTable branch: fixed by collapsing duplicate restore/download
  action-state logic.
- Analytics/Backups mount revalidation concern: reviewed against Pages/Posts.
  The current contract is cached-first mount without forced network refresh when
  cache is fresh; cache-bus invalidation and explicit refresh remain the forced
  paths.

## Execution

Claude was rerun after API authentication was restored. The first retry reached
the admin UI and navigated through SEO Manager, Backups, and Redirects, but the
CLI process did not return a final report. A shorter follow-up prompt reused a
logged-in Playwright session and completed with a concise UX report.

The session visited every Tools route:

- Search (`/admin/search`)
- SEO Manager (`/admin/seo`)
- Analytics (`/admin/analytics`)
- Backups (`/admin/backups`)
- Import / Export (`/admin/tools/import-export`)
- Redirects (`/admin/redirects`)

The pass avoided destructive operations. It typed a test query into Search and
reviewed the visible page states, empty states, status tables, and primary
actions.

## TASK-354 Resolution - 2026-06-01

- Seed admin now hashes bootstrap passwords through the same pepper-aware helper
  used by login verification, with tests for pepper and no-pepper behavior.
- Search, SEO Manager, Analytics, Backups, Import / Export, and Redirects are
  mapped into `scripts/tools-audit-matrix.ts`, which requires observable control
  effects, cause-specific empty states, async-state ownership, runtime-effect
  evidence, scoped fixtures, cleanup paths, and report drift checks.
- Backups now has a bounded polling policy for queued/running legacy states,
  and final manual backups complete through the internal CMS artifact path
  without depending on an external worker.
- The original findings below remain as source evidence; the final status is
  resolved through TASK-348 through TASK-354 unless a future task explicitly
  reopens a surface.

## Environment Notes

- A fresh isolated Playwright profile did not inherit the user's browser login.
- A temporary backend-created admin was used only to authenticate the isolated
  Playwright session and was deleted after the review.
- During setup, the existing seed-admin path was found to be unreliable when
  `AUTH_PASSWORD_PEPPER` is configured: `core/db/seed.ts` hashes the bootstrap
  password directly with Argon2, while login verifies through the pepper-aware
  `hashPassword` helper. That can make seeded `.env` credentials fail with
  `Invalid credentials`.
- The UX findings below are limited to what was visible in the local dataset.
  The deeper Playwright reports in this folder contain the end-to-end mutation
  checks for backup creation, import/export, SEO persistence, and redirects.

## Search

Worked:

- The route loaded correctly in the admin shell.
- The main search input accepted text and returned a visible no-results state.
- Content-type tabs and the date filter were visible.

UX issues:

- The `Try:` label rendered without example chips, so it looks unfinished.
- `No results for "test"` does not explain whether there is no content or the
  date filter removed possible results.
- The Category helper text still says categories appear after search even after
  a search has run.

Fix path:

- Add real query suggestion chips after `Try:`.
- Split empty states between no indexed data, no match, and filters too narrow.
- Refresh or hide the Category section after a completed query.

## SEO Manager

Worked:

- The page loaded with the global scan header, scan action, status cards, and
  SEO table columns.
- The page clearly exposes the intended audit workflow.

UX issues:

- `GLOBAL SCAN: 0%` plus an empty table reads like a stalled process even when
  no scan has run.
- The table has no strong empty-state message or in-table CTA.

Fix path:

- Show a neutral pre-scan state before an audit is running.
- Add an in-table empty state with a `Run Full Audit` CTA.
- Reserve percentage progress for an active or completed scan.

## Analytics

Worked:

- The dashboard loaded with metric cards, content activity, and top-content
  sections.
- The layout is understandable even with an empty dataset.

UX issues:

- Empty data renders as `0` and `0%`, which is ambiguous: it can mean either no
  data or no change.
- Multiple sections show similar empty states, but the page does not explain how
  to generate meaningful analytics.

Fix path:

- Use `-` or `No data yet` when there is no baseline.
- Add a short empty-state CTA that points users toward publishing content or
  widening the date range.

## Backups

Worked:

- The page exposes `Create Backup Now`, schedule frequency controls, storage
  target, recent backups, pagination, and retention information.
- Existing backup rows were visible.

UX issues:

- Backup rows remained `Queued` with size `-`; restore, download, and delete
  actions were disabled.
- The UI does not explain whether queue processing is delayed, failed, or not
  configured.

Fix path:

- Add auto-refresh and an age-aware warning for backups queued longer than a
  small threshold.
- Show operation/queue health or a recoverable error message when artifacts are
  not produced.
- Keep the restore/download disabled state, but explain why the action is not
  available.

## Import / Export

Worked:

- The screen presents export modules, download actions, a drag-and-drop import
  zone, file constraints, and recent import rows.
- It was the most complete-feeling screen in the UX pass.

UX issues:

- Failed import rows do not show a reason, log link, or retry path.
- In-progress rows do not expose a visible progress bar even though the table
  has a progress column.

Fix path:

- Surface failure reason and retry action directly from the row.
- Render a real progress indicator for in-progress imports.

## Redirects

Worked:

- The page loaded cleanly with `Create redirect`, search, table columns, and an
  understandable empty state.

UX issues:

- The empty state does not include a direct create CTA.
- Pagination is still shown when there are zero redirects.

Fix path:

- Add `Create your first redirect` inside the empty table state.
- Hide pagination controls when the result count is zero.

## Top UX Fixes

1. Make Backups explicit about backup progress, local artifact availability,
   and unavailable restore actions.
2. Standardize empty states across Tools with clear cause and next action.
3. Clarify Search no-results behavior and fill the empty `Try:` suggestions.
4. Add failure reasons, retry actions, and progress indicators to Import /
   Export.
5. Add direct empty-state CTAs and hide zero-result pagination where it does not
   help.
