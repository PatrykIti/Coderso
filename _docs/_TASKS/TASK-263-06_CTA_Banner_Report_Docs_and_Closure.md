# TASK-263-06: CTA Banner Report Docs and Closure

# FileName: TASK-263-06_CTA_Banner_Report_Docs_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Documentation + Playwright QA + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-263-01, TASK-263-02, TASK-263-03, TASK-263-04, TASK-263-05
**Status:** Done (2026-05-17)

---

## Overview

Close the CTA Banner Playwright follow-up family after implementation leaves
land. This leaf owns evidence refresh, docs/changelog/board synchronization, and
final validation recording for TASK-263.

It must not mark the family complete merely because task docs exist. Closure
requires every report row to be fixed, explicitly routed to TASK-256 shared
scope, or deferred to a named future task with a reason.

## Sub-Tasks

- [ ] Re-read `_docs/PLAYWRIGHT/REPORT_CTA_BANNER_WIDGET.md` and build a final
  fixed/routed/deferred matrix for all BUG, UX, BF, and A rows.
- [ ] Update the report with textual admin/frontend evidence after code changes
  are validated. Do not commit PNG screenshots.
- [ ] Update `_docs/_WIDGETS/CTA_BANNER.md` with the final schema, editor,
  runtime, accessibility, and safety contract.
- [ ] Update `_docs/WIDGETS.md` only when a shared widget contract changed.
- [ ] Update `_docs/WIDGET_PACK_MATRIX.md` only when CTA Banner pack readiness or
  completeness changed.
- [ ] Add the TASK-263 changelog entry and update `_docs/_CHANGELOG/README.md`.
- [ ] Move TASK-263 and completed leaves to `Done`, update
  `_docs/_TASKS/README.md` statistics and rows, and verify board consistency.
- [ ] Record exact validation commands and results in the task/changelog notes.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_CTA_BANNER_WIDGET.md` | Add final fixed/routed/deferred evidence and validation notes. |
| `_docs/_WIDGETS/CTA_BANNER.md` | Sync final CTA Banner user-facing contract. |
| `_docs/WIDGETS.md` | Update only for shared widget contract changes. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only when pack readiness/completeness changes. |
| `_docs/_TASKS/TASK-263*.md` | Update statuses, implementation notes, and closure evidence. |
| `_docs/_TASKS/README.md` | Move rows and statistics when status changes. |
| `_docs/_CHANGELOG/*.md` | Add final TASK-263 changelog entry. |
| `_docs/_CHANGELOG/README.md` | Add the changelog index row. |

## Implementation Pseudocode

Coverage matrix:

```md
| Report ID | Final status | Evidence | Owner |
|---|---|---|---|
| BUG-01 | Fixed | test + DOM excerpt | TASK-263-01 |
| UX-01 | Fixed | CTA text/button Clear wiring using the landed shared helper contract | TASK-263-03 consuming TASK-256-02 |
| BF-10 | Deferred | named future task if motion is intentionally postponed | TASK-263-05 or future task |
```

Board update flow:

```text
1. Re-read _docs/_TASKS/README.md from the current branch.
2. Move only TASK-263 rows whose task files are marked Done.
3. Recompute To Do / In Progress / Done counts.
4. Check the diff only changes TASK-263 rows and statistics.
```

Error handling:

- If a report row is still reproducible and not owned by a completed leaf, keep
  the relevant task open.
- If a row is shared-contract scope, cite the exact TASK-256 leaf and current
  status instead of claiming CTA closure.
- If a broad validation command fails for unrelated pre-existing reasons, record
  the targeted passing evidence and the unrelated failure separately.
- If local Playwright replay cannot run, keep textual evidence from targeted
  Vitest/Bun checks and mark Playwright replay as blocked with the concrete
  blocker.

## Security Contract

No API routes are added by this closure leaf.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: closure must confirm schema tests ran for every
  new persisted field.
- Anti-abuse: report/docs/changelog must not include private URLs, secrets,
  nonce values, raw tokens, or provider credentials.
- Secret handling: never paste privileged payloads into report evidence.

## Testing Requirements

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/ctaBanner.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/cta-banner-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when renderer
  assertions changed
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` when
  link attrs changed
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` when
  shared Clear/none style behavior was touched
- `bun test tests/unit/widgets/validator.test.ts` when schemas/defaults changed
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_CTA_BANNER_WIDGET.md`
- `_docs/_WIDGETS/CTA_BANNER.md`
- `_docs/WIDGETS.md` only if shared wording changed
- `_docs/WIDGET_PACK_MATRIX.md` only if readiness/completeness changed
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md`

## Changelog Policy

- This leaf creates or updates the final TASK-263 changelog entry unless a prior
  implementation leaf already did so.
- The changelog must list TASK-263 and summarize fixed, TASK-256-routed, and
  deferred report scope.

## Acceptance Criteria

- Every row in `REPORT_CTA_BANNER_WIDGET.md` has a final fixed/routed/deferred
  status with evidence.
- CTA Banner docs match the final schema/editor/runtime behavior.
- `_docs/_TASKS/README.md`, task statuses, and changelog index are synchronized.
- Final validation evidence is recorded and scoped to CTA Banner plus any shared
  helper touched by this family.
