# TASK-539-07-L01: Bind Each Page Root and Footer Exactly Once

# FileName: TASK-539-07-L01-Bind-Each-Page-Root-And-Footer-Exactly-Once.md

**Parent Subtask:** TASK-539-07
**Priority:** High
**Category:** Pages / Browser Runtime / Reliability
**Estimated Effort:** Large
**Dependencies:** TASK-539-05-L01, TASK-539-04-L01
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Scope and ownership

Sole source writer: `core/services/pages/pageEffectsRuntime.ts`. This leaf also owns
compatibility-expectation updates required before its source gate in
`tests/vitest/pages/pageEffectsRuntime.test.ts`,
`tests/vitest/content/task-534-interactivity-runtime.test.tsx`, and
`tests/vitest/site/page-runtime-shell-branch.test.tsx`. Current global guard
and scan are around `:67-95`; tilt and magnetic writers around `:191-225`.

## Implementation Pseudocode

The generated static IIFE must install or reuse one versioned state, then always call
its initializer:

```js
var state = window.__codersoPageEffectsV2;
if (!state) {
  state = window.__codersoPageEffectsV2 = {
    reveal: new WeakSet(),
    parallax: new WeakSet(),
    spotlight: new WeakSet(),
    switcher: new WeakSet(),
    gallery: new WeakSet(),
    tilt: new WeakSet(),
    magnetic: new WeakSet(),
    documentListenersBound: false,
    init: function(root) { /* scan and bind unowned elements */ }
  };
}
state.init(document);
// Preserve the exported legacy observation key/value, but never use it to skip a scan.
window.__codersoPageMotionEffectsInit = true;
```

This is a global reusable state plus per-element WeakSets, not a root-only/global
boolean guard. Each emitted main/footer script rescans the current document. A set
membership check precedes listener/observer creation; add to the set only after the
binding is ready. Document-wide pointer/keyboard listeners, if retained, are guarded
separately and dispatch only to current matching elements.

Keep `PAGE_EFFECTS_RUNTIME_INIT_FLAG` exported with the exact existing value
`"__codersoPageMotionEffectsInit"` for source/test compatibility. The generated static
source may set that window property to `true` after installing/reusing state, but it must
never read it as an early-return guard. `window.__codersoPageEffectsV2` plus the per-
element WeakSets are the sole idempotence authority.

Binder data flow:

```text
init(root)
 -> query fixed selectors in root/current document
 -> for each unbound element create its exact observer/listeners
 -> record element in the corresponding WeakSet
 -> no-op only for that already-bound element, never for undiscovered footer nodes
```

Reveal/parallax/spotlight/tilt/magnetic motion setup is skipped or neutralized under reduced
motion as appropriate. Switcher/gallery keyboard and ARIA state initialization must
still run because they are accessibility behavior, not motion.

Tilt pointer movement sets `--cx-tilt-x`/`--cx-tilt-y`; magnetic sets
`--cx-magnetic-x`/`--cx-magnetic-y`. Leave/reset returns each owned variable to its
neutral typed value. Never set/remove the whole `transform` property or another
effect's variables.

## Error and lifecycle rules

- Missing APIs/selectors fail soft per binder without aborting later binders.
- Repeated main/footer scripts and explicit repeated `init(document)` calls do not
  multiply callbacks or state transitions.
- Detached nodes remain collectible through WeakSets; do not retain element arrays in
  the global state.
- No MutationObserver is required: parser-order scripts invoke a fresh rescan. Do not
  add a perpetual whole-document observer without a separate demonstrated need.

## Gate test ownership and validation

Update all three named suites' stale one-shot-flag and direct-transform expectations
before this source gate. Include spotlight in state-shape assertions. TASK-539-07-L02
owns additive parser-order and duplicate-callback cases afterward and must not
re-baseline the compatibility assertions.

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/pages/pageEffectsRuntime.test.ts tests/vitest/content/task-534-interactivity-runtime.test.tsx tests/vitest/site/page-runtime-shell-branch.test.tsx
git diff --check
```

Rerun any named failing test file once in isolation before classifying the failure.
