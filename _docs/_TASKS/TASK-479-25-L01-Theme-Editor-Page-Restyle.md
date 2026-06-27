# TASK-479-25-L01: Theme Editor Page Restyle
# FileName: TASK-479-25-L01-Theme-Editor-Page-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Admin UI Theme
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-25

---

## Overview

Port the prototype Admin UI Theme layout onto the real screen: a `Palette`
`PageHeader`, a **preset row** of swatch cards (active card ringed + badged), a
two-column body with a **live mini-admin preview** (`SectionCard`) on the left
and the existing controls/sections stacked on the right. Preserve template +
profile persistence, cache hydration, and the drawer flow exactly. Do NOT
re-implement per-token color pickers — those land in `ThemeTemplateDrawer` via
TASK-479-05-L05, and the dark-mode toggle in TASK-479-05-L06.

- **Goal:** `core/admin/ui/themes/ThemesPage.tsx` (plus `ThemeTemplateCard`,
  `ThemeProfileCard`, `ThemePreviewPanel`) visually match
  `_docs/_PROTOTYPE/src/pages/themes/ThemesPage.tsx` while keeping the real
  template/profile CRUD, cache hydration + background revalidation, RBAC, and
  canonical `activeHref`/breadcrumbs wiring.
- **Owning module/service:**
  `core/admin/ui/themes/ThemesPage.tsx`,
  `core/admin/ui/themes/ThemeTemplateCard.tsx`,
  `core/admin/ui/themes/ThemeProfileCard.tsx`,
  `core/admin/ui/themes/ThemePreviewPanel.tsx`.
- **Source-of-truth docs:**
  - Prototype page: `_docs/_PROTOTYPE/src/pages/themes/ThemesPage.tsx`
  - Prototype patterns: `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,SectionCard,SettingsSection}.tsx`, `_docs/_PROTOTYPE/src/components/ui/{card,badge,button}.tsx`
  - Shared shell/patterns: delivered by TASK-479-06 (consume `AdminShell`,
    `PageHeader`, `SectionCard`, restyled `Card`/`Badge`/`Button`; do not redefine)
  - Persistence + tokens: `core/services/adminThemeClient.ts`,
    `core/services/adminThemes/tokenTypes.ts` (`DEFAULT_ADMIN_THEME_TOKENS`),
    `core/services/adminThemes/tokenUtils.ts` (`mergeAdminThemeTokens`,
    `toAdminThemeCssVariableMap`)
  - Tokens: `_docs/_PROTOTYPE/src/styles/theme.css`, `_docs/DESIGN_TOKENS.md`
- **Out of scope:** No `adminThemeClient` / token-contract / route changes; no new
  endpoints; per-token pickers (TASK-479-05-L05) and dark-mode toggle
  (TASK-479-05-L06) are NOT built here; do not replace template/profile CRUD with
  the prototype's single "Save theme" mock or fabricate inline accent/radius/font/
  density state; `ThemeTemplateDrawer`/`ThemeProfileDrawer`/`ThemeExportDialog`
  internals stay as-is.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Concretely:

- Keep the `adminThemeClient` API exactly as today —
  `getCachedAdminThemeTemplates`/`getCachedAdminThemeProfiles` hydration,
  `listAdminThemeTemplatesCached`/`listAdminThemeProfilesCached({force})`,
  `create/updateAdminThemeTemplate`, `create/updateAdminThemeProfile`,
  `activateAdminThemeProfile`. No new client calls.
- Preserve the cache contract: the mount effect's single
  `Promise.all([... {force:true}])` hydrate, the `refresh({force,background})`
  callback, the `subscribeCacheEvents` filter on
  `cacheKeys.adminThemeTemplatesList` / `adminThemeProfilesList`, and the
  `theme:updated` `dispatchEvent`. Do NOT add a mount-force refetch loop beyond
  the one that already exists, and do not overwrite in-flight/dirty drawer state.
- `<AdminShell activeHref="/admin/themes" breadcrumbs={["Visual","Admin UI Theme"]}>`
  must keep routing through the canonical sidebar href (`sidebarConfig.ts`
  `/admin/themes`); if any preset/preview adds a navigable link, route it through
  `adminPaths`/`AdminLink`/`prefetchAdminRoute` — never a hand-built string. The
  prototype's `<Button>Save theme</Button>` is a mock; keep the REAL actions
  (Export JSON + New Template).
- Obey ESLint 9 react-hooks rules: keep `templateCards`/`filteredTemplateCards`/
  `profileCards` as `useMemo` render-time derivations; no sync `setState` in
  effects.

---

## Implementation Pseudocode

### Prototype element → real target mapping (decide each, no fabricated state)

| Prototype element | Real target | Decision |
|-------------------|-------------|----------|
| `PageHeader` (icon `Palette`, "Admin UI theme", "Customize the look of your admin", `Save theme` action) | `ThemesPage` `PageHeader` | Restyle to prototype look + add `Palette` icon; KEEP real actions (`Export JSON`, `New Template`) — do NOT swap to single "Save theme" mock |
| Preset row (5 swatch cards, active = `ring-2 ring-ring` + "Active" badge, hover lift) | `ThemeTemplateCard` / `ThemeProfileCard` grids | Port preset-card visual onto the real cards (swatch row from `template.palette`, soft `rounded-2xl` card, hover `-translate-y-0.5`, active ring/badge on profiles) |
| Live preview mini-admin (sidebar + topbar + stat cards + button, painted by theme vars) | `ThemePreviewPanel` (restyle from static typography demo → mini-admin) | Port the mini-admin markup; paint it LIVE from the **active profile's** tokens via `toAdminThemeCssVariableMap` |
| Controls column — Accent / Theme options / Appearance (`Select`/`Switch`) | `ThemeTemplateDrawer` per-token pickers (TASK-479-05-L05) + dark toggle (TASK-479-05-L06) | Out of scope here; the right column keeps the real search/filter + Profiles section wrapped in `SectionCard`. Do NOT inline-fabricate accent/radius/font/density widgets |
| Active swatch / "Active" badge | `profile.isActive` | Drive ring/badge from real `isActive`, not a prototype constant |

### `ThemesPage.tsx` — restyle the composition, keep the data wiring verbatim

```tsx
// core/admin/ui/themes/ThemesPage.tsx
// UNCHANGED: all state (templateDrawerOpen/profileDrawerOpen/exportOpen/
// editing*, templates/profiles/isLoading/isSaving/error/templateQuery,
// hasHydratedRef), `refresh` useCallback, the mount hydrate effect, the
// cacheBus subscribe effect, dispatchThemeUpdated, and the
// templateCards/filteredTemplateCards/profileCards/activeProfile useMemos +
// the open*/save handlers + the three drawers/dialog. ONLY the returned JSX
// chrome changes. No new fetches, no new client imports.

return (
  <AdminShell activeHref="/admin/themes" breadcrumbs={["Visual", "Admin UI Theme"]}>
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <PageHeader
        icon={<Palette />}                       // prototype chrome; KEEP real actions
        title="Admin UI Theme"
        description="Create theme templates and activate profiles for the admin panel."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
              <Download className="h-4 w-4" /> Export JSON
            </Button>
            <Button size="sm" className="gap-2" onClick={openCreateTemplate}>
              <Plus className="h-4 w-4" /> New Template
            </Button>
          </div>
        }
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {/* Two-column body: live preview (left) + sections (right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <SectionCard
          icon={<Palette />}
          title="Live preview"
          description="A snapshot of how your admin will look."
        >
          {/* paints from the ACTIVE profile's resolved tokens (see below) */}
          <ThemePreviewPanel tokens={activePreviewTokens} />
        </SectionCard>

        {/* Right column keeps the REAL controls: search/filter + Profiles */}
        <div className="flex flex-col gap-6">
          <SectionCard title="Templates" description="Reusable token sets.">
            <ThemeSearchRow value={templateQuery} onChange={setTemplateQuery}
              count={templateCards.length} filtered={filteredTemplateCards.length} />
          </SectionCard>
          {activeProfile ? (
            <p className="text-xs text-muted-foreground">
              Active profile: <span className="font-medium">{activeProfile.name}</span>
            </p>
          ) : null}
        </div>
      </div>

      {/* Preset row = template cards (swatch cards, hover lift) */}
      <section className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {filteredTemplateCards.map((t) => (
            <ThemeTemplateCard key={t.id} template={t} onEdit={() => openEditTemplate(rawTemplateById(t.id))} />
          ))}
          {!isLoading && filteredTemplateCards.length === 0 ? (
            <EmptyState>{templateQuery.trim()
              ? "No templates match your search."
              : "No theme templates yet. Create your first template to unlock profiles."}</EmptyState>
          ) : null}
        </div>
      </section>

      {/* Profiles section — preset cards w/ active ring + Activate (unchanged logic) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Profiles</h2>
            <p className="text-sm text-muted-foreground">Profiles activate a template for the admin UI.</p>
          </div>
          <Button size="sm" className="gap-2" onClick={openCreateProfile} disabled={templates.length === 0}>
            <Plus className="h-4 w-4" /> New Profile
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {profileCards.map((p) => (
            <ThemeProfileCard key={p.id} profile={p}
              onEdit={() => openEditProfile(p)}
              onActivate={() => { /* EXISTING activate→refresh→dispatch chain verbatim */ }} />
          ))}
          {!isLoading && profileCards.length === 0 ? (
            <EmptyState>Create a profile to activate a template for your admin UI.</EmptyState>
          ) : null}
        </div>
      </section>
    </div>

    {/* drawers + export dialog unchanged */}
    <ThemeTemplateDrawer ... />
    <ThemeProfileDrawer ... />
    <ThemeExportDialog open={exportOpen} onOpenChange={setExportOpen} />
  </AdminShell>
);
```

### Live-preview token derivation (render-time `useMemo`, no fetch)

```tsx
// Resolve the active profile's template tokens into a CSS-var style for the
// mini-admin preview. Reuses the SAME helpers already imported by the page.
const activePreviewTokens = useMemo(() => {
  const activeTemplate =
    templates.find((t) => t.id === activeProfile?.templateId) ?? null;
  return mergeAdminThemeTokens(DEFAULT_ADMIN_THEME_TOKENS, activeTemplate?.tokens ?? null);
}, [templates, activeProfile]);
// ThemePreviewPanel applies style={toAdminThemeCssVariableMap(tokens)} on its root.
```

### `ThemePreviewPanel.tsx` — restyle into the live mini-admin

```tsx
// core/admin/ui/themes/ThemePreviewPanel.tsx
// Replace the static typography/buttons demo with the prototype mini-admin
// (sidebar + topbar + stat cards + button), painted by the passed tokens.
export function ThemePreviewPanel({ tokens }: { tokens: AdminThemeTokens }) {
  const style = toAdminThemeCssVariableMap(tokens); // existing helper
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background" style={style}>
      <div className="flex">
        <div className="flex w-28 flex-col gap-2 border-r border-border bg-muted/40 p-3">{/* mini sidebar */}</div>
        <div className="flex-1 p-3">
          <div className="mb-3 flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">{/* topbar */}</div>
          <div className="grid grid-cols-2 gap-3">{/* 2 mini stat cards w/ shadow-soft */}</div>
          <div className="mt-3 flex justify-end">{/* primary button bar */}</div>
        </div>
      </div>
    </div>
  );
}
// NOTE: ThemePreviewPanel currently takes no props; adding `tokens` is additive.
// If a caller still renders it prop-less, default `tokens = DEFAULT_ADMIN_THEME_TOKENS`.
```

### `ThemeTemplateCard.tsx` / `ThemeProfileCard.tsx` — preset-card visual

```tsx
// Restyle ONLY: rounded-2xl soft Card, swatch row from `*.palette`, hover lift
// (`hover:-translate-y-0.5 hover:shadow-card`), profile active = `ring-2 ring-ring`
// + "Active" Badge (variant="success" w/ Check). Keep the prop contracts
// (template/profile, onEdit, onActivate) and the existing `*.palette`/isActive
// data exactly — swatches are the only allowed inline-style colors.
```

**Data flow:** mount effect hydrates `templates`/`profiles` (unchanged) →
`templateCards`/`filteredTemplateCards`/`profileCards`/`activeProfile` useMemos
derive card view-models from real data → `activePreviewTokens` useMemo resolves
the active profile's template tokens → `ThemePreviewPanel` paints the mini-admin
via `toAdminThemeCssVariableMap`. Edits/saves/activations go through the existing
drawer + `adminThemeClient` handlers + `refresh({force,background})` +
`dispatchThemeUpdated`. No new fetches.

**Error handling:** preserve the existing `error` string + `text-destructive`
banner and the empty-state copy (template/profile empty strings — keep verbatim so
existing tests pass). Guard `activeProfile?.templateId` with the `?? null`
fallback so the preview render never throws when no profile is active
(`mergeAdminThemeTokens(DEFAULT_ADMIN_THEME_TOKENS, null)` yields defaults).

**Regression-test shape (delivered in L02):**

- Render `ThemesPage`; assert restyled chrome (PageHeader title, "Live preview",
  preset cards, Profiles heading) renders without throwing and the real CRUD
  flows (search, drawers, save, activate, cache-bus refresh) still pass.
- Assert the live preview reflects the active profile (a `--admin-*` CSS var from
  the active template's tokens appears on the preview root).
- Assert empty-state copy and the active-profile line are unchanged.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/themes.test.tsx tests/vitest/ui/theme-leaf-components.test.tsx`
- Keep `tests/vitest/admin/adminThemeClient.test.ts` green (persistence contract
  untouched).
- State clearly in the summary if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure linking `TASK-479` +
  `TASK-479-25-L01`.
- If the Admin UI Theme screen's documented look/preview behavior changes in a
  design doc under `_docs/UI/admin_panel/` or `_docs/DESIGN_TOKENS.md`, record the
  new live-preview behavior there.
