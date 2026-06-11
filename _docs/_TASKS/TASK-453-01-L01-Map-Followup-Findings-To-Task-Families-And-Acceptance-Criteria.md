# TASK-453-01-L01: Map Followup Findings To Task Families And Acceptance Criteria
# FileName: TASK-453-01-L01-Map-Followup-Findings-To-Task-Families-And-Acceptance-Criteria.md

**Parent Subtask:** TASK-453-01
**Priority:** High
**Category:** Pages / Audit Governance / Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-453-01
**Status:** ⏳ To Do

---

## Overview

Build the matrix that links every high/medium/low finding in the aggregate
follow-up report to the concrete task families, acceptance criteria, and final
evidence required for closure.

The matrix must also reconcile the follow-up report's §4/§5 summary-table rows
against the per-target audit evidence (`_docs/AUDIT/*-2026-06-10.md`) and the
2026-06-11 drift-audit reports in `_docs/AUDIT/TASKS/`: where a table row is
contradicted by per-target evidence, the row is annotated as explicitly
superseded with the citation instead of being treated as an open finding.
Named examples: the faq variant-to-front ⚠️ row in the follow-up §4 table is
superseded by `_docs/AUDIT/faq-2026-06-10.md` §4 ("Variant control works
end-to-end"); the testimonials cards==grid identical-geometry ⚠️ is owned by
TASK-434's extended acceptance (`cards` must gain a visibly distinct per-item
card surface while `grid` stays flat).

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```md
| Followup finding | Severity | Owner family | Acceptance proof |
| --- | --- | --- | --- |
| Dedicated controls drift | High | TASK-421, TASK-424, TASK-426..450 | Vitest UI + live panel replay |
| Runtime responsive delivery | High | TASK-423 | public mobile/tablet computed styles |
| faq variant-to-front ⚠️ (§4 table) | Low | None — superseded by `_docs/AUDIT/faq-2026-06-10.md` §4 ("Variant control works end-to-end") | superseded annotation with citation; only the segmented-pill widget drift remains (TASK-421/TASK-433) |
| testimonials cards==grid geometry ⚠️ (§4 table) | Low | TASK-434 (extended acceptance: `cards` gains a distinct card surface vs flat `grid`) | published-front cards vs grid visible divergence |
```

Owner files:

- `_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md`
- `_docs/_TASKS/README.md`

Validation commands:

- `git diff --check`

Expected data flow:

- Matrix inputs: `_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md`, the per-target
  `_docs/AUDIT/*-2026-06-10.md` audits, and the 2026-06-11 drift-audit reports
  in `_docs/AUDIT/TASKS/`.
- Every aggregate finding resolves to a concrete task family or families.
- Every follow-up §4/§5 table row is reconciled against the per-target audit
  evidence; rows contradicted by it are annotated as superseded with the
  citation, never silently dropped, so the matrix does not demand fixes for
  phantom open findings.
- Acceptance proof is explicit and evidence-shaped, not narrative-only.
- Residual risks remain visible until a family is closed or superseded.

Error handling:

- Unowned findings must produce a new follow-on task, not a silent note.
- Split ownership remains explicit when more than one family is required.
- A follow-up table row that no family intends to change must carry an
  explicit superseded or won't-fix annotation with named evidence, not an
  open ⚠️.

Regression-test shape:

- Documentation audit only; no production-code changes.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** not applicable.
- **RBAC:** not applicable.
- **CSRF:** not applicable.
- **Rate-limit bucket:** not applicable.
- **Validation:** matrix entries must cite real task ids and real evidence types.

---

## Testing Requirements

- `git diff --check`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
