# TASK-275-05-01: Navigation Collapse Runtime Contract

# FileName: TASK-275-05-01_Navigation_Collapse_Runtime_Contract.md

**Priority:** Medium
**Category:** Widgets + Navigation + Runtime Render + Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-256-04, TASK-275, TASK-275-02, TASK-275-05
**Status:** To Do

---

## Overview

Make `behavior.collapseOnScroll` a real Navigation-owned runtime behavior. The
current contract stores the flag and renders `data-collapse-on-scroll="true"`,
but no root-scoped script changes Navigation state while scrolling.

This task must not repair sticky placement failures caused by Section or
page-shell overflow. Those remain routed through TASK-275-06 to an exact shared
physical owner before closure.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:74-78` - `collapseOnScroll`
  persists only a data attribute.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:187,285-289` - the
  Surface/Runtime Behavior and Advanced editor copy makes sticky/collapse
  ownership unclear for Navigation users.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:378-393,405` - sticky
  frontend failures involve Section/layout ownership and must not be patched by
  this task.
- `_docs/_WIDGETS/NAVIGATION.md` - current docs describe this as v1 data-only
  behavior, so this leaf is a Navigation product-contract expansion.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/navigation.tsx` | Extend the root-scoped Navigation runtime script so roots with `data-collapse-on-scroll="true"` toggle a deterministic collapsed state/class while scrolling. Keep the behavior passive, idempotent, and scoped to each Navigation root. |
| `core/admin/ui/widgets/editors/NavigationEditors.tsx` | Update collapse/sticky helper copy after behavior is implemented; explain the Navigation-local collapse behavior and Section/page-shell sticky limitation without changing global editor-mode IA. |
| `tests/vitest/widgets/navigation.test.tsx` | Assert collapse attributes/classes/hooks render only when enabled and legacy payloads remain unchanged when disabled. |
| `_docs/_WIDGETS/NAVIGATION.md` | Document collapse behavior, no-JS fallback, reduced-motion expectations, and sticky placement limitations. |
| `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md` | Mark the collapse data-only row fixed only for Navigation runtime behavior and keep Section/page-shell sticky rows routed. |

## Implementation Pseudocode

```tsx
function bindCollapseOnScroll(root: HTMLElement) {
  if (root.dataset.collapseOnScroll !== "true") return;
  if (root.dataset.navigationCollapseBound === "true") return;
  root.dataset.navigationCollapseBound = "true";

  let previousY = window.scrollY;
  const threshold = 24;
  const update = () => {
    const y = window.scrollY;
    const collapsed = y > threshold && y > previousY;
    root.dataset.navigationCollapsed = collapsed ? "true" : "false";
    root.classList.toggle("is-navigation-collapsed", collapsed);
    previousY = y;
  };

  window.addEventListener("scroll", update, { passive: true });
  update();
}
```

Error handling:

- No-op when browser globals are unavailable.
- No-op when the Navigation root is malformed or missing the enabled attribute.
- Do not bind duplicate scroll listeners for the same root.
- Do not mutate Section/page-shell wrapper classes or styles.

## Data Flow

1. Admin toggles `behavior.collapseOnScroll` in the Navigation editor.
2. Existing schema/default/normalizer flow persists a boolean flag.
3. `navigation.tsx` emits `data-collapse-on-scroll="true"` only for enabled
   roots and includes root-scoped script binding.
4. The script toggles `data-navigation-collapsed` and an internal class on the
   Navigation root only.
5. Tests assert enabled/disabled SSR markers and script assumptions; docs/report
   distinguish Navigation collapse from shared sticky blockers.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: unchanged unless this leaf adds a persisted
  collapse tuning field, in which case it must update `navigationSchema`.
- Anti-abuse: runtime script must not interpolate user-authored strings, store
  data in browser storage, or bind outside the current Navigation root.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if script
  injection assumptions change.
- `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx` if
  editor helper copy or controls change.
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun scripts/coderso-release-gates.ts --gate ux`
- `bun scripts/coderso-release-gates.ts --gate reliability`
- `bun scripts/coderso-release-gates.ts --gate performance`
- `bun run scan:security:strict`
- `bun run precommit`
- `git diff --check`

## Documentation Updates Required

- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md`
- `_docs/_TASKS/TASK-275-05-01_Navigation_Collapse_Runtime_Contract.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- `collapseOnScroll` changes the Navigation root state at runtime when enabled.
- Disabled and legacy payloads render without collapse bindings.
- The scroll behavior is root-scoped, passive, idempotent, and safe without
  browser globals.
- Section/page-shell sticky overflow findings remain routed outside TASK-275
  with exact owner handling in TASK-275-06.
