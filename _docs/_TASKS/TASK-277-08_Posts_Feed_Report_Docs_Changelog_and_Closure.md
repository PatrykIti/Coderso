# TASK-277-08: Posts Feed Report, Docs, Changelog, and Closure

# FileName: TASK-277-08_Posts_Feed_Report_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Posts Feed + Playwright QA + Documentation
**Estimated Effort:** Medium
**Dependencies:** TASK-277-01, TASK-277-02, TASK-277-03, TASK-277-04, TASK-277-05, TASK-277-06, TASK-277-07, TASK-256-08
**Status:** To Do

---

## Overview

Close the Posts Feed follow-up family with report evidence, widget docs,
changelog, board sync, and final validation.

This leaf must explicitly prove that every
`_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md` finding is either fixed by
TASK-256, fixed by TASK-277, routed to a non-widget platform follow-up, or
intentionally deferred.

## Source Findings

- Entire `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md`, especially findings at
  lines `121-262`, summary tables at lines `283-332`, and screenshot labels at
  lines `342-358`.
- TASK-277 umbrella scope and exclusion matrices.
- TASK-256 final fixed/deferred notes after TASK-256-08 lands.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md` | Add fixed/deferred textual evidence. Keep PNG screenshot files out of git. |
| `_docs/_WIDGETS/POSTS_FEED.md` | Reflect final Posts Feed schema, editor, and runtime behavior. |
| `_docs/WIDGETS.md` | Update only if shared widget contract text changed outside TASK-256. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if Posts Feed pack completeness/readiness changes. |
| `_docs/_TASKS/TASK-277*.md` | Mark completed leaves with dates and final validation notes. |
| `_docs/_TASKS/README.md` | Move completed TASK-277 rows to Done and update statistics. |
| `_docs/_CHANGELOG/{N}-2026-05-16-task-277-posts-feed-widget-followups.md` | Add the final changelog entry. |
| `_docs/_CHANGELOG/README.md` | Add the changelog index row. |

## Implementation Pseudocode

```ts
type PostsFeedFindingStatus =
  | "fixed-task-256"
  | "fixed-task-277"
  | "platform-follow-up"
  | "deferred";

const findingMap = [
  { id: "BUG-01", status: "fixed-task-277", evidence: "TASK-277-01 validation" },
  { id: "BUG-06", status: "platform-follow-up", reason: "global auth/session refresh" },
  { id: "A1", status: "fixed-task-256", evidence: "shared Content List renderer validation" },
];

function assertEveryPostsFeedFindingMapped(findings: Finding[]) {
  const missing = findings.filter((finding) => !findingMap.some((item) => item.id === finding.id));
  if (missing.length > 0) throw new Error(`Unmapped Posts Feed findings: ${missing.join(", ")}`);
}
```

Closure checklist:

- Re-read the final report and all TASK-277 files.
- Verify every status/date is consistent.
- Verify `_docs/_TASKS/README.md` counts match visible rows.
- Verify changelog numbering is monotonic against `_docs/_CHANGELOG/README.md`.
- Run final validation commands and paste exact command results into this leaf.

## Security Contract

No API routes are added by this docs/closure leaf.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: closure must verify schema tests ran for any
  schema-changing leaves.
- Anti-abuse: closure must verify safe-link/media/pagination tests ran where
  applicable.
- Secret handling: reports and changelog must not include secrets, provider
  keys, private media tokens, or local-only screenshots.

## Testing Requirements

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/postsFeedWidget.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx` if public
  page render output changed in the family.
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults changed.
- `bun test tests/unit/widgets/registry.test.ts` if registry/variant wiring
  changed.
- `bun test tests/integration/posts/posts-runtime-flow.test.ts` if DB-backed
  posts runtime behavior changed and `DATABASE_URL` is reachable.
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md`
- `_docs/_WIDGETS/POSTS_FEED.md`
- `_docs/WIDGETS.md` only for shared contract changes
- `_docs/WIDGET_PACK_MATRIX.md` only for pack readiness changes
- `_docs/_TASKS/TASK-277*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/{N}-2026-05-16-task-277-posts-feed-widget-followups.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

- The Posts Feed report has no unmapped finding.
- TASK-277 does not claim TASK-256 shared-contract fixes or global auth/session
  fixes as its own.
- All TASK-277 files are `Done` with dates, validation notes, and final evidence.
- Changelog and board statistics are synchronized.
- Final validation is recorded with exact commands and results.
