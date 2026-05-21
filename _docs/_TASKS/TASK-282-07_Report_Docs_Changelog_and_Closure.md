# TASK-282-07: Rich Text Report Docs Changelog and Closure

# FileName: TASK-282-07_Report_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Docs + Playwright QA + Release Hygiene
**Estimated Effort:** Medium
**Dependencies:** TASK-282-01, TASK-282-02, TASK-282-03, TASK-282-04, TASK-282-05, TASK-282-08, TASK-282-09, TASK-282-06
**Status:** In Progress (2026-05-21)

---

## Overview

Close the Rich Text Section Playwright follow-up family with exact fixed,
deferred, and TASK-256-excluded evidence.

Closure for this family must allow explicit report statuses beyond `fixed` and
`deferred`: `fixed-shared`, `not-a-bug`, `accepted limitation`, and
`documented only` are valid end states when backed by source evidence and a
clear reason.

This leaf owns final synchronization after TASK-282 implementation leaves land:
the source report, widget docs, board rows, changelog, and validation matrix.


## Current Blocker

Final TASK-282 closure is still blocked in this worktree environment. The
implementation and focused test coverage are in place, but:

- `playwright-cli` is not available in `PATH`, so no fresh constrained
  admin/frontend refresh session could be recorded from this worktree.
- `bun run scan:security:strict` cannot complete here because `semgrep`,
  `trivy`, and `gitleaks` are not installed in `PATH`.

Keep the family `In Progress` until that evidence is captured in a provisioned
environment and the strict scan finishes end-to-end.

## Scope Boundary

In scope:

- Refreshing `_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md` with final
  fixed, fixed-shared, not-a-bug, accepted-limitation, documented-only,
  deferred, and TASK-256 classification.
- Updating `_docs/_WIDGETS/RICH_TEXT_SECTION.md` and any source-of-truth docs
  touched by actual implementation.
- Adding the final TASK-282 changelog entry and `_docs/_CHANGELOG/README.md`
  index row.
- Moving task files and `_docs/_TASKS/README.md` rows to `Done` only after code,
  tests, docs, and report evidence are complete.

Out of scope:

- Implementing product fixes directly in this closure leaf.
- Marking TASK-256 rows fixed unless TASK-256 implementation has landed and its
  own validation proves the shared contract.
- Committing screenshot PNGs from `_docs/PLAYWRIGHT`; keep screenshot references
  textual unless repo policy changes.

## Sub-Tasks

- [x] Build a finding-by-finding closure table for every KOD/A11Y/observation row
  in `REPORT_RICH_TEXT_SECTION_WIDGET.md`, using an explicit status set such as
  `fixed`, `fixed-shared`, `not-a-bug`, `accepted limitation`,
  `documented only`, or `deferred`.
- [x] Close KOD-10 through TASK-282-09 or leave TASK-282-09 open with explicit
  remaining validation. Do not mark KOD-10 as closed by TASK-256 unless
  TASK-256 closure names the exact Rich Text Section physical owner path and
  tests.
- [x] Close KOD-13 only when both the image/media-picker slice (TASK-282-05) and
  attachment/safe embed slice (TASK-282-08) have final fixed/deferred evidence.
- [x] Record any deferred items with a named future task or explicit reason.
- [ ] Run or record a constrained Playwright/admin/frontend refresh for visual
  and runtime rows that cannot be proven by unit/Vitest alone: output-source UI,
  article max-width, TOC focus, section labeling, inline media, attachments,
  safe embeds, and text-color clear. Capture textual run/session evidence in
  the report; do not commit temporary screenshot PNGs.
- [x] Update `_docs/_WIDGETS/RICH_TEXT_SECTION.md` with the final schema,
  editor, runtime, security, media, and accessibility contract.
- [x] Update `_docs/WIDGETS.md` or `_docs/WIDGET_PACK_MATRIX.md` only if actual
  implementation changed those source-of-truth contracts.
- [x] Add a changelog entry and update `_docs/_CHANGELOG/README.md`.
- [ ] Move TASK-282 umbrella/leaves and board rows to `Done` with dates only
  after validation is complete.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md` | Add final fixed/deferred/TASK-256 classification and validation evidence. |
| `_docs/_WIDGETS/RICH_TEXT_SECTION.md` | Document final fields, editor modes, runtime behavior, accessibility, sanitizer, and media policy. |
| `_docs/WIDGETS.md` | Update only if shared widget overview changes. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if pack readiness/completeness changes. |
| `_docs/_TASKS/TASK-282*.md` | Move status to `Done (YYYY-MM-DD)` only after validation. |
| `_docs/_TASKS/README.md` | Move rows to Done and recompute statistics. |
| `_docs/_CHANGELOG/<next>-YYYY-MM-DD-task-282-rich-text-section-widget-followups.md` | Add final release note with validation. |
| `_docs/_CHANGELOG/README.md` | Add the final changelog index row. |

## Implementation Pseudocode

Closure matrix:

```md
| Finding | Final status | Evidence | Owner |
|---|---|---|---|
| KOD-01 | Fixed | TASK-282-01 commit + Vitest evidence | TASK-282 |
| KOD-06 | Not-a-bug | Documented deterministic TOC behavior + report evidence | TASK-282-07 |
| KOD-10 | Fixed/deferred by physical owner | TASK-282-09 commit + editor Vitest evidence, or explicit open TASK-282-09 blocker | TASK-282-09 |
| KOD-13 images | Fixed/deferred by physical owner | TASK-282-05 commit + media render/editor evidence | TASK-282-05 |
| KOD-13 attachments/embeds | Fixed/deferred by physical owner | TASK-282-08 commit + attachment/embed render/editor evidence | TASK-282-08 |
```

Board update:

```text
To Do count = previous To Do - completed TASK-282 rows
Done count = previous Done + completed TASK-282 rows
```

Changelog entry:

```md
# <next>-YYYY-MM-DD-task-282-rich-text-section-widget-followups

- Lists TASK-282 and all completed leaves.
- Includes exact validation commands and any skipped/manual gates.
```

## Error Handling

- If any implementation leaf remains incomplete, do not move the umbrella to
  `Done`.
- If validation fails for unrelated existing reasons, isolate and document the
  failure instead of claiming closure.
- If `_docs/_TASKS/README.md` changed on `feature/corrections`, preserve both
  task families and recompute counts before the closure commit.

## Security Contract

No API routes are added by this closure leaf.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: closure must verify that any added schema fields
  remained strict.
- Anti-abuse: closure evidence must not include secrets, private media URLs,
  auth tokens, raw nonce values, or large pasted content.
- Secret handling: redact sensitive values from report/changelog notes.

## Testing Requirements

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/richTextSection.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/rich-text-section-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` when schema changed
- touched post-richtext/media lanes from implementation leaves
- constrained Playwright/admin/frontend refresh evidence for report rows that
  are visual or runtime-only; if local Playwright CLI/session access is
  unavailable, record the blocker and keep the affected row out of `Fixed`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`
- If any implementation leaf landed independently before this closure leaf,
  verify that leaf's own commit recorded `bun run gates:coderso`; otherwise run
  it here and leave the leaf out of `Done` until the missing validation is
  resolved.

## Documentation Updates Required

- This leaf is the documentation closure owner for TASK-282.
- No TASK-282 task may be marked `Done` without a matching changelog entry and
  updated board statistics.

## Changelog Policy

- Create the final TASK-282 changelog entry before marking this leaf `Done`.
- If previous leaves created their own changelog entries, reference them instead
  of duplicating release notes.

## Acceptance Criteria

- Every source-report finding has a final status with evidence.
- TASK-256-owned rows are not claimed as TASK-282 fixes.
- Source-of-truth widget docs match the final code.
- Every closed report row uses an explicit status vocabulary that can represent
  real `not-a-bug`, `accepted limitation`, and `documented only` outcomes
  instead of forcing them into `fixed` or `deferred`.
- Task board statistics, task files, changelog, and validation evidence are
  synchronized.
