# TASK-540-07-L01: Correct the Radix Option Selector and Guard the Text-Engine Shape

# FileName: TASK-540-07-L01-Correct-Radix-Option-Selector-And-Guard-Text-Engine-Shape.md

**Parent Subtask:** TASK-540-07
**Parent Task:** TASK-540
**Priority:** High
**Category:** Custom Screens / Smoke Harness / Test Integrity
**Estimated Effort:** Small
**Dependencies:** none (lands first in TASK-540-07)
**Status:** 🚧 In Progress
**Implementation Complete:** 2026-07-27 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Targeted Gate Passed:** 2026-07-27 — this leaf's two authoritative lanes re-measured on the current bytes, not copied from the seed: `node _docs/_workflows/task-540-smoke-contract.mjs --self-test` returned `pass: true, actions: 496, setupActions: 55, flowActions: 434, cleanupActions: 7, fixtures: 15, captures: 17, screenshots: 13, assertions: 55, expandedCleanupActions: 45, executableTypeCounts {runtime-operation: 76, browser-run-code: 392, browser-native: 14, browser-screenshot: 13, browser-global-list: 1}, oneLoopReceipts: 496, negativeCases: 117`, so the frozen contract counts are unchanged and `negativeCases` is above the 109 pre-edit baseline; `node _docs/_workflows/task-540-smoke-executor.mjs --self-test` returned `pass: true, actions: 496, runtimeReceipts: 177, cleanupActions: 72, captures: 26, negativeCases: 2985`, proving the same plan still builds; `wc -l` over both owned modules gave `contract/selectors.mjs` 230 and `contract/self-test/registries-fixtures.mjs` 424, each ≤ 1,000. The guard was exercised directly against the live registry: `createSelectorRegistry().muted` is `[role="option"]:has(span:text-is("Muted"))`, and `assertSelectorTextEngineShape` rejected the pre-fix `[role="option"]:text-is("Muted")`, the `[data-slot="select-item"]:text-is("Muted")` sibling token, and the non-delegated `[role="option"] span:text-is("Muted")` form. This is an evidence-backed re-measurement of already-landed code, not a transition-generated generation/token or hash receipt; it claims no family post-audit, full validation, canonical smoke run, changelog, or closure result.
**Changelog:** 1252 (family-pinned; closure only, owned by TASK-540-06)

---

## Overview

Correct the one registered smoke selector that can never match, and make the
defect class that produced it a build-time error.

`muted` is registered as `[role="option"]:text-is("Muted")`. Playwright's
`:text-is()` matches an element only when its text is `self`, and a Radix /
shadcn `SelectItem` puts its label in a child `<span>` via
`SelectPrimitive.ItemText`, so the `[role="option"]` host has no direct text node
and the selector resolves to 0 nodes. The same file already carries the correct
shape for the same widget class in `fieldOption`.

Two changes, one cohesive unit, one file plus its self-test:

1. Swap the `muted` value to `[role="option"]:has(span:text-is("Muted"))`.
2. Add a registry-construction invariant that rejects **any** selector which
   addresses a text-delegating widget host by the host's own text, so this can
   never be reintroduced silently.

## Exclusive file ownership

| Path (relative to `_docs/_workflows/task-540-smoke/`) | Role |
|---|---|
| `contract/selectors.mjs` | selector value + new invariant + new export |
| `contract/self-test/registries-fixtures.mjs` | negative/positive regression cases |

No other file may be edited by this leaf. In particular
`browser/simple-invocations.mjs` and
`executor/self-test/browser-tone-flow-source.mjs` must **not** be touched: both
derive the string through `registeredSelector(plan, "muted")`
(`browser/simple-invocations.mjs:178`,
`executor/self-test/browser-tone-flow-source.mjs:167` and `:222`) and therefore
follow the registry automatically.

## Verified anchors

| Anchor | Fact |
|---|---|
| `contract/selectors.mjs:205` | `muted: staticSelector('[role="option"]:has(span:text-is("Muted"))')` — the corrected value; the defect was `staticSelector('[role="option"]:text-is("Muted")')` |
| `contract/selectors.mjs:126-129` | `fieldOption: selectorTemplate(['[role="option"]:has(span:text-is("', " (", ')"))'], [slot(0), slot(1)])` — the correct shape for the same widget |
| `contract/selectors.mjs:44-46` | `staticSelector(value)` = `selectorTemplate([value])`; a static selector's literal is `parts[0]` and its arity is 0 |
| `contract/selectors.mjs:106-230` | `createSelectorRegistry()` returns a `deepFreezeExact` object of 59 selector templates, then hands it to `assertSelectorTextEngineShape` at `:229` |
| `contract/selectors.mjs:1` | imports `{ deepFreezeExact, invariant } from "./core.mjs"` — both helpers already available |
| `contract/registries.mjs:321` | `const selectors = createSelectorRegistry();` — the single construction site, reached on every plan build |
| `core/admin/components/ui/select.tsx:92-117` | `SelectItem`; `data-slot="select-item"` at `:99`, indicator span at `:107`, `<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>` at `:114` |
| `core/admin/ui/custom-screens/CustomScreenEntryPresentationPanel.tsx:166` | `<div className="space-y-1" data-presentation-control="tone">` |
| `core/admin/ui/custom-screens/CustomScreenEntryPresentationPanel.tsx:181-185` | `presentationToneOptions.map(...)` → `<SelectItem value={option.value}>{option.label}</SelectItem>` |
| `core/admin/ui/custom-screens/customScreenEntryPresentation.ts:56-59` | `presentationToneOptions` — label = value with first letter uppercased |
| `core/services/customScreens/screenEntryPresentationOverrideContract.ts:37-49` | `screenEntryPresentationToneValues` contains `"muted"` → label `Muted` |
| `browser/simple-invocations.mjs:179` | `const mutedSelector = JSON.stringify(registeredSelector(plan, "muted"));` |
| `browser/simple-invocations.mjs:278` | `const option = openContent.locator(${mutedSelector});` (tone-open) |
| `browser/simple-invocations.mjs:358` | `const option = openContent.locator(${selector});` (tone-select) |
| `browser/simple-invocations.mjs:337` | `trigger.textContent.trim() === "Muted"` — the Select **trigger** (`SelectValue`), unaffected by this change and already correct |
| `contract/self-test/index.mjs:13-41` | `runTask540SmokeContractSelfTest()`; `negative(callback, label)` increments `negativeCases`; `runRegistriesFixturesSelfTestSuite(plan, negative)` at `:25` |
| `contract/self-test/registries-fixtures.mjs:13` | `export function runRegistriesFixturesSelfTestSuite(plan, negative)` |

`muted` is a `staticSelector`, so the fix is a pure string swap: no arity
change, no template-slot change, no consumer signature change.

## Implementation Pseudocode

### 1. `contract/selectors.mjs` — the value swap

```js
// line 142, inside createSelectorRegistry()
- muted: staticSelector('[role="option"]:text-is("Muted")'),
+ muted: staticSelector('[role="option"]:has(span:text-is("Muted"))'),
```

### 2. `contract/selectors.mjs` — the reintroduction guard

Add above `createSelectorRegistry`, with the evidence in the comment so the list
is auditable:

```js
// Widget hosts whose label is delegated to a child element, so Playwright's
// :text-is() (which requires elementMatchesText === "self") can never match the
// host itself. Radix/shadcn SelectItem renders its children inside
// <SelectPrimitive.ItemText> — core/admin/components/ui/select.tsx:92-117 — so
// [role="option"] / [data-slot="select-item"] must be addressed through
// :has(span:text-is(...)), never by the host's own text.
export const TEXT_DELEGATING_HOST_TOKENS = deepFreezeExact([
  '[role="option"]',
  '[data-slot="select-item"]',
]);

const TEXT_ENGINE_PSEUDO = ":text-is(";
const DELEGATED_TEXT_FORM = ':has(span:text-is("';

export function assertSelectorTextEngineShape(registry) {
  invariant(
    registry !== null && typeof registry === "object",
    "selector registry is absent"
  );
  for (const [name, template] of Object.entries(registry)) {
    invariant(
      template?.kind === "selector-template" && Array.isArray(template.parts),
      name + " selector template is invalid"
    );
    // A template's literal shape is its parts joined by a neutral placeholder:
    // argument values can never contain a selector combinator, so joining with a
    // placeholder cannot create or destroy a host/pseudo adjacency.
    const literal = template.parts.join("\0");
    if (!literal.includes(TEXT_ENGINE_PSEUDO)) continue;
    for (const host of TEXT_DELEGATING_HOST_TOKENS) {
      invariant(
        !literal.includes(host + TEXT_ENGINE_PSEUDO),
        name + " selector addresses a text-delegating host by its own text"
      );
      invariant(
        !literal.includes(host) || literal.includes(host + DELEGATED_TEXT_FORM),
        name + " selector must match a delegated label through :has(span:text-is(...))"
      );
    }
  }
  return registry;
}
```

Wire it into the single construction site so it runs on every plan build,
including both self-tests:

```js
export function createSelectorRegistry() {
  const slot = (argIndex) => ({ argIndex, encoding: "css-string" });
  const registry = deepFreezeExact({ /* ...unchanged 59 entries... */ });
  return assertSelectorTextEngineShape(registry);
}
```

Notes on the shape of the guard:

- It is a **denylist of proven text-delegating hosts**, not an allowlist of
  safe hosts. The sweep proved that only `SelectItem` wraps its children —
  `Badge` (`core/admin/components/ui/badge.tsx:34-48`), `DropdownMenuItem`
  (`core/admin/components/ui/dropdown-menu.tsx:51-75`), `TabsTrigger` and
  `Button` all pass children through unwrapped — so an allowlist would be
  maintenance-heavy and would fire on correct selectors. If a future shadcn
  primitive starts wrapping, add its host token to
  `TEXT_DELEGATING_HOST_TOKENS` with the same comment evidence.
- Both `[role="option"]` and `[data-slot="select-item"]` are listed because
  `SelectItem` emits both attributes on the same host
  (`core/admin/components/ui/select.tsx:96-99`), so either could be used as the
  addressing token.
- The second invariant is the positive half: a selector may mention a
  delegating host together with a text engine only in the `:has(span:text-is("`
  form. This is what keeps `fieldOption` legal and would reject a half-fix such
  as `[role="option"] span:text-is("Muted")` written as a descendant match on
  the wrong host.

### 3. `contract/self-test/registries-fixtures.mjs` — regression coverage

Import the new export and append to `runRegistriesFixturesSelfTestSuite`:

```js
import { assertSelectorTextEngineShape } from "../selectors.mjs";

// ...inside runRegistriesFixturesSelfTestSuite(plan, negative):

// Positive pin: the corrected literal is exactly what the tone sources consume.
invariant(
  plan.registries.selectors.muted.parts.length === 1 &&
    plan.registries.selectors.muted.parts[0] ===
      '[role="option"]:has(span:text-is("Muted"))' &&
    plan.registries.selectors.muted.minArity === 0 &&
    plan.registries.selectors.muted.maxArity === 0,
  "muted selector literal drift"
);

// Negative 1: the exact pre-fix value must be rejected.
negative(
  () =>
    assertSelectorTextEngineShape({
      ...plan.registries.selectors,
      muted: { kind: "selector-template", parts: ['[role="option"]:text-is("Muted")'] },
    }),
  "option host addressed by its own text"
);

// Negative 2: the sibling attribute token is rejected too.
negative(
  () =>
    assertSelectorTextEngineShape({
      ...plan.registries.selectors,
      muted: {
        kind: "selector-template",
        parts: ['[data-slot="select-item"]:text-is("Muted")'],
      },
    }),
  "select-item host addressed by its own text"
);

// Negative 3: a delegating host with a text engine in any other form is rejected.
negative(
  () =>
    assertSelectorTextEngineShape({
      ...plan.registries.selectors,
      muted: {
        kind: "selector-template",
        parts: ['[role="option"] span:text-is("Muted")'],
      },
    }),
  "delegated label matched outside the :has(span:text-is(...)) form"
);

// Negative 4: a malformed entry fails closed rather than being skipped.
negative(
  () => assertSelectorTextEngineShape({ muted: { kind: "not-a-selector" } }),
  "selector template shape rejected"
);
```

`fieldOption` needs no extra case: it is already in
`plan.registries.selectors` and every positive run of
`assertSelectorTextEngineShape` exercises it.

## Data flow

```
createSelectorRegistry()            contract/selectors.mjs:106
  └─ assertSelectorTextEngineShape  (new; throws on a delegating-host text match)
       └─ registries.selectors      contract/registries.mjs:321,339
            └─ plan.registries.selectors
                 ├─ registeredSelector(plan, "muted")   executor/ref-dsl.mjs:584
                 │    ├─ browser/simple-invocations.mjs:179 → :278 (tone-open locator)
                 │    ├─ browser/simple-invocations.mjs:358      (tone-select locator)
                 │    └─ executor/self-test/browser-tone-flow-source.mjs:183,:238
                 │         (expected-token strings — follow automatically)
                 └─ contract/self-test/registries-fixtures.mjs   (new cases)
```

Nothing else reads `muted`. `contract/fixtures.mjs:211`
(`presentationDraft: { tone: "muted" }`) and
`contract/visible-assertion-schemas.mjs:227`
(`schemaLiteral("muted")`) are the persisted **value** `"muted"`, not the
selector, and must not be changed.

## Error handling

- `assertSelectorTextEngineShape` uses the file's existing `invariant` from
  `./core.mjs`, so a violation throws the harness's standard contract error at
  plan-build time. Both `--self-test` entry points build the plan first, so a
  bad selector fails before any browser, server or fixture is touched.
- The guard is total: it iterates every registry entry and rejects a
  non-template value rather than skipping it, so a malformed future entry
  cannot slip past by not looking like a selector.
- Joining `parts` with `\0` is deliberate. Selector arguments are
  `encoding: "css-string"` values (block ids, labels, hrefs); they can never
  contain a `:` pseudo or an attribute-selector token, so the placeholder join
  can neither fabricate a false positive across a slot boundary nor hide a real
  adjacency inside one part.
- The guard runs on the frozen registry object; it only reads, never mutates,
  and returns the same frozen reference so `createSelectorRegistry`'s contract
  is unchanged.

## Regression-test shape

| Case | Kind | Assertion |
|---|---|---|
| `muted` literal pin | positive `invariant` | `parts === ['[role="option"]:has(span:text-is("Muted"))']`, `minArity === maxArity === 0` |
| pre-fix value | `negative(...)` | `[role="option"]:text-is("Muted")` throws |
| sibling token | `negative(...)` | `[data-slot="select-item"]:text-is("Muted")` throws |
| wrong delegated form | `negative(...)` | `[role="option"] span:text-is("Muted")` throws |
| malformed entry | `negative(...)` | `{ kind: "not-a-selector" }` throws |

Expected counter movement: contract self-test `negativeCases` 109 → 113 (measured
at HEAD 2026-07-27: 117, later family leaves having added contract negatives). The
executor self-test's `negativeCases` is unchanged by this leaf (2810 at the time;
measured 2985 at HEAD) because it
adds no executor-level negative case; its `pass` must stay `true` since it
builds the same plan.

## Validation commands

```
node _docs/_workflows/task-540-smoke-contract.mjs --self-test
node _docs/_workflows/task-540-smoke-executor.mjs --self-test
wc -l _docs/_workflows/task-540-smoke/contract/selectors.mjs \
      _docs/_workflows/task-540-smoke/contract/self-test/registries-fixtures.mjs
```

Required output:

- contract self-test: `pass: true`, `actions: 496`, `setupActions: 55`,
  `flowActions: 434`, `cleanupActions: 7`, `executableTypeCounts` unchanged,
  `negativeCases: 113`.
- executor self-test: `pass: true`, `actions: 496`, `runtimeReceipts: 177`,
  `cleanupActions: 72`, `captures: 26`, `negativeCases: 2810`.
- both files ≤ 1,000 physical lines.

Pre-edit baselines measured on this working tree, for comparison:
contract `{"pass":true,"actions":496,...,"negativeCases":109}`,
executor `{"pass":true,"actions":496,"runtimeReceipts":177,"cleanupActions":72,"nominalPersistentCleanupActions":72,"terminalMatrixCases":1,"captures":26,"negativeCases":2810}`.

## Acceptance

- `contract/selectors.mjs:205` reads
  `muted: staticSelector('[role="option"]:has(span:text-is("Muted"))'),`.
- Reverting that one line makes the contract self-test throw, not pass.
- No file outside this leaf's two owned paths is modified.
- The action contract counts are byte-identical to the pre-edit baseline.
