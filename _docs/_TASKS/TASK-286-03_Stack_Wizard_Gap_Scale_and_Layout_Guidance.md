# TASK-286-03: Stack Wizard Gap Scale and Layout Guidance

# FileName: TASK-286-03_Stack_Wizard_Gap_Scale_and_Layout_Guidance.md

**Priority:** Medium
**Category:** Widgets + Admin UI + UX Copy + Design Tokens
**Estimated Effort:** Medium
**Dependencies:** TASK-256-05-02, TASK-286-01, TASK-286-02, TASK-286
**Status:** To Do

---

## Overview

Improve Stack Wizard usability for the Stack-only findings in
`REPORT_STACK_WIDGET.md`:

- ISSUE-05: Wizard exposes only variant, mobile direction, and base gap, so
  authors must switch to Visual to configure common distribution behavior;
- ISSUE-08: gap labels do not explain the approximate scale or that the Wizard
  base gap writes all breakpoints.

This leaf adds beginner-safe Wizard controls and descriptions after TASK-256
has repaired variant/direction truthfulness and duplicate zero-token semantics.

## Scope Boundary

This leaf does not decide the final duplicate `none` / `0` behavior. It must use
the token list that remains after TASK-256.

Do not introduce a new control library, custom spacing input, arbitrary numeric
gap, or raw rem/px persistence. Gap scale text is explanatory UI only; persisted
data remains the existing allowlisted Stack token model.

## Sub-Tasks

- [ ] Rename Wizard `Base gap` copy to make the all-breakpoint write explicit.
- [ ] Add concise gap descriptions such as token and approximate Tailwind scale
  text without persisting px/rem values.
- [ ] Add Wizard-level align and justify presets that write through the same
  normalizers as Visual/Advanced.
- [ ] Make Wizard align/justify controls update all breakpoints intentionally
  and label that behavior.
- [ ] Preserve current Wizard variant and mobile direction controls after
  TASK-256-05-02 fixes their data sync.
- [ ] Add tests for Wizard labels, all-breakpoint gap writes, and align/justify
  updates.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/StackEditors.tsx` | Add Wizard layout controls, explicit all-breakpoint copy, and gap scale labels/help. |
| `core/widgets/core/stack.tsx` | Export helper metadata only if the editor needs a schema-owned gap label map. |
| `tests/vitest/ui/stack-editor-wave.test.tsx` | Assert Wizard copy, all-breakpoint gap writes, and align/justify updates. |
| `tests/vitest/widgets/stack.test.tsx` | Add helper/normalizer assertions only if a schema-owned label helper is introduced. |
| `_docs/_WIDGETS/STACK.md` | Document Wizard behavior and gap scale guidance. |

## Implementation Pseudocode

```ts
const stackGapScaleDescriptions: Record<StackGap, string> = {
  none: "No gap",
  "1": "Gap 1 - compact",
  "2": "Gap 2 - tight",
  "3": "Gap 3 - small",
  "4": "Gap 4 - default mobile",
  "5": "Gap 5",
  "6": "Gap 6 - default desktop",
  "8": "Gap 8 - roomy",
  "10": "Gap 10 - spacious",
  "12": "Gap 12 - extra spacious",
};

function buildStackGapOptions(tokens: readonly StackGap[]) {
  return tokens.map((token) => ({
    id: token,
    label: stackGapScaleDescriptions[token] ?? `Gap ${token}`,
  }));
}

function updateAllBreakpoints<T>(field: "gap" | "align" | "justify", next: T) {
  updateValue(value, variant, onChange, (current) => ({
    ...current,
    [field]: {
      desktop: next,
      tablet: next,
      mobile: next,
    },
  }));
}
```

Wizard layout:

```tsx
<p className="text-sm font-medium">Gap on all breakpoints</p>
<p className="text-xs text-muted-foreground">
  Writes desktop, tablet, and mobile spacing together. Use Visual for per-breakpoint gaps.
</p>

<Select value={resolvedWizardAlign} onValueChange={(next) => updateAllBreakpoints("align", next)}>
  ...
</Select>
```

Error handling:

- If TASK-256 removes one zero/off token, option builders must not reintroduce
  the removed token.
- If existing data uses scalar align/justify, Wizard updates must preserve
  compatibility through the normalizer selected by TASK-286-02.
- Labels must stay explanatory; persisted values remain enum tokens.

## Regression Test Shape

- `tests/vitest/ui/stack-editor-wave.test.tsx`
  - Assert Wizard copy says which controls write all breakpoints.
  - Assert the gap select uses the shared token list and shows descriptive scale
    labels without persisting copy text.
  - Assert Wizard align/justify changes rewrite those fields across desktop,
    tablet, and mobile together without clobbering direction or gap data.
  - Assert base-gap changes still write all three breakpoint gap values.
- `tests/vitest/widgets/stack.test.tsx`
  - Only if editor-facing gap label metadata moves into the widget owner,
    assert the exported helper stays deterministic and uses the same token list
    as Stack schema/editor options.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged admin editing and public runtime rendering.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: unchanged unless helper metadata adds schema
  fields, in which case validator tests are required.
- Anti-abuse: no arbitrary spacing values, CSS, class names, or unsafe HTML in
  labels/help text.
- Secret handling: no secrets or privileged settings are introduced.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/stack-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/stack.test.tsx` only if exported
  helper metadata changes
- `bun test tests/unit/widgets/validator.test.ts` only if schema/defaults change
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/STACK.md`
- `_docs/PLAYWRIGHT/REPORT_STACK_WIDGET.md` when this leaf is implemented and
  verified
- `_docs/_TASKS/TASK-286-03_Stack_Wizard_Gap_Scale_and_Layout_Guidance.md`
  status updates during execution
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Wizard copy clearly says when a control writes all breakpoints.
- Gap options include practical scale context without adding arbitrary spacing.
- Wizard can set common align/justify behavior without forcing authors into
  Visual for the simplest layout distribution changes.
- Wizard align/justify writes use the same responsive object contract as
  TASK-286-02 and intentionally write all three breakpoints together.
- Tests prove Wizard interaction, copy, and all-breakpoint writes.
