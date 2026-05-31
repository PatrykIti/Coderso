# TASK-275-05-02: Navigation Active Links and Safe Targets

# FileName: TASK-275-05-02_Navigation_Active_Links_and_Safe_Targets.md

**Priority:** Medium
**Category:** Widgets + Navigation + Runtime Render + Admin UI + Security
**Estimated Effort:** Medium
**Dependencies:** TASK-256, TASK-275, TASK-275-01, TASK-275-05
**Status:** Done (2026-05-19)

---

## Overview

Add Navigation-owned active-link highlighting and safe link target controls. This
leaf consumes existing safe-href ownership and must not fork a sanitizer or
change global link policy. Active-link detection stays Navigation-local by
deriving the current pathname from the existing runtime script when browser
location is available; SSR output remains inactive by default.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:151-157` - target/rel controls
  and active-link highlighting are missing.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:201,227` - active state is a
  visible runtime and market-standard gap.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:439,442` - target/rel and
  active highlighting appear in lower-priority backlog rows.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/navigation.tsx` | Add schema/default/normalizer/render support for bounded `activeLinkMode` and manual item/child target fields. Derive active state client-side from `window.location.pathname` in the existing runtime script when available, and render external/new-tab links with safe `rel` values. |
| `core/admin/ui/widgets/editors/NavigationEditors.tsx` | Add Visual controls for active-link mode and manual link/sub-link target policy. Keep helper copy explicit that unsafe hrefs still fall back through the existing safe-href helper, and that `menu` / `pages` sources stay `self` until their upstream owners define target data. |
| `tests/vitest/widgets/navigation.test.tsx` | Assert target/rel output, safe fallback, and legacy payload normalization. |
| `tests/vitest/widgets/navigationRuntimeScript.test.ts` | Assert client-side active-link detection marks one matching link active, keeps unmatched/external links inactive, and remains safe without browser globals. |
| `tests/vitest/ui/navigation-editor-wave.test.tsx` | Assert active/target controls persist and reject unsafe target values. |
| `tests/unit/widgets/validator.test.ts` | Update schema/default assertions for new persisted fields. |
| `_docs/_WIDGETS/NAVIGATION.md` | Document active-link behavior, SSR fallback, and target/rel policy. |
| `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md` | Record fixed/deferred evidence for active-link and target/rel rows. |

## Implementation Pseudocode

```tsx
type NavigationActiveLinkMode = "none" | "pathname" | "exact";
type NavigationLinkTarget = "self" | "blank";

function resolveNavigationLinkAttributes(item: NavigationItem) {
  const href = normalizeNavigationHref(item.href);
  const target = item.target === "blank" ? "_blank" : undefined;

  return {
    href,
    target,
    rel: target ? "noopener noreferrer" : undefined,
  };
}

function updateNavigationActiveLinks(root: HTMLElement) {
  const mode = root.dataset.navigationActiveMode as NavigationActiveLinkMode | undefined;
  if (!mode || mode === "none") return;
  const currentPath = window.location.pathname;
  for (const anchor of root.querySelectorAll<HTMLAnchorElement>("[data-navigation-link='1']")) {
    const href = anchor.getAttribute("href");
    const isActive = shouldMarkNavigationActive(href, currentPath, mode);
    anchor.toggleAttribute("aria-current", isActive);
    anchor.dataset.navigationActive = isActive ? "true" : "false";
  }
}
```

Error handling:

- Active detection must not require `window` during SSR; SSR output remains
  inactive until the runtime script runs.
- Unknown active modes and target values normalize to safe defaults.
- New-tab output must always include `rel="noopener noreferrer"`.
- Unsafe hrefs continue through `normalizeWidgetSafeHref()` and never bypass the
  existing sanitizer.
- `menu` and `pages` sources keep `self` targets until their upstream owners
  define target data; this leaf does not invent menu/page target metadata.

## Data Flow

1. Admin configures active-link mode and manual-link target policy in Visual
   controls.
2. `navigationSchema` rejects unknown values and `normalizeNavigationData()`
   clamps them to bounded enums.
3. `navigation.tsx` resolves each manual link through the existing safe-href
   helper, applies target/rel attributes, and emits a bounded active-mode data
   marker on the Navigation root.
4. The runtime script reads `window.location.pathname` when available and marks
   matching links active client-side.
5. Tests cover schema/defaults, renderer output, runtime active detection, safe
   fallback, and editor persistence.
6. Docs/report describe the client-side active detection boundary and keep
   external/page-shell ownership explicit.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: new persisted fields must be represented in
  `navigationSchema` with `additionalProperties: false`.
- Anti-abuse: safe-href normalization remains the only destination sanitizer.
  Target fields are bounded enums and external/new-tab links always render safe
  `rel` values.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/navigationRuntimeScript.test.ts`
- `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer
  output assumptions change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun scripts/coderso-release-gates.ts --gate ux`
- `bun scripts/coderso-release-gates.ts --gate security`
- `bun run scan:security:strict`
- `bun run precommit`
- `git diff --check`

## Documentation Updates Required

- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md`
- `_docs/_TASKS/TASK-275-05-02_Navigation_Active_Links_and_Safe_Targets.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Active-link mode and manual-link target output are schema-backed, normalized,
  documented, and tested.
- Client-side active detection derives from the current browser pathname and
  safely emits no active state when that pathname is unavailable.
- New-tab target behavior is bounded and always emits safe `rel`.
- Existing safe-href behavior remains shared and unforked.
- Legacy Navigation payloads normalize without breaking existing links.
