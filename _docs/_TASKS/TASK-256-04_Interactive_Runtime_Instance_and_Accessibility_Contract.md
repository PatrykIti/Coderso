# TASK-256-04: Interactive Runtime Instance and Accessibility Contract

# FileName: TASK-256-04_Interactive_Runtime_Instance_and_Accessibility_Contract.md

**Priority:** High
**Category:** Widgets + Runtime Render + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-256, TASK-256-03
**Status:** To Do

---

## Overview

Repair interactive widget runtime contracts: instance-safe IDs, idempotent client
binding, keyboard behavior, and accessible relationships.

Reports highlight duplicate IDs in multi-instance renders, global binding flags
that can block rebinding, and missing ARIA/semantic attributes across interactive
widgets. This task defines the shared runtime pattern before widget-specific
leaves expand it.

## Drift Evidence

- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md:31,39,207` reports duplicate
  IDs and a global binding flag risk.
- `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md:168,287` reports ARIA gaps.
- `_docs/PLAYWRIGHT/REPORT_FAQ_ACCORDION_WIDGET.md:97,141-145,179-180,303-305`
  reports FAQ single-open and ARIA gaps.
- `_docs/PLAYWRIGHT/REPORT_ACCORDION_WIDGET.md:138,240,286` reports
  default-open, collapsible, placeholder, chevron, and ARIA gaps in the
  generic accordion renderer.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:117,211-219,241-244`
  reports static billing toggle and pricing semantics gaps.
- `_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md:170,266-270` reports ARIA gaps.
  TASK-256-04 owns the reusable accessibility policy only; concrete Timeline
  renderer labels, list names, hidden decorative icons, and `aria-current`
  fixes are routed to TASK-291-03.
- `_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md:253` reports separator ARIA gaps.

## Sub-Tasks

- [ ] Add shared deterministic instance ID helpers where widget blocks need DOM
  relationships.
- [ ] Scope tab/toggle scripts by root element instead of only global flags.
- [ ] Replace hardcoded descendant IDs with IDs prefixed by widget instance.
- [ ] Add missing `aria-labelledby`, `aria-controls`, table captions/scopes,
  separator semantics, and section labels where reports require them.
- [ ] Add duplicate-ID regression tests for multi-instance renders.

## Files to Change

| File | Lines | Required change |
|---|---:|---|
| `core/widgets/core/tabs.tsx` | 271-371 | Make script binding idempotent per root and safe across repeated renders/navigation. |
| `core/widgets/core/tabs.tsx` | 432-505 | Prefix `tabs-trigger-*` and `tabs-panel-*` IDs with a root instance ID and rename legacy external-project `data-*`/global binding names to the `data-coderso-*` namespace. |
| `core/widgets/core/toggleBlock.tsx` | 141-250 | Make script binding idempotent per root and safe across repeated renders/navigation. |
| `core/widgets/core/toggleBlock.tsx` | 298-389 | Prefix `toggle-trigger-*` and `toggle-pane-*` IDs with a root instance ID; replace hardcoded radiogroup label where data provides better context; rename legacy external-project `data-*` names to `data-coderso-*`. |
| `core/widgets/core/accordion.tsx` | item render and placeholder region around 361-368 | Add instance-safe summary/content IDs, chevron/expanded state semantics, default-open/collapsible behavior, placeholder gating through TASK-256-03, and rename legacy external-project accordion IDs/data attributes to `coderso`/`data-coderso-*`. |
| `core/admin/ui/widgets/editors/AccordionEditors.tsx` | 272-430 | Keep default-open/collapsible controls consistent with runtime behavior and remove duplicated clear/control drift. |
| `core/widgets/core/faqAccordion.tsx` | 316-365 | Add section labelling, summary/content IDs, visible expand indicator, and single-open behavior if `allowMultipleOpen=false`. |
| `core/widgets/core/pricingPlans.tsx` | 682-727 | Make billing toggle interactive if it remains rendered as a toggle; otherwise downgrade to static copy. Add table/plan ARIA where missing. |
| `core/widgets/core/divider.tsx` | separator render | Add appropriate `role="separator"` or `aria-hidden` behavior depending on labelled vs decorative variants. |

Timeline-specific `core/widgets/core/timeline.tsx` ARIA implementation is
intentionally not in this file list; TASK-291-03 owns those concrete renderer
edits while this leaf owns shared policy.

## Implementation Pseudocode

```tsx
function createWidgetInstanceId(type: string, blockId: string | undefined, fallbackSeed: string) {
  const source = blockId && blockId.trim().length > 0 ? blockId : fallbackSeed;
  return `${type}-${source.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function scopedId(instanceId: string, part: string) {
  return `${instanceId}-${part}`;
}
```

Runtime script shape:

```js
(() => {
  if (typeof document === "undefined") return;

  document.querySelectorAll("[data-coderso-toggle-block='1']").forEach((root) => {
    if (!(root instanceof HTMLElement)) return;
    if (root.dataset.codersoToggleBound === "true") return;
    root.dataset.codersoToggleBound = "true";

    root.addEventListener("click", handleToggleClick);
    root.addEventListener("keydown", handleToggleKeydown);
  });
})();
```

The current tabs, toggle, and accordion owners still contain legacy
external-project data/global namespaces. This leaf must rename those runtime
namespaces to `coderso`/`data-coderso-*` together with the scoped instance-id
work so the shared contract does not preserve cross-project selectors.

ARIA relationship shape:

```tsx
const triggerId = scopedId(instanceId, `trigger-${stateId}`);
const panelId = scopedId(instanceId, `panel-${stateId}`);

<button id={triggerId} aria-controls={panelId} aria-checked={isActive} />
<div id={panelId} aria-labelledby={triggerId} hidden={!isActive} />
```

Error handling:

- Fallback instance IDs must be deterministic within a render and not depend on
  `Math.random`.
- If a widget cannot be safely interactive in public runtime, remove the
  interactive affordance and document it as static.
- External links must keep safe href normalization and `rel` requirements.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and before closure.
- For non-trivial or parallel leaf work, prefer a dedicated branch or worktree.
- Stage only the owner files listed in this task plus required docs/reports/changelog files.
- Verify `git diff --name-only --cached` before every commit so unrelated report or code edits stay out of scope.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: preserve widget schemas.
- Anti-abuse: runtime scripts must only operate inside their widget root and
  must not evaluate user-authored code.
- Secret handling: no secrets in DOM IDs, dataset attributes, or script payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/tabs.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/toggleBlock.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/accordionWidget.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/faqAccordion.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/pricingPlans.test.tsx`
- Timeline-specific renderer tests run through TASK-291-03 when that physical
  leaf implements `core/widgets/core/timeline.tsx` changes.
- `bun run test:vitest -- tests/vitest/widgets/divider.test.tsx`
- Add duplicate-ID assertions for rendering two instances of each interactive
  widget on one page.
- Add keyboard/ARIA assertions for tabs and toggle block.
- Add pricing/FAQ tests for interactive behavior if those controls remain
  interactive.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update affected `_docs/_WIDGETS/*.md` files for interactive behavior changes.
- Update Playwright reports with multi-instance and accessibility evidence.
- Update `_docs/WIDGETS.md` only if a new shared runtime ID helper becomes part
  of the widget contract.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-256-08 may create the final umbrella changelog entry that explicitly lists this task ID.

## Acceptance Criteria

- Rendering multiple tabs/toggle instances does not duplicate DOM IDs.
- Runtime scripts bind per root and remain safe across repeated render/hydration
  paths.
- Interactive widgets expose correct accessible names, relationships, and state.
- Static widgets do not render fake interactive controls.
- Tests fail if duplicate IDs or missing ARIA relationships regress.
