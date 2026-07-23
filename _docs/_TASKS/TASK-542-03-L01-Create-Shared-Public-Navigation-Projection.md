# TASK-542-03-L01: Create Shared Public Navigation Projection

# FileName: TASK-542-03-L01-Create-Shared-Public-Navigation-Projection.md

**Parent Task:** TASK-542
**Parent Subtask:** TASK-542-03
**Priority:** High
**Category:** Navigation / Pure Domain / Public Projection
**Estimated Effort:** Small
**Dependencies:** TASK-542-01-L01
**Status:** ⏳ To Do
**Changelog:** 1254 (pinned; closure only)

---

## Exclusive ownership

- new `core/services/navigation/publicNavigationProjection.ts`
- new `tests/vitest/services/public-navigation-projection.test.ts`

Do not modify the mapper, site shell, editor, widgets, other tests, or menu model.

## Grounded anchors

- Current pure mapping owner:
  `core/services/navigation/navigationMenuMapping.ts:1-95`.
- Duplicated public filters/renderability:
  `core/site/siteShell.tsx:112-179,224-245`.
- Canvas raw recursive rendering:
  `MenuDesignEditor.tsx:794-845`.
- `NavigationItem` type owner: `core/widgets/core/navigation`.

## Implementation Pseudocode

```ts
const normalizePublicNavigationHref = (href: string): string =>
  normalizeWidgetSafeHref(href, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
  }) ?? "#";

export const hasPublicNavigationHref = (href: string): boolean =>
  href.trim().length > 0 && href.trim() !== "#";

export function projectPublicNavigationItems(
  items: readonly NavigationItem[]
): NavigationItem[] {
  const projected: NavigationItem[] = [];
  for (const item of items) {
    if (item.meta?.visibility === "logged_in") continue; // hide whole subtree
    const children = projectPublicNavigationItems(item.children ?? []);
    const href = normalizePublicNavigationHref(item.href);
    if (!hasPublicNavigationHref(href) && children.length === 0) continue;
    const { children: _sourceChildren, ...itemWithoutChildren } = item;
    projected.push({
      ...itemWithoutChildren,
      href, // unsafe leaf drops; unsafe parent with children becomes a linkless group
      ...(children.length > 0 ? { children } : {}),
    });
  }
  return projected;
}
```

Import the existing canonical `normalizeWidgetSafeHref`; do not create another URL
regex/parser. Keep target, badge, description, icon, and variant metadata unchanged. Never
flatten a hidden parent into visible children. Return new arrays/objects only for
the projection; do not mutate cached menu data. No user/session input belongs in
this anonymous projection.

## Error/compatibility flow

The helper is total for a typed array and throws no domain error. Empty input
returns empty. A real-href parent remains even with no children; a linkless parent
remains only with a renderable projected child. Order is stable.

## Direct source-gate test

Create `tests/vitest/services/public-navigation-projection.test.ts` before landing the
new helper. The pure Vitest suite covers deep nesting, hidden subtree, dead leaf/group,
unsafe leaf/drop and unsafe-parent-to-linkless-group behavior, metadata/order
preservation, immutability, idempotence, and parity fixtures used by both site and Menu
Design tests. It must fail without the helper and pass in this leaf's gate.

TASK-542-04-L01 treats this direct suite as read-only: closure reruns it and adds
consumer/integration coverage only in its separately enumerated existing files; it never
rebaselines the pure owner contract.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/services/public-navigation-projection.test.ts \
  tests/vitest/services/menu-item-settings-variant.test.ts \
  tests/vitest/site/siteShell.test.tsx
```

This gate proves the new contract directly while keeping the current mapping consumer
and site-shell lanes green.
