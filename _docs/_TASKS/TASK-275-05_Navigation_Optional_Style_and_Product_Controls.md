# TASK-275-05: Navigation Optional Style and Product Controls

# FileName: TASK-275-05_Navigation_Optional_Style_and_Product_Controls.md

**Priority:** Medium
**Category:** Widgets + Navigation + Admin UI + Runtime Render
**Estimated Effort:** Very Large
**Dependencies:** TASK-256-02, TASK-256-04, TASK-275, TASK-275-01, TASK-275-02, TASK-275-03
**Status:** To Do

---

## Overview

Add lower-priority Navigation-owned visual and product controls from the report:
hover/active link styles, active-link highlighting, CTA shape and separation,
logo size, letter spacing, shadow, backdrop blur, dropdown direction, safe
new-tab behavior, bounded dropdown/mobile motion, and `collapseOnScroll`
runtime behavior.

This leaf is intentionally broad but still Navigation-only. If implementation
becomes too large, split it into physical child leaves before coding rather than
silently dropping report rows.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:74-78` - `collapseOnScroll`
  persists only a data attribute. Current widget docs also describe this as v1
  behavior, so this is a Navigation product-contract expansion.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:97-123` - hover/active state,
  second CTA, CTA radius, logo size, and CTA separator controls are missing.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:127-161` - letter spacing,
  shadow, backdrop blur, dropdown animation/direction, target/rel, active
  highlighting, and mobile animation controls are missing.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:201,226-235` - active state and
  visual market-standard gaps.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:403-407,431-442,452-455` -
  prioritized P0/P3 backlog rows.

## Sub-Tasks

- None. This is an execution leaf unless the implementer splits it before
  coding due to size.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/navigation.tsx` | Add schema/default/normalizer/render support for Navigation-owned style fields such as `linkHoverColor`, `linkActiveColor`, `linkUnderline`, `activeLinkMode`, `ctaBorderRadius`, `ctaSeparator`, `logoHeight`, `letterSpacing`, `shadow`, `backdropBlur`, `dropdownDirection`, bounded motion tokens, and collapse state hooks. Add safe target/rel rendering for links if target fields are approved. |
| `core/widgets/core/navigation.tsx` | Extend the root-scoped runtime script to support `collapseOnScroll` only when `data-collapse-on-scroll="true"`, without patching Section/layout wrappers. |
| `core/admin/ui/widgets/editors/NavigationEditors.tsx` | Add Visual controls for these fields with clearable behavior where appropriate. Keep Advanced technical-only unless TASK-256 mode ownership changes. Update collapse helper copy after behavior lands. |
| `tests/vitest/widgets/navigation.test.tsx` | Assert style fields render stable classes/styles, active-link markers are safe, target/rel output is safe, collapse hooks render, and legacy payloads normalize unchanged. |
| `tests/vitest/ui/navigation-editor-wave.test.tsx` | Assert style controls update fields, clear controls remove keys, and target/active/collapse controls do not serialize unsafe values. |
| `tests/vitest/widgets/styleNoneTokens.test.tsx` | Run/update if new fields interact with `none` or clearable token semantics. |
| `tests/unit/widgets/validator.test.ts` | Update when schema/defaults add persisted fields. |
| `_docs/_WIDGETS/NAVIGATION.md` | Document visual style fields, active-link behavior, new-tab target policy, motion policy, collapse behavior, and sticky placement limitations. |
| `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md` | Record fixed/deferred evidence for visual style and collapse backlog rows. Route Section overflow sticky drift outside TASK-275 if still present. |

## Implementation Pseudocode

```tsx
type NavigationStyle = {
  linkHoverColor?: string;
  linkActiveColor?: string;
  linkUnderline?: "none" | "hover" | "always";
  activeLinkMode?: "none" | "pathname" | "exact";
  ctaBorderRadius?: "sm" | "md" | "full";
  ctaSeparator?: "none" | "line" | "spacing";
  logoHeight?: "sm" | "md" | "lg" | "xl";
  letterSpacing?: "normal" | "wide" | "wider";
  shadow?: "none" | "sm" | "md" | "lg";
  backdropBlur?: "none" | "sm" | "md";
  dropdownDirection?: "bottom" | "top" | "auto";
};

function bindCollapse(root: HTMLElement) {
  let previousY = window.scrollY;
  const threshold = 24;
  const update = () => {
    const y = window.scrollY;
    const collapsed = y > threshold && y > previousY;
    root.dataset.navigationCollapsed = collapsed ? "true" : "false";
    previousY = y;
  };
  window.addEventListener("scroll", update, { passive: true });
  update();
}

function resolveNavigationLinkAttributes(item: NavigationItem, currentPath?: string) {
  const href = normalizeNavigationHref(item.href);
  const isActive = shouldMarkActive(href, currentPath, style.activeLinkMode);
  return {
    href,
    "aria-current": isActive ? "page" : undefined,
    style: isActive ? activeStyle : linkStyle,
  };
}
```

Error handling:

- Unknown style tokens normalize to defaults or are omitted.
- Clearable fields remove the configured key instead of serializing empty
  strings or ad hoc sentinel values.
- Collapse should no-op without browser APIs and should not run unless the data
  attribute is enabled.
- Active-link detection must not require browser globals during SSR. Use a
  passed current path when available; otherwise render no active marker.
- New-tab fields must always render safe `rel` values and never bypass the
  existing safe-href normalizer.
- Secondary CTA remains a product decision: prefer existing `right` slot or a
  bounded secondary CTA field, but document the chosen policy before coding.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: every new persisted field must be included in
  `navigationSchema` with `additionalProperties: false`.
- Anti-abuse: style fields must be tokenized or validated CSS color values only.
  No raw class names, raw CSS blocks, raw HTML, script, or unsafe link targets.
  Runtime script must not interpolate user-authored strings.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  clear/none-adjacent fields are added.
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run scan:security:strict`

## Documentation Updates Required

- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md`
- `_docs/_TASKS/TASK-275-05_Navigation_Optional_Style_and_Product_Controls.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Every optional Navigation-owned visual field is either implemented, split into
  a physical child task, or explicitly deferred with a reason.
- `collapseOnScroll`, if implemented here, is documented as a changed
  Navigation product contract and remains root-scoped.
- New persisted fields are schema-backed, normalized, tested, and documented.
- Link target behavior remains safe for external and same-origin links.
- Visual controls remain in the Visual editor unless a TASK-256 mode-ownership
  change explicitly moves them.
