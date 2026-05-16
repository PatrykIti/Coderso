# TASK-269-06: Form Embed Report, Docs, and Closure

# FileName: TASK-269-06_Form_Embed_Report_Docs_and_Closure.md

**Priority:** Medium
**Category:** QA + Documentation + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-269-01, TASK-269-02, TASK-269-03, TASK-269-04, TASK-269-05
**Status:** To Do

---

## Overview

Close the Form Embed Playwright follow-up family after implementation leaves
land.

This leaf refreshes `_docs/PLAYWRIGHT/REPORT_FORM_EMBED_WIDGET.md`, Form Embed
source-of-truth docs, changelog, task board, and validation evidence. It must
not mark TASK-269 complete while any Form Embed report finding remains
unclassified or any required validation lane is missing.

## Scope Boundary

This leaf owns docs/QA closure only:

- fixed/deferred/not-reproducible rows in the Form Embed Playwright report;
- explicit TASK-256 shared-scope notes for U3/U4 and any shared helper that
  remained outside TASK-269;
- Form Embed widget docs and general widget docs only where contracts changed;
- board/changelog sync;
- final validation matrix.

This leaf does not implement late code fixes directly. If closure finds a code
gap, reopen the owning TASK-269 implementation leaf or create a new physical
follow-up before marking the row deferred.

## Sub-Tasks

- [ ] Review every Form Embed report row and mark it `fixed`, `deferred`,
  `not-reproducible`, `TASK-256 shared scope`, or `future physical task`.
- [ ] Add textual admin preview and frontend runtime evidence for high/medium
  rows; screenshot filenames may remain local labels, but do not commit PNGs.
- [ ] Update `_docs/_WIDGETS/FORM_EMBED.md` with final schema/editor/runtime
  behavior.
- [ ] Update `_docs/WIDGETS.md` only if a general Form Embed listing or shared
  widget contract changed.
- [ ] Update `_docs/WIDGET_PACK_MATRIX.md` only if Form Embed readiness changes.
- [ ] Add changelog entry and update `_docs/_CHANGELOG/README.md`.
- [ ] Move TASK-269 rows to Done in `_docs/_TASKS/README.md` and update
  statistics.
- [ ] Record final validation commands and any unavoidable blockers.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_FORM_EMBED_WIDGET.md` | Add final status/evidence for Form Embed rows and note TASK-256 exclusions. |
| `_docs/_WIDGETS/FORM_EMBED.md` | Sync final Form Embed contract. |
| `_docs/WIDGETS.md` | Update only if the source-of-truth widget list/contract changed. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if readiness changed. |
| `_docs/_TASKS/TASK-269*.md` | Update status, dates, and validation evidence. |
| `_docs/_TASKS/README.md` | Move TASK-269 rows and update statistics. |
| `_docs/_CHANGELOG/*.md` | Add TASK-269 changelog entry. |
| `_docs/_CHANGELOG/README.md` | Add the new changelog entry. |

## Implementation Pseudocode

```md
## Final TASK-269 Evidence

| Finding | Status | Fix owner | Test evidence | Notes |
|---|---|---|---|---|
| C2 radio fields | future Forms field-model scope | TASK-269-02 classification plus future Forms field-model task | validation owner evidence | current Forms model rejects radio |
| U3 CSS var picker | TASK-256 shared scope | TASK-256-02 | recorded TASK-256-02 validation evidence | not implemented in TASK-269 |
| W11 CAPTCHA/honeypot | nonce projection fixed / CAPTCHA-honeypot policy deferred | TASK-269-05 plus future Forms/public-write task if needed | route/security/runtime command list | current resolver projects `submissionNonce`; no widget-owned switches |
```

Closure helper shape:

```ts
type FormEmbedFindingStatus =
  | "fixed"
  | "deferred"
  | "not-reproducible"
  | "task-256-shared-scope"
  | "future-physical-task";

function classifyFormEmbedFinding(
  row: FormEmbedFinding,
  evidence: EvidenceMap
): FormEmbedFindingStatus {
  if (evidence.fixedRows.has(row.id)) return "fixed";
  if (row.owner === "TASK-256") return "task-256-shared-scope";
  if (row.needsFutureFormsTask) return "future-physical-task";
  if (evidence.notReproducedRows.has(row.id)) return "not-reproducible";
  return "deferred";
}
```

Error handling:

- Do not mark a finding fixed without code/test/runtime evidence or a verified
  not-reproducible note.
- Do not mark U3/U4 fixed under TASK-269 unless TASK-256-02 landed the shared
  helper and this family only wired a Form Embed-specific final hook.
- If public-write anti-abuse needs backend route changes outside Form Embed,
  create or link a future Forms task before marking W11 deferred.
- If broad gates fail for unrelated reasons, isolate targeted Form Embed lanes
  and record the unrelated blocker separately.
- If `_docs/_TASKS/README.md` has parallel task edits, reconcile visible row
  counts carefully and stage only TASK-269-owned changes.

## Security Contract

No API routes are added by this closure leaf.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged by docs closure.
- Reject-unknown validation: closure must verify schema tests for leaves that
  changed Form Embed schema.
- Anti-abuse: final report must not include raw nonce values, CAPTCHA secrets,
  private URLs, form submissions, provider keys, or privileged debug payloads.
- Secret handling: redact any runtime/log snippets that contain sensitive data.

## Testing Requirements

- Always run `git diff --check`.
- Run the exact suites listed by completed implementation leaves.
- Form Embed baseline:
  - `bun run test:vitest -- tests/vitest/widgets/formEmbed.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/form-embed-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/formRuntimeScript.test.ts`
    when `formRuntimeScript.ts` changes
  - `bun test tests/unit/widgets/validator.test.ts` when schema/variants change
- Forms/public-write additions:
  - `bun run test:vitest -- tests/vitest/forms/formRuntimeResolver.test.ts`
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

- `_docs/PLAYWRIGHT/REPORT_FORM_EMBED_WIDGET.md`
- `_docs/_WIDGETS/FORM_EMBED.md`
- `_docs/WIDGETS.md` only if changed behavior affects the general widget
  contract.
- `_docs/WIDGET_PACK_MATRIX.md` only if Form Embed readiness changes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and a new changelog entry.

## Changelog Policy

- This leaf must add or verify a changelog entry that lists TASK-269 and every
  completed TASK-269 child task.

## Acceptance Criteria

- Every Form Embed report finding has a final status and owner.
- TASK-256 shared rows are explicitly named and not silently implemented inside
  TASK-269.
- Form Embed docs match the final schema/editor/runtime behavior.
- Task board statistics, task file statuses, and changelog entries are
  synchronized.
- Required validation gates are green or blocked with exact evidence and a
  final rerun plan.
