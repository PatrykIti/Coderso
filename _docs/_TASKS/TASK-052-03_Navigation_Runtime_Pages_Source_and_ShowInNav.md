# TASK-052-03: Navigation Runtime Pages Source and ShowInNav
# FileName: TASK-052-03_Navigation_Runtime_Pages_Source_and_ShowInNav.md

**Priority:** High  
**Category:** CMS/Menus + CMS/Widgets + Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-050-06-02, TASK-052-01, TASK-052-02  
**Status:** Done (2026-02-10)  

---

## Overview

Implement runtime behavior for page-level navigation visibility:
- `settings.showInNav` becomes a real runtime data source,
- Navigation widget gets a `pages` source mode,
- menu fallback rules stay deterministic.

This closes the gap between page settings semantics and front rendering behavior.

---

## Scope

1. Extend navigation data model with `linksSource: "pages"`.
2. Add runtime resolver for navigation links:
- manual -> widget items,
- menu -> selected menu / location fallback,
- pages -> published pages with `showInNav=true`.
3. Hydrate navigation block runtime payload before rendering.
4. Keep renderer deterministic when resolved source is empty.

---

## Runtime Rules

### `linksSource = manual`
- Use normalized `data.items`.

### `linksSource = menu`
- If `menuKey` exists: use that menu.
- Else fallback to menu with location `primary`.
- If none found: fallback to normalized manual items.

### `linksSource = pages`
- Fetch published pages only.
- Include only pages where `settings.showInNav === true`.
- Sort by explicit menu order if available; else stable by title then slug.
- Map to `{ label: page.title, href: page.slug }`.

---

## Pseudocode

```ts
// core/services/navigation/navigationRuntimeResolver.ts
export async function resolveNavigationRuntimeLinks(data: NavigationData): Promise<NavigationItem[]> {
  const source = data.linksSource ?? "manual";

  if (source === "pages") {
    const pages = await listPublishedPagesForNavigation();
    if (pages.length > 0) return pages.map(toNavItem);
    return normalizeManualItems(data.items);
  }

  if (source === "menu") {
    const tree = await resolveMenuTree(data.menuKey, "primary");
    if (tree.length > 0) return mapMenuTreeToItems(tree);
    return normalizeManualItems(data.items);
  }

  return normalizeManualItems(data.items);
}
```

```ts
// core/server/publicSite.tsx (hydrateRuntimeBlock)
if (block.type === "navigation") {
  const normalized = normalizeNavigationData(block.data);
  const items = await resolveNavigationRuntimeLinks(normalized);
  nextBlock = {
    ...block,
    data: {
      ...normalized,
      items,
      runtime: { resolvedLinksSource: normalized.linksSource ?? "manual" },
    },
  };
}
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/navigation.tsx` | update schema/defaults | add `linksSource: "pages"` support |
| `core/services/pages/pageService.ts` | new helper | list pages for navigation runtime |
| `core/services/navigation/navigationRuntimeResolver.ts` | new | resolve links for manual/menu/pages |
| `core/services/menus/menuService.ts` | optional helper | resolve by location fallback |
| `core/server/publicSite.tsx` | update hydration | resolve navigation data before render |
| `tests/unit/widgets/navigation.test.tsx` | update | `pages` source rendering + fallback coverage |
| `tests/unit/site/publicRenderer.test.tsx` | update | navigation runtime hydration path assertions |
| `tests/unit/services/navigationRuntimeResolver.test.ts` | new | source selection and fallback order |

---

## Acceptance Criteria

1. `showInNav` has observable impact on runtime navigation via `linksSource=pages`.
2. `linksSource=menu` keeps deterministic fallback when menu key is missing.
3. Existing manual navigation behavior is backward compatible.
4. Runtime preview device tabs still honor visibility rules after hydration.

---

## Testing Requirements

- `bun test tests/unit/widgets/navigation.test.tsx`
- `bun test tests/unit/services/navigationRuntimeResolver.test.ts`
- `bun test tests/unit/site/publicRenderer.test.tsx`
- `bun --cwd core lint && bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/WIDGETS.md` (navigation link sources contract)
- `_docs/PAGE_MODEL.md` (`showInNav` runtime semantics)
- `_docs/CMS_SPEC.md` (menus/pages integration behavior)
