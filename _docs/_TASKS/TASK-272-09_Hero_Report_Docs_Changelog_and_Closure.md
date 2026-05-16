# TASK-272-09: Hero Report, Docs, Changelog, and Closure

# FileName: TASK-272-09_Hero_Report_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Hero + Playwright QA + Documentation
**Estimated Effort:** Medium
**Dependencies:** TASK-272-01, TASK-272-02, TASK-272-03, TASK-272-04, TASK-272-05, TASK-272-06, TASK-272-07, TASK-272-08, TASK-256-08
**Status:** To Do

---

## Overview

Close the Hero follow-up family with report evidence, widget docs, changelog,
board sync, and final validation.

This leaf must explicitly prove that every
`_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md` finding is either fixed by TASK-256,
fixed by TASK-272, classified as page-shell scope, or intentionally deferred.

## Source Findings

- Entire `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md`, especially finding sections
  at lines `126-261`, priority summary at lines `265-299`, and screenshot labels
  at lines `319-331`.
- TASK-272 umbrella scope and exclusion matrices.
- TASK-256 final fixed/deferred notes after TASK-256-08 lands.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md` | Add fixed/deferred/page-shell textual evidence. Keep PNG screenshot files out of git. |
| `_docs/_WIDGETS/HERO.md` | Reflect final Hero schema, editor, runtime, preset, media, and performance behavior. |
| `_docs/WIDGETS.md` | Update only if shared widget contract text changed outside TASK-256. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if Hero pack completeness/readiness changes. |
| `_docs/_TASKS/TASK-272*.md` | Mark completed leaves with dates and final validation notes. |
| `_docs/_TASKS/README.md` | Move completed TASK-272 rows to Done and update statistics. |
| `_docs/_CHANGELOG/{N}-2026-05-16-task-272-hero-widget-followups.md` | Add the final changelog entry. |
| `_docs/_CHANGELOG/README.md` | Add the changelog index row. |

## Implementation Pseudocode

```ts
type HeroFindingStatus =
  | "fixed-task-256"
  | "fixed-task-272"
  | "page-shell-follow-up"
  | "deferred";

const findingMap = [
  { id: "BUG-01", status: "fixed-task-272", evidence: "TASK-272-01 validation" },
  { id: "BUG-02", status: "fixed-task-256", evidence: "TASK-256-06-03 validation" },
  { id: "BUG-03", status: "page-shell-follow-up", evidence: "TASK-256-08 classification" },
];

function assertEveryHeroReportFindingMapped(findings: string[]) {
  const missing = findings.filter((finding) => !findingMap.some((item) => item.id === finding));
  if (missing.length > 0) throw new Error(`Unmapped Hero findings: ${missing.join(", ")}`);
}
```

Closure checklist:

- Re-read the final report and all TASK-272 files.
- Verify every status/date is consistent.
- Verify `_docs/_TASKS/README.md` counts match visible rows.
- Verify changelog numbering is monotonic against `_docs/_CHANGELOG/README.md`.
- Verify page-shell findings are not claimed as Hero fixes.
- Run final validation commands and paste exact command results into this leaf.

## Security Contract

No API routes are added by this docs/closure leaf.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: closure must verify schema tests ran for any
  schema-changing leaves.
- Anti-abuse: closure must verify safe-link, media, rich-text, import/export,
  and preset tests ran where applicable.
- Secret handling: reports and changelog must not include secrets, provider
  keys, private media tokens, or local-only screenshots.

## Testing Requirements

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/hero.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/heroEditors.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if any
  renderer output changed in the family.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear semantics changed in the family.
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` if rich
  copy or links changed in the family.
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults changed.
- `bun test tests/unit/widgets/registry.test.ts` if registry/variant wiring
  changed.
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md`
- `_docs/_WIDGETS/HERO.md`
- `_docs/WIDGETS.md` only for shared contract changes
- `_docs/WIDGET_PACK_MATRIX.md` only for pack readiness changes
- `_docs/_TASKS/TASK-272*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/{N}-2026-05-16-task-272-hero-widget-followups.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

- The Hero report has no unmapped finding.
- TASK-272 does not claim TASK-256 shared-contract fixes as its own.
- Page-shell findings are visibly classified outside Hero widget scope.
- All TASK-272 files are `Done` with dates, validation notes, and final
  evidence.
- Changelog and board statistics are synchronized.
- Final validation is recorded with exact commands and results.
