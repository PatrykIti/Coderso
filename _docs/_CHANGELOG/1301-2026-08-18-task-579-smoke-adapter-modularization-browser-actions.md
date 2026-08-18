# 1301 - TASK-579 Smoke Adapter Modularization Browser Actions

**Date:** 2026-08-18
**Version:** Unreleased
**Tasks:** TASK-579

## Key Changes

### Smoke / Tooling
- The task-517 browser-actions smoke adapter (1519 lines) is modularized into
  clearly named modules (`fixtures.ts`, `public-actions.ts`,
  `admin-actions.ts`) re-exported through a thin index-like
  `browser-actions.ts`, so no module exceeds 1000 physical lines per the
  AGENTS.md gate.
- Owning tests moved accordingly; the shared runtime-smoke entry point and
  the registered suite adapter are unchanged (no new lifecycle, worker, DB
  cleanup, Playwright, or report loop).
- Suite still exercises the full entry-visibility surface: anon cached
  render, private uniform 404, password unlock cycle, cross-entry isolation,
  no shared-cache leak, publish-front-admin parity.

## Validation
- `bun --cwd core lint` + `lint:types` green; task-517 browser-actions suite
  green after split; touched-file line-count gate verified.
- Runtime smoke (`wf579-517smoke`): 6/6 scenarios PASS (report + 6
  screenshots in `_docs/_workflows/_smoke/evidence/task-517/wf579-517smoke/`),
  server up, 0 console errors.
