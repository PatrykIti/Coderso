# TASK-542-03-L01: Create Shared Public Navigation Projection

# FileName: TASK-542-03-L01-Create-Shared-Public-Navigation-Projection.md

**Parent Task:** TASK-542
**Parent Subtask:** TASK-542-03
**Priority:** High
**Category:** Navigation / Pure Domain / Public Projection
**Estimated Effort:** Small
**Dependencies:** TASK-542-01-L01
**Status:** ⏳ To Do
**Changelog:** 1319 (pinned; closure only)

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
- Widget `NavigationItem` type owner (must NOT be imported by the new module):
  `core/widgets/core/navigation.tsx:38`.
- Widget safe-href helper (must NOT be imported by the new module):
  `core/widgets/core/widgetSafeHref.ts:17`.

## Implementation Pseudocode

```ts
// Local structural contract: the projection owns this type and MUST NOT import
// it (or any helper) from core/widgets/core/*, which S6 removes.
export type PublicNavigationBadge = {
  label: string;
  tone: "default" | "accent" | "success" | "warning" | "danger";
};

export type PublicNavigationMeta = {
  visibility: "all" | "logged_in" | "logged_out";
  badge: PublicNavigationBadge | null;
  description: string | null;
  icon: string | null;
  variant?: "link" | "button";
};

export type PublicNavigationItem = {
  label: string;
  href: string;
  target?: "self" | "blank";
  meta?: PublicNavigationMeta;
  children?: PublicNavigationItem[];
};

// hrefs arrive already normalized by mapMenuNodesToNavigationItems: a safe
// relative/hash/http URL or the "#" sentinel for empty/unsafe. The projection
// performs NO URL parsing and MUST NOT import normalizeWidgetSafeHref.
export const hasPublicNavigationHref = (href: string): boolean =>
  href.trim().length > 0 && href.trim() !== "#";

export function projectPublicNavigationItems(
  items: readonly PublicNavigationItem[]
): PublicNavigationItem[] {
  const projected: PublicNavigationItem[] = [];
  for (const item of items) {
    if (item.meta?.visibility === "logged_in") continue; // hide whole subtree
    const children = projectPublicNavigationItems(item.children ?? []);
    if (!hasPublicNavigationHref(item.href) && children.length === 0) continue;
    const { children: _sourceChildren, ...itemWithoutChildren } = item;
    projected.push({
      ...itemWithoutChildren, // dead parent with children stays a linkless group
      ...(children.length > 0 ? { children } : {}),
    });
  }
  return projected;
}
```

Do not import `NavigationItem`, `NavigationItemMeta`, or `normalizeWidgetSafeHref`
from `core/widgets/core/*`: the projection owns its `PublicNavigationItem` type and
consumes the mapper's already-canonical href (safe value or the `"#"` sentinel), so
it creates no URL regex/parser. The widget `NavigationItem` at
`core/widgets/core/navigation.tsx:38` is structurally assignable to
`PublicNavigationItem`, so existing mapped `NavigationItem[]` call sites compile
without a cast. Keep target, badge, description, icon, and variant metadata
unchanged. Never flatten a hidden parent into visible children. Return new
arrays/objects only for the projection; do not mutate cached menu data. No
user/session input belongs in this anonymous projection.

## Type ownership and S6 collision guard

This leaf adds no new dependency on the widget surface. Forbidden import paths for
`publicNavigationProjection.ts` are `core/widgets/core/navigation.tsx`,
`core/widgets/core/widgetSafeHref.ts`, and `core/widgets/core/index.ts`. The
stable owner of the projection contract is `PublicNavigationItem` (and its meta/
badge types) exported by `core/services/navigation/publicNavigationProjection.ts`.

Reciprocal note for S6 (widget-removal family): S6 will remove `core/widgets/core/*`;
it must not expect TASK-542 to have left any widget import behind in this module.
Migrating the pre-existing `NavigationItem` imports in `siteShell.tsx`,
`MenuDesignEditor.tsx`, `navigationMenuMapping.ts`, `navigationRuntimeResolver.ts`,
and the server runtime is S6's scope, not TASK-542's. Do not widen those files here
to re-export the widget type.

## Error/compatibility flow

The helper is total for a typed array and throws no domain error. Empty input
returns empty. A real-href parent remains even with no children; a linkless parent
remains only with a renderable projected child. Order is stable.

## Direct source-gate test

Create `tests/vitest/services/public-navigation-projection.test.ts` before landing the
new helper. The pure Vitest suite covers deep nesting, hidden subtree, dead leaf/group,
`#`-href leaf/drop and `#`-href parent to linkless-group behavior (the mapper's
sentinel), metadata/order preservation, immutability, idempotence, and parity fixtures used by both site and Menu
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
