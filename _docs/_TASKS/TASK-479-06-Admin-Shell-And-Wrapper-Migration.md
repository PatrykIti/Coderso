# TASK-479-06: Admin Shell & Wrapper Migration
# FileName: TASK-479-06-Admin-Shell-And-Wrapper-Migration.md

**Priority:** Medium
**Category:** Admin UI / Design System / Shell & Layout
**Estimated Effort:** Large
**Dependencies:** TASK-479-05 (token port into `core/admin/styles/globals.css` must land first)
**Status:** ⏳ To Do
**Parent Task:** TASK-479
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Port the finished visual-redesign prototype's **shell + shared primitives + pattern
library + floating-panel editor surface** into the real admin so every screen
inherits the new "soft & friendly" (Notion-like), violet-accent look, light
default + dark toggle. This subtask restyles the *frame* (primitives, patterns,
sidebar, top bar, layouts, canvas-editor pattern) — not individual pages (those
roll out section-by-section in **TASK-479-07**).

- **Goal:** Adopt the prototype's structure and tokens in
  `core/admin/components/ui/*`, `core/admin/ui/shared/*`,
  `core/admin/ui/layouts/*`, and `core/admin/ui/navigation/sidebarConfig.ts`
  while preserving all real data/logic, routing helpers, RBAC gating, and the
  cache contract. De-SaaS the chrome: the sidebar shows **site identity** (site
  name + domain + "Visit site"), **no** workspace switcher, **no** plans /
  "Coderso Pro" / trial card; the footer is just a version label.
- **Owning module/service:** `core/admin/components/ui/*`,
  `core/admin/ui/shared/*`, `core/admin/ui/layouts/*`,
  `core/admin/ui/navigation/sidebarConfig.ts`.
- **Source-of-truth docs:**
  - `_docs/_TASKS/TASK-479_Admin_UI_Visual_Redesign_Prototype.md` (parent plan).
  - `_docs/_PROTOTYPE/README.md` ("Porting back into `core/admin`").
  - `_docs/DESIGN_TOKENS.md` + `_docs/_PROTOTYPE/src/styles/theme.css` (tokens, ported by TASK-479-05).
  - Prototype sources: `_docs/_PROTOTYPE/src/components/{shell/*,ui/*,patterns/*}`.
  - `_docs/TESTING_STRATEGY.md` (Vitest lane for admin/UI).
- **Out of scope:**
  - Per-page restyle of dashboards/lists/settings/galleries (→ TASK-479-07).
  - Token hex/dark-block changes (→ TASK-479-05; this subtask consumes them).
  - Any change to editor *behavior*, payload schemas, routes, or permissions.
  - Rewiring real editors onto `CanvasEditor` (L06 ships the shared pattern only;
    adopting it per-editor is TASK-479-07 / dedicated editor tasks).
  - The inline state screens `NotFound` / `AccessDenied` / `Loading` get no
    dedicated leaf — they inherit the new semantic tokens automatically
    (token-only, no structural change here).

## Owned files (frame layer)

- Layouts: `core/admin/ui/layouts/{AdminShell,AuthShell,EditorShell,SettingsShell,SplitShell}.tsx`.
- Shared: `core/admin/ui/shared/{SidebarNav,TopBar,PageHeader,SectionHeader,AdminThemeSwitcher,ListPaginationFooter}.tsx` (+ new pattern files from L02 + `CanvasEditor.tsx` from L06).
- Primitives: `core/admin/components/ui/*` (shadcn, Radix-backed).
- Nav config: `core/admin/ui/navigation/sidebarConfig.ts` (+ `advancedModules.ts` untouched logic).

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). The new site-identity block reads existing
cached site/general settings and links "Visit site" to the public site URL as an
**external** link (`target="_blank"`, `rel="noreferrer"`) — it adds no admin
route and no new fetch. RBAC gating in `SidebarNav` / `AdminShell`
(`useAdminCan`, `permission` / `anyPermissions`) is preserved unchanged.

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-06-L01 | Shared shadcn Primitive Restyle | ⏳ To Do |
| TASK-479-06-L02 | Shared Pattern Component Library | ⏳ To Do |
| TASK-479-06-L03 | SidebarNav Redesign + Site Identity (de-SaaS) | ⏳ To Do |
| TASK-479-06-L04 | TopBar Redesign (Command Search, Theme Toggle, User Menu) | ⏳ To Do |
| TASK-479-06-L05 | AdminShell & Editor Shell Layout | ⏳ To Do |
| TASK-479-06-L06 | CanvasEditor Floating-Panel Pattern + Show/Hide Toggle | ⏳ To Do |
| TASK-479-06-L07 | Shell & Primitive Tests | ⏳ To Do |

### Implementation order

L01 (primitives) → L02 (patterns, depends on L01) and L03 (sidebar, depends on
L01) in parallel → L04 (top bar, depends on L01 + the 05-L06 light/dark toggle)
→ L05 (layouts, depends on L03 + L04) → L06 (canvas-editor, depends on L01/L02/L05)
→ L07 (tests, depends on all). Land behind the same component names so pages keep
importing the same modules. The light/dark **"dark actually recolors chrome"**
gate (L07) runs only **after** L01/L03/L04 land — see the Dark-mode tokens hard
constraint below; until the chrome migration completes, the dark toggle would
recolor only part of the shell.

## Hard constraints (apply to every leaf)

- **Routing:** route every admin nav target / href / prefetch through the shared
  canonical helpers (`adminPaths` / `mapNavSections` / `mapNavItems` /
  `resolveAdminHref` / `AdminLink` / `prefetchAdminRoute`). Never hand-build an
  admin href. External links (Visit site, Docs, Support) may be plain anchors.
- **RBAC / cache:** preserve permission gating (`useAdminCan`, item
  `permission` / `anyPermissions`), the cache contract (`cachedClient`,
  `cacheKeys`, `cacheBus` subscriptions, cache-hydrate + background revalidate,
  **no** mount-force refetch loops, **no** dirty-state overwrites), and the
  existing custom-screen / solution-kit wiring already in `AdminShell.tsx`.
- **Hooks:** obey ESLint 9 `react-hooks` rules — no synchronous `setState` in
  effects; use lazy `useState` init / render-time derivation / reducers
  (e.g. `panelOpen`, `navOpen`, `navGroupState`).
- **Schema-first:** any payload/settings read stays schema-validated at its
  existing client boundary; the visual layer never introduces an unvalidated read.
- **Keep Radix internals** in `components/ui/*`; only merge styling/variants.
- **Dark-mode tokens (canonical strategy):** the real chrome primitives
  (`button` `--admin-button-*`, `input`/`textarea` `--admin-input-*`, `alert`
  `--admin-state-*`, `SidebarNav` `--admin-sidebar-*`, `TopBar` `--admin-topbar-*`)
  read the existing `--admin-*` CSS variables **directly** and MUST stay on them —
  do NOT re-route chrome through derived shadcn vars (`bg-sidebar-accent`,
  `bg-background`, `border-input`, `border-border`, …). Dark recolor comes from
  the per-profile injected `<style id="coderso-theme-tokens">`, which (per
  TASK-479-05-L04/L06) emits BOTH a light `:root{--admin-*}` and a dark
  `:root.dark{--admin-*}` block and wins source order over `globals.css`; a static
  `globals.css .dark{--admin-*}` would lose source order, so it is NOT the
  mechanism. Additive shadcn-derived variants (`soft`/`success`/`warning`/`info`
  on Badge/Button, the new `CanvasEditor` surface) may use derived vars
  (`--primary-soft`, `--card`, …) whose dark values come from `globals.css .dark`
  (05) — those are not chrome the injected style overrides. L07 asserts a real
  computed token/background flip in dark for button + sidebar + topbar, not merely
  that the `.dark` class is present.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/admin-shell` (shell render, nav active-state, theme toggle — added in L07)
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin` (existing admin suites must stay green — nav gating, adminPaths, theme switcher)
- Per-leaf suites are listed in each leaf's Testing Requirements; all existing
  Vitest admin + ui-integration suites must remain green (no regressions to nav
  gating, adminPaths resolution, or cache behavior).

## Documentation Updates Required

- `_docs/_TASKS/README.md` — move TASK-479-06 between buckets and update
  Statistics on each status change.
- `_docs/_CHANGELOG/` — add a dated entry on closure linking `TASK-479` +
  `TASK-479-06` (and per-leaf where a leaf closes independently).
- `_docs/DESIGN_TOKENS.md` and any admin-shell/UI contract doc under
  `_docs/UI/` that references the old shell structure (note the de-SaaS shell,
  site identity, dark toggle, floating-panel canvas pattern).
- Update the parent `TASK-479_Admin_UI_Visual_Redesign_Prototype.md` §"TASK-479-06"
  to replace the stale "workspace switcher … footer trial card" wording with the
  delivered de-SaaS shell (site identity + version footer).

## Closure Checklist

- [ ] All L01–L07 leaves `✅ Done`.
- [ ] No open children under this subtask.
- [ ] Board + Statistics synced; changelog entry cross-linked.
- [ ] Lint, types, and the L07 Vitest suites green; existing admin suites green.
- [ ] Live-verified (light + dark) on Dashboard + one list + one editor route
      that the shell renders correctly and nav active-state is longest-prefix.
