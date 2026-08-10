# TASK-489-03-L01: One-Writer Operational UI Composition in SolutionKitsPage
# FileName: TASK-489-03-L01-Ui-Integration-Tests.md

**Parent Subtask:** TASK-489-03
**Priority:** High
**Category:** Solution Kits / Admin UI / Accessibility / Security
**Estimated Effort:** Large
**Dependencies:** All TASK-489 parent-level start gates; TASK-489-02-L02; TASK-547 done; complete terminal TASK-551
**Status:** ⏳ To Do
**Changelog:** 1268 (pinned; closure only)

---

## Overview

Compose bounded history, sanitized detail, pagination, and exact rollback in the
existing Solution Kits screen. Preserve the Reviewed Site Builder handoff and
do not reintroduce apply/dry-run/rerun/latest behavior. This leaf is the single
writer of `SolutionKitsPage.tsx` for the family.

## Sub-Tasks

None; this is an executable leaf.

## Exact File Ownership

**Production:**
`core/admin/ui/kits/SolutionKitsPage.tsx`,
`core/admin/ui/kits/SolutionKitRunOperationsPanel.tsx` (new),
`core/admin/ui/kits/SolutionKitRunHistory.tsx` (new),
`core/admin/ui/kits/SolutionKitRunDetail.tsx` (new), and
`core/admin/ui/kits/solutionKitRunPresentation.ts` (new, pure safe labels only).

**Tests:**
`tests/vitest/ui-integration/solution-kits-runs.test.tsx` (new) and
`tests/vitest/ui/solution-kits-page.test.tsx`.

No service/route/client/cache/hook, shared `ConfirmActionDialog`, auth context,
DB schema/migration, runtime-smoke/docs/task/changelog/board, apply/dry-run
surface, public/API-key route, or TASK-555/TASK-556 may be edited.

## UI Contract

- Mount `useSolutionKitRuns({})` once as the first-class global operations view,
  independent of legacy catalog selection. This keeps terminal TASK-547
  `formadom-studio` runs reachable before TASK-555 adds a curated starter card.
- The rendered history, detail, and rollback controls use the exact descriptive
  IDs `solution-kits.run-history`, `solution-kits.run-detail`, and
  `solution-kits.exact-rollback` from TASK-489-02-L01's pure contribution. These
  IDs support Guide/capability evidence only and are never consulted for
  authorization.
- History shows safe mode, engine, status, counters, timestamp, and safe failure
  code. A running row visibly says `In progress` and renders no summary counters
  or fake zero values. It uses semantic buttons/list rows, `aria-current` or
  `aria-pressed`, and keyboard selection. No raw JSON or prohibited fields.
- A visible `Load more` requests exactly the current `nextCursor`; show an end
  state from `hasMore=false`. No inert pagination or automatic all-page loop.
- Detail shows all ten safe resource-kind labels, key, operation, status, and
  safe code. `unknown` engine is visibly unsupported for rollback. A
  `legacy_template_summary_only` detail renders explicit bounded copy that
  exactly `omittedItemCount` template operations are represented by summary
  counters only; it never implies that item rows are complete or exposes options.
  A running detail renders the bounded current items as nonterminal, shows no
  omitted count or final counters, and never labels the trace complete.
- Loading preserves existing rows/detail with a busy indicator. Empty, denied,
  malformed, and retryable error states are distinct and accessible.
- The hook's `corrupt_detail` state renders fixed copy that stored run evidence
  is invalid and cannot be operated on. It preserves the selected safe history
  row for orientation, renders no item/counter guess, and exposes no rollback
  trigger/dialog even when both permissions are present. It never prints the raw
  server error or silently relabels corruption as empty/not-found.
- The hook's cursor-reset notice remains visible and non-destructive after the
  guarded page-one refresh; it is distinct from an error/empty state and may be
  dismissed without changing history or selection.
- Rollback button exists only when selected detail is rollback-eligible and the
  user has both permissions. If either permission is absent, render read-only
  explanatory copy and no active destructive control.
- `rollbackIneligibleCode="solution_kit_rollback_source_superseded"` always
  renders fixed superseded-source copy and no active confirm trigger, even when
  both permissions are present. The UI never waits for snapshot mismatch to
  discover this state.
- `rollbackIneligibleCode="solution_kit_rollback_relation_limit_exceeded"`
  renders fixed bounded-history/recovery copy and no confirm trigger; it never
  guesses eligibility or silently scans another page.
- Reuse `ConfirmActionDialog` with destructive tone, target package/source run
  labels, typed confirmation equal to the bounded package key, and exact source
  semantics. Cancel closes with zero request. Confirm calls only
  `rollbackExact(selectedRun.id)` and remains pending/disabled until settled.
- Terminal success visibly adds/selects the rollback run and announces a status
  summary. Terminal failed keeps the exact source context, refreshes history, and
  renders fixed safe copy/code/counters stating that no net rollback change
  remains. It can expose a new exact confirm only after refreshed source detail is
  eligible; the next request receives a new rollback owner. `recovery_required`
  keeps source context, refreshes history, renders fixed partial/unresolved
  recovery copy plus the same durable running rollback run ID and no counters, and
  disables another confirm until that owner reaches a proven terminal state.
  Pre-write rejection keeps context and creates no result row.
- Light/dark token usage follows the existing screen. Mobile stacks panels and
  preserves keyboard/focus return to the exact rollback trigger. L02's exact
  `rollback-confirm-cancel` smoke measures this at 390x844: both panel and dialog
  rectangles stay within the viewport, stacked panels do not overlap, document
  horizontal overflow is zero, and cancel restores focused-trigger geometry.

## Security Contract

- **Endpoint visibility:** UI uses the internal TASK-489 client only.
- **Auth model:** Admin session through existing shell/context.
- **RBAC:** read surface requires `solution-kits:read`; destructive control uses
  require-all client gate for `solution-kits:write` and `settings:write`.
- **CSRF/rate limit:** client-owned exact rollback; UI never calls raw `fetch`.
- **Validation:** receives strict safe hook state only; no dynamic HTML/JSON.
- **Anti-abuse:** one pending rollback, exact selected source, typed confirm,
  disabled double submit, bounded manual pagination.
- **Sensitive data:** TASK-489 history/detail/rollback DOM, accessibility names,
  toast, console, screenshot, and local state never contain actor/options/
  snapshots/rollback payload/raw errors. Retained apply UI outside this operational
  region is not reclassified by this claim.

## Implementation Pseudocode

```tsx
function SolutionKitRunOperationsPanel({ permissions }: Props) {
  const runs = useSolutionKitRuns({});
  const canRollback = permissions.can("solution-kits:write")
    && permissions.can("settings:write");
  const selected = runs.selectedRun;

  return <section aria-label="Install run operations">
    <SolutionKitRunHistory {...safeHistoryProps(runs)} />
    <SolutionKitRunDetail detail={selected} />
    {selected?.run.rollbackEligible && canRollback ?
      <ConfirmActionDialog
        requireTypedValue={selected.run.packageKey}
        onConfirm={() => runs.rollbackExact(selected.run.id)}
      /> : <ReadOnlyRollbackState reason={resolveReason(selected, canRollback)} />}
  </section>;
}
```

**Data flow:** global operations region -> one race-safe hook -> safe keyset rows -> exact
selection/detail -> require-all gate -> typed confirm -> exact source rollback ->
safe refreshed history/detail.

**Error handling:** use stable client code/status to choose fixed user copy.
Never print arbitrary `Error.message`. Preserve already loaded safe state on
page/detail/rollback failure, provide explicit retry, and restore focus after
cancel/success/failure.

## Regression Tests

- History/empty/loading/error/denied states and manual next-cursor pagination.
- Corrupt-detail state from `solution_kit_run_shape_invalid` retains the safe
  selected row, shows fixed integrity copy, no synthesized items/counters, and
  zero rollback callback for a fully permitted user.
- One-shot cursor-expiry notice survives refresh/dismiss flow without losing
  visible rows/detail or triggering another request.
- Selection/detail rendering for every ten-kind label and no prohibited text or
  serialized keys in DOM; both terminal item-trace variants render exact bounded
  omitted copy and reject contradictory counts, while nonterminal trace has no
  omitted count.
- Both permissions independently missing and both missing: no active rollback.
- Confirm opens with exact source/package, typed value required, cancel sends
  zero request, double confirm sends one request.
- Success selects/announces rollback; failure preserves source and safe code/
  counters plus zero-net copy, then refreshed eligibility permits a new owner;
  recovery preserves source, shows the same durable running run ID/safe code,
  renders no counters, and disables duplicate confirmation.
- Superseded source with both permissions has explicit disabled/read-only copy,
  no confirm dialog, and zero rollback callback; terminal failed result still
  refreshes and announces its bounded counters.
- Relation-limit source has its distinct fixed read-only copy, no confirm dialog,
  and zero rollback callback.
- Running history/detail renders nonterminal copy with no zero summary. A
  successful `C` rollback refresh makes restored `B` eligible; after successful
  `B`, restored `A` becomes eligible, while failed/recovery results do not release
  the predecessor. Failed releases only its own claim and may retry the same
  source with a new owner; recovery retains the same owner.
- Rapid page/run changes cannot display stale hook state (integration with mocked
  delayed client); focus returns to trigger and mobile DOM remains usable.
- Existing test continues to prove Reviewed Site Builder exists and legacy
  apply/dry-run/rerun/latest controls remain absent.
- UI test pins the three contribution control IDs to real rendered behavior and
  proves permission checks remain the only control-authorization source.

## Testing Requirements

```bash
bun --cwd core lint:types
bun --cwd core lint
NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/solution-kits-runs.test.tsx tests/vitest/ui/solution-kits-page.test.tsx
wc -l core/admin/ui/kits/SolutionKitsPage.tsx core/admin/ui/kits/SolutionKitRunOperationsPanel.tsx core/admin/ui/kits/SolutionKitRunHistory.tsx core/admin/ui/kits/SolutionKitRunDetail.tsx core/admin/ui/kits/solutionKitRunPresentation.ts tests/vitest/ui-integration/solution-kits-runs.test.tsx tests/vitest/ui/solution-kits-page.test.tsx
git diff --check
```

Every touched production/test file must be <=1,000 physical lines.

## Documentation Updates Required

TASK-489-03-L02 documents placement, read-only permission state, pagination,
sanitized detail, exact typed-confirm rollback, accessibility/focus behavior,
and separation from Reviewed Site Builder in user/developer docs.
