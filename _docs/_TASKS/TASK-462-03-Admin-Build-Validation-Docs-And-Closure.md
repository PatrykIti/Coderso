# TASK-462-03: Admin Build Validation Docs And Closure
# FileName: TASK-462-03-Admin-Build-Validation-Docs-And-Closure.md

**Parent Task:** TASK-462
**Priority:** High
**Category:** Architecture / Admin Build / Runtime Boundary
**Estimated Effort:** Medium
**Dependencies:** TASK-462-02-L02
**Status:** ✅ Done
**Completed:** 2026-06-13

---

## Overview

Close the boundary-hardening family after implementation, validation, and docs
sync. This subtask owns proving that the admin production build is green for
the right reason: server/runtime-only code is no longer in the admin browser
import graph.

---

## Sub-Tasks

- [x] Capture final `bun --cwd core build:admin` evidence.
- [x] Capture final targeted Bun/Vitest evidence for affected boundaries.
- [x] Run lint/type gates.
- [x] Update task board, changelog, and any source-of-truth docs.
- [x] Record any remaining non-blocking import-boundary risks as explicit
      follow-up tasks before closing TASK-462.

---

## Implementation Pseudocode

```text
1. Re-run the original failing command:
   - `bun --cwd core build:admin`
   - confirm no Azure/browser export error
   - confirm no argon2/browser wasm resolution error

2. Run bundle gate:
   - `bun run check:admin-bundle`
   - record output path and result

3. Run static import-boundary guard:
   - `bun run check:admin-boundary` or the documented equivalent source
     import-boundary command
   - prove the admin import graph does not reach DB/server/provider/auth
     runtime-only modules through value imports
   - specifically verify `PageEditor`, page editor preview helpers, and
     `pageRendererV2` no longer reach `contentListResolver`,
     `formRuntimeResolver`, `listingRuntimeService`, `filterEngine`,
     runtime-owned `queryBuilderService` entrypoints, media storage adapters,
     security settings runtime loaders, or auth password hashing

4. Run dependency-shaped tests:
   - pure contract suites for listing/filter/settings/media DTOs
   - runtime suites for media storage, listing execution, public content/listing
   - lint/types/root typecheck

5. Inspect final diff:
   - no `@vite-ignore` final dependency hiding
   - no Vite/Rolldown externals or aliases for server SDKs
   - no browser stubs for secrets/provider clients
   - no route/security behavior weakened

6. Close docs:
   - update TASK-462 statuses
   - update `_docs/_TASKS/README.md` counts/tables
   - add changelog entry
   - update architecture/testing docs if new seam is reusable
```

Error handling:

- If build passes only because a bundler ignore/external/alias/stub hides server
  code, do not close this task.
- If a real runtime test regresses, fix the runtime seam rather than replacing
  runtime behavior with test-only fallbacks.
- If a remaining warning is harmless, document why it is harmless and what code
  path proves it cannot execute in the browser.

---

## Testing Requirements

- `bun --cwd core build:admin`
- `bun run check:admin-bundle`
- `bun run check:admin-boundary` or the documented equivalent source
  import-boundary command
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/tsc -p tsconfig.json --noEmit`
- Targeted Bun and Vitest suites from TASK-462-02-L01/L02.
- Before DB/settings-backed Bun tests, load repo env with:
  `set -a && { [ ! -f .env ] || . ./.env; } && set +a`.
- Full `bun run test:bun` and `bun run test:vitest` when the final diff touches
  shared contracts imported by both admin and runtime layers.

---

## Documentation Updates Required

- `_docs/_TASKS/TASK-462*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` entry and `_docs/_CHANGELOG/README.md`
- `_docs/ARCHITECTURE.md`, `_docs/TESTING_STRATEGY.md`, or `tests/README.md`
  if the implementation adds a reusable boundary rule or validation command.

---

## Closeout Notes

- Final `bun --cwd core build:admin` passes and no longer fails on Azure
  `StorageSharedKeyCredential` or argon2/browser resolution.
- Final `bun run check:admin-bundle` passes with entry gzip 46.16 KiB and
  initial static gzip 171.35 KiB, both below budget.
- Final `bun run check:admin-boundary` passes with 690 browser-reachable files
  scanned.
- Full validation passed: `bun run test:bun` reported 1128 pass, 1 skip,
  0 fail; `bun run test:vitest` reported 671 files and 4085 tests passed.
- Final drift pass reported two low-severity items; both were resolved by
  adding assistant provider loader coverage to `check:admin-boundary` and
  updating active TASK-459 references to the new page runtime contract/preparer
  split.
- No Vite/Rolldown provider externals, aliases, `@vite-ignore`, or browser
  stubs were added.
