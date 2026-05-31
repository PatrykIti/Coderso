# TASK-285-01: Split Layout Mobile Ratio and Reverse Behavior

# FileName: TASK-285-01_Split_Layout_Mobile_Ratio_and_Reverse_Behavior.md

**Priority:** High
**Category:** Widgets + Layout + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-285, TASK-256-05-02
**Status:** Done (2026-05-21)

---

## Overview

Repair Split Layout-only mobile behavior findings from
`_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md`:

- BUG-03: `collapseMobile="keep"` silently uses `ratio.tablet` for mobile
  spans.
- BUG-04: `Reverse on mobile` stays active without enough context about how it
  behaves in `stack` versus `keep`.

This leaf must not implement the shared atomic variant+ratio update helper from
TASK-256-05-02. That helper landed on 2026-05-17, so this leaf should consume
the shipped path and change only Split Layout mobile fields and copy.

## Sub-Tasks

- [x] Add a Split Layout-owned mobile ratio model for `keep` mode, or explicitly
  document and test the product decision that mobile keep intentionally follows
  tablet ratio.
- [x] If adding `ratio.mobile`, default it to the current tablet ratio for
  backward compatibility and keep `stack` mode single-column on mobile.
- [x] Make the editor describe how reverse ordering behaves in both `stack` and
  `keep` modes.
- [x] Show contextual helper text or disabled-state copy when a mobile control is
  not applicable.
- [x] Keep public output deterministic and free of arbitrary class strings.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/splitLayout.tsx` | Add or codify mobile-ratio normalization and rendering behavior; preserve saved payload compatibility. |
| `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx` | Add mode-aware mobile ratio/reverse controls, labels, and helper copy. |
| `tests/vitest/widgets/splitLayout.test.tsx` | Add SSR assertions for `stack`, `keep`, tablet fallback, optional `ratio.mobile`, and reverse ordering. |
| `tests/vitest/ui/split-layout-editor-wave.test.tsx` | Add editor assertions for mobile ratio controls, helper copy, disabled/applicable states, and reverse behavior. |
| `tests/unit/widgets/validator.test.ts` | Run and update when the schema adds a persisted `ratio.mobile` field. |

## Implementation Pseudocode

```tsx
type SplitLayoutRatioSet = {
  desktop?: SplitLayoutRatio;
  tablet?: SplitLayoutRatio;
  mobile?: SplitLayoutRatio;
};

function normalizeSplitLayoutRatio(
  ratio: SplitLayoutRatioSet | undefined,
  variant: SplitLayoutVariantId
): Required<SplitLayoutRatioSet> {
  const defaultRatio = splitLayoutDefaults.ratio ?? {
    desktop: variant,
    tablet: "50-50",
  };
  const desktop = resolveSplitLayoutRatio(ratio?.desktop, variant);
  const tablet = resolveSplitLayoutRatio(ratio?.tablet, defaultRatio.tablet ?? "50-50");
  return {
    desktop,
    tablet,
    mobile: resolveSplitLayoutRatio(ratio?.mobile, tablet),
  };
}

function resolveMobileSpan(
  ratio: Required<SplitLayoutRatioSet>,
  collapse: SplitLayoutCollapseMobile
) {
  if (collapse === "stack") return { left: "col-span-1", right: "col-span-1" };
  return {
    left: mobileKeepLeftSpanMap[ratio.mobile],
    right: mobileKeepRightSpanMap[ratio.mobile],
  };
}
```

Editor flow:

1. Normalize the current value with `normalizeSplitLayoutData(value, variant)`.
2. In `keep` mode, expose `Mobile ratio` next to `Tablet ratio`; in `stack`
   mode, show read-only copy that mobile uses one column.
3. Keep `Reverse on mobile` available only when its visual effect is described
   accurately for the selected collapse mode.
4. Patch only `ratio.mobile`, `collapseMobile`, and `reverseOnMobile`; do not
   call or reimplement the shared variant helper.

Error handling:

- Missing `ratio.mobile` falls back to tablet ratio to preserve existing pages.
- Invalid mobile ratio normalizes through the owner module.
- Existing payloads without `ratio.mobile` must render exactly as before until
  the editor saves the new field.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: add `ratio.mobile` to `splitLayoutSchema` only if
  this leaf persists it; keep `additionalProperties: false`.
- Anti-abuse: mobile ratio must remain a bounded enum, not user-supplied classes
  or style strings.
- Secret handling: no secrets or privileged diagnostics in widget data.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/splitLayout.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/split-layout-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Before a manual commit for this leaf, also run the TASK-285 implementation
  baseline: `bun run gates:coderso`, `bun run scan:security:strict`, and
  `bun run precommit`.

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md` BUG-03 and BUG-04
  evidence after implementation.
- Update `_docs/_WIDGETS/SPLIT_LAYOUT.md` with final mobile ratio and reverse
  behavior.
- Update `_docs/WIDGETS.md` only if this leaf changes a shared layout-widget
  contract; otherwise keep docs Split Layout-only.

## Changelog Policy

- Covered by the TASK-285 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Mobile keep behavior is no longer silently controlled by an unrelated-looking
  tablet control.
- Reverse-on-mobile behavior is truthful in both stack and keep modes.
- Legacy Split Layout payloads render without migration.
- Schema, normalizer, renderer, editor, tests, and docs stay synchronized.

## Completion Notes (2026-05-21)

- Split Layout now persists an optional `ratio.mobile` field with tablet fallback so existing pages keep their historical phone output until authors save a mobile override.
- Visual exposes a keep-only mobile-ratio control plus truthful reverse-order copy for both `stack` and `keep` modes.
