# TASK-242-01-02: None Token Semantics and Compatibility Helpers

# FileName: TASK-242-01-02_None_Token_Semantics_and_Compatibility_Helpers.md

**Priority:** High
**Category:** Widgets + Contract Helpers
**Estimated Effort:** Small
**Dependencies:** TASK-242-01-01
**Status:** Done (2026-04-29)

---

## Overview

Define the runtime meaning of `none` for each visual token family and decide
whether local helpers or a small shared helper should own repeated compatibility
logic.

## Sub-Tasks

- None. This is an execution leaf.

## Required Semantics

| Token family | `none` behavior |
|---|---|
| gap/spacing | render zero gap or no margin/padding, depending on current field |
| padding | render `p-0`, `py-0`, or equivalent zero style |
| radius | render no rounded class |
| max width/content width | render no max-width class while preserving `w-full` |
| typography size/font scale | render no widget-specific text-size class and let surrounding/default CSS inherit |
| button/input size | remove the size preset class only if the control still remains usable |
| logo height | render without a forced logo height/max-height class |
| legacy `"0"` tokens | accept and render the same zero output as `none` without breaking saved data |

## Compatibility Rules

- Keep existing defaults unchanged. New widgets must still normalize to the same
  default token they use today unless the saved data explicitly contains
  `none`.
- Preserve legacy `"0"` values as accepted input for fields that already expose
  `"0"` in schema/type contracts today.
- Do not blindly canonicalize `"0"` to `none` in normalized widget data when a
  current renderer exposes the normalized token through `data-*` markers or tests
  assert the exact normalized value. In that case, add `none` as a parallel alias
  that renders the same zero output while leaving saved `"0"` data readable.
- Canonicalize `"0"` to `none` only for a local helper when tests prove the
  normalized data/marker contract is not observable, or when the task explicitly
  updates the docs and tests to record that compatibility decision.
- Reject or safely fall back for every other unknown token. Do not pass arbitrary
  user strings into class names.

## Files to Change

Possible helper locations:

- local widget files for small, isolated token maps;
- `core/widgets/types.ts` only for broad reusable token helpers;
- avoid a new abstraction if it only hides one or two local checks.

## Security Contract

- Visibility: internal widget contract helper only.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: helper must validate against explicit token arrays.
- Anti-abuse: helper must never pass arbitrary user strings into class names.

## Pseudocode

Local helper shape:

```ts
const tokenValues = ["none", "sm", "md", "lg"] as const;
type TokenValue = (typeof tokenValues)[number];

function resolveToken(value: unknown, fallback: TokenValue): TokenValue {
  return tokenValues.includes(value as TokenValue) ? (value as TokenValue) : fallback;
}
```

Zero-compatible local helper shape:

```ts
const gapTokens = ["none", "0", "1", "2", "3", "4", "6", "8"] as const;
type GapToken = (typeof gapTokens)[number];

function resolveGapToken(value: unknown, fallback: GapToken): GapToken {
  return gapTokens.includes(value as GapToken) ? (value as GapToken) : fallback;
}

const gapClassMap: Record<GapToken, string> = {
  none: "gap-0",
  "0": "gap-0",
  "1": "gap-1",
  "2": "gap-2",
  "3": "gap-3",
  "4": "gap-4",
  "6": "gap-6",
  "8": "gap-8",
};
```

Optional shared helper shape if repeated across many widgets:

```ts
export function resolveEnumToken<T extends string>(
  value: unknown,
  tokens: readonly T[],
  fallback: T,
  aliases: Partial<Record<string, T>> = {}
): T {
  if (typeof value === "string" && aliases[value]) return aliases[value];
  return tokens.includes(value as T) ? (value as T) : fallback;
}
```

Only pass `{ "0": "none" }` as an alias when that canonicalization is explicitly
safe for the field. For current zero-token contracts such as stack, split layout,
divider, and spacer, prefer adding `none` to the token set and mapping both
`none` and `"0"` to zero output.

## Testing Requirements

- Unit coverage for any shared helper if added.
- Otherwise cover local helper behavior through each widget normalizer/render
  test touched by TASK-242-02 and TASK-242-03.

## Documentation Updates Required

- `_docs/WIDGETS.md` authoring guide token policy.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. `none` semantics are consistent across token families.
2. Legacy saved `"0"` values keep rendering the same output and keep their
   normalized/marker contract unless a leaf explicitly documents a safe
   canonicalization.
3. Invalid values still fall back or reject according to the current contract.
4. No arbitrary class-name passthrough is introduced.
