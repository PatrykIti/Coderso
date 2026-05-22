# TASK-286-01: Stack Flex Alignment Token Expansion

# FileName: TASK-286-01_Stack_Flex_Alignment_Token_Expansion.md

**Priority:** Medium
**Category:** Widgets + Layout + Design Tokens + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-286
**Status:** To Do

---

## Overview

Add the Stack-owned flexbox tokens requested by `REPORT_STACK_WIDGET.md`:

- ISSUE-06: `justify-around` and `justify-evenly`;
- ISSUE-07: `align-items: baseline`.

This leaf expands the bounded Stack token model without changing responsive
field shape. Responsive axis ownership is TASK-286-02.

## Scope Boundary

This leaf does not touch duplicate gap/off tokens, Clear controls, or variant
sync. Those remain TASK-256.

Do not add arbitrary CSS class input, custom CSS values, or a generic flexbox
token framework. Stack may add only allowlisted enum values with explicit class
maps, editor labels, schema coverage, and regression tests.

## Sub-Tasks

- [ ] Add `baseline` to `StackAlign` and `stackSchema.properties.align`.
- [ ] Add `around` and `evenly` to `StackJustify` and
  `stackSchema.properties.justify`.
- [ ] Extend Stack class maps with `items-baseline`, `justify-around`, and
  `justify-evenly`.
- [ ] Extend Stack editor option lists with concise labels.
- [ ] Update normalizer fallback behavior so unknown values still fall back to
  `stretch` for align and `start` for justify.
- [ ] Add runtime, validation, and editor tests for every new token.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/stack.tsx` | Extend `StackAlign`, `StackJustify`, schema enums, resolver guards, and class maps. |
| `core/admin/ui/widgets/editors/StackEditors.tsx` | Add `Baseline`, `Space around`, and `Space evenly` options in Visual and Advanced controls. |
| `tests/vitest/widgets/stack.test.tsx` | Assert normalization, validation, SSR classes, and data markers for the new tokens. |
| `tests/vitest/ui/stack-editor-wave.test.tsx` | Assert editor controls expose and persist the new tokens. |
| `_docs/_WIDGETS/STACK.md` | Document the expanded token set. |

## Implementation Pseudocode

```ts
export type StackAlign = "start" | "center" | "end" | "stretch" | "baseline";
export type StackJustify = "start" | "center" | "end" | "between" | "around" | "evenly";

const alignClassMap: Record<StackAlign, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const justifyClassMap: Record<StackJustify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

const resolveAlign = (value: string | undefined): StackAlign => {
  if (value === "start" || value === "center" || value === "end" || value === "baseline") {
    return value;
  }
  return "stretch";
};

const resolveJustify = (value: string | undefined): StackJustify => {
  if (
    value === "center" ||
    value === "end" ||
    value === "between" ||
    value === "around" ||
    value === "evenly"
  ) {
    return value;
  }
  return "start";
};
```

Error handling:

- Unknown persisted align/justify values normalize to existing safe defaults.
- New tokens must render only through explicit class maps, never raw string
  interpolation.
- Legacy payloads with current values must render byte-for-byte equivalent
  classes except for intentional option-list ordering.

## Regression Test Shape

- `tests/vitest/widgets/stack.test.tsx`
  - Normalize `align="baseline"` and `justify="around"|"evenly"` without
    changing unrelated direction/gap defaults.
  - Render SSR output with `items-baseline`, `justify-around`, and
    `justify-evenly`.
  - Keep invalid persisted `align`/`justify` values clamped to `stretch` and
    `start`.
- `tests/vitest/ui/stack-editor-wave.test.tsx`
  - Assert Visual and Advanced selects expose `Baseline`, `Space around`, and
    `Space evenly`.
  - Assert selecting each new token persists normalized Stack data and updates
    the Advanced snapshot.
- `bun test tests/unit/widgets/validator.test.ts`
  - Accept the new allowlisted enum values and continue rejecting unknown
    `align`/`justify` tokens.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged admin editing and public runtime rendering.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: update Stack schema enums and validator coverage.
- Anti-abuse: keep all classes allowlisted; reject arbitrary CSS/class input.
- Secret handling: no secrets or privileged settings are introduced.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/stack.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/stack-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/STACK.md`
- `_docs/PLAYWRIGHT/REPORT_STACK_WIDGET.md` when this leaf is implemented and
  verified
- `_docs/_TASKS/TASK-286-01_Stack_Flex_Alignment_Token_Expansion.md` status
  updates during execution
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Stack accepts and renders `align="baseline"`.
- Stack accepts and renders `justify="around"` and `justify="evenly"`.
- Invalid tokens still normalize to existing safe defaults.
- Editor controls expose the tokens in both Visual and Advanced modes.
- Tests prove schema, normalizer, runtime class output, and editor interaction.
