# TASK-242-01-02: None Token Semantics and Compatibility Helpers

# FileName: TASK-242-01-02_None_Token_Semantics_and_Compatibility_Helpers.md

**Priority:** High
**Category:** Widgets + Contract Helpers
**Estimated Effort:** Small
**Dependencies:** TASK-242-01-01
**Status:** To Do

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
| legacy `"0"` tokens | accept and render as `none` or as the existing zero output without breaking saved data |

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
  if (value === "0") return "none";
  return tokenValues.includes(value as TokenValue) ? (value as TokenValue) : fallback;
}
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

## Testing Requirements

- Unit coverage for any shared helper if added.
- Otherwise cover local helper behavior through each widget normalizer/render
  test touched by TASK-242-02 and TASK-242-03.

## Documentation Updates Required

- `_docs/WIDGETS.md` authoring guide token policy.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. `none` semantics are consistent across token families.
2. Legacy saved `"0"` values keep rendering the same output.
3. Invalid values still fall back or reject according to the current contract.
4. No arbitrary class-name passthrough is introduced.
