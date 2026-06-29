# TASK-479-24-L02: Plugin Details Restyle
# FileName: TASK-479-24-L02-Plugin-Details-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Store
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ✅ Done (2026-06-29)
**Parent Subtask:** TASK-479-24
**Started:** 2026-06-28
**Completed:** 2026-06-29

---

## Overview

Restyle the real Plugin Details screen to match the prototype: a soft **hero header**
(icon tile + name + status badge + version + author + auto-update/Uninstall controls),
a `line`-variant **underline-style tab** row, and a two-column body with a
`SectionCard` content stack
and a `SectionCard` **info + permissions + support sidebar**. The install/auto-update/
uninstall controls, the tabs data (Overview/Permissions/Changelog/Settings), and the
`store:browse` RBAC + `/admin/store` breadcrumb are preserved exactly.

- **Goal:** `core/admin/ui/store/PluginDetailsPage.tsx` and
  `core/admin/ui/store/PluginDetailsTabs.tsx` look like
  `_docs/_PROTOTYPE/src/pages/store/PluginDetailsPage.tsx` while keeping the install
  flow (auto-update `Switch`, Uninstall button) and the existing `PluginDetailsData`
  seed/tabs behavior intact.
- **Owning module/service:** `core/admin/ui/store/PluginDetailsPage.tsx`,
  `core/admin/ui/store/PluginDetailsTabs.tsx`. Consumes shell + the shared
  `SectionCard` pattern delivered by TASK-479-06-L02
  (`@/ui/layouts/AdminShell`, plus the shared pattern library); falls back to porting
  the prototype `SectionCard` into the shared pattern dir if 06-L02 has not yet landed
  it (coordinate, do not duplicate).
- **Source-of-truth docs:** prototype screen
  `_docs/_PROTOTYPE/src/pages/store/PluginDetailsPage.tsx`; prototype patterns
  `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,SectionCard}.tsx`; prototype
  ui `_docs/_PROTOTYPE/src/components/ui/{card,badge,button,tabs}.tsx`; tokens
  `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`;
  `_docs/STORE_SPEC.md` (permissions/changelog/version taxonomy).
- **Out of scope:** No change to the install/update/uninstall semantics, the auto-
  update policy meaning, the permission-scope copy, the changelog release types, RBAC,
  or the `/admin/store` route/breadcrumb. The store **gallery** is restyled in L01.
  No new tabs and no new data — Settings/Permissions/Changelog content stays the same.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Restyle only. Keep the `AdminShell activeHref="/admin/store" breadcrumbs={["Store",
"Plugins", "SEO Optimizer"]}` wrapper, the `pluginDetails` seed, and the controls'
existing wiring. Reskin the hero card and convert the `PluginDetailsTabs` panels to
the prototype `SectionCard` layout. The `TabsList` ALREADY uses the `line` variant
(see real `PluginDetailsTabs.tsx`) — that IS the prototype's underline-style tab;
there is NO `underline` variant in core (only `default`/`line`), so do not rename it.

```tsx
// PluginDetailsPage.tsx — RENDER ONLY changes inside the existing return().
// Keep AdminShell + breadcrumbs (route through the canonical breadcrumb prop — do
// NOT hand-build hrefs). Replace the bespoke hero with the prototype hero card.

<Card className="mb-6 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
  <div className="flex items-center gap-4">
    {/* icon tile — port prototype rounded-2xl primary-soft tile */}
    <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
      <BarChart3 className="size-8" />
    </span>
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <h1 className="font-display text-xl font-semibold">SEO Optimizer</h1>
        {/* token-driven StatusBadge instead of the local statusStyles hex map */}
        <Badge variant="success">Enabled</Badge>
      </div>
      <div className="text-sm text-muted-foreground">v2.4.1 by Digital Labs</div>
      {/* NO rating / install-count row. The real `PluginDetailsData` has NO rating or
          installs field and the real hero renders neither — do NOT fabricate "4.9" /
          "12k installs". Show only real values (version + author from the seed). */}
    </div>
  </div>
  {/* PRESERVE install flow: keep the auto-update Switch + Uninstall button and any
      handlers they already carry (the seed plugin is INSTALLED, so the hero shows
      Uninstall, not Install). Only add an external "Visit site" link if a REAL URL is
      available — the seed carries none, so do NOT hand-build or fabricate one; omit it
      otherwise. The destructive Uninstall keeps its destructive styling/intent. */}
  <div className="flex shrink-0 flex-wrap items-center gap-2">
    <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-2">
      <span className="text-sm font-medium text-muted-foreground">Auto-update</span>
      <Switch defaultChecked />                {/* UNCHANGED wiring */}
    </div>
    <Button variant="outline"
      className="border-destructive/30 text-destructive hover:bg-destructive/5">
      Uninstall
    </Button>
  </div>
</Card>

// Replace the local `statusStyles` hex map with the shared token-driven StatusBadge
// (enabled→success, disabled→muted) so the hero badge reads from the theme.
```

```tsx
// PluginDetailsTabs.tsx — KEEP TabsList on the existing `line` variant (the real
// component already uses it; there is NO `underline` variant in core — `line` IS the
// prototype's underline-style tab) and wrap each panel's content in the shared
// SectionCard (title + icon). Keep ALL data
// (data.description/features/screenshots/info/permissions/changelog/settings) and
// every control (Switch toggles, Save settings, support CTA) wired exactly as now.

<Tabs defaultValue="overview" className="w-full">
  <TabsList variant="line" className="border-b border-border pb-2">  {/* real core variant; renders the prototype underline */}
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="permissions">Permissions</TabsTrigger>
    <TabsTrigger value="changelog">Changelog</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>

  <TabsContent value="overview" className="mt-6">
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-6">
        <SectionCard title="Description" icon={<Info />}> ...data.description... </SectionCard>
        <SectionCard title="What's included" icon={<Check />}>
          {/* port prototype 2-col checklist driven by data.features */}
        </SectionCard>
        <SectionCard title="Screenshots" icon={<ImageIcon />}>
          {/* data.screenshots: keep <img src> with alt; soft rounded-xl tiles */}
        </SectionCard>
      </div>
      <div className="flex flex-col gap-6">
        <SectionCard title="Information">
          {/* data.info dl rows, divide-y; keep actionLabel "View website" as a real
              link — external -> <a rel="noopener noreferrer" target="_blank">,
              internal -> AdminLink/adminPaths (never hand-built href) */}
        </SectionCard>
        <SectionCard title="Permissions">
          {/* data.permissions list with per-scope icon tile + access badge.
              Replace permissionBadgeStyles hex map with token-driven access tones. */}
        </SectionCard>
        <SectionCard title="Support">
          {/* data.support CTA -> external link via isExternalHref handling */}
        </SectionCard>
      </div>
    </div>
  </TabsContent>

  {/* permissions / changelog / settings panels: keep their data + controls; only
      swap the Card chrome to SectionCard + the new tokens. Settings toggles keep
      defaultChecked + the "Save settings" button wiring. */}
</Tabs>
```

**Data flow:** `pluginDetails` seed → `PluginDetailsTabs` panels → controls
(`Switch`, Save, support/info links). Hero install controls remain on
`PluginDetailsPage`. The restyle only swaps chrome (Card→SectionCard, the `line`
tab variant is KEPT as-is, hex maps→token badges); no data edge or handler changes.

**Navigation/href constraint (preserve):** Breadcrumbs flow through the
`AdminShell breadcrumbs` prop — do NOT hand-build the breadcrumb hrefs. The
"View website" / "Documentation" / Support links are EXTERNAL store URLs per
`_docs/STORE_SPEC.md`; render them as real `<a>` with `rel="noopener noreferrer"`
(use the existing `isExternalHref` helper from `core/admin/utils/adminPaths.ts` to
decide), and route any INTERNAL admin link through `AdminLink`/`adminPaths`. Never
string-concat an admin URL.

**Error handling:** Keep the Settings "All checks passed" status block and the
compatibility note copy; only their surrounding card styling inherits new tokens.
Images keep their `alt` text and graceful no-`src` fallback. No new error surfaces.

**React-hooks/cache rules:** This screen is presentational over a static seed; do NOT
add a mount effect or force-refetch. If a real `storeClient`/cache hydrate replaces
the seed later, leave that wiring untouched (no dirty-state overwrite, no refetch
loop). No synchronous `setState` in effects — toggles stay
`defaultChecked`/locally-controlled exactly as today.

**Regression-test shape:** see L03 — render `PluginDetailsPage` via `renderAdminUi`
and assert: hero name + status badge + Uninstall + auto-update present; the `line`
(underline-style) tab TRIGGERS render Overview/Permissions/Changelog/Settings; the
active Overview SectionCard sections (Description, Information, Permissions) render
with their seed content (incl. a permission scope from the Overview Permissions
SectionCard) and the hero version `v2.4.1` is present. Do NOT assert the INACTIVE
Changelog/Settings tab bodies — `renderAdminUi` is a single SSR snapshot and Radix
`TabsContent` unmounts inactive panels.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/plugin-details-restyle.test.tsx`
  (new suite in L03)
- Re-run the pre-existing details suite to confirm no behavioral regression:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/plugin-details.test.tsx`
  (update only the minimal selector if a node genuinely moved; keep assertion intent).
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-24-L02`.
- If `SectionCard` is first introduced to the shared pattern library here (rather than
  by TASK-479-06-L02), note it in the shell/pattern notes so other detail screens
  reuse the same primitive instead of re-porting it.
