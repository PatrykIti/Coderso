# TASK-479-06-L04: TopBar Redesign (Command Search, Theme Toggle, User Menu)
# FileName: TASK-479-06-L04-TopBar-Redesign.md

**Priority:** Medium
**Category:** Admin UI / Shell / Top Bar
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06-L01 (primitives); TASK-479-05-L06 (light/dark theme toggle control)
**Status:** ✅ Done (2026-06-29)
**Parent Subtask:** TASK-479-06

---

## Overview

- **Goal:** Restyle `TopBar` to the prototype: a command-style **⌘K search**
  trigger (with kbd hint), the **light/dark theme toggle** (from TASK-479-05-L06)
  alongside the existing admin **theme-profile** switcher, a **notifications**
  dropdown, a **user menu** (avatar + name/role + Profile/Settings/Help/Sign out),
  and a **Create** action. Real wiring is preserved: `SearchBar`, breadcrumbs
  (`AdminBreadcrumbs`), `AdminThemeSwitcher`, and the mobile `navToggle`.
- **Owning module/service:** `core/admin/ui/shared/TopBar.tsx` (+ a small
  `TopBarUserMenu` and `TopBarNotifications` if extracted) — consumes
  `AdminThemeSwitcher` and the new theme toggle.
- **Source-of-truth docs:** `_docs/_PROTOTYPE/src/components/shell/Topbar.tsx`
  + `shell/ThemeToggle.tsx` + `ui/dropdown.tsx` (port source).
- **Out of scope:** Implementing the ⌘K command-palette *behavior* (this leaf
  ships the trigger that opens the existing `SearchBar` / search flow; a full
  palette is a separate task); changing search results/data; sidebar (→ L03);
  layout container (→ L05).

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). The user menu's links route through
`AdminLink` + adminPaths; Sign out reuses the existing logout action/route. No
new notification or search endpoint is introduced, and **no fabricated data** is
shipped (de-SaaS de-fabrication rule): the **⌘K** trigger only opens the existing
`SearchBar`/search flow; **Notifications** render from whatever the existing
source provides, else a calm empty state ("No notifications") — never invented
items + unread counts; **Create** is a presentational slot that either routes via
an existing create flow (`AdminLink`) or is host-provided through the `actions`
prop — it introduces no new data or endpoint. These three are wired/empty, not
mock-seeded.

## Implementation Pseudocode

Restyle in place; keep the `TopBarProps` shape (`navToggle`, `breadcrumbs`,
`search`, `actions`, `user`, `className`) so `AdminShell` keeps passing the same
nodes.

### Layout (port `shell/Topbar.tsx`)

```tsx
export function TopBar({ navToggle, breadcrumbs, search, actions, user, className }: TopBarProps) {
  // KEEP breadcrumb resolution (AdminBreadcrumbs / buildAdminBreadcrumbItemsFromNode).
  // D1: TopBar is chrome — KEEP --admin-topbar-* (bg/border/text); do NOT move to shadcn
  // bg-background/border-border. Dark recolor comes from the injected <style> :root.dark{--admin-topbar-*}.
  return (
    <header className={cn(
      "sticky top-0 z-30 flex h-16 items-center gap-3 border-b " +
      "border-[var(--admin-topbar-border)] bg-[var(--admin-topbar-bg)] text-[var(--admin-topbar-text)] " +
      "px-4 backdrop-blur-md lg:px-6", className)}>
      {navToggle /* mobile menu button, md:hidden */}
      <div className="min-w-0 truncate">{renderedBreadcrumbs}</div>

      {/* Command-style search trigger (proto). `search` slot still hosts the real SearchBar. */}
      {search ?? <CommandSearchTrigger />}

      <div className="ml-auto flex items-center gap-2">
        <CreateButton />                 {/* Button variant="default" size="sm" + Plus */}
        <AdminColorModeToggle />                  {/* light/dark, from TASK-479-05-L06 */}
        <AdminThemeSwitcher />           {/* KEEP existing admin theme-PROFILE dropdown */}
        {actions}
        <NotificationsMenu />            {/* dropdown-menu primitive, bell + unread dot */}
        {user ?? <UserMenu />}           {/* avatar + name/role; Profile/Settings/Help/Sign out */}
      </div>
    </header>
  );
}
```

### Command search trigger

```tsx
function CommandSearchTrigger() {
  // Button-shaped trigger that opens the existing search flow (focuses SearchBar / opens palette).
  // Visual only here; do NOT duplicate search logic — delegate to the real SearchBar handler.
  return (
    <button type="button" onClick={openSearch}
      className="group flex h-9 w-full max-w-xs items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm text-muted-foreground shadow-soft hover:border-ring/60">
      <Search className="size-4" />
      <span className="flex-1 text-left">Search or jump to…</span>
      <kbd className="hidden items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] sm:flex">
        <Command className="size-3" />K
      </kbd>
    </button>
  );
}
// When AdminShell passes `search={<SearchBar />}`, that real control renders instead —
// keep SearchBar wiring intact; the trigger is the fallback/compact affordance.
```

### User menu (port `shell/Topbar.tsx` dropdown) — use real `dropdown-menu` primitive

```tsx
// Use core/admin/components/ui/dropdown-menu (Radix), NOT the prototype's mini Dropdown.
// Items -> AdminLink for internal routes (adminPaths). Sign out -> existing logout action.
<DropdownMenu>
  <DropdownMenuTrigger> Avatar + name/role </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-56 rounded-2xl">
    <DropdownMenuLabel> name + email + role Badge(variant="soft") </DropdownMenuLabel>
    <DropdownMenuItem>Profile</DropdownMenuItem>{/* non-navigating (matches proto): no /profile route exists */}
    <DropdownMenuItem asChild><AdminLink href="/settings">Settings</AdminLink></DropdownMenuItem>
    <DropdownMenuItem>Help &amp; support</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive" onSelect={signOut}>Sign out</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
// Identity (name/email/role) comes from the existing admin auth context (AdminAuthContext) —
// no new fetch; render-time read, lazy state only.
```

**Data flow:** breadcrumbs unchanged; theme toggle reads/writes the theme
provider from TASK-479-05-L06 (persisted), independent of the admin theme-profile
switcher; user identity from `AdminAuthContext`; search delegates to the existing
`SearchBar` handler. Dropdown open/close is local lazy `useState` (Radix-managed).

**Error handling:** if notifications/identity sources are empty, render a calm
empty state ("No notifications") / initials fallback — never throw. Theme toggle
no-ops safely if the provider is absent (SSR/test guard).

**Regression-test shape:** (L07)
- Theme toggle flips `document.documentElement` `dark` class and persists.
- User menu renders `AdminLink` items with resolved hrefs; Sign out calls logout.
- Search trigger renders kbd hint; passing a real `search` node renders it instead.
- `AdminThemeSwitcher` (profile) and `AdminColorModeToggle` (light/dark) coexist (two
  distinct controls).

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/admin-shell` (topbar + theme toggle, added in L07)
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin` (existing AdminThemeSwitcher / SearchBar suites stay green)

## Documentation Updates Required

- `_docs/_TASKS/README.md` board + Statistics on status change.
- `_docs/UI/` shell reference — document the dual theme controls (profile switcher
  vs light/dark toggle) and the command-search trigger.
- `_docs/_CHANGELOG/` entry on closure linking TASK-479 + TASK-479-06-L04.
