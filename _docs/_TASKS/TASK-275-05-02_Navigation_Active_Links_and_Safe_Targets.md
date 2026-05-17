# TASK-275-05-02: Navigation Active Links and Safe Targets

# FileName: TASK-275-05-02_Navigation_Active_Links_and_Safe_Targets.md

**Priority:** Medium
**Category:** Widgets + Navigation + Runtime Render + Admin UI + Security
**Estimated Effort:** Medium
**Dependencies:** TASK-256, TASK-275, TASK-275-01, TASK-275-05
**Status:** To Do

---

## Overview

Add Navigation-owned active-link highlighting and safe link target controls. This
leaf consumes existing safe-href ownership and must not fork a sanitizer or
change global link policy.

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
| `core/widgets/core/navigation.tsx` | Add schema/default/normalizer/render support for bounded `activeLinkMode` and target fields. Render `aria-current="page"` only when active detection is available and safe. Render external/new-tab links with safe `rel` values. |
| `core/admin/ui/widgets/editors/NavigationEditors.tsx` | Add Visual controls for active-link mode and link target policy. Keep helper copy explicit that unsafe hrefs still fall back through the existing safe-href helper. |
| `tests/vitest/widgets/navigation.test.tsx` | Assert active markers, target/rel output, safe fallback, and legacy payload normalization. |
| `tests/vitest/ui/navigation-editor-wave.test.tsx` | Assert active/target controls persist and reject unsafe target values. |
| `tests/unit/widgets/validator.test.ts` | Update schema/default assertions for new persisted fields. |
| `_docs/_WIDGETS/NAVIGATION.md` | Document active-link behavior, SSR fallback, and target/rel policy. |
| `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md` | Record fixed/deferred evidence for active-link and target/rel rows. |

## Implementation Pseudocode

```tsx
type NavigationActiveLinkMode = "none" | "pathname" | "exact";
type NavigationLinkTarget = "self" | "blank";

function resolveNavigationLinkAttributes(item: NavigationItem, currentPath?: string) {
  const href = normalizeNavigationHref(item.href);
  const isActive = shouldMarkNavigationActive(href, currentPath, data.style.activeLinkMode);
  const target = item.target === "blank" ? "_blank" : undefined;

  return {
    href,
    target,
    rel: target ? "noopener noreferrer" : undefined,
    "aria-current": isActive ? "page" : undefined,
    "data-navigation-active": isActive ? "true" : undefined,
  };
}
```

Error handling:

- Active detection must not require `window` during SSR.
- Unknown active modes and target values normalize to safe defaults.
- New-tab output must always include `rel="noopener noreferrer"`.
- Unsafe hrefs continue through `normalizeWidgetSafeHref()` and never bypass the
  existing sanitizer.

## Data Flow

1. Admin configures active-link mode and target policy in Visual controls.
2. `navigationSchema` rejects unknown values and `normalizeNavigationData()`
   clamps them to bounded enums.
3. `navigation.tsx` resolves each link through the existing safe-href helper,
   applies target/rel attributes, and conditionally emits active markers.
4. Tests cover schema/defaults, renderer output, safe fallback, and editor
   persistence.
5. Docs/report describe what active detection can prove during SSR and what
   remains page-shell owned.

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
- `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer
  output assumptions change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` plus targeted security/accessibility gates for public
  link output changes.
- `bun run scan:security:strict`
- `bun run precommit`
- `git diff --check`

## Documentation Updates Required

- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md`
- `_docs/_TASKS/TASK-275-05-02_Navigation_Active_Links_and_Safe_Targets.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Active-link output is schema-backed, normalized, documented, and tested.
- New-tab target behavior is bounded and always emits safe `rel`.
- Existing safe-href behavior remains shared and unforked.
- Legacy Navigation payloads normalize without breaking existing links.
