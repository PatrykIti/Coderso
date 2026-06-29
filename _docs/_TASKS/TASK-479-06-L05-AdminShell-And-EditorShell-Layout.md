# TASK-479-06-L05: AdminShell & Editor Shell Layout
# FileName: TASK-479-06-L05-AdminShell-And-EditorShell-Layout.md

**Priority:** Medium
**Category:** Admin UI / Shell / Layout
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06-L03 (SidebarNav), TASK-479-06-L04 (TopBar)
**Status:** ✅ Done (2026-06-29)
**Parent Subtask:** TASK-479-06

---

## Overview

- **Goal:** Apply the prototype's outer-frame layout to the real shells:
  a **max-width centered content** column with comfortable padding and a soft
  route-change transition, a content **scroll container** that respects pages
  owning their own overflow, the **mobile drawer** (already via `Sheet`), and an
  **editor-shell host** prepared for the floating-panel canvas (L06). Resolve and
  pass **site identity** to `SidebarNav` (L03). Restyle the thin sibling shells
  (`AuthShell`, `SettingsShell`, `SplitShell`) to the new tokens. Preserve the
  existing `AssistantPanel`, nav-group-state persistence, custom-screen /
  solution-kit wiring, and the cache contract in `AdminShell.tsx`.
- **Owning module/service:** `core/admin/ui/layouts/{AdminShell,EditorShell,AuthShell,SettingsShell,SplitShell}.tsx`.
- **Source-of-truth docs:** `_docs/_PROTOTYPE/src/components/shell/{AppShell,AuthShell,SettingsLayout}.tsx`; the real `AdminShell.tsx` current logic; "Page Editor V2 vision" memory (floating panel = sole control surface).
- **Out of scope:** The `CanvasEditor` component itself (→ L06); rewiring real
  editors; per-page content (→ TASK-479-07); changing custom-screen /
  solution-kit data loading logic (preserve as-is).

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). The custom-screen and solution-kit
`cacheKeys` / `subscribeCacheEvents` / `subscribeActiveSolutionKitId` wiring and
`useAdminCan` gating in `AdminShell` are preserved verbatim — no new fetch, no
mount-force refetch loop, no dirty-state overwrite.

## Implementation Pseudocode

Restyle layout in place; keep `AdminShellProps` and all the existing memoized
nav/cache logic (lines that build `navSectionsWithCustomScreens`, persist
`navGroupState`, subscribe to cache events). Only the JSX frame + a small
site-identity derivation change.

### `AdminShell.tsx`

```tsx
// 1) Derive site identity from existing cached settings (no new fetch).
const siteIdentity = useSiteIdentityFromCache(); // { name, domain, url } from settings cache; memoized
// Pass to SidebarNav via `brand={<SiteIdentity {...siteIdentity} />}` (L03 fallback if undefined).

// 2) Outer frame: max-width centered main content + soft route transition.
return (
  <div className={cn("flex h-screen w-full overflow-hidden bg-[var(--admin-base-surface)]", className)}>
    <SidebarNav sections={resolvedSections} footerItems={resolvedFooter} activeHref={resolvedActiveHref}
      canAccess={canAccess} groupState={resolvedNavGroupState} onGroupToggle={...}
      brand={<SiteIdentity {...siteIdentity} />} />            {/* L03 */}
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <TopBar breadcrumbs={breadcrumbs} search={showSearch ? (search ?? <SearchBar />) : search}
        actions={topbarActions} user={user} navToggle={<MobileNavButton onClick={() => setNavOpen(true)} />} />
      <main data-app-scroll
        className={cn("min-h-0 flex-1", !contentOwnsOverflow && "overflow-y-auto", contentClassName)}>
        {/* Centered max-width column unless the page owns full-bleed (editor) layout. */}
        {contentOwnsOverflow
          ? children
          : <div className="mx-auto w-full max-w-[1280px] px-4 py-6 lg:px-8 lg:py-8">
              <div key={routeKey} className="animate-in-soft">{children}</div>
            </div>}
      </main>
    </div>
    <Sheet open={navOpen} onOpenChange={setNavOpen}>{/* KEEP mobile SidebarNav variant="mobile" */}</Sheet>
    <AssistantPanel activeHref={resolvedActiveHref ?? null} />   {/* PRESERVE */}
  </div>
);
// `routeKey` = a stable value already available (e.g. resolvedActiveHref) — no new router coupling;
// the animate-in-soft transition must NOT remount data-bearing children in a way that refetches.
```

### `EditorShell.tsx` (host for the floating-panel canvas)

```tsx
// Today EditorShell = 3-pane (leftPanel | center | rightPanel) over AdminShell with contentClassName="p-0 overflow-hidden".
// KEEP that API for existing editors. ADD a `canvas` host mode so editors can opt into the
// L06 floating-panel CanvasEditor instead of side rails (Page Editor V2 model).
type EditorShellProps = { /* existing */ } & {
  variant?: "panels" | "canvas";   // NEW, default "panels" (backward compatible)
};
// variant="canvas": render a single full-height host that fills the center region; the editor
// page drops a <CanvasEditor> (L06) inside. Still goes through AdminShell with overflow owned by content.
// variant="panels": unchanged 3-pane layout, retokenized (bg-muted/20 -> bg-[var(--admin-base-surface)] etc).
```

### Sibling shells (retheme only)

```text
AuthShell.tsx     -> port shell/AuthShell.tsx framing: centered card on warm canvas, rounded-2xl, soft shadow
SettingsShell.tsx -> use SettingsSection (L02) two-col rhythm + section nav; keep its data/props
SplitShell.tsx    -> retoken borders/bg to new tokens; no structural change
```

**Data flow:** all nav/cache/solution-kit derivation stays exactly as today
(memoized selectors + cache subscriptions). Site identity is a render-time
derivation from the already-cached settings — no effect that triggers a fetch.
`contentOwnsOverflow` continues to gate whether the shell adds scroll, so editor
routes (`p-0 overflow-hidden`) keep full-bleed behavior and skip the max-width
wrapper.

**Error handling:** missing site identity → `SiteIdentity` falls back to neutral
brand (L03). The `animate-in-soft` wrapper must be CSS-only (no JS that could
throw); guard `routeKey` so an undefined key doesn't force remounts.

**Regression-test shape:** (L07)
- `AdminShell` renders sidebar + topbar + main; centered `max-w-[1280px]` wrapper
  present for normal pages, **absent** when `contentClassName` owns overflow.
- `AssistantPanel` still mounted; nav-group state persists to localStorage
  (existing behavior unchanged — no extra writes per render).
- `EditorShell variant="canvas"` renders a single full-height host;
  `variant="panels"` renders the 3-pane layout (default).
- Mobile drawer opens/closes via the nav toggle.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/admin-shell` (added in L07)
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin` (existing AdminShell custom-screen / solution-kit / nav-group suites stay green)

## Documentation Updates Required

- `_docs/_TASKS/README.md` board + Statistics on status change.
- `_docs/UI/` shell reference — document the centered content column, the
  `EditorShell` `variant="canvas"` host, and the de-SaaS site identity wiring.
- `_docs/_CHANGELOG/` entry on closure linking TASK-479 + TASK-479-06-L05.
