# TASK-540-07: Smoke Option-Selector Correction and First-Failure Reporting

# FileName: TASK-540-07-Smoke-Option-Selector-And-First-Failure-Reporting.md

**Parent Task:** TASK-540
**Priority:** High
**Category:** Custom Screens / Smoke Harness / Test Integrity
**Estimated Effort:** Small
**Dependencies:** TASK-540-06 (owns the smoke bundle and the family closure; this
subtask edits smoke-implementation modules only and must land before the next
canonical smoke run)
**Status:** ⏳ To Do
**Changelog:** 1252 (family-pinned; closure only, owned by TASK-540-06 — this
subtask consumes no new changelog number)

---

## Overview

The TASK-540 canonical smoke run fails at `dg-024-entry-nav-cancel` with
`inline_pointer_locked` after roughly 65 seconds. That verdict is a symptom
reported three actions downstream of the real breakage, and the real breakage is
in the frozen smoke contract, not in Custom Screens application code.

Two independent defects were proven empirically in the harness. Both are
test-integrity defects; neither is a product regression:

1. **An unmatchable option selector.** The registered selector `muted`
   (`_docs/_workflows/task-540-smoke/contract/selectors.mjs:142`) is
   `[role="option"]:text-is("Muted")`. It can never match, because the Radix /
   shadcn `SelectItem` delegates its label to a child element.
2. **Discarded browser failure frames.** Every `browser-run-code` action whose
   `outputSchemaId` is `unit` — which includes all four tone actions — has its
   source rewritten by a wrapper that awaits the source and then returns a
   literal `{ ok: true }`, i.e. the `unit` contract's success value. A source
   that computed a well-formed hard-failure verdict therefore reports as PASS.

Defect 1 makes the run fail. Defect 2 makes the run lie about where it failed,
and would do so for **any** future regression in the tone flow, not only this
one.

Neither defect is repaired by touching application code. Both repairs are
confined to `_docs/_workflows/task-540-smoke/**`.

### Established root cause — defect 1 (proven, treat as fact)

Playwright's `:text-is()` CSS pseudo matches an element only when its internal
`elementMatchesText` returns `self`. When a child element carries the same text
the result is downgraded to `selfAndChildren`, which the pseudo rejects.

`SelectItem` (`core/admin/components/ui/select.tsx:92-117`) renders

```
<div role="option" data-slot="select-item" aria-labelledby="rid">
  <span data-slot="select-item-indicator"></span>
  <span id="rid">Muted</span>
</div>
```

because the label is passed to `<SelectPrimitive.ItemText>{children}</…>` at
`core/admin/components/ui/select.tsx:114`. The `[role="option"]` host therefore
carries **no direct text node**.

Measured on that exact DOM (`page.setContent` + `locator.count()`):

| Selector | Count |
|---|---:|
| `[role="option"]:text-is("Muted")` | 0 |
| `[role="option"]:has(span:text-is("Muted"))` | 1 |
| bare `<div role="option">CtrlBare</div>` with `:text-is` | 1 |
| wrapped `<div role="option"><span></span><span>CtrlWrapped</span></div>` with `:text-is` | 0 |

This is precisely why `dg-012`, `dg-013`, `dg-015` and `dg-016` pass — their
hosts are `ConfirmActionDialog` buttons
(`core/admin/ui/shared/ConfirmActionDialog.tsx:180-189`) carrying direct text
nodes — while the tone actions cannot.

The tone option under test comes from `presentationToneOptions`
(`core/admin/ui/custom-screens/customScreenEntryPresentation.ts:56-59`) over
`screenEntryPresentationToneValues`
(`core/services/customScreens/screenEntryPresentationOverrideContract.ts:37-49`),
so `"muted"` renders the label `Muted` at
`core/admin/ui/custom-screens/CustomScreenEntryPresentationPanel.tsx:181-185`,
inside the tone control declared at the same file's line 166.

Consequence chain, verified against unmodified application code:

`dg-021-tone-open`'s postcondition requires `optionCount === 1` and can never be
satisfied → it polls for 30 s → `dg-022-tone-muted` never dispatches a click →
the tone `Select` stays `data-state="open"` → Radix mounts a `DismissableLayer`
with `disableOutsidePointerEvents: true` plus `RemoveScroll`, so `document.body`
**correctly** keeps inline `pointer-events: none` and `data-scroll-locked` →
30 s later `dg-024-entry-nav-cancel`'s hit-test on the records link fails and is
classified `inline_pointer_locked`. From the identical stuck state, clicking the
option with a working locator restores `document.body.style.pointerEvents` to
`""`, removes `data-scroll-locked`, unmounts the content, sets the trigger text
to `Muted`, and the discard dialog then appears with navigation suspended.

### Established root cause — defect 2 (attribution investigation: real defect)

The attribution investigation asked whether `dg-021` genuinely succeeds. It does
not. Its source correctly returns
`{ failureClass: "tone_portal_settlement", settled: false }` — byte-identical in
shape to `TONE_OPEN_FAILURE_FRAMES` in
`_docs/_workflows/task-540-smoke/executor/config.mjs:466-473`. The frame never
leaves the browser:

- `_docs/_workflows/task-540-smoke/browser/generic-invocations.mjs:456-458`
  routes dirty-guards actions to `normalizeDirtyGuardsUnitSource` and **every
  other scenario** (this is the path for `rc-015` / `rc-016`) to an inline
  discarding wrapper.
- `_docs/_workflows/task-540-smoke/browser/scenarios/dirty-guards.mjs:385-386`
  returns the same discarding wrapper for every dirty-guards action that is not
  in `DIRTY_NAVIGATION_REQUEST_ACTION_IDS`.
- Only the five ids in `DIRTY_NAVIGATION_REQUEST_ACTION_IDS`
  (`executor/config.mjs:221-223` → `dg-012`, `dg-015`, `dg-024`, `dg-037`,
  `rc-037a`) receive the frame-preserving wrapper at
  `browser/scenarios/dirty-guards.mjs:388-397`.

`{ ok: true }` is exactly the `unit` contract's success value
(`contract/output-contracts.mjs:157-162`: `unitValue = { ok: true }` with
`predicate: outputEquals([], unitValue)`), so a hard-failed `dg-021` emits a
valid success frame. Downstream everything then behaves correctly and sees
nothing: `classifyPrivateToneOpenFailureFrame`
(`executor/failure-boundary.mjs:115-129`, called at
`runtime/command-authority.mjs:399` and
`executor/capabilities/execute-action.mjs:316-319`) returns `null`;
`completePrivateFailureAction` (`executor/plan-execution.mjs:104-106`) finds no
retained failure; the `assertionDependencies` check
(`executor/plan-execution.mjs:71-74`) passes because `dg-021` really is in
`completed`. `dg-022` then fails instantly rather than after a poll — it starts
with `page.context().__wf540Recall(stateKey)`
(`browser/simple-invocations.mjs:354`), `dg-021` never reached
`__wf540Remember` (`browser/simple-invocations.mjs:296`), so
`authorityOptionPreconditionFailed` short-circuits and it returns
`fail("tone_select_authority_option_precondition")` **before** `option.click()`
— also discarded. `dg-023`'s observation predicate
(`contract/output-contracts.mjs:688-694`, the `entry-drafts-url-before-cancel`
predicate) requires only non-empty
`contentBytes` / `presentationBytes` / `url`, so it cannot catch the missing tone
either. `dg-024` is the first downstream action whose failure frame is on the
preserved list, hence the first failure the harness can report.

The measured ~64-65 s open-Select window matches exactly: ~30 s (`dg-021` portal
poll) + ~0 s (`dg-022` fail-fast) + fast observe + ~30 s (`dg-024` target
hit-test poll).

Why no self-test caught it: `executor/self-test/failure-action-execution.mjs:120-131`
injects `createPrivateToneOpenFailure` by monkey-patching
`capabilities.executeAction`, i.e. **below** the browser wrapper; and
`executor/self-test/browser-tone-flow-source.mjs` validates the compiled source
purely by `source.includes(token)`, so the outer discarding wrapper is invisible
to it. The whole tone-frame apparatus (`TONE_OPEN_FAILURE_FRAMES`,
`TONE_SELECT_FAILURE_FRAMES`, both classifiers, both `createPrivateTone*Failure`
throw sites) is dead code in production for all four tone actions. The
auth-settlement equivalents stay live only because those six actions are
`kind: "observe"` with `observation:*` schemas, so the unit wrapper never touches
them.

## Scope

In scope, and nothing else:

1. Correct the single registered selector that addresses a text-delegating
   widget host by the host's own text, using the shape the same file already
   uses for the same widget class.
2. Add a registry-construction invariant that makes reintroducing that selector
   shape fail closed at plan-build time, with negative self-test coverage.
3. Generalise the existing frame-preserving unit wrapper from
   "dirty-navigation only" to "any action with registered browser failure
   classes", driven by one derived registry, so the harness reports the first
   real failure instead of one three actions downstream.
4. Add self-test coverage that pins both the preserving and the discarding
   wrapper to the correct action sets, so the dead path cannot silently return.

Out of scope:

- Any change to Custom Screens application code under `core/`.
- Any change to the frozen action contract: 496 rows, action ids, `kind`s,
  `outputSchemaId`s, `assertionDependencies`, ordinals and route states all stay
  byte-identical.
- Any new failure class, any relaxed assertion, any new dependency.
- Running the smoke itself; TASK-540-06 owns the canonical run and the closure.

## Explicitly rejected alternatives (do not revisit)

| Rejected | Reason |
|---|---|
| Change `SelectItem` to emit a direct text node | `SelectPrimitive.ItemText` supplies the trigger's `SelectValue` text, the option's accessible name and Radix typeahead. Removing it breaks value rendering and accessibility to satisfy a CSS text selector. |
| Patch or pin `@radix-ui/react-dismissable-layer` | There is exactly one copy (1.1.16) and it behaves correctly. The locked body is the correct consequence of a Select that was never closed. |
| Replace `:text-is()` with `getByText(text, { exact: true })` in the tone sources | `getByText` does resolve to the innermost match and would work, but it is a different engine from the rest of the registry and would leave the defect class alive for the other 27 text-engine selectors. Fix the selector shape and guard it instead. |
| Weaken `dg-021`'s postcondition so it tolerates `optionCount === 0` | Relaxes a behaviour assertion. The postcondition is correct as written. |
| Make the generic (non-registered) unit wrapper fail closed for every source | Larger blast radius: it needs a sweep of all ~390 unit run-code sources to confirm their return values first. Recorded as a non-blocking follow-up in L02, not executed here. |

## Selector sweep result (all 59 registered selectors)

A full read of `createSelectorRegistry` (`contract/selectors.mjs:106-230`) splits
the registry into 28 text-engine selectors and 31 pure attribute/structural
selectors. Every text-engine selector's label was traced to the component that
renders the matched host, every shadcn primitive that could wrap children was
read (`core/admin/components/ui/{select,tabs,dropdown-menu,badge,alert,button,card}.tsx`),
and every verdict was measured rather than reasoned. Result:

- **Exactly one defect:** `muted`. It is the only registered selector that
  addresses a Radix `SelectItem` by the item host's own text.
- `fieldOption` (`contract/selectors.mjs:126-129`) already uses
  `[role="option"]:has(span:text-is("<label> (<type>)"))` — the same widget
  class, the correct shape, and the template for the fix.
- Only `SelectItem` inserts a wrapper. `Badge`, `DropdownMenuItem`,
  `TabsTrigger` and `Button` all pass children through unwrapped.
- Two previously-flagged selectors are settled as safe: `runtimeTab`'s host is a
  raw `<button type="button" role="tab">{tab.label}</button>` at
  `core/admin/ui/custom-screens/ScreenRuntimeContainerBlocks.tsx:199-220`
  (`role="tab"` at `:202`, `{tab.label}` at `:219`) (not a
  shadcn `TabsTrigger`; `ui/tabs.tsx` is used nowhere under
  `core/admin/ui/custom-screens`), and `mediaCard` is `MediaCard.tsx:192-195`'s
  grid `<button>` with an inner `<p>`, already using `:has()`.
- Every registry selector measured exactly 1 match except `relatedSkeletonChip`
  = 3 (by design; `recovery-cache.mjs` `rc-027` counts rather than clicks) and
  `muted` = 0.
- Consumption is Playwright-only. No registered text selector reaches
  `document.querySelectorAll` — only the plain-CSS `panelSelector`,
  `triggerSelector` and `ALL_SELECT_CONTENT_SELECTOR` do, at
  `browser/simple-invocations.mjs:322` and `:339` — so the
  `:has(span:text-is(…))` form is legal at every consumption site.

Adjacent items checked and confirmed non-issues: `builderSave` and `entrySave`
are both `button:text-is("Save")` but live on different routes and never coexist
(neighbours use distinct exact strings `Save presentation` / `Save draft` /
`Runtime preview`); `panelShow` is disambiguated from the separate
`screenReopen` button by `[aria-pressed="false"]` (the reopen button omits
`aria-pressed` entirely); `fieldBadge`'s `Text` / `Read` values render under a
CSS `uppercase` class but Playwright matches `textContent`, not rendered casing;
and the ~20 non-registry `getByText(…, { exact: true })` count assertions in
`browser/*.mjs` are immune to this defect class because `getByText` resolves to
the innermost match (measured: wrapped control → `getByText` = 1 while
`button:text-is(…)` = 0).

## Corrected seed anchors

The research seeds passed into this subtask contained two anchor errors, both
corrected here and carried into the leaves:

- **Wrong:** "existing self-tests that pin the old wrapper text
  (`executor/self-test/browser-source-context.mjs:178,227-228`)".
  **Correct:** `browser-source-context.mjs` does not pin any wrapper text. The
  wrapper pins are `"if (result === true) return { ok: true };"` at
  `executor/self-test/browser-dirty-navigation-source.mjs:173` (the `required`
  token list) and `:255` (the `orderedTokens` list). `browser-source-context.mjs:89`
  only asserts `invocation.unitResultAlreadyNormalized === true` for the
  data-bearing run-code operations, which are a different, already-normalized
  path (`browser/run-code.mjs:251-259`).
- **Wrong:** "`core/admin/components/ui/select.tsx:99-124` (SelectItem)".
  **Correct:** `SelectItem` spans `core/admin/components/ui/select.tsx:92-117`;
  `data-slot="select-item"` is at `:99`, the indicator span at `:107`, and
  `<SelectPrimitive.ItemText>` at `:114`.

A third seed claim — that `browser-tone-flow-source.mjs` "asserts only on the raw
pre-normalization source text" — is imprecise. It receives the **post**-wrapper
`compiledSource` (`executor/self-test/browser-run-code-source-ownership.mjs:165-191`),
but validates it exclusively by substring inclusion, so both wrappers satisfy it
identically. The effect matches the seed; the mechanism does not, and L02's
coverage is written against the real mechanism.

## Leaves and order

Land strictly in this order. The two leaves have disjoint file ownership, so the
order is about diagnosis quality rather than compilation: L01 removes the
blocker, L02 then guarantees any residual regression is reported at its true
origin.

| ID | Title | Exclusive source ownership | Status |
|---|---|---|---|
| TASK-540-07-L01 | Correct the Radix option selector and guard the text-engine shape | `contract/selectors.mjs`, `contract/self-test/registries-fixtures.mjs` | ⏳ To Do |
| TASK-540-07-L02 | Preserve browser failure frames for registered unit actions | `executor/config.mjs`, `browser/generic-invocations.mjs`, `browser/scenarios/dirty-guards.mjs`, `executor/self-test/browser-dirty-navigation-source.mjs`, `executor/self-test/browser-tone-flow-source.mjs`, `executor/self-test/browser-run-code-source-ownership.mjs` | ⏳ To Do |

All paths are relative to `_docs/_workflows/task-540-smoke/`. Single-writer
ownership holds: no file appears in both rows, and no file listed here is owned
by another TASK-540 leaf.

## Non-negotiable invariants for both leaves

- The action contract is frozen. After both leaves the contract self-test must
  still report `actions: 496`, `setupActions: 55`, `flowActions: 434`,
  `cleanupActions: 7`, `executableTypeCounts` unchanged
  (`runtime-operation: 76`, `browser-run-code: 392`, `browser-native: 14`,
  `browser-screenshot: 13`, `browser-global-list: 1`), and the executor
  self-test must still report `actions: 496`, `runtimeReceipts: 177`,
  `cleanupActions: 72`, `captures: 26`.
- `negativeCases` may only **increase**. Pre-edit historical baselines, measured
  on this working tree before any edit: contract self-test `109`, executor
  self-test `2810`. Post-implementation measured values at HEAD (2026-07-27):
  contract self-test `117`, executor self-test `2985`.
- No assertion may be relaxed. Both leaves strictly strengthen the harness: L01
  turns an unmatchable selector into a matching one and makes the bad shape a
  build-time error; L02 turns a silently-discarded verdict into either a
  classified hard failure or a thrown error.
- Every module under `_docs/_workflows/task-540-smoke/**` must stay at or below
  1,000 physical lines (parent's `Current Smoke Module Ownership` contract).
  Sizes of the touched files, measured post-implementation at HEAD (2026-07-27):
  `contract/selectors.mjs` 230, `executor/config.mjs` 557,
  `browser/generic-invocations.mjs` 513,
  `browser/scenarios/dirty-guards.mjs` 442,
  `executor/self-test/browser-dirty-navigation-source.mjs` 364 (untouched),
  `executor/self-test/browser-tone-flow-source.mjs` 710,
  `executor/self-test/browser-run-code-source-ownership.mjs` 716,
  `contract/self-test/registries-fixtures.mjs` 424. No split was required, and
  the ≤ 1,000 gate holds tree-wide: the largest module under
  `_docs/_workflows/task-540-smoke/**` is
  `executor/self-test/browser-widget-absence-scope.mjs` at 964, and the smoke
  entry point `_docs/_workflows/task-540-smoke-executor.mjs` is 976.
- `_docs/_workflows/` is gitignored. Any commit of these implementation files
  needs `git add -f`; the task files in `_docs/_TASKS/` are tracked normally.

## Sub-Tasks

Leaf status lives in exactly one table in this file — `Leaves and order` above.
This section deliberately carries no `Status` column. The resume machinery
resolves a leaf's row by table shape, not by heading, and
`readCanonicalTaskStatusTableRow` requires **exactly one** matching row per id;
a second `| ID | … | Status |` table here makes every resume mode throw
`expected one canonical status row for TASK-540-07-L01`. This subtask was the
only child in the family carrying two.

| ID | Title |
|---|---|
| TASK-540-07-L01 | Correct the Radix option selector and guard the text-engine shape |
| TASK-540-07-L02 | Preserve browser failure frames for registered unit actions |

## Security and Boundary Contract

This subtask touches **no API route, endpoint, migration, RBAC rule, CSRF path,
rate-limit bucket or persisted schema**, so no endpoint-visibility section
applies. The relevant boundary invariants are the harness's own:

- **Evidence redaction.** L02 causes browser failure frames to reach the
  executor's stdout classification path. The frames are the existing frozen
  vocabulary `canonicalJson({ failureClass, settled: false }) + "\n"` over
  `TONE_OPEN_BROWSER_FAILURE_CLASSES` / `TONE_SELECT_BROWSER_FAILURE_CLASSES`
  (`executor/config.mjs:460-490`). They are fixed literals with no interpolated
  value, so no credential, session token, entry content or fixture secret can
  enter them. `MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES` bounding in
  `classifyPrivateTone*FailureFrame` stays unchanged.
- **Diagnostic minimality.** The diagnostic sink keeps emitting only the two-key
  `{ failedActionId, failureClass }` line (`executor/diagnostic-sink.mjs`). L02
  changes which action id appears, never the shape or the allowlist.
- **No repository mutation.** Both leaves edit only files under
  `_docs/_workflows/task-540-smoke/`, which the smoke's own repository-mutation
  policy already treats as workflow-owned.
- **Fail-closed direction.** Every new check rejects; none admits. An
  unrecognised wrapper return throws instead of passing.

## Testing Requirements

Both leaves are validated by the harness's own self-tests — these are the
authoritative lanes for `_docs/_workflows/task-540-smoke/**`, and no Vitest or
Bun suite covers this tree.

| Lane | Command | Required result |
|---|---|---|
| Contract self-test | `node _docs/_workflows/task-540-smoke-contract.mjs --self-test` | `pass: true`, `actions: 496`, counts unchanged, `negativeCases` > 109 after L01 |
| Executor self-test | `node _docs/_workflows/task-540-smoke-executor.mjs --self-test` | `pass: true`, `actions: 496`, `runtimeReceipts: 177`, `cleanupActions: 72`, `captures: 26`, `negativeCases` > 2810 after L02 |
| Line-count gate | `wc -l` over every touched module | every file ≤ 1,000 |

Regression shape required of the leaves (details in each leaf):

- L01: a negative case proving the registry rejects the reverted
  `[role="option"]:text-is("Muted")` value, plus a positive case pinning the
  corrected `muted` string and a negative case for a second
  text-delegating-host mutant.
- L02: a round-trip case proving that for every id in the new registry the
  **final normalized** unit source maps `true → { ok: true }` and returns each
  registered frame unchanged, plus the complement — that no other unit run-code
  source is wrapped in the preserving form — plus a negative case for an
  unrecognised return shape.

The canonical seven-flow Playwright smoke run itself is **not** part of this
subtask. TASK-540-06 owns it and reruns it after both leaves land; the expected
change is that the run proceeds past `dg-021`/`dg-022` instead of failing at
`dg-024` with `inline_pointer_locked`.

## Documentation Updates Required

- `_docs/_TASKS/TASK-540_Custom_Screens_Functional_and_Data_Integrity_Remediation.md`
  — add the `TASK-540-07` row to the `Sub-Tasks` table. No other line of that
  file may be touched.
- `_docs/_TASKS/README.md` — update the `TASK-540` In Progress row's child/leaf
  count from `6 children + 10 leaves` to `7 children + 12 leaves`. No other line
  may be touched.
- No product doc changes. `CONTENT_TYPES_SPEC.md`, `ARCHITECTURE.md` and
  `TESTING_STRATEGY.md` are unaffected because no product contract, schema or
  test lane changes.
- Changelog: none of its own. The family closure entry 1252, owned by
  TASK-540-06, records this subtask.
