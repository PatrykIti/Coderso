# TASK-539-04-L02: Prove Independent Transform Composition

# FileName: TASK-539-04-L02-Prove-Independent-Transform-Composition.md

**Parent Subtask:** TASK-539-04
**Priority:** High
**Category:** Pages / Vitest / CSS Contract Proof
**Estimated Effort:** Medium
**Dependencies:** TASK-539-04-L01
**Status:** ⏳ To Do
**Changelog:** 1318 (pinned; create only at TASK-539 closure)

---

## Additive-only ownership

Create only `tests/vitest/pages/task-539-transform-composition.test.ts`.
L01 source and its two existing suites are read-only here.

## Test Shape

- Pin all eleven variable bytes (reveal 1, decoration 4, hover 2, tilt 2, magnetic
  2), the one host attribute/selector, both exact marquee-replica constants, and the
  exact formula order/defaults.
- Assert reveal, decoration, hover, tilt, and magnetic declarations write only their
  variables. Cover every transform-bearing decoration mode (`float`, `drift`,
  `pulse`, `orbit`) plus ambient-orb drift; preserve radiate box-shadow and all other
  independent opacity/filter/box-shadow channels.
- Assert resolver host/magnetic presence is authored-only and invalid values omit.
- Assert layer anchors use `translate` and full/auto width stays bounded.
- Assert viewport→rail→segment CSS, one animation owner, nonshrinking segments, the
  one-segment fallback plus equal two-segment geometry, direction/speed, and
  reduced-motion stop.
- Assert all glow pseudo-overlays have `pointer-events:none` while interactive hosts
  do not.
- Pin no-effect/unrelated output identity.

Use complete selector/declaration assertions. Do not import renderer/runtime or claim
actual reveal/orb host stamping, movement, clone isolation, or browser geometry; those
belong to TASK-539-05/07/08.

## Implementation Pseudocode

```text
create task-539-transform-composition.test.ts only
import only the L01 pure CSS owners/constants; never import renderer or runtime modules

build explicit no-effect and authored-effect fixtures
for each reveal/decoration/hover/tilt/magnetic case:
  render the pure CSS output
  assert the exact owned variable declaration and absence of another transform owner
assert the eleven variables, host selector/attribute, replica constants, formula order,
marquee geometry/fallback, layer translate behavior, glow pointer-events, and
no-effect/unrelated byte identity through complete selector/declaration comparisons

run the new file independently, lint/types, family line-limit, wc -l, and diff check;
on failure rerun the named test once before classification
```

## Validation and line receipt

```bash
bun run test:vitest -- tests/vitest/pages/task-539-transform-composition.test.ts
bun --cwd core lint:types
bun --cwd core lint
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
wc -l tests/vitest/pages/task-539-transform-composition.test.ts
git diff --check
```

The suite must be independently runnable and `<=1000`. Rerun it once on failure.
