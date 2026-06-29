# TASK-479-25-L01: Theme Editor Page Restyle
# FileName: TASK-479-25-L01-Theme-Editor-Page-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Admin UI Theme
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ✅ Done (2026-06-29)
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
  `ThemeProfileCard`, and a NEW `ThemeLivePreview`) visually match
  `_docs/_PROTOTYPE/src/pages/themes/ThemesPage.tsx` while keeping the real
  template/profile CRUD, cache hydration + background revalidation, RBAC, and
  canonical `activeHref`/breadcrumbs wiring.
- **Owning module/service:**
  `core/admin/ui/themes/ThemesPage.tsx`,
  `core/admin/ui/themes/ThemeTemplateCard.tsx`,
  `core/admin/ui/themes/ThemeProfileCard.tsx`,
  a NEW `core/admin/ui/themes/ThemeLivePreview.tsx` (mini-admin; the existing
  `ThemePreviewPanel.tsx` is only rendered by the unrouted `ThemeEditorPage` and
  is NOT touched here).
- **Source-of-truth docs:**
  - Prototype page: `_docs/_PROTOTYPE/src/pages/themes/ThemesPage.tsx`
  - Prototype patterns: `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,SectionCard,SettingsSection}.tsx`, `_docs/_PROTOTYPE/src/components/ui/{card,badge,button}.tsx`
  - Shared shell/patterns: delivered by TASK-479-06 (consume `AdminShell`,
    `PageHeader`, `SectionCard`, restyled `Card`/`Badge`/`Button`; do not redefine)
  - Persistence + tokens: `core/admin/services/adminThemeClient.ts`,
    `core/services/adminThemes/tokenTypes.ts` (`DEFAULT_ADMIN_THEME_TOKENS`),
    `core/services/adminThemes/tokenUtils.ts` (`mergeAdminThemeTokens`),
    `core/ui/theme/tokenCss.ts` (`toAdminThemeCssVariableMap` — emits only
    `--admin-*`/`--font-*`/`--text-*`; imported relatively as
    `../../../ui/theme/tokenCss`, same as `ThemeTemplateDrawer.tsx`)
  - Tokens: `_docs/_PROTOTYPE/src/styles/theme.css`, `_docs/DESIGN_TOKENS.md`
- **Out of scope:** No `adminThemeClient` / token-contract / route changes; no new
  endpoints; per-token pickers (TASK-479-05-L05) and dark-mode toggle
  (TASK-479-05-L06) are NOT built here; do not replace template/profile CRUD with
  the prototype's single "Save theme" mock or fabricate inline accent/radius/font/
  density state; `ThemeTemplateDrawer`/`ThemeProfileDrawer`/`ThemeExportDialog`
  internals stay as-is; `ThemePreviewPanel.tsx` (unrouted `ThemeEditorPage` only)
  is NOT repurposed — the live preview is the NEW `ThemeLivePreview.tsx`.

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
| Live preview mini-admin (sidebar + topbar + stat cards + button, painted by theme vars) | NEW `ThemeLivePreview` (dedicated mini-admin; `ThemePreviewPanel` is unrouted, left alone) | Build the mini-admin from the drawer's working markup (`ThemeTemplateDrawer.tsx` lines 190-208), consuming `--admin-*` via arbitrary-value utilities (`bg-[var(--admin-sidebar-bg)]`, `text-[var(--admin-topbar-text)]`, `bg-[var(--admin-card-bg)]`, …) — NOT shadcn `bg-background`/`bg-card`/`border-border`; paint LIVE from the **active profile's** tokens via `toAdminThemeCssVariableMap` |
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

      {/* Preset row = template cards (swatch cards, hover lift) — FIRST, matching the
          prototype order (PageHeader → Presets → two-column body) */}
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

      {/* Two-column body: live preview (left) + sections (right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <SectionCard
          icon={<Palette />}
          title="Live preview"
          description="A snapshot of how your admin will look."
        >
          {/* paints from the ACTIVE profile's resolved tokens (see below) */}
          <ThemeLivePreview tokens={activePreviewTokens} />
        </SectionCard>

        {/* Right column keeps the REAL controls: search/filter + Profiles */}
        <div className="flex flex-col gap-6">
          <SectionCard title="Templates" description="Reusable token sets.">
            {/* EXISTING inline search markup (Input + Search icon + count line);
                ThemesPage has NO `ThemeSearchRow` component — keep it inline */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search templates..."
                value={templateQuery} onChange={(e) => setTemplateQuery(e.target.value)} />
            </div>
            {templateQuery.trim() ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {filteredTemplateCards.length} of {templateCards.length} templates
              </p>
            ) : null}
          </SectionCard>
          {activeProfile ? (
            <p className="text-xs text-muted-foreground">
              Active profile: <span className="font-medium">{activeProfile.name}</span>
            </p>
          ) : null}
        </div>
      </div>

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
// ThemeLivePreview applies style={toAdminThemeCssVariableMap(tokens)} on its root
// (import: `../../../ui/theme/tokenCss`, the same helper ThemeTemplateDrawer uses).
```

### `ThemeLivePreview.tsx` — NEW live mini-admin (leave `ThemePreviewPanel.tsx` alone)

```tsx
// core/admin/ui/themes/ThemeLivePreview.tsx  (NEW component)
// A dedicated live mini-admin for ThemesPage, modeled on the WORKING mini-admin in
// ThemeTemplateDrawer.tsx (lines 190-208). It consumes the --admin-* vars that
// toAdminThemeCssVariableMap actually emits via arbitrary-value utilities
// (bg-[var(--admin-...)]) — NOT shadcn bg-background/bg-card/border-border, which
// that map never sets. Do NOT reuse/restyle ThemePreviewPanel (unrouted-only).
import { toAdminThemeCssVariableMap } from "../../../ui/theme/tokenCss";
import { DEFAULT_ADMIN_THEME_TOKENS } from "../../../services/adminThemes/tokenTypes";
import type { AdminThemeTokens } from "../../../services/adminThemes/tokenTypes";

export function ThemeLivePreview({
  tokens = DEFAULT_ADMIN_THEME_TOKENS,
}: {
  tokens?: AdminThemeTokens;
}) {
  const style = toAdminThemeCssVariableMap(tokens); // Record<string,string> of --admin-*/--font-*/--text-*, applied as style={style} like the drawer
  return (
    <div
      style={style}
      className="overflow-hidden rounded-xl border border-[var(--admin-base-border)] bg-[var(--admin-base-bg)] text-[var(--admin-base-text)]"
    >
      <div className="flex">
        {/* mini sidebar */}
        <div className="w-28 shrink-0 space-y-3 bg-[var(--admin-sidebar-bg)] px-3 py-4 text-[var(--admin-sidebar-text)]">
          <div className="h-2 w-12 rounded-full bg-[var(--admin-sidebar-text)]/40" />
          <div className="rounded-md bg-[var(--admin-sidebar-active-bg)] px-2 py-1 text-[10px] font-medium text-[var(--admin-sidebar-active-text)]">
            Dashboard
          </div>
        </div>
        <div className="flex-1 p-3">
          {/* topbar */}
          <div className="mb-3 flex items-center justify-between rounded-md border border-[var(--admin-topbar-border)] bg-[var(--admin-topbar-bg)] px-3 py-2 text-[10px] text-[var(--admin-topbar-text)]">
            <span>Admin</span>
          </div>
          {/* 2 mini stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-[var(--admin-card-border)] bg-[var(--admin-card-bg)] p-3" />
            <div className="rounded-lg border border-[var(--admin-card-border)] bg-[var(--admin-card-bg)] p-3" />
          </div>
          {/* primary button bar */}
          <div className="mt-3 flex justify-end">
            <div className="rounded-md bg-[var(--admin-button-primary-bg)] px-3 py-1.5 text-[10px] text-[var(--admin-button-primary-text)]">
              Save
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// NOTE: the `tokens` default (DEFAULT_ADMIN_THEME_TOKENS) + the caller's `?? null`
// mergeAdminThemeTokens fallback means the preview never throws with no active profile.
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
the active profile's template tokens → `ThemeLivePreview` paints the mini-admin
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
