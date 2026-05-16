# TASK-257-01: Accordion Initial Open State Product Options

# FileName: TASK-257-01_Accordion_Initial_Open_State_Product_Options.md

**Priority:** High
**Category:** Widgets + Layout + Runtime Render + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-256-04, TASK-256-05-04, TASK-257
**Status:** To Do

---

## Overview

Add an explicit all-collapsed initial state for the layout `accordion` widget.

`REPORT_ACCORDION_WIDGET.md` row W11 identifies that Accordion cannot start with
all panels closed because the current normalizer always falls back to the first
item. TASK-256 owns the correctness bug for default-open and collapsible runtime
behavior. This leaf adds the product option that remains after that shared
contract is fixed: editors can intentionally save "none open by default" when
the accordion is collapsible.

## Scope Boundary

This leaf does not own:

- C1 default-open bug for non-first items;
- C3 `collapsible=false` enforcement;
- R1-R4 ARIA wiring or chevron state;
- R7 instance-safe details group naming.

Those stay in TASK-256-05-04 and TASK-256-04. This leaf starts after those fixes
or must be rebased on their final model. Do not implement this leaf while the
live renderer still contains the TASK-256 default-open and collapsible bugs.

## Sub-Tasks

- [ ] Extend the Accordion data contract to represent an intentional empty
  `defaultOpenIds` state without using an invalid item ID sentinel.
- [ ] Update `normalizeAccordionData()` so it preserves an empty
  `defaultOpenIds` only when `options.collapsible !== false`; otherwise it
  still selects a valid item.
- [ ] Distinguish explicit `defaultOpenIds: []` from stale non-empty
  `defaultOpenIds` whose IDs no longer match slot instances. Stale IDs must use
  the existing valid-item fallback instead of becoming an intentional
  all-collapsed state.
- [ ] Update Wizard/Visual/Advanced controls so editors can choose:
  - "None - start collapsed" when all-closed is allowed;
  - a concrete item title when one should be open;
  - multiple concrete item titles when `openMode="multiple"`.
- [ ] Preserve backward compatibility for legacy `initiallyOpenId` and
  `allowMultiple` payloads.
- [ ] Ensure item count changes keep the explicit all-collapsed state instead
  of silently reverting to the first item.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/accordion.tsx` | Preserve intentional empty default-open state; update schema/defaults only if a new explicit option is needed. |
| `core/admin/ui/widgets/editors/AccordionEditors.tsx` | Add editor choices for "None - start collapsed" and keep copy aligned with `collapsible`. |
| `tests/vitest/widgets/accordionWidget.test.tsx` | Add normalizer and SSR render coverage for all-collapsed initial state. |
| `tests/vitest/ui/accordion-editor-wave.test.tsx` | Add editor coverage for selecting/retaining the all-collapsed state. |

## Implementation Pseudocode

```ts
function resolveAccordionDefaultOpenIds(current: AccordionData, items: NormalizedAccordionItem[]) {
  const openMode =
    current.options?.openMode === "multiple" || current.options?.allowMultiple === true
      ? "multiple"
      : "single";
  const explicitDefaultOpenIds = Array.isArray(current.options?.defaultOpenIds)
    ? current.options.defaultOpenIds
    : undefined;
  const legacyInitiallyOpenId = toTrimmedString(current.options?.initiallyOpenId);
  const rawDefaultOpenIds =
    explicitDefaultOpenIds ?? (legacyInitiallyOpenId ? [legacyInitiallyOpenId] : undefined);
  const requested = extractValidDefaultOpenIds(rawDefaultOpenIds ?? [], items);
  const allClosedAllowed = current.options?.collapsible !== false;

  if (explicitDefaultOpenIds?.length === 0 && allClosedAllowed) {
    return [];
  }

  if (requested.length > 0) {
    return openMode === "multiple" ? requested : [requested[0]];
  }

  // A non-empty raw array with no valid IDs is stale persisted data, not an
  // intentional all-collapsed choice. Stale legacy initiallyOpenId follows the
  // same compatibility fallback.
  return items[0] ? [items[0].id] : [];
}
```

Editor flow:

```tsx
function handleDefaultOpenChange(next: string) {
  if (next === "__none__") {
    updateOptions(value, onChange, { defaultOpenIds: [], initiallyOpenId: undefined });
    return;
  }
  updateOptions(value, onChange, { defaultOpenIds: [next], initiallyOpenId: next });
}
```

Error handling:

- Invalid item IDs are still removed by the normalizer.
- Stale non-empty `defaultOpenIds` arrays fall back to the first valid item.
- Legacy `initiallyOpenId` is only a fallback source when `defaultOpenIds` is
  absent, and legacy `allowMultiple=true` still maps to multiple-open mode.
- `collapsible=false` cannot save all-collapsed because runtime must keep at
  least one panel open.
- Sparse legacy payloads without explicit default-open data keep the current
  first-item fallback for compatibility.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: schema must reject unknown Accordion option keys.
- Anti-abuse: do not introduce inline scripts or user-authored HTML.
- Secret handling: no secrets in widget data or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/accordionWidget.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/accordion-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`

## Documentation Updates Required

- Update `_docs/_WIDGETS/ACCORDION.md` with the all-collapsed initial state.
- Update `_docs/PLAYWRIGHT/REPORT_ACCORDION_WIDGET.md` row W11 after validation.

## Changelog Policy

- Covered by the TASK-257 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Editors expose a clear all-collapsed default option only when all-closed
  behavior is allowed.
- Normalization preserves intentional empty `defaultOpenIds` without breaking
  legacy first-item fallback.
- Legacy `initiallyOpenId` and `allowMultiple` payloads retain their saved open
  behavior unless their IDs are stale.
- Runtime output starts with all panels closed for the intentional all-collapsed
  case after TASK-256 runtime fixes are present.
