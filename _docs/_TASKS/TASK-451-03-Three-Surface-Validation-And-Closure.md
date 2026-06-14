# TASK-451-03: Three Surface Validation And Closure
# FileName: TASK-451-03-Three-Surface-Validation-And-Closure.md

**Parent Task:** TASK-451
**Priority:** High
**Category:** Pages / Preview / QA
**Estimated Effort:** Medium
**Dependencies:** TASK-451-02
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-11

---

## Overview

Close the parity family with a fresh 3-surface replay: canvas, preview, and
front must all render truthfully, and the cross-parity shell observations must
be updated with final evidence.

---

## Sub-Tasks

- [x] Run the targeted validation set and capture final evidence.
- [x] Synchronize the owned docs, task-board rows, and changelog coverage.
- [x] Split any residual drift into explicit follow-up tasks before closure if needed.

## Implementation Pseudocode

```text
1. Exercise canvas, preview, and public front for the same styled Page document.
2. Run the targeted Bun preview/runtime suites, relevant editor Vitest suites, and lint/type checks.
3. Replay the preview dialog/browser audit steps and confirm 3-surface parity plus shell polish.
4. Sync preview docs, board rows, and changelog evidence before closure.
Validation commands:
- `bun run test:bun`
- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
```

## Security Contract

- **Endpoint visibility:** existing public page and public `/preview` routes only.
- **Auth model:** published pages remain anonymous; preview remains token-gated.
- **RBAC:** unchanged.
- **CSRF:** not applicable to public reads.
- **Rate-limit bucket:** existing public and preview buckets.
- **Validation:** the parity replay must use normalized Page documents and keep preview-token protections intact.
- **Anti-abuse controls:** preview TTL, hashing, and target checks remain unchanged.

## Testing Requirements

- Relevant Bun preview/runtime suites.
- Relevant Page editor UI Vitest suites.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` three-surface replay.

---

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` entry on completion

---

## Completion Notes

Closure executed 2026-06-11: canvas/preview/front replay PASS (3/3 surfaces; draft-only headline visible in preview, absent on published front), suites green, changelog 1163.
