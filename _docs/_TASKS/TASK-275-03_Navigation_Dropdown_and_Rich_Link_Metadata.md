# TASK-275-03: Navigation Dropdown and Rich Link Metadata

# FileName: TASK-275-03_Navigation_Dropdown_and_Rich_Link_Metadata.md

**Priority:** High
**Category:** Widgets + Navigation + Runtime Accessibility + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-256-04, TASK-275, TASK-275-02
**Status:** To Do

---

## Overview

Replace hover-only submenus with Navigation-owned click, touch, and keyboard
state, and make the existing `NavigationItemMeta` contract visible. The schema
already supports `visibility`, `badge`, `description`, and `icon`, but the
renderer and editor do not expose those fields as rich link UI.

This leaf keeps submenus bounded to the current one-level `children[]` contract.
Mega menus, arbitrary rich HTML, and deeper menu trees stay deferred unless a
later product task approves them.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:63-72` - `icon` and
  `description` are defined but unused.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:142-145` - click/touch submenu
  state is missing. Dropdown animation and direction controls are owned by
  TASK-275-05-03.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:195,198,209-210,213` -
  hover-only dropdowns, missing nav label, submenu role semantics, and unused
  metadata are visible runtime/accessibility issues.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:213` - submenu `role="menu"` /
  `role="menuitem"` absence is called out. This leaf must make an explicit
  semantic decision; for ordinary site navigation, prefer `<nav>` + lists/links
  + button disclosure semantics over ARIA application-menu roles unless code
  review proves a true menu pattern is required.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:262-263,317-321` - browser tests
  confirm desktop hover works but click/touch does not.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:415,417` - prioritized dropdown
  touch and metadata rows.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/navigation.tsx` | Render the root `<nav>` with an accessible `aria-label`, submenu trigger controls for items with children, root-scoped submenu IDs, `aria-expanded`, `aria-controls`, stable data attributes, state hooks that TASK-275-05-03 can style, and plain-text icon/badge/description output for top-level and child links. Decide and document whether submenu roles remain semantic site navigation or adopt ARIA menu roles; do not add `role="menu"` mechanically. |
| `core/widgets/core/navigation.tsx` | Extend `navigationRuntimeClientScript` to toggle submenus on click/touch, close on Escape/outside click, and close sibling menus in the same Navigation root. |
| `core/admin/ui/widgets/editors/NavigationEditors.tsx` | Add manual-link and sub-link metadata editors for icon text, description, and badge label/tone. Keep menu-source metadata read-only if TASK-275-04 has not landed. Preserve existing `visibility` metadata values, but do not surface a new visibility control until a separate auth-context owner exists. |
| `core/services/navigation/navigationRuntimeResolver.ts` | Update only if resolved menu/page metadata shape changes. Existing deterministic metadata mapping should stay intact. |
| `tests/vitest/widgets/navigation.test.tsx` | Assert submenu triggers, ARIA attributes, root-scoped IDs, metadata rendering, safe text output, and the chosen submenu role policy. |
| `tests/vitest/widgets/navigationRuntimeScript.test.ts` | Assert click/touch submenu open/close behavior, sibling-close behavior, Escape close, and outside-click close inside one Navigation root. |
| `tests/vitest/ui/navigation-editor-wave.test.tsx` | Assert metadata fields update the right item/child and menu metadata remains deterministic. |
| `tests/unit/navigation/navigationRuntimeResolver.test.ts` | Run/update only if resolver mapping changes. |
| `_docs/_WIDGETS/NAVIGATION.md` | Document dropdown interaction, metadata authoring/rendering, and submenu role semantics. |
| `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md` | Record fixed/deferred evidence for dropdown, metadata, and submenu role findings. |

## Implementation Pseudocode

```tsx
function renderNavigationItem(item: NavigationItem, index: number) {
  const submenuId = `${rootId}-submenu-${index}`;
  if (!item.children?.length) {
    return <a href={item.href}>{renderNavigationLinkContent(item)}</a>;
  }

  return (
    <>
      <a href={item.href}>{renderNavigationLinkContent(item)}</a>
      <button
        type="button"
        data-navigation-submenu-toggle
        aria-expanded="false"
        aria-controls={submenuId}
        aria-label={`Toggle ${item.label} submenu`}
      />
      <ul id={submenuId} data-navigation-submenu hidden>
        {item.children.map(renderChildItem)}
      </ul>
    </>
  );
}

function renderNavigationLinkContent(item: NavigationItem) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      {item.meta?.icon ? <span aria-hidden="true">{item.meta.icon}</span> : null}
      <span>{item.label}</span>
      {item.meta?.badge ? <span>{item.meta.badge.label}</span> : null}
      {item.meta?.description ? <span className="block">{item.meta.description}</span> : null}
    </span>
  );
}
```

Error handling:

- If `aria-controls` points to a missing submenu, the script should no-op.
- Do not mutate submenu state outside the current `[data-navigation-widget]`
  root.
- Empty icon, description, and badge labels normalize to `null`.
- Unknown badge tones normalize to `default`.
- Visibility values remain preserved when present from legacy payloads or menu
  resolution, but this leaf does not add a new visibility authoring control or
  runtime auth gate until a separate access task owns runtime auth context.

## Data Flow

1. Manual Navigation items and child items carry existing `meta` fields through
   the editor form.
2. `normalizeNavigationData()` trims empty `icon`, `description`, and `badge`
   values, preserves strict item/child shapes, and passes through existing
   visibility metadata untouched.
3. `navigation.tsx` renders a labelled root `<nav>`, text-only metadata, and
   submenu controls with root-scoped IDs and the chosen role policy.
4. `navigationRuntimeClientScript` toggles only submenu elements inside the
   current Navigation root and closes sibling/open menus from the same root.
5. Resolver tests run only if menu/page-source metadata mapping changes;
   otherwise Vitest covers renderer/editor ownership.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: preserve `additionalProperties: false` for
  `items[].meta` and `children[].meta`.
- Anti-abuse: metadata renders as text only. Do not allow raw HTML, script,
  unbounded icon component names, or user-authored class names.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/navigationRuntimeScript.test.ts`
- `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx`
- `bun test tests/unit/navigation/navigationRuntimeResolver.test.ts` if mapping
  changes.
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun scripts/coderso-release-gates.ts --gate ux`
- `bun scripts/coderso-release-gates.ts --gate reliability`
- `bun run scan:security:strict`
- `bun run precommit`
- `git diff --check`

## Documentation Updates Required

- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md`
- `_docs/_TASKS/TASK-275-03_Navigation_Dropdown_and_Rich_Link_Metadata.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Items with children expose a click/touch submenu trigger with
  `aria-expanded` and `aria-controls`.
- The root Navigation element has an accessible `aria-label` covered by SSR
  tests.
- Submenu role semantics are explicit and tested: either semantic site
  navigation remains without `role="menu"` / `role="menuitem"` for documented
  reasons, or true ARIA menu roles are implemented with the required keyboard
  model.
- Keyboard and touch users can access child links without relying on hover.
- Icon, description, and badge metadata are editable for manual links and
  render as accessible plain text, while legacy visibility metadata remains
  preserved but out of scope for new authoring/runtime auth behavior.
- No arbitrary rich menu content or deeper menu hierarchy is introduced.
