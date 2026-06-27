# TASK-479-06-L03: SidebarNav Redesign + Site Identity (de-SaaS)
# FileName: TASK-479-06-L03-SidebarNav-Redesign-De-SaaS.md

**Priority:** Medium
**Category:** Admin UI / Shell / Navigation
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06-L01 (Badge soft variant for shortcut/badge styling)
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-06

---

## Overview

- **Goal:** Restyle `SidebarNav` to the prototype look and **de-SaaS** it: a
  **site-identity** block at the top (site name + domain + "Visit site"), with
  **no** workspace switcher and **no** plans / "Coderso Pro" / trial card; grouped
  sections with the collapsible **Advanced** group; published custom-screen
  shortcuts shown under a "Published screens" sublabel; rounded active pills with
  **longest-prefix** active resolution; and a footer that is just a **version
  label** plus the Docs/Support links. All real behavior — `AdminLink`/prefetch,
  RBAC gating, group-state persistence, scroll persistence,
  `buildCustomScreenShortcutNavItems` — is preserved.
- **Owning module/service:** `core/admin/ui/shared/SidebarNav.tsx` +
  `core/admin/ui/navigation/sidebarConfig.ts`.
- **Source-of-truth docs:** `_docs/_PROTOTYPE/src/components/shell/Sidebar.tsx`
  (port source) + `_docs/_PROTOTYPE/src/nav/navConfig.ts`; the user-memory
  "Floating panel control UX feedback" + "Page Editor V2 vision" for tone.
- **Out of scope:** Changing `advancedModules.ts` registry/logic; changing
  permission tokens; adding a real workspace concept; top-bar work (→ L04);
  the site-settings client itself (read-only consumption only).

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). RBAC gating
(`canAccess` / item `permission` / `anyPermissions` filtering) is preserved
verbatim. The site-identity block reads existing cached site/general settings
(no new fetch, no mount-force loop) and "Visit site" is an **external** anchor
(`target="_blank" rel="noreferrer noopener"`), not an admin route.

## Implementation Pseudocode

Restyle in place. Keep the props (`sections`, `activeHref`, `footerItems`,
`brand`, `variant`, `canAccess`, `groupState`, `onGroupToggle`, `onNavigate`),
the `visibleSections` permission filter, and the scroll-persistence effect.

### 1. Site-identity block (replaces `defaultBrand`)

```tsx
// New default brand = SITE identity, NOT a SaaS workspace switcher.
// Source name/domain from existing cached settings; fall back to a passed `brand`.
function SiteIdentity({ siteName, siteDomain, siteUrl }: {
  siteName: string; siteDomain?: string; siteUrl?: string;
}) {
  return (
    <div className="px-3 pt-3.5">
      <div className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
          {/* site initial / logo */}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-semibold leading-tight">{siteName}</span>
          {siteDomain ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ExternalLink className="size-3 shrink-0" />
              <span className="truncate">{siteDomain}</span>
            </span>
          ) : null}
        </span>
        {/* NO ChevronDown workspace-switcher affordance. */}
      </div>
      {siteUrl ? (
        <a href={siteUrl} target="_blank" rel="noreferrer noopener"
           className="mt-1 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ExternalLink className="size-3.5" /> Visit site
        </a>
      ) : null}
    </div>
  );
}
// siteName/siteDomain/siteUrl resolved by AdminShell (L05) from existing settings cache
// and passed via the `brand` prop; SidebarNav keeps a neutral fallback brand if absent.
```

### 2. Longest-prefix active resolution (replaces per-item `isAdminHrefActive`)

```ts
// Problem: a published screen (/admin/advanced/custom-screens/:id/entries) and the
// "Screens" item (/admin/advanced/custom-screens) are BOTH prefixes of the path.
// Resolve ONE winner = longest matching resolved href, like proto resolveActiveTo.
function resolveActiveHref(adminBasePath, sections, activeHref): string | null {
  const hrefs = collectAllItemHrefs(sections); // items + group.items + itemsAfterGroups (already adminPaths-resolved)
  let best: string | null = null;
  for (const href of hrefs) {
    if (/^https?:/.test(href)) continue;                 // skip external
    if (isAdminHrefActive(adminBasePath, href, activeHref) && (!best || href.length > best.length)) best = href;
  }
  return best;
}
// Then an item is active iff item.href === winner (exact), so only the deepest match highlights.
// Compute once per render via useMemo over (adminBasePath, sections, activeHref).
```

### 3. Section / group / shortcut styling (port `shell/Sidebar.tsx`)

```text
// D1: SidebarNav is chrome — KEEP the existing --admin-sidebar-* tokens (and --admin-base-border
// for the right rail); do NOT move to shadcn sidebar-* vars. Dark recolor arrives from the
// injected <style> :root.dark{--admin-sidebar-*} (05-L04/L06), source-order winner.
sidebar shell  -> bg-[var(--admin-sidebar-bg)], right rail border-[var(--admin-base-border)]
section label  -> px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-sidebar-text)]/70
nav item       -> rounded-xl px-3 py-2 text-[var(--admin-sidebar-text)] hover:bg-[var(--admin-sidebar-hover-bg)];
                  active = bg-[var(--admin-sidebar-active-bg)] text-[var(--admin-sidebar-active-text)]; icon accent text-primary
Advanced group -> collapsible button (ChevronDown rotate); body has left border (border-[var(--admin-base-border)] pl-2.5)
                  KEEP groupState/onGroupToggle + aria-expanded/aria-controls; default expanded from group.defaultExpanded
shortcuts      -> render section.itemsAfterGroups under a "Published screens" sublabel (text-[10px] uppercase)
badge          -> use <Badge variant="soft"> (L01) for item.badge (e.g. "Beta")
```

### 4. Footer = version label (de-SaaS)

```tsx
// Replace any trial/Pro card with a plain version line + the Docs/Support footer links.
<div className="border-t border-[var(--admin-base-border)] p-3">
  <div className="mb-2 flex items-center gap-1.5 px-3 py-1 text-xs text-muted-foreground">
    <Hexagon className="size-3.5 shrink-0" /> Coderso 1.0
  </div>
  {/* footerItems (Docs/Support) -> AdminLink for internal, plain <a> for external coderso.dev links */}
</div>
// NOTE: there is NO client-side version constant (only server-side env.APP_VERSION), so render the
// owner's literal "Coderso 1.0" (matches the prototype footer). If a versioned label is wanted later,
// add a concrete Vite `define`/exported constant (with the 1.0.0 -> 1.0 mapping) — do NOT reference a
// non-existent APP_VERSION import.
```

**Data flow:** `AdminShell` (L05) resolves `sections`/`footerItems` via
`mapNavSections`/`mapNavItems` (adminPaths) and passes site identity through
`brand`. `SidebarNav` filters by `canAccess`, computes the longest-prefix winner
with `useMemo`, and renders. Group expand/collapse stays driven by the parent's
`groupState` + `onGroupToggle` (persisted in `AdminShell`). Scroll position
persistence (sessionStorage) effect is unchanged.

**Error handling:** missing site name/domain → render neutral fallback brand
(no crash, no empty link). External "Visit site" omitted if no site URL. No
thrown paths added.

**Regression-test shape:** (L07)
- RBAC: items lacking permission are filtered out (existing behavior intact).
- Longest-prefix: with both `/admin/advanced/custom-screens` and
  `/admin/advanced/custom-screens/:id/entries` present and `activeHref` =
  the entries route, only the shortcut item gets the active class.
- Group toggle calls `onGroupToggle(groupId, next)`; `aria-expanded` flips.
- No workspace switcher / no "Pro"/"trial" text rendered; version label present.
- "Visit site" renders `target="_blank" rel` and is not routed through AdminLink.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/admin-shell` (nav active-state + de-SaaS assertions, added in L07)
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin` (existing nav gating / sidebarConfig suites stay green)

## Documentation Updates Required

- `_docs/_TASKS/README.md` board + Statistics on status change.
- Parent `TASK-479_Admin_UI_Visual_Redesign_Prototype.md` §"TASK-479-06" — drop
  the stale "workspace switcher … footer trial card" wording.
- `_docs/UI/` shell/navigation reference — note site identity + version footer.
- `_docs/_CHANGELOG/` entry on closure linking TASK-479 + TASK-479-06-L03.
