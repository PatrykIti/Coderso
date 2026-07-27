# TASK-540-07-L02: Preserve Browser Failure Frames for Registered Unit Actions

# FileName: TASK-540-07-L02-Preserve-Browser-Failure-Frames-For-Registered-Unit-Actions.md

**Parent Subtask:** TASK-540-07
**Parent Task:** TASK-540
**Priority:** High
**Category:** Custom Screens / Smoke Harness / Test Integrity / Observability
**Estimated Effort:** Small
**Dependencies:** TASK-540-07-L01 (land order only; file ownership is disjoint)
**Status:** 🚧 In Progress
**Implementation Complete:** 2026-07-27 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Targeted Gate Passed:** 2026-07-27 — this leaf's authoritative lane re-measured on the current bytes, not copied from the seed: `node _docs/_workflows/task-540-smoke-executor.mjs --self-test` returned `pass: true, actions: 496, runtimeReceipts: 177, cleanupActions: 72, nominalPersistentCleanupActions: 72, terminalMatrixCases: 1, captures: 26, negativeCases: 2985`, so every frozen executor count holds and `negativeCases` is above the 2810 pre-edit baseline; `node _docs/_workflows/task-540-smoke-contract.mjs --self-test` returned `pass: true, actions: 496, setupActions: 55, flowActions: 434, cleanupActions: 7, negativeCases: 117`, so this leaf relaxed nothing in the contract lane; `wc -l` over all six owned modules gave `executor/config.mjs` 557, `browser/generic-invocations.mjs` 513, `browser/scenarios/dirty-guards.mjs` 442, `executor/self-test/browser-dirty-navigation-source.mjs` 364, `executor/self-test/browser-tone-flow-source.mjs` 710 and `executor/self-test/browser-run-code-source-ownership.mjs` 716, each ≤ 1,000. Structural acceptance was read at the anchors: `UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID` is declared once at `executor/config.mjs:495` under the `=== 9` cardinality invariant at `:505-509`, the preserving wrapper body exists once at `browser/scenarios/dirty-guards.mjs:102` and is reached from the single normalization site at `browser/generic-invocations.mjs:473`, and the ownership self-test derives its coverage from the registry's own keys at `executor/self-test/browser-run-code-source-ownership.mjs:692-693`. This is an evidence-backed re-measurement of already-landed code, not a transition-generated generation/token or hash receipt. The canonical seven-flow Playwright smoke run is owned by TASK-540-06 and was NOT run here; no family post-audit, full validation, changelog, or closure result is claimed.
**Changelog:** 1252 (family-pinned; closure only, owned by TASK-540-06)

---

## Overview

Make the smoke report the **first** action that actually failed instead of one
three actions downstream.

Every `browser-run-code` action whose `outputSchemaId` is `unit` has its source
rewritten before dispatch into

```js
(async (page) => { await (SOURCE)(page); return { ok: true }; })
```

The source's return value is awaited and thrown away, and a literal
`{ ok: true }` — which is exactly the `unit` contract's success value — is
emitted instead. Only the five ids in `DIRTY_NAVIGATION_REQUEST_ACTION_IDS` get
the frame-preserving wrapper that already exists next to it.

All four tone actions (`dg-021-tone-open`, `dg-022-tone-muted`,
`rc-015-tone-open`, `rc-016-tone-muted`) are `kind: "click"` →
`outputSchemaId: "unit"` → `browser-run-code`, so all four are inside the
discarding branch. Their sources compute correct, well-formed hard-failure
frames that are silently replaced with a success literal. Consequently the whole
tone-failure apparatus — `TONE_OPEN_FAILURE_FRAMES`, `TONE_SELECT_FAILURE_FRAMES`,
`classifyPrivateToneOpenFailureFrame`, `classifyPrivateToneSelectFailureFrame`,
`createPrivateToneOpenFailure`, `createPrivateToneSelectFailure` — is dead code
in production.

This leaf generalises the existing preserving wrapper from "dirty-navigation
only" to "any action with registered browser failure classes", driven by one
derived registry, and pins the result with self-test coverage that the current
substring-inclusion checks cannot provide.

It strictly strengthens the harness: an object that currently reads as PASS
becomes either a classified hard failure or a thrown error. No assertion is
relaxed.

## Exclusive file ownership

| Path (relative to `_docs/_workflows/task-540-smoke/`) | Role |
|---|---|
| `executor/config.mjs` | new derived registry `UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID` |
| `browser/generic-invocations.mjs` | single registry-driven wrapper choice |
| `browser/scenarios/dirty-guards.mjs` | lift the preserving wrapper body into a shared, parameterised builder |
| `executor/self-test/browser-dirty-navigation-source.mjs` | keep its wrapper token pins valid against the shared builder |
| `executor/self-test/browser-tone-flow-source.mjs` | add wrapper pins for the tone phases |
| `executor/self-test/browser-run-code-source-ownership.mjs` | new round-trip + complement coverage |

No other file may be edited. In particular `executor/failure-boundary.mjs`,
`runtime/command-authority.mjs`, `executor/capabilities/execute-action.mjs`,
`executor/plan-execution.mjs` and `executor/diagnostic-sink.mjs` are **correct as
written** and must not change — they simply never see a failure today.

## Verified anchors

| Anchor | Fact |
|---|---|
| `browser/generic-invocations.mjs:454-481` | the unit-normalization block; the registry-driven wrapper choice is `:469-477`, `unitFailureFrameClassesForAction` is consulted at `:468`, and the discarding form is now `buildDiscardingUnitSource` (`browser/scenarios/dirty-guards.mjs:124-127`). Before this leaf the branch was: `const unitSource = dirtyGuardsCandidate ? normalizeDirtyGuardsUnitSource(action, invocation.args[sourceIndex]) : \`(async (page) => { await (…)(page); return { ok: true }; })\`` — the discarding literal is at `:458` |
| `browser/generic-invocations.mjs:446-453` | the `unitResultAlreadyNormalized` escape hatch and its drift invariant; only `browser/run-code.mjs:259` sets it |
| `browser/generic-invocations.mjs:332` | `const dirtyGuardsCandidate = isDirtyGuardsBrowserCandidate(action);` |
| `browser/scenarios/dirty-guards.mjs:416-426` | `normalizeDirtyGuardsUnitSource`; the discarding branch now delegates to `buildDiscardingUnitSource` (`:124-127`) at `:420`, and the preserving wrapper was lifted to `buildFailureFramePreservingUnitSource` (`:102-122`) |
| `browser/scenarios/dirty-guards.mjs:67-75` | `SHARED_DIRTY_NAVIGATION_ACTION_IDS = ["rc-037a-exit-navigation"]`; `isDirtyGuardsBrowserCandidate` also matches `action.id.startsWith("dg-")` |
| `browser/scenarios/dirty-guards.mjs:77-94` | `assertDirtyGuardsBrowserAction` — must keep running at today's call site |
| `executor/config.mjs:359-361` | `DIRTY_NAVIGATION_REQUEST_ACTION_IDS` = keys of `DIRTY_NAVIGATION_REQUEST_ACTION_CONFIG` (`dg-012`, `dg-015`, `dg-024`, `dg-037`, `rc-037a`) |
| `executor/config.mjs:391-397` | `dirtyNavigationBrowserFailureClassesForAction(actionId)` |
| `executor/config.mjs:445-446` | `TONE_MENU_OPEN_ACTION_IDS = ["dg-021-tone-open", "rc-015-tone-open"]`, `TONE_MUTED_ACTION_IDS = ["dg-022-tone-muted", "rc-016-tone-muted"]` |
| `executor/config.mjs:460-473` | `TONE_OPEN_BROWSER_FAILURE_CLASSES` (4) and `TONE_OPEN_FAILURE_FRAMES` = `canonicalJson({ failureClass, settled: false }) + "\n"` |
| `executor/config.mjs:474-490` | `TONE_SELECT_BROWSER_FAILURE_CLASSES` (7) and `TONE_SELECT_FAILURE_FRAMES` |
| `contract/output-contracts.mjs:157-162` | `unitValue = { ok: true }`; `jsonUnit` predicate `outputEquals([], unitValue)` |
| `browser/simple-invocations.mjs:269-304` | `dg-021`'s postcondition; `__wf540Remember` only on success at `:296`; `return fail(TONE_OPEN_BROWSER_FAILURE_CLASSES[3])` on timeout at `:302` |
| `browser/simple-invocations.mjs:354-387` | `dg-022` recalls at `:354`, short-circuits `authorityOptionPreconditionFailed` at `:386`, `option.click()` at `:387` |
| `executor/failure-boundary.mjs:102-129` | `createPrivateToneOpenFailure` / `classifyPrivateToneOpenFailureFrame` (byte-exact `bytes.equals(...)`, bounded by `MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES`) |
| `executor/failure-boundary.mjs:131-155` | the tone-select equivalents |
| `runtime/command-authority.mjs:394-431` | both classifiers on the retained-process path, with the `<= 1` overlap invariant and the throw sites |
| `executor/capabilities/execute-action.mjs:309-332` | both classifiers on the normalized-bytes path |
| `executor/plan-execution.mjs:71-74, 104-106` | dependency bookkeeping and `completePrivateFailureAction` — correct, unchanged |
| `contract/output-contracts.mjs:688-694` | `dg-023`'s observation predicate `entry-drafts-url-before-cancel` (named at `contract/actions/dirty-guard.mjs:161-166`) — cannot catch the missing tone |
| `executor/self-test/browser-run-code-source-ownership.mjs:165-191` | the per-action loop; `compiledSource` (`:191`) is the **post**-wrapper source returned by `buildBrowserInvocation`, and the new unit-frame block is `:229-282` |
| `executor/self-test/browser-dirty-navigation-source.mjs:173` and `:255` | the only existing pins of the preserving wrapper text (`"if (result === true) return { ok: true };"`) |
| `executor/self-test/failure-action-execution.mjs:120-131` | tone self-test injects below the browser wrapper (`createPrivateToneOpenFailure` thrown at `:126`) — why the dead path was never covered |

**Seed correction:** the research seed placed the wrapper pins at
`executor/self-test/browser-source-context.mjs:178,227-228`. That is wrong.
`browser-source-context.mjs` pins no wrapper text; its only related assertion is
`invocation.unitResultAlreadyNormalized === true` at `:89`, for the separate
already-normalized data-bearing path. The real pins are in
`browser-dirty-navigation-source.mjs` at `:173` and `:255`.

**Seed refinement:** the seed said `browser-tone-flow-source.mjs` asserts on the
raw pre-normalization source. It actually receives the post-wrapper
`compiledSource`, but validates it only by `source.includes(token)`, so both
wrappers satisfy it identically. The coverage below is written against that real
mechanism.

## Implementation Pseudocode

### 1. `executor/config.mjs` — one derived registry

Append next to the existing tone constants. No new failure class, no new action
id, no new frame:

```js
export const UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID = deepFreezeExact(
  Object.fromEntries([
    ...DIRTY_NAVIGATION_REQUEST_ACTION_IDS.map((id) => [
      id,
      dirtyNavigationBrowserFailureClassesForAction(id),
    ]),
    ...TONE_MENU_OPEN_ACTION_IDS.map((id) => [id, TONE_OPEN_BROWSER_FAILURE_CLASSES]),
    ...TONE_MUTED_ACTION_IDS.map((id) => [id, TONE_SELECT_BROWSER_FAILURE_CLASSES]),
  ])
);

invariant(
  Object.keys(UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID).length === 9 &&
    new Set(Object.keys(UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID)).size === 9,
  "unit failure-frame registry drift"
);
export const UNIT_FAILURE_FRAME_DIRTY_NAVIGATION_RESULT_ERROR_TAG = "dirty_navigation";
export const UNIT_FAILURE_FRAME_TONE_RESULT_ERROR_TAG = "unit_frame";
export function unitFailureFrameClassesForAction(actionId) {
  return Object.hasOwn(UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID, actionId)
    ? UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID[actionId]
    : null;
}
export function unitFailureFrameResultErrorTagForAction(actionId) {
  return DIRTY_NAVIGATION_REQUEST_ACTION_IDS.includes(actionId)
    ? UNIT_FAILURE_FRAME_DIRTY_NAVIGATION_RESULT_ERROR_TAG
    : UNIT_FAILURE_FRAME_TONE_RESULT_ERROR_TAG;
}
```

Nine ids: five dirty-navigation + two tone-open + two tone-muted. The cardinality
invariant is what makes an accidental duplicate or a dropped id fail closed.

Declaration order matters — place the block after
`TONE_SELECT_FAILURE_FRAMES` (`executor/config.mjs:483-490`) so every referenced
constant is already initialised.

### 2. `browser/scenarios/dirty-guards.mjs` — lift the preserving wrapper

Extract the existing body verbatim, parameterised on the failure classes and on
the error tag, and export it. As landed,
`buildFailureFramePreservingUnitSource` is at
`browser/scenarios/dirty-guards.mjs:102-122` and the discarding form it leaves
behind is `buildDiscardingUnitSource` at `:124-127`:

```js
export function buildFailureFramePreservingUnitSource(source, failureClasses, resultErrorTag) {
  invariant(typeof source === "string" && source.length > 0, "unit source is absent");
  invariant(
    Array.isArray(failureClasses) &&
      failureClasses.length > 0 &&
      failureClasses.every((entry) => typeof entry === "string" && entry.length > 0),
    "unit failure classes are invalid"
  );
  invariant(/^[a-z_]+$/u.test(resultErrorTag), "unit result error tag is invalid");
  return `(async (page) => {
          const result = await (${source})(page);
          if (result === true) return { ok: true };
          const failureClasses = ${JSON.stringify(failureClasses)};
          const keys = result !== null && typeof result === "object" && !Array.isArray(result) && Object.getPrototypeOf(result) === Object.prototype ? Object.keys(result) : [];
          if (keys.length === 2 && keys.includes("failureClass") && keys.includes("settled") && result.settled === false && failureClasses.includes(result.failureClass)) return result;
          throw new Error("wf540_${resultErrorTag}_result");
        })`;
}
```

`normalizeDirtyGuardsUnitSource` keeps its `assertDirtyGuardsBrowserAction(action)`
call — that ownership check is load-bearing and must not move — and delegates:

```js
function normalizeDirtyGuardsUnitSource(action, source) {
  assertDirtyGuardsBrowserAction(action);
  invariant(typeof source === "string", action.id + " dirty-guards unit source is absent");
  const failureClasses = unitFailureFrameClassesForAction(action.id);
  if (failureClasses === null) return buildDiscardingUnitSource(source);
  return buildFailureFramePreservingUnitSource(
    source,
    failureClasses,
    unitFailureFrameResultErrorTagForAction(action.id)
  );
}
```

The emitted string for the five dirty-navigation ids must stay **byte-identical**
to today's output — same indentation, same statement order, same
`wf540_dirty_navigation_result` message — so
`executor/self-test/browser-dirty-navigation-source.mjs:173`/`:255` keep passing
without being re-baselined. Verify by diffing the built source for `dg-024`
before and after.

### 3. `browser/generic-invocations.mjs` — one registry lookup

Replace the wrapper branch (as landed, `browser/generic-invocations.mjs:468-477`):

```js
- const unitSource = dirtyGuardsCandidate
-   ? normalizeDirtyGuardsUnitSource(action, invocation.args[sourceIndex])
-   : `(async (page) => { await (${invocation.args[sourceIndex]})(page); return { ok: true }; })`;
+ const unitFailureClasses = unitFailureFrameClassesForAction(action.id);
+ const unitSource = dirtyGuardsCandidate
+   ? normalizeDirtyGuardsUnitSource(action, invocation.args[sourceIndex])
+   : unitFailureClasses === null
+     ? buildDiscardingUnitSource(invocation.args[sourceIndex])
+     : buildFailureFramePreservingUnitSource(
+         invocation.args[sourceIndex],
+         unitFailureClasses,
+         unitFailureFrameResultErrorTagForAction(action.id)
+       );
```

Keeping the `dirtyGuardsCandidate` branch preserves
`assertDirtyGuardsBrowserAction`'s ownership check for every `dg-*` and
`rc-037a` action. The new branch is what fixes `rc-015` / `rc-016`, which are
related-cache actions (`browser/scenarios/related-cache.mjs:19-20`) and never
enter the dirty-guards path.

Add the imports: `UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID` from
`../executor/config.mjs` (the file already imports `SESSION_NAME` from there at
`:1`), and `buildFailureFramePreservingUnitSource` from
`./scenarios/dirty-guards.mjs`. If importing the builder from a scenario module
into the router reads as the wrong direction, move
`buildFailureFramePreservingUnitSource` into `browser/run-code.mjs` and import it
from both places — that file already owns `runCode`/`playwrightArgs` and is
imported by both. Either placement is acceptable; do not duplicate the body.

### 4. Self-test coverage

**4a. `executor/self-test/browser-tone-flow-source.mjs`** — add wrapper pins to
`inspectToneFlowRunCodeSource`'s `required` list for both phases, so the
substring check can no longer be satisfied by the discarding wrapper:

```js
const wrapperRequired = [
  "const result = await (",
  "if (result === true) return { ok: true };",
  "const failureClasses = " +
    JSON.stringify(
      toneFlowConfig.phase === "open"
        ? TONE_OPEN_BROWSER_FAILURE_CLASSES
        : TONE_SELECT_BROWSER_FAILURE_CLASSES
    ) + ";",
  'keys.length === 2 && keys.includes("failureClass") && keys.includes("settled")',
  "result.settled === false",
  "failureClasses.includes(result.failureClass)",
  "return result;",
  'throw new Error("wf540_' + unitFailureFrameResultErrorTagForAction(actionId) + '_result");',
];
const required = [...commonRequired, ...phaseRequired, ...wrapperRequired];
```

Add the matching mutants through the existing `assertSourceMutantsRejected`
helper so each new token is proven load-bearing.

**4b. `executor/self-test/browser-run-code-source-ownership.mjs`** — add the
behavioural round-trip and its complement. This is the coverage that would have
caught the original defect; the substring pins alone would not.

```js
const observedUnitFailureFrameActionIds = [];

// ...inside the per-action loop, after `const compiledSource = ...`:
if (action.outputSchemaId === "unit") {
  const failureClasses = UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID[action.id] ?? null;
  if (failureClasses === null) {
    // Complement: no other unit source may carry the preserving form.
    invariant(
      !compiledSource.includes("if (result === true) return { ok: true };"),
      action.id + " unregistered unit source is frame-preserving"
    );
  } else {
    observedUnitFailureFrameActionIds.push(action.id);
    const tag = DIRTY_NAVIGATION_REQUEST_ACTION_IDS.includes(action.id)
      ? "dirty_navigation"
      : "tone_frame";

    // The compiled source must really be this action's preserving wrapper:
    // compare its tail against the builder's output for a probe inner source.
    invariant(
      compiledSource.endsWith(
        buildFailureFramePreservingUnitSource("PROBE", failureClasses, tag).slice(
          "(async (page) => {\n          const result = await (PROBE)(page);".length
        )
      ),
      action.id + " preserving unit wrapper tail drift"
    );

    // Behavioural round-trip, executed against the builder's own output.
    invariant(
      deepEqualJson(await runWrappedUnitSource(failureClasses, tag, "true"), { ok: true }),
      action.id + " unit success frame drift"
    );
    for (const failureClass of failureClasses) {
      const frame = { failureClass, settled: false };
      invariant(
        deepEqualJson(
          await runWrappedUnitSource(failureClasses, tag, JSON.stringify(frame)),
          frame
        ),
        action.id + " " + failureClass + " frame was not preserved"
      );
    }

    // An unrecognised class and an unrecognised shape both throw.
    await expectAsyncFailure(
      () =>
        runWrappedUnitSource(
          failureClasses,
          tag,
          JSON.stringify({ failureClass: "zz_unknown", settled: false })
        ),
      action.id + " unregistered failure class"
    );
    await expectAsyncFailure(
      () => runWrappedUnitSource(failureClasses, tag, JSON.stringify({ ok: true })),
      action.id + " unrecognised unit return shape"
    );
  }
}

// ...after the loop:
invariant(
  observedUnitFailureFrameActionIds.length ===
    Object.keys(UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID).length &&
    Object.keys(UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID).every((id) =>
      observedUnitFailureFrameActionIds.includes(id)
    ),
  "unit failure-frame action coverage drift"
);
```

`runWrappedUnitSource(failureClasses, resultErrorTag, innerLiteral)` is the one
new local helper. It must exercise the real builder output, so it calls
`buildFailureFramePreservingUnitSource` itself with a trivial inner source that
returns the probe value:

```js
async function runWrappedUnitSource(failureClasses, resultErrorTag, innerLiteral) {
  const source = buildFailureFramePreservingUnitSource(
    "async () => (" + innerLiteral + ")",
    failureClasses,
    resultErrorTag
  );
  const wrapper = new Script("(" + source + ")", {
    filename: "unit-frame-roundtrip.self-test.js",
  }).runInThisContext();
  return await wrapper(null);
}
```

The behavioural round-trip is bound to the real action by the wrapper-tail
assertion in the loop above: the action's actual `compiledSource` must end with
exactly the tail the builder emits for that action's failure classes and tag.
Together the two checks prove both "this action really got the preserving
wrapper" and "that wrapper really preserves every registered frame", without
needing to strip the inner source out of a compiled string.

Do not attempt to execute an action's real inner source: those sources drive a
live `page`. The probe inner source above is the only safe form. If the tail
slice proves awkward to express, an equivalent and acceptable alternative is to
assert that `compiledSource` contains the exact
`const failureClasses = <JSON of this action's classes>;` line together with the
`wf540_<tag>_result` throw — the point is an exact, per-action byte pin, not the
particular slicing technique.

## Data flow

```
plan.actionManifest row (kind: "click", outputSchemaId: "unit")
  └─ buildBrowserInvocation                browser/generic-invocations.mjs:317
       ├─ scenario builder produces the raw source
       └─ unit normalization                browser/generic-invocations.mjs:454-481
            ├─ UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID[action.id]   executor/config.mjs (new)
            ├─ registered  → buildFailureFramePreservingUnitSource  (frame survives)
            └─ unregistered→ discarding wrapper                      (unchanged)
                 ↓ playwright-cli stdout
       classifyPrivateToneOpenFailureFrame / …SelectFailureFrame
            executor/failure-boundary.mjs:115,141
            ← runtime/command-authority.mjs:399,405
            ← executor/capabilities/execute-action.mjs:316,320
                 ↓ throw createPrivateTone*Failure
       beginPrivateFailureAction / completePrivateFailureAction
            executor/plan-execution.mjs:69,104
                 ↓
       executor/diagnostic-sink.mjs → {"failedActionId":"…","failureClass":"…"}
```

Observable behaviour change on the currently-stuck run: instead of
`{"failedActionId":"dg-024-entry-nav-cancel","failureClass":"inline_pointer_locked"}`
at ~65 s, the harness reports
`{"failedActionId":"dg-021-tone-open","failureClass":"tone_portal_settlement"}`
at ~30 s.

## Error handling

- **Unrecognised return.** The preserving wrapper throws
  `wf540_<tag>_result` for anything that is neither `true` nor a two-key
  `{ failureClass, settled: false }` with a registered class. Fail closed: an
  unexpected object can never be read as success.
- **Registry miss.** An action with no registry entry keeps the existing
  discarding wrapper. This is deliberate: only actions whose sources are known
  to compute frames are promoted. The complement self-test proves no other unit
  source accidentally carries the preserving form.
- **Prototype safety.** The shape check keeps the existing
  `Object.getPrototypeOf(result) === Object.prototype` guard, so a class
  instance or an `Object.create(null)` bag cannot impersonate a frame.
- **Cardinality.** The `=== 9` invariant in `executor/config.mjs` and the
  coverage invariant in the ownership self-test together make a silently
  dropped id impossible.
- **Ordering.** `buildFailureFramePreservingUnitSource` must run **after** the
  scenario builder produced the source and **before** `invocation.args` is
  rebuilt, exactly where the current wrapper sits. The
  `unitResultAlreadyNormalized` escape hatch at
  `browser/generic-invocations.mjs:437-445` must be left untouched — those
  sources already return their own normalized value.
- **No secret exposure.** The frames are fixed literals from the frozen class
  vocabulary; nothing from the page, fixtures or environment is interpolated,
  so `assertSafeEvidence` and the diagnostic sink's redaction contract are
  unaffected.

## Regression-test shape

| Case | File | Assertion |
|---|---|---|
| tone-open wrapper pins | `browser-tone-flow-source.mjs` | compiled `dg-021`/`rc-015` source contains the preserving tokens incl. `JSON.stringify(TONE_OPEN_BROWSER_FAILURE_CLASSES)` |
| tone-select wrapper pins | `browser-tone-flow-source.mjs` | same for `dg-022`/`rc-016` with `TONE_SELECT_BROWSER_FAILURE_CLASSES` |
| success round-trip | `browser-run-code-source-ownership.mjs` | inner `true` → `{ ok: true }` for all 9 registered ids |
| frame round-trip | `browser-run-code-source-ownership.mjs` | every registered frame returns byte-equal for its own action |
| unknown class rejected | `browser-run-code-source-ownership.mjs` | `{ failureClass: "zz_unknown", settled: false }` throws |
| unknown shape rejected | `browser-run-code-source-ownership.mjs` | `{ ok: true }` from the inner source throws |
| complement | `browser-run-code-source-ownership.mjs` | no unregistered unit source contains the preserving form |
| coverage | `browser-run-code-source-ownership.mjs` | observed registered ids === all 9 registry keys |
| dirty-navigation byte identity | `browser-dirty-navigation-source.mjs` | existing pins at `:173`/`:255` still pass unmodified |

Expected counter movement: executor self-test `negativeCases` increases from
2810 by the number of `expectAsyncFailure` / `assertSourceMutantsRejected` cases
added (≥ 18: two per registered id plus the tone mutants). The contract
self-test's `negativeCases` is unaffected by this leaf.

## Validation commands

```
node _docs/_workflows/task-540-smoke-executor.mjs --self-test
node _docs/_workflows/task-540-smoke-contract.mjs --self-test
wc -l _docs/_workflows/task-540-smoke/executor/config.mjs \
      _docs/_workflows/task-540-smoke/browser/generic-invocations.mjs \
      _docs/_workflows/task-540-smoke/browser/scenarios/dirty-guards.mjs \
      _docs/_workflows/task-540-smoke/executor/self-test/browser-dirty-navigation-source.mjs \
      _docs/_workflows/task-540-smoke/executor/self-test/browser-tone-flow-source.mjs \
      _docs/_workflows/task-540-smoke/executor/self-test/browser-run-code-source-ownership.mjs
```

Required output:

- executor self-test: `pass: true`, `actions: 496`, `runtimeReceipts: 177`,
  `cleanupActions: 72`, `nominalPersistentCleanupActions: 72`,
  `terminalMatrixCases: 1`, `captures: 26`, `negativeCases` > 2810 (the baseline
  at the time of this leaf; measured 2985 at HEAD 2026-07-27, per commit
  `c89fa96c`).
- contract self-test: unchanged from the post-L01 result
  (`pass: true`, `actions: 496`, `negativeCases: 113`).
- every touched module ≤ 1,000 physical lines (measured at HEAD 2026-07-27 the
  largest touched module is `browser-run-code-source-ownership.mjs` at 716,
  followed by `browser-tone-flow-source.mjs` at 710).

Additional manual check before declaring done: build the invocation for
`dg-024-entry-nav-cancel` before and after the change and diff the emitted unit
source — it must be byte-identical.

## Non-blocking follow-up (do not execute here)

Make the generic, unregistered unit wrapper fail closed as well: assert the
inner source returned `true` or `undefined` and throw on any plain object
carrying a `failureClass` key. That would close the whole "source computes a
verdict the wrapper drops" class for future sources, but it requires first
sweeping all ~390 unit run-code sources to confirm their return values.

Status as of 2026-07-27: this is a **deliberately-open, unraised** follow-up. It
was not raised as a leaf — TASK-540 has not closed (`TASK-540` is still
`🚧 In Progress`), no `TASK-540-07-L03` exists, and no TASK-545 leaf covers it
(TASK-545-01..04 are the all-results guard / static workflow contract, the
audit-workflow convergence, the durable smoke-evidence manifest and the
task-graph/changelog repair). Owner: the TASK-540 family owner, to raise it as a
TASK-540-07 leaf while the family is open, or to hand it to TASK-545 at closure.

## Acceptance

- `UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID` exists in `executor/config.mjs` with
  exactly the nine ids and is the only source of truth for which unit actions
  preserve frames.
- The preserving wrapper body exists once, not twice.
- Compiled sources for `dg-021`, `dg-022`, `rc-015`, `rc-016` contain the
  preserving form; the compiled source for `dg-024` is byte-identical to before.
- Reverting `browser/generic-invocations.mjs` to the unconditional discarding
  wrapper makes the executor self-test fail.
- No file outside this leaf's six owned paths is modified, and no failure class,
  action id, frame literal or output contract changes.
