# TASK-539-07-L02: Prove Main and Footer Idempotence

# FileName: TASK-539-07-L02-Prove-Main-And-Footer-Idempotence.md

**Parent Subtask:** TASK-539-07
**Priority:** High
**Category:** Pages / Vitest / Runtime Proof
**Estimated Effort:** Medium
**Dependencies:** TASK-539-07-L01
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Ownership

Own only additive parser-order/idempotence cases in:

- `tests/vitest/pages/pageEffectsRuntime.test.ts`
- `tests/vitest/content/task-534-interactivity-runtime.test.tsx`
- `tests/vitest/site/page-runtime-shell-branch.test.tsx`

TASK-539-07-L01 already updated and gated compatibility expectations in all three
files; do not re-baseline them.

## Implementation Pseudocode

### Test Shape

- Execute main markup/script first, append footer effect markup/script second, and
  prove both roots' reveal/parallax/spotlight/switcher/gallery/tilt/magnetic elements
  respond. Include main-without-spotlight → footer-with-spotlight and the inverse parser
  order; each spotlight root updates its own CSS variables exactly once.
- Execute the generated script/init repeatedly and prove one action produces one
  state transition/callback, not duplicate listeners.
- Assert the state owns WeakSets per binder and has no one-shot early return that
  skips a later scan.
- Import `PAGE_EFFECTS_RUNTIME_INIT_FLAG`, assert its exported literal is unchanged and
  the generated script may set it for compatibility but never reads it to return early.
- Magnetic/tilt pointer movement changes only exact `--cx-*` variables and leave
  resets only those values.
- Reduced-motion disables motion variables/observers while switcher/gallery keyboard,
  roving tabindex and ARIA updates still initialize.
- Main-only, footer-only, and no-matching-element fixtures fail soft with zero errors.
- Render the real Page document/shell strings for selector tests; do not manually add
  the magnetic hook expected from the renderer.
- Use magnetic as the only authored composition effect in both a main-only fixture and
  a footer-only fixture. Assert the real renderer supplied the fixed composition CSS,
  pointer movement changes computed transform through the magnetic variables, leave
  restores neutral transform, and parser-order initialization does not skip either root.

Use listener spies or observable state counts, not only generated-script substring
checks.

## Validation

```bash
bun run test:vitest -- tests/vitest/pages/pageEffectsRuntime.test.ts tests/vitest/content/task-534-interactivity-runtime.test.tsx tests/vitest/site/page-runtime-shell-branch.test.tsx
bun --cwd core lint:types
bun --cwd core lint
git diff --check
```

Rerun each failing file alone before classification.
