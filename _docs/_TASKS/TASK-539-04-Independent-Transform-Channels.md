# TASK-539-04: Independent Transform Channels

# FileName: TASK-539-04-Independent-Transform-Channels.md

**Parent Task:** TASK-539
**Priority:** High
**Category:** Pages / Composition CSS / Interaction Contract
**Estimated Effort:** Large
**Dependencies:** TASK-539-03-L04
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Goal

Own one fixed transform-host attribute/formula whose independent reveal, decoration,
hover, tilt, and magnetic variables compose on both block hosts and decorative
ambient orbs. Layer anchoring remains on the independent CSS `translate` property.
Also own the fixed marquee-replica attribute/selector consumed by renderer and
runtime; no consumer may duplicate those bytes.

This subtask does **not** own grid placement or
`PAGE_BLOCK_GRID_ITEM_ATTRIBUTE`; TASK-539-03-L05 is the sole owner.

## Leaves and ownership

| Order | Leaf | Scope | Status |
|---|---|---|---|
| 1 | TASK-539-04-L01 | Sole composition/interactivity CSS resolver change and source-owner expectation updates | ⏳ To Do |
| 2 | TASK-539-04-L02 | New additive TASK-539 transform proof suite only | ⏳ To Do |

L01 solely writes `core/services/pages/pageCompositionEffects.tsx` and updates
existing expectations in `page-composition-effects.test.ts` and
`task-534-interactivity-css.test.ts`. L02 creates one new suite and cannot edit source
or re-baseline L01.

## Security Contract

No routes or author strings are added. Attribute/variable names and CSS formulas are
fixed literals; values remain normalized enums/clamped numbers/sanitized colors.
No public write, auth, RBAC, CSRF, rate-limit, nonce, or captcha change applies.

## Acceptance

- One fixed host selector/formula composes five independent transform channels and
  exactly eleven custom-property names.
- Float, drift, pulse, and orbit keyframes write only the decoration channel;
  radiate retains its independent box-shadow channel.
- Block-owned effects resolve the host present-only; renderer later stamps reveal
  descendants and orbs with the same attribute.
- `PAGE_MARQUEE_REPLICA_ATTRIBUTE` and `PAGE_MARQUEE_REPLICA_SELECTOR` have one
  exact owner here and are reused by TASK-539-05/07. They identify only a
  renderer-approved replica segment; an authored seamless marquee whose normalized
  child subtree is unsafe falls back to one canonical segment and stamps neither.
- Layer anchors use `translate`, never the composed `transform`.
- Marquee CSS has one viewport→rail→segment contract that supports one canonical
  segment or two equal segments without requiring an unsafe clone.
- Every glow pseudo-overlay is `pointer-events:none`.
- No-effect output remains byte-identical.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- \
  tests/vitest/pages/page-composition-effects.test.ts \
  tests/vitest/pages/task-534-interactivity-css.test.ts \
  tests/vitest/pages/task-539-transform-composition.test.ts
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
git diff --check
```
