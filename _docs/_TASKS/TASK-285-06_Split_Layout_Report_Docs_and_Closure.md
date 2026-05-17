# TASK-285-06: Split Layout Report Docs and Closure

# FileName: TASK-285-06_Split_Layout_Report_Docs_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Documentation + Playwright QA + Release Hygiene
**Estimated Effort:** Medium
**Dependencies:** TASK-285-01, TASK-285-02, TASK-285-03, TASK-285-04, TASK-285-05
**Status:** To Do

---

## Overview

Close the TASK-285 Split Layout follow-up family after implementation leaves
land. This leaf owns final evidence and synchronization, not feature
implementation.

Every finding in `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md` must be
marked as fixed, routed to TASK-256, deferred with a reason, or no longer
reproducible with evidence.

## Sub-Tasks

- [ ] Refresh `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md` with final
  textual admin/frontend evidence for each finding.
- [ ] Update `_docs/_WIDGETS/SPLIT_LAYOUT.md` with the final data, editor, and
  runtime contract.
- [ ] Update `_docs/WIDGETS.md` only for intentional shared contract changes.
- [ ] Update `_docs/WIDGET_PACK_MATRIX.md` only if Split Layout readiness or
  pack completeness changes.
- [ ] Move TASK-285 and completed leaves through task-board status updates.
- [ ] Add changelog coverage and update `_docs/_CHANGELOG/README.md` when the
  family or leaf is completed.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md` | Add fixed/routed/deferred status and final textual evidence for every finding. |
| `_docs/_WIDGETS/SPLIT_LAYOUT.md` | Document final Split Layout editor/runtime/data behavior. |
| `_docs/WIDGETS.md` | Update only when shared widget rules change. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if readiness/completeness changes. |
| `_docs/_TASKS/TASK-285*.md` | Update statuses and validation evidence. |
| `_docs/_TASKS/README.md` | Sync board rows and statistics. |
| `_docs/_CHANGELOG/*.md`, `_docs/_CHANGELOG/README.md` | Add/list final changelog entry when any TASK-285 item moves to `Done`. |

## Implementation Pseudocode

```ts
type FindingStatus = "fixed" | "task-256" | "deferred" | "not-reproducible";

function classifySplitLayoutFinding(findingId: string): FindingStatus {
  if (isSharedContractFinding(findingId)) return "task-256";
  if (hasTask285Evidence(findingId)) return "fixed";
  if (hasExplicitDeferral(findingId)) return "deferred";
  return "not-reproducible";
}

function buildClosureMatrix(findings: SplitLayoutFinding[]) {
  return findings.map((finding) => ({
    id: finding.id,
    status: classifySplitLayoutFinding(finding.id),
    evidence: getAdminFrontendEvidence(finding.id),
  }));
}
```

Closure flow:

1. Re-read the current report, TASK-256 status, Split Layout code, and tests.
2. Build a finding-by-finding ledger before editing docs.
3. Mark BUG-01/BUG-02 and shared public-placeholder/token rows as TASK-256
   routed unless the exact TASK-256 leaf has landed and provides evidence.
4. Record admin and frontend textual evidence for TASK-285 fixes.
5. Update task statuses, board stats, changelog, and docs in the same closure
   commit.

Error handling:

- Do not mark a finding fixed from screenshots alone; use textual DOM/editor
  state, test names, and exact commit evidence.
- If a broad gate fails for an unrelated known reason, record it separately and
  keep targeted TASK-285 validation visible.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: closure docs must reference validator coverage if
  schema fields changed.
- Anti-abuse: report evidence must not include secrets, private URLs, session
  cookies, API keys, or privileged internal diagnostics.
- Secret handling: redact any local/admin-sensitive data from Playwright notes
  and changelog.

## Testing Requirements

- `git diff --check`
- `bun run test:vitest -- tests/vitest/widgets/splitLayout.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/split-layout-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when renderer
  output changed during the family
- `bun run test:vitest -- tests/vitest/pageBuilder/visualPanel.test.tsx` when
  the family consumes the TASK-256 shared variant helper through VisualPanel
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` when
  the family consumes final TASK-256 token semantics
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults changed
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- This leaf is the documentation and closure owner for TASK-285.
- Keep TASK-256-routed rows explicit so the report does not imply Split Layout
  implemented shared contract work.

## Changelog Policy

- Add a final TASK-285 changelog entry when this leaf or the umbrella moves to
  `Done`.
- Update `_docs/_CHANGELOG/README.md` with the new entry and task IDs.

## Acceptance Criteria

- Every Split Layout report finding has a final status and evidence path.
- TASK-285 docs, source docs, report, changelog, and board agree.
- Required validation commands are recorded with exact pass/fail/blocker status.
- No unrelated TASK-256, TASK-279 through TASK-284, or other widget report edits
  are included in the closure commit.
