# TASK-422-03: Validation Live Smoke And Closure
# FileName: TASK-422-03-Validation-Live-Smoke-And-Closure.md

**Parent Task:** TASK-422
**Priority:** High
**Category:** Admin UI / Pages / Editor UX / QA
**Estimated Effort:** Medium
**Dependencies:** TASK-422-02
**Status:** ⏳ To Do

---

## Overview

Close the inline-editing family with full-lane validation, a real-browser
smoke pass that reproduces the audit method, and docs/changelog/board sync.

The audit (`_docs/AUDIT/_cross-canvas-inline-typography-2026-06-10.md`) used an
objective probe: count `contenteditable` regions inside canvas blocks, attempt
single/double click, type, and verify text change. The closure smoke must
re-run that probe and flip its result.

---

## Sub-Tasks

- [ ] Run the targeted validation set and capture final evidence.
- [ ] Synchronize the owned docs, task-board rows, and changelog coverage.
- [ ] Split any residual drift into explicit follow-up tasks before closure if needed.

---

## Implementation Pseudocode

```text
Live smoke (coderso-dev-core-host + playwright-cli, .env credentials):
1. Create page, insert Hero (heading/text/button).
2. Single-click heading -> selected, contenteditable count for active edit = 0.
3. Double-click heading -> [data-page-editor-inline-edit="active"],
   activeElement.isContentEditable = true.
4. Type replacement text, blur -> panel "Primary text" shows the same value.
5. Press Delete while editing -> block NOT deleted (hotkey suppressed).
6. Save + Publish -> front body text contains the typed value.
7. Repeat steps 3-6 for text, quote, statistic, button label, list item.
```

Expected validation set:

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- New inline-edit Vitest suites (contract + UI) green.
- `bun --cwd core lint` and `bun --cwd core lint:types` clean.
- Live smoke transcript/screenshots preserved under `.tmp/` and referenced in
  the changelog entry.

Error handling:

- If any audited block type fails the live probe, fix within this family or
  split an explicit follow-up before closing (no silent scope downgrade per
  `AGENTS.md`).

Regression-test shape:

- The closure adds no new production code; it verifies and records evidence.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session; `.env` credentials only, never
  committed or pasted into reports.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** unchanged.
- **Anti-abuse controls:** not applicable.

---

## Testing Requirements

- Full Vitest UI lane for pages editor suites.
- `bun --cwd core lint`, `bun --cwd core lint:types`.
- `coderso-dev-core-host` + `playwright-cli` live smoke per pseudocode.

---

## Documentation Updates Required

- `docs/guide/` page editor docs (inline editing usage).
- `_docs/PAGE_MODEL.md` if contract surfaces changed.
- `_docs/_TASKS/README.md` board + statistics sync for the family.
- `_docs/_CHANGELOG/` family entry listing all closed TASK-422 leaves.
