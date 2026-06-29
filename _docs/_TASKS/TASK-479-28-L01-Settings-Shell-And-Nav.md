# TASK-479-28-L01: Settings Shell & Sub-Nav Restyle
# FileName: TASK-479-28-L01-Settings-Shell-And-Nav.md

**Priority:** Medium
**Category:** Admin UI / Settings / Visual Refresh
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ✅ Done (2026-06-29)
**Parent Subtask:** TASK-479-28

---

## Overview

Restyle the shared settings chrome — `SettingsShell.tsx` and `SettingsSidebar.tsx`
— to the prototype's `SettingsLayout`: a two-column settings surface with a soft,
rounded sub-nav (General / Site / Assistant / Security [+ IP allowlist / Sessions /
Login alerts children] / API keys / Webhooks / Email / Storage / Integrations) and
a save bar pattern. All routing stays canonical via `adminPaths`/`AdminLink`, the
dirty-navigation guard stays intact, and the optional preview rail keeps working.

- **Goal:** Give the settings shell + sub-nav the soft/violet, `rounded-xl` look
  of the prototype (active item highlighted with `bg-sidebar-accent` +
  primary-tinted icon, Security children revealed when the Security branch is
  active, sticky sub-nav) while preserving the `AdminShell` host, the
  `SettingsDirtyNavigationProvider`, the `requestNavigation` dirty guard,
  `prefetch`, and the optional `preview` rail.
- **Owning module/service:** `core/admin/ui/layouts/SettingsShell.tsx` and
  `core/admin/ui/settings/SettingsSidebar.tsx` (exporting `settingsSidebarItems`),
  consumed by every settings page via `SettingsShell` + `<SettingsSidebar
  activeId=… />`.
- **Source-of-truth docs:** `_docs/DESIGN_TOKENS.md`; prototype source
  `_docs/_PROTOTYPE/src/components/shell/SettingsLayout.tsx` (the `SETTINGS_NAV`
  array, the active/children highlight, the save bar) and primitives
  `_docs/_PROTOTYPE/src/components/patterns/PageHeader.tsx`,
  `_docs/_PROTOTYPE/src/components/ui/button.tsx`.
- **Out of scope:** No route changes (keep every `/admin/settings/...` href in
  `settingsSidebarItems`). No change to `AdminShell`, the dirty-navigation
  engine, or the `preview` contract. Do NOT centralize the per-page save bar into
  the shell in this leaf — pages own their own sticky save bar (L02+); this leaf
  only ports the sub-nav look + the shared shell two-column structure.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Target files: `core/admin/ui/settings/SettingsSidebar.tsx` (restyle the nav item
markup; add Security children grouping) and
`core/admin/ui/layouts/SettingsShell.tsx` (keep `AdminShell` host + the
`SettingsDirtyNavigationProvider` + `aside`/`section`/`preview` skeleton; restyle
spacing/tokens only).

Port from prototype `SettingsLayout.tsx`: the `SETTINGS_NAV` shape with optional
`children`, the active/childActive class logic, and the `rounded-xl` item chrome.

```tsx
// SettingsSidebar.tsx — keep settingsSidebarItems hrefs + ids EXACTLY.
// Add an OPTIONAL children grouping so Security reveals its sub-pages when active,
// matching the prototype. Children reuse the SAME existing href ids/targets that
// already exist as flat items today (sessions / login-alerts / ip-allowlist) —
// do NOT invent new routes; render them as a nested group under Security instead
// of three flat rows.

const SETTINGS_NAV = [
  { id: "general",   label: "General",   icon: Settings, href: "/admin/settings/general" },
  { id: "site",      label: "Site",      icon: Globe,    href: "/admin/settings/site" },
  { id: "assistant", label: "Assistant", icon: Bot,      href: "/admin/settings/assistant" },
  { id: "security",  label: "Security",  icon: Shield,   href: "/admin/settings/security",
    children: [
      { id: "ip-allowlist", label: "IP allowlist", href: "/admin/settings/security/ip-allowlist" },
      { id: "sessions",     label: "Sessions",     href: "/admin/settings/security/sessions" },
      { id: "login-alerts", label: "Login alerts", href: "/admin/settings/security/login-alerts" },
    ] },
  { id: "api-keys",  label: "API keys",  icon: KeyRound, href: "/admin/settings/api-keys" },
  { id: "webhooks",  label: "Webhooks",  icon: Link2,    href: "/admin/settings/webhooks" },
  { id: "email",     label: "Email",     icon: Mail,     href: "/admin/settings/email" },
  { id: "storage",   label: "Storage",   icon: HardDrive,href: "/admin/settings/storage" },
  { id: "integrations", label: "Integrations", icon: Plug, href: "/admin/settings/integrations" },
];
// NOTE: keep settingsSidebarItems exported (flat, for callers/tests that read it);
// derive the nested render structure from it OR keep a parallel SETTINGS_NAV that
// is asserted-equal in tests. Prefer ONE source: extend settingsSidebarItems with
// optional `parent`/`children` so existing consumers keep their id->href mapping.

function SettingsSidebar({ activeId = "general" }) {
  const { requestNavigation } = useSettingsDirtyNavigation();
  const securityChildIds = new Set(["ip-allowlist", "sessions", "login-alerts"]);
  const securityActive = activeId === "security" || securityChildIds.has(activeId);

  const renderLink = (item, { child = false } = {}) => {
    const isActive = item.id === activeId;
    return (
      <AdminLink
        key={item.id}
        href={item.href}
        prefetch
        aria-current={isActive ? "page" : undefined}
        onClick={(event) => {
          if (!shouldGuardSettingsNavigation(event)) return;
          if (!requestNavigation(item.href)) event.preventDefault(); // KEEP dirty guard
        }}
        className={cn(
          child
            ? "rounded-lg px-2.5 py-1.5 text-[13px]"
            : "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium [&_svg]:size-4",
          isActive
            ? (child ? "font-medium text-primary"
                     : "bg-sidebar-accent text-sidebar-accent-foreground [&_svg]:text-primary")
            : "text-muted-foreground hover:bg-accent hover:text-foreground [&_svg]:text-muted-foreground",
        )}
      >
        {item.icon ? <item.icon /> : null}
        {item.label}
      </AdminLink>
    );
  };

  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {topLevelItems.map((item) => (
        <div key={item.id}>
          {renderLink(item)}
          {item.id === "security" && securityActive && item.children ? (
            <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-3">
              {item.children.map((c) => renderLink(c, { child: true }))}
            </div>
          ) : null}
        </div>
      ))}
    </nav>
  );
}
```

```tsx
// SettingsShell.tsx — KEEP the AdminShell host + SettingsDirtyNavigationProvider +
// the aside/section/preview skeleton verbatim. Only adjust container tokens to the
// soft look (warm canvas bg, rounded sidebar surface) — same structure, no logic.
<AdminShell contentClassName="p-0 overflow-hidden" {...props}>
  <SettingsDirtyNavigationProvider>
    <div className="flex h-full min-h-0 min-h-[calc(100vh-4rem)] overflow-hidden">
      <aside className={cn("hidden w-64 shrink-0 overflow-y-auto border-r bg-card lg:block", sidebarClassName)}>
        {sidebar}
      </aside>
      <section className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-muted/30">
        <div className="border-b bg-card lg:hidden">{sidebar}</div>
        {children}
      </section>
      {preview ? <aside className={cn("hidden w-[420px] shrink-0 overflow-y-auto border-l bg-card xl:block", previewClassName)}>{preview}</aside> : null}
    </div>
  </SettingsDirtyNavigationProvider>
</AdminShell>
```

**Data flow:** `SettingsShell` is structural (no data). `SettingsSidebar` reads
`useSettingsDirtyNavigation()` for the guard and renders `AdminLink`s resolved by
the admin router through `adminPaths` — no fetch, no state, no effect.

**Error handling:** none added. The dirty guard's `requestNavigation` return value
still gates `event.preventDefault()`; do not swallow it. Cmd/ctrl/middle-click and
already-prevented events still bypass the guard via
`shouldGuardSettingsNavigation` (keep that helper).

**Decision to honor:** `settingsSidebarItems` is consumed by tests and callers as
a flat id→href list. Keep it exported and stable. Add the Security `children`
grouping as render-time structure derived from the same items (or an additive
optional field), NOT by removing the existing `sessions` / `login-alerts` /
`ip-allowlist` flat entries' hrefs. The prototype's `<Button>Save changes</Button>`
save bar in `SettingsLayout` is NOT ported into the shell — the real pages own
their own sticky save bar with live `isDirty`/saving state (L02+).

**Regression-test shape (see L07):** snapshot `renderAdminUi(<SettingsSidebar
activeId="security" />)` (SSR HTML string) and assert the Security children (IP
allowlist / Sessions / Login alerts) appear when a security id is active and are
absent for non-security ids; assert each item's resolved `/admin/settings/...`
href is present in the markup (AdminLink-rendered — do NOT try to assert "no raw
anchor", which is unsatisfiable since `AdminLink` itself renders an `<a>`); for the
dirty-guard, mount under happy-dom (`createRoot` + `React.act`) with
`requestNavigation` mocked → `false` and assert the click's `preventDefault` fires.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/settings-sidebar.test.tsx tests/vitest/ui/settings-shell.test.tsx tests/vitest/ui-integration/settings.test.tsx`

Update the literal class/markup assertions in `settings-sidebar.test.tsx` /
`settings-shell.test.tsx` where the nav chrome + Security grouping intentionally
change; keep the routing + dirty-guard behavioral assertions. State in the summary
if any suite was skipped.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure, linking `TASK-479` + `TASK-479-28-L01`.
- No contract doc change (routing + dirty-state preserved). If a UX doc enumerates
  the settings sub-nav, note the Security-children grouping.
