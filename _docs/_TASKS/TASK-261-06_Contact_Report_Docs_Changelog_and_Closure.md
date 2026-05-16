# TASK-261-06: Contact Report, Docs, Changelog, and Closure

# FileName: TASK-261-06_Contact_Report_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** QA + Documentation + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-261-01, TASK-261-02, TASK-261-03, TASK-261-04, TASK-261-05
**Status:** To Do

---

## Overview

Close the Contact Playwright follow-up family after implementation leaves land.

This leaf refreshes `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md`, source-of-truth
Contact docs, changelog, task board, and validation evidence. It must not mark
TASK-261 complete while any Contact report finding remains unclassified or any
required validation lane is missing.

## Scope Boundary

This leaf owns docs/QA closure only:

- fixed/deferred/not-reproducible rows in the Contact Playwright report;
- Contact widget docs and general widget docs only where contracts changed;
- board/changelog sync;
- final validation matrix.

This leaf does not implement late code fixes directly. If closure finds a code
gap, reopen the owning TASK-261 implementation leaf or create a new physical
follow-up before marking the row deferred.

## Sub-Tasks

- [ ] Review every Contact report row and mark it `fixed`, `deferred`,
  `not-reproducible`, `TASK-256 shared scope`, or `future physical task`.
- [ ] Add textual admin preview and frontend runtime evidence for high/medium
  rows; screenshot filenames may remain local labels, but do not commit PNGs.
- [ ] Update `_docs/_WIDGETS/CONTACT.md` with final schema/editor/runtime
  behavior.
- [ ] Update `_docs/WIDGETS.md` only if a general Contact listing or shared
  widget contract changed.
- [ ] Update `_docs/WIDGET_PACK_MATRIX.md` only if Contact readiness changes.
- [ ] Add changelog entry and update `_docs/_CHANGELOG/README.md`.
- [ ] Move TASK-261 rows to Done in `_docs/_TASKS/README.md` and update
  statistics.
- [ ] Record final validation commands and any unavoidable blockers.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md` | Add final status/evidence for Contact rows and note TASK-256 exclusions. |
| `_docs/_WIDGETS/CONTACT.md` | Sync final Contact contract. |
| `_docs/WIDGETS.md` | Update only if the source-of-truth widget list/contract changed. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if readiness changed. |
| `_docs/_TASKS/TASK-261*.md` | Update status, dates, and validation evidence. |
| `_docs/_TASKS/README.md` | Move TASK-261 rows and update statistics. |
| `_docs/_CHANGELOG/*.md` | Add TASK-261 changelog entry. |
| `_docs/_CHANGELOG/README.md` | Add the new changelog entry. |

## Implementation Pseudocode

```md
## Final TASK-261 Evidence

| Finding | Status | Fix owner | Test evidence | Notes |
|---|---|---|---|---|
| C2 tel/mailto links | fixed | TASK-261-01 | bun run test:vitest -- tests/vitest/widgets/contact.test.tsx | public/frontend parity verified |
| U2 border clear | TASK-256 shared scope | TASK-256-02 | N/A for TASK-261; optional TASK-256-02 status link if landed | not implemented in TASK-261 |
| C4 public submit | fixed/deferred | TASK-261-02 | <route/security/runtime tests> | must not silently GET current URL |
```

Closure helper shape:

```ts
type ContactFindingStatus =
  | "fixed"
  | "deferred"
  | "not-reproducible"
  | "task-256-shared-scope"
  | "future-physical-task";

function classifyContactFinding(row: ContactFinding, evidence: EvidenceMap): ContactFindingStatus {
  if (evidence.fixedRows.has(row.id)) return "fixed";
  if (row.owner === "TASK-256") return "task-256-shared-scope";
  if (row.needsFutureProductTask) return "future-physical-task";
  if (evidence.notReproducedRows.has(row.id)) return "not-reproducible";
  return "deferred";
}
```

Error handling:

- Do not mark a finding fixed without code/test/runtime evidence or a verified
  not-reproducible note.
- Do not mark U2 fixed under TASK-261 unless TASK-256-02 has landed the shared
  helper and this family only wired a Contact-specific final hook.
- If broad gates fail for unrelated reasons, isolate targeted Contact lanes and
  record the unrelated blocker separately.
- If `_docs/_TASKS/README.md` has parallel task edits, reconcile visible row
  counts carefully and stage only TASK-261-owned changes.

## Security Contract

No API routes are added by this closure leaf.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged by docs closure.
- Reject-unknown validation: closure must verify schema tests for leaves that
  changed Contact schema.
- Anti-abuse: final report must not include raw nonce values, CAPTCHA secrets,
  private URLs, form submissions, provider keys, or privileged debug payloads.
- Secret handling: redact any runtime/log snippets that contain sensitive data.

## Testing Requirements

- Always run `git diff --check`.
- Run the exact suites listed by completed implementation leaves.
- Contact baseline:
  - `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/contact-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when
    renderer integration changed
  - `bun test tests/unit/widgets/validator.test.ts` when schema changed
- Forms/public-write additions:
  - `bun run test:vitest -- tests/vitest/forms/formRuntimeResolver.test.ts`
  - `bun test tests/integration/runtime/pages-runtime.test.ts` when Contact
    runtime hydration changes `publicSite.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/formEmbed.test.tsx` when
    shared Forms runtime script/status attributes change
  - `bun test tests/integration/routes/forms.test.ts`
  - `bun test tests/unit/forms/submissionService.test.ts`
  - `bun test tests/security/codersoSecurityGate.test.ts`
- Final family closure:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run gates:coderso`
  - `bun run scan:security:strict`
  - `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md`
- `_docs/_WIDGETS/CONTACT.md`
- `_docs/WIDGETS.md` only if changed behavior affects the general widget
  contract.
- `_docs/WIDGET_PACK_MATRIX.md` only if Contact readiness changes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and a new changelog entry.

## Changelog Policy

- This leaf must add or verify a changelog entry that lists TASK-261 and every
  completed TASK-261 child task.
- At closure, read `_docs/_CHANGELOG/README.md` and use the next unused
  monotonically increasing number; do not hardcode the changelog number in
  advance.

## Acceptance Criteria

- Every Contact report finding has a final status and owner.
- TASK-256 shared rows are explicitly named and not silently implemented inside
  TASK-261.
- Contact docs match the final schema/editor/runtime behavior.
- Task board statistics, task file statuses, and changelog entries are
  synchronized.
- Required validation gates are green or blocked with exact evidence and a
  final rerun plan.
