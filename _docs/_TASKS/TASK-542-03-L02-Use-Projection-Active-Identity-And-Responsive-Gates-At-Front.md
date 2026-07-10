# TASK-542-03-L02: Use Projection, Active Identity, and Responsive Gates at Front

# FileName: TASK-542-03-L02-Use-Projection-Active-Identity-And-Responsive-Gates-At-Front.md

**Parent Task:** TASK-542
**Parent Subtask:** TASK-542-03
**Priority:** High
**Category:** Public Site / Menu Runtime / Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-542-02-L01, TASK-542-03-L01, TASK-539
**Status:** ⏳ To Do
**Changelog:** 1254 (pinned; closure only)

---

## Exclusive ownership

- `core/site/siteShell.tsx`

Re-read the post-TASK-539 file before editing. This leaf must not overlap a live
TASK-539 writer and must preserve its Page/footer runtime changes.

## Grounded anchors

- Local public filtering/renderability: `siteShell.tsx:112-179,224-245`.
- Href-only winner and duplicate stamping: `:134-165,198-218`.
- Responsive brand icon inline color: `:495-553`.
- First-section/desktop-only scroll gate: `:670-705`.
- Static scroll machine: `:626-650`.

## Implementation Pseudocode

```tsx
type NavigationIdentityPath = readonly number[];
const pathKey = (path: NavigationIdentityPath) => path.join(".");

export function resolveMenuActiveItemPath(items, activePath): string | null {
  const current = normalizeNavPath(activePath);
  let winner: { targetLength: number; key: string } | null = null;
  const visit = (nodes, parentPath = []) => {
    nodes.forEach((item, index) => {
      const itemPath = [...parentPath, index];
      const target = normalizeNavPath(item.href);
      if (matches(current, target) && (!winner || target.length > winner.targetLength)) {
        winner = { targetLength: target.length, key: pathKey(itemPath) };
      }
      visit(item.children ?? [], itemPath);
    });
  };
  visit(items);
  return winner?.key ?? null; // equal-length tie stays first DFS
}

function SiteNavItem({ item, itemPath, activeIdentity, ... }) {
  const ownKey = pathKey(itemPath);
  return <SiteNavLink aria-current={ownKey === activeIdentity ? "page" : undefined} ... />;
  // child paths append their projected index
}

const publicItems = projectPublicNavigationItems(navigation?.items ?? []);
const activeIdentity = resolveMenuActiveItemPath(publicItems, activePath);
const emitScrollMachine = isFront && menuDocumentHasScrolledVariantForAnyDevice(document);

// Brand icon: remove inline style.color entirely. The base and media-scoped
// CSS from 542-02 owns currentColor; keep width/height presentation attributes.
<Icon aria-hidden width={iconSize} height={iconSize} />
```

Replace local visibility/renderability helpers with imports from the projection
owner. Resolver and recursive render must receive the same projected array so
indices cannot drift. Do not add item IDs to the shared widget contract merely
for active state.

The scroll script is armed when any effective device layout is sticky and has an
authored scrolled key. CSS media rules decide which device visibly responds; the
script remains one static, front-only instance and no-scrolled documents emit no
script.

## Error/compatibility flow

- Missing activePath stamps none.
- External/hash/protocol-relative targets never match.
- Longest path wins; equal duplicate hrefs select only first DFS identity.
- Anonymous projection removes hidden branches before matching.
- No iconColor retains inherited color and byte behavior; authored color moves
  from inline to scoped CSS without widening accepted values.

## Tests owned by TASK-542-04

- `tests/vitest/site/siteShell.test.tsx`: projection import, duplicate href one
  current, longest match, deep path identity, hidden branch, icon no-inline color,
  responsive-only scroll gate, no-scrolled no-script.
- `tests/unit/site/menu-document-render.test.tsx` and
  `tests/integration/runtime/site-shell-runtime.test.ts`: SSR/runtime parity.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/site/siteShell.test.tsx \
  tests/vitest/site/menu-document-css.test.ts
bun test tests/unit/site/menu-document-render.test.tsx \
  tests/integration/runtime/site-shell-runtime.test.ts
```

Rerun any named failure once in isolation.
