# TASK-282-07: Rich Text Report Docs Changelog and Closure

# FileName: TASK-282-07_Report_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Docs + Playwright QA + Release Hygiene
**Estimated Effort:** Medium
**Dependencies:** TASK-282-01, TASK-282-02, TASK-282-03, TASK-282-04, TASK-282-05, TASK-282-06
**Status:** To Do

---

## Overview

Close the Rich Text Section Playwright follow-up family with exact fixed,
deferred, and TASK-256-excluded evidence.

This leaf owns final synchronization after TASK-282 implementation leaves land:
the source report, widget docs, board rows, changelog, and validation matrix.

## Scope Boundary

In scope:

- Refreshing `_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md` with final
  fixed/deferred/TASK-256 classification.
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

- [ ] Build a finding-by-finding closure table for every KOD/A11Y/observation row
  in `REPORT_RICH_TEXT_SECTION_WIDGET.md`.
- [ ] Mark KOD-10 as TASK-256-02 only if TASK-256-07/08 names the exact Rich
  Text Section physical owner path and tests. If that owner is not named, record
  KOD-10 as excluded-pending and create or reference a named future adoption
  task before TASK-282 closure.
- [ ] Record any deferred items with a named future task or explicit reason.
- [ ] Update `_docs/_WIDGETS/RICH_TEXT_SECTION.md` with the final schema,
  editor, runtime, security, media, and accessibility contract.
- [ ] Update `_docs/WIDGETS.md` or `_docs/WIDGET_PACK_MATRIX.md` only if actual
  implementation changed those source-of-truth contracts.
- [ ] Add a changelog entry and update `_docs/_CHANGELOG/README.md`.
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
| KOD-10 | Excluded only with exact owner | TASK-256-02 plus TASK-256-07/08 Rich Text Section editor/test owner; otherwise named future adoption task | TASK-256 / future task |
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
- Task board statistics, task files, changelog, and validation evidence are
  synchronized.
