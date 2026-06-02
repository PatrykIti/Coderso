# TASK-354-06: Admin Tools User Feedback Follow-Up
# FileName: TASK-354-06_Admin_Tools_User_Feedback_Followup.md

**Priority:** High
**Category:** Admin Tools + Cache + UX + Playwright + Claude QA
**Estimated Effort:** Large
**Dependencies:** TASK-347, TASK-348, TASK-349, TASK-350, TASK-351, TASK-352, TASK-353, TASK-354
**Status:** Done (2026-06-02)

---

## Overview

Close the post-audit feedback for the admin Tools section as an additional
TASK-354 cross-tools follow-up after TASK-348 through TASK-354 were initially
marked done. The earlier closure is not enough unless the current UI behaves
like the mature Pages/Posts lists and is physically proven in the browser.

Scope:

- Search
- SEO Manager
- Analytics
- Backups
- Import / Export
- Redirects

Primary feedback to address:

- Tools pages must hydrate from cache like Pages/Posts: first visit may fetch,
  revisits must render cached state immediately, and mutations must update or
  invalidate only the affected resource family.
- SEO Manager saves must be proven against the public frontend HTML, not only
  the admin/backend row.
- Backups must run inside the CMS for manual v1 backups; the UI must not imply
  an unexplained external worker dependency.
- Backups UI must be calmer and more readable; loud yellow operational states
  should only appear for real warnings.
- Import / Export downloads must be per-card operations, not a global loading
  lock. Real import preview/apply must be physically tested through the UI.
- Tools list/table UX should match Pages/Posts patterns where applicable:
  concise primary actions, toasts, destructive confirmations, selection/bulk
  actions for real table resources, truthful empty states, and no duplicate or
  redundant CTAs.
- Claude CLI must run a real UX/UI review pass with Playwright where possible,
  and Codex must compare Claude feedback against the user's requested points.

## Sub-Tasks

- [x] Reconcile cache documentation drift and verify all six Tools surfaces have
  cached-first hydration or an explicitly documented non-cacheable boundary.
- [x] Reduce unnecessary foreground/full refetches in Tools pages where client
  caches already patch the changed resource.
- [x] Polish Backups UI copy and visual states for internal CMS artifact
  creation, download, disabled restore, and warning-only queued/running states.
- [x] Keep Import / Export export loading scoped per target and prove JSON
  preview/apply through a browser E2E flow.
- [x] Recheck Redirects table UX against Pages/Posts patterns, including concise
  create action, toasts, destructive confirmation, selection, and bulk actions.
- [x] Add or update focused Vitest/Bun coverage for cache hydration, scoped
  loading, and table action behavior.
- [x] Run real Playwright/Claude review and update the Tools reports with the
  final UX/cache/runtime evidence.

## Completion Evidence - 2026-06-02

- Cache-first Tools revisits were refined for SEO, Analytics, Backups, and
  Redirects. Backups create/delete now patch or selectively invalidate list
  caches without storing local artifact paths in browser cache.
- Backups UI now uses concise `Create`, explicit internal CMS artifact copy,
  neutral queued styling, confirm dialogs, toasts, row selection, and bulk
  delete controls.
- Redirects single-row deletes now use the shared destructive confirmation
  dialog instead of a native browser confirm, matching the Pages/Posts-style
  admin action pattern.
- Import / Export has regression coverage proving a clicked export card enters
  `Preparing...` without locking the other download buttons.
- HTTP E2E on the running local CMS verified:
  - admin login and CSRF,
  - Backups worker mode `internal`, manual backup create, local JSON download,
    and delete cleanup,
  - Import / Export redirects bundle export, preview, and apply,
  - SEO Manager save rendering into public HTML `<title>`, description,
    canonical, and robots metadata,
  - cleanup of the E2E backup, page, and temporary SEO docs.
- Existing DB state still contains two stale queued/running backup rows from
  2026-05-31, so the worker health banner can report `healthy=false`; new
  manual backups complete and download inside the CMS.
- Claude CLI review ran with `claude --print --permission-mode
  bypassPermissions`; actionable cache-patching findings were fixed. Claude's
  physical-proof concern was superseded by the HTTP E2E evidence. Playwright
  Chromium install via `npx @playwright/test@1.57.0 install chromium` hung in
  this environment, so browser automation could not be rerun after TASK-354-06.

## Implementation Pseudocode

```text
for each toolsRoute in toolsRoutes:
  inspect cached client wrappers and page mount policy
  if cached data exists:
    render cached rows/cards immediately
    run background revalidation without blocking interaction
  on mutation:
    patch or invalidate only the resource cache keys owned by that mutation
    broadcast cache-bus update/invalidation
    avoid redundant foreground full-list waits unless needed for totals/page repair

backupManualFlow():
  submit controlled include options
  create CMS-managed artifact in backupService
  return completed/failed row with redacted artifactPath for browser cache
  allow download for completed local artifacts
  keep restore unavailable with explicit unsupported reason

playwrightProof():
  login isolated session
  visit every Tools route twice to prove cached revisit behavior
  edit SEO fixture and verify public HTML title/meta/canonical/robots
  create/download/delete a manual backup
  download one export card while another card stays interactive
  upload JSON bundle, preview, apply, and restore/cleanup
  create/toggle/bulk/delete redirect and verify public runtime
  capture Claude UX review output and compare against user feedback
```

Data flow:

- Admin UI pages call cached admin clients first.
- Admin clients own localStorage/in-memory cache keys and cache-bus events.
- Server routes keep strict validation and route-level permission checks.
- Public runtime checks are done through the actual frontend route, not inferred
  from admin API state.

Error handling:

- Known API/domain failures must map to user-facing messages and toasts.
- Failed mutations must not patch browser cache as success.
- Playwright fixtures must be uniquely scoped and cleaned up by API/UI cleanup
  where possible.

## Security Contract

This task may touch internal admin Tools routes and public read rendering proof:

- Endpoint visibility: existing Tools admin routes remain internal under
  `/admin/api/*`; public SEO/redirect checks remain public read only.
- Auth model: admin operations use session cookie auth.
- RBAC: unchanged from each route family (`content:read/write`,
  `settings:read/write`, `backups:read/write`).
- CSRF: required for admin POST/PATCH/DELETE writes and import preview/apply.
- Rate-limit bucket: existing `admin_read`, `admin_write`, and `public_read`
  buckets remain in force.
- Reject-unknown validation: route schemas must stay strict; no UI shortcut may
  bypass schema-first normalization.
- Anti-abuse: no new public write endpoint, nonce, HMAC, or reCAPTCHA flow.
- Secret handling: browser cache must not store backup artifact filesystem
  paths, export bundle payloads, upload contents, session tokens, passwords, or
  provider/storage secrets.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/admin/searchClient.test.ts tests/vitest/admin/seoClient.test.ts tests/vitest/admin/analyticsClient.test.ts tests/vitest/admin/backupsClient.test.ts tests/vitest/admin/importExportClient.test.ts tests/vitest/admin/redirectsClient.test.ts`
- `bun run test:vitest -- tests/vitest/ui/search-page.test.tsx tests/vitest/ui/seo-manager.test.tsx tests/vitest/ui/analytics.test.tsx tests/vitest/ui/backups-page-wave.test.tsx tests/vitest/ui/backups.test.tsx tests/vitest/ui/import-export.test.tsx tests/vitest/ui/redirects.test.tsx tests/vitest/ui/redirects-page-leaf.test.tsx`
- Relevant Bun route/runtime suites for SEO public metadata, Backups artifact
  lifecycle, Import / Export apply, and Redirect public runtime.
- `bun scripts/tools-audit-matrix.ts --validate`
- Real Playwright pass across all six Tools routes.
- Claude CLI UX/UI review using an isolated Playwright session, or a documented
  failed attempt with exact command/status.

Executed validation:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/backups.test.tsx tests/vitest/ui/backups-page-wave.test.tsx tests/vitest/admin/backupsClient.test.ts tests/vitest/ui/import-export.test.tsx tests/vitest/ui/redirects-page-leaf.test.tsx tests/vitest/ui/seo-manager.test.tsx tests/vitest/ui/analytics.test.tsx tests/vitest/assistant/operation-policy-admin-surfaces.test.ts tests/vitest/ui/dialogs.test.tsx`
- `set -a && source .env && set +a && bun test --parallel=1 tests/integration/routes/backups.test.ts tests/integration/routes/importExport.test.ts tests/integration/routes/seo.test.ts tests/unit/backups/backupService.test.ts tests/unit/tools/importExport.test.ts tests/unit/seo/seoService.test.ts tests/integration/runtime/pages-runtime.test.ts`
- `set -a && source .env && set +a && bun .tmp/task-354-06-http-e2e.ts`
- Claude CLI review: `claude --print --permission-mode bypassPermissions ...`
- Playwright install attempt: `NODE_PATH=/home/coder/.npm/_npx/d07fa91bd3497047/node_modules npx --yes @playwright/test@1.57.0 install chromium`; stopped after hanging without installing `/ms-playwright/chromium_headless_shell-1200/chrome-linux/headless_shell`.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-tools/README.md`
- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_TOOLS_SECTION_OVERVIEW.md`
- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_CLAUDE_UX_REVIEW.md`
- Per-tool reports if a classification or residual finding changes.
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- Changelog entry 1044 when TASK-354-06 closes.

## Acceptance Criteria

- Tools pages no longer have stale docs/report claims that contradict current
  cache behavior.
- Cached Tools revisits render without foreground waiting when cached data
  exists.
- SEO Manager admin save is physically verified against public frontend HTML.
- Manual backups create CMS-managed artifacts without an unexplained external
  worker dependency and can be downloaded/deleted through the UI.
- Import / Export proves real JSON preview/apply and per-card export loading in
  browser testing.
- Redirects and Backups table actions follow the Pages/Posts style for toasts,
  concise create actions, destructive confirmations, and bulk actions where the
  resource model supports them.
- Claude feedback and Codex Playwright evidence are reconciled in the reports.
