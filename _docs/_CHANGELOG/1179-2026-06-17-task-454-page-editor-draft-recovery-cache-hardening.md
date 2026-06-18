# 1179 - TASK-454 Page Editor Draft Recovery And Cache Trust Hardening

**Date:** 2026-06-17
**Version:** Unreleased
**Tasks:** TASK-454, TASK-454-01, TASK-454-01-L01, TASK-454-02,
TASK-454-02-L01, TASK-454-02-L02, TASK-454-02-L03, TASK-454-03,
TASK-454-03-L01, TASK-454-03-L02, TASK-454-04, TASK-454-04-L01,
TASK-454-04-L02, TASK-454-05, TASK-454-05-L01

## Key Changes

### Page Editor Cache
- Added host `loadDetail(id, { force })` support for shared Page Editor hosts.
- Added explicit freshness policy helpers so Pages and Page Templates use
  strict `updatedAt` replacement while Menu Design can cleanly replace poisoned
  cache without relying on `createdAt` as freshness.
- Page Editor now keeps cache-first hydration but performs one forced server
  detail revalidation per mounted resource and refuses to overwrite dirty local
  edits.

### Draft Recovery
- Pages now detect newer autosave revisions after reopen and show a
  `Recover draft version` prompt.
- Recovery offers restore, discard, and keep-current actions using the existing
  internal revision routes; autosave data is never silently promoted into the
  saved draft.

### Dirty Navigation
- Extracted a shared admin dirty-navigation guard from Settings behavior.
- Page Editor now blocks admin SPA navigation, popstate, and hard browser
  navigation while local edits or a recoverable draft prompt are pending.
- Confirming navigation discards only local editor state and leaves server
  autosave revisions intact.

### Docs And QA
- Documented the Page Editor mount revalidation, autosave recovery, and dirty
  guard contracts in `_docs/ADMIN_CACHE.md`.
- Updated the Page Editor user guide with recovery prompt behavior.
- Closed the TASK-454 board family and synchronized task statistics.

## Validation

- `bun run test:vitest -- tests/vitest/pages/page-editor-host-contract.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/settings-shell.test.tsx tests/vitest/ui/admin-router-context-blocker.test.tsx tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
- `bun run test:vitest -- tests/vitest/admin/pagesClient.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/pages/pageRevisionAutosave.test.ts tests/unit/pages/revisionService.test.ts tests/integration/routes/pages.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `git diff --check`
- Live dev smoke with `coderso-dev-core-host` and `playwright-cli`:
  poisoned `pages:detail:<id>` reload corrected by forced server detail,
  section insert and dirty navigation guard prompted/discarded, reopen surfaced
  recoverable autosave, restore/save/publish succeeded, and the public frontend
  rendered restored content at `http://coderso-a.localhost:3000`.

## Audit Notes

- A fresh local read-only pre-implementation audit compared TASK-454 contracts,
  parent/child state, Page Editor hosts, Pages clients, router blockers,
  Settings guard behavior, revisions routes, and touched tests against HEAD
  `6190242a433d36c89bd233e5478a4471f6fb4481`; no blocking drift was found.
- Final drift was checked against the validated working tree; no unresolved
  TASK-454 contract drift remained.
