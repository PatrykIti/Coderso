# TASK-479-28-L02: General & Site Settings Restyle
# FileName: TASK-479-28-L02-General-And-Site-Settings-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Settings / Visual Refresh
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06, TASK-479-28-L01
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-28

---

## Overview

Restyle the **General** settings page (`core/admin/ui/settings/GeneralSettingsPage.tsx`)
and the **Site** settings page (`core/admin/ui/site/SiteSettingsPage.tsx`) to the
prototype's `GeneralSettingsPage` / `SiteSettingsPage`: `SettingsSection` groups
(two-column sticky title + controls) with `SettingsField` rows, the accent-swatch
branding row, and the toggle rows — over the real save/dirty-state + cache wiring.

- **Goal:** Give General + Site settings the prototype's grouped
  `SettingsSection` look (Workspace/Identity, Localization, Branding, Behavior,
  Homepage, Reading, Comments) while preserving the live values, the
  `BrandingCard`/`LogoUploadCard` real upload flow, the site-settings cache
  hydrate (`getCachedSiteSettings`/`getSiteSettingsCached`), the homepage/posts-page
  selects backed by the real content-types + pages caches, validation, the
  dirty-state guard, auto-save, and the sticky save bar.
- **Owning module/service:** `core/admin/ui/settings/GeneralSettingsPage.tsx`
  (+ `BrandingCard.tsx`, `LogoUploadCard.tsx`, `settingsValues.ts`) and
  `core/admin/ui/site/SiteSettingsPage.tsx`, backed by `siteSettingsClient`
  (`getCachedSiteSettings`, `getSiteSettingsCached`, `updateSiteSettings`),
  `contentTypesClient` (`getCachedContentTypes`, `listContentTypesCached`),
  `pagesClient` (`getCachedPages`, `listPagesCached`, `previewPage`),
  `cacheKeys`, and the shared dirty/auto-save hooks.
- **Source-of-truth docs:** `_docs/DESIGN_TOKENS.md`; prototype sources
  `_docs/_PROTOTYPE/src/pages/settings/GeneralSettingsPage.tsx` and
  `_docs/_PROTOTYPE/src/pages/settings/SiteSettingsPage.tsx`, with patterns
  `_docs/_PROTOTYPE/src/components/patterns/SettingsSection.tsx` and primitives
  `_docs/_PROTOTYPE/src/components/ui/{input,select,switch,textarea,button,separator}.tsx`.
- **Out of scope:** No change to the site-settings schema/validation, the
  content-types/pages cache keys, the logo-upload endpoint, or the auto-save
  engine. The prototype's hardcoded language/timezone/date lists are presentation
  defaults — bind every control to the REAL value the page already manages; do not
  drop a real field to match the prototype's smaller set, and do not add a control
  the page has no value for.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Target file A: `core/admin/ui/settings/GeneralSettingsPage.tsx`. Keep the ENTIRE
state/effect/handler block: the `formState` snapshot (`source`/`form`/`savedForm`),
`normalizeValues`, `form`/`savedForm` render-time derivation, `setForm`, `isDirty`
+ `useRegisterSettingsDirty(isDirty)`, `handleSave`, `useAutoSaveEffect`,
`useSettingsAutoSave`, the `onSave` prop contract, the busy/disableSave derivation,
and the Alert blocks. Only the body JSX (group the existing cards into
`SettingsSection`s) and the save bar chrome change.

Port from prototype `GeneralSettingsPage.tsx` (the `SettingsSection` groups +
accent swatch row).

```tsx
// GeneralSettingsPage.tsx — RENDER ONLY changes. Logic above `return` unchanged.
<SettingsShell activeHref="/admin/settings" sidebar={<SettingsSidebar activeId="general" />}
               breadcrumbs={["Settings", "General"]} showSearch={false}>
  <div className="mx-auto w-full max-w-4xl px-6 py-10 pb-28">
    {/* keep error / saveError / saveSuccess <Alert> blocks verbatim */}
    <div className="divide-y divide-border">
      <SettingsSection title="Workspace" description="How your site appears across the admin.">
        {/* BrandingCard contents re-expressed as SettingsField rows, still bound to
            form.siteName / form.siteLocale via setForm — keep BrandingCard as the
            owner of those inputs OR inline its fields; do NOT change what they write */}
        <BrandingCard siteName={form.siteName} siteLocale={form.siteLocale}
          onChange={(next) => setForm((p) => ({ ...p, siteName: next.siteName, siteLocale: next.siteLocale }))}
          disabled={busy} />
      </SettingsSection>
      <SettingsSection title="Logo" description="Shown in the admin and on your site.">
        <LogoUploadCard /> {/* keep real upload flow untouched; restyle chrome only */}
      </SettingsSection>
      {/* Branding/accent swatch row: ONLY if the page already owns an accent value
          (it ties into TASK-479-05 theming). If General does NOT persist an accent,
          DO NOT port the prototype's mock ACCENTS swatch here — leave accent to the
          theme editor (TASK-479-05-L05). Render it only when wired to a real value. */}
    </div>
  </div>
  {/* sticky save bar — keep the existing markup: autosave Checkbox + Save Button,
      bound to autoSaveEnabled / handleSave / disableSave; restyle to soft chrome */}
</SettingsShell>
```

Target file B: `core/admin/ui/site/SiteSettingsPage.tsx`. Keep the ENTIRE data
block: `getCachedSiteSettings`/`getSiteSettingsCached`/`updateSiteSettings`, the
content-types cache (`getCachedContentTypes`/`listContentTypesCached`) and pages
cache (`getCachedPages`/`listPagesCached`/`previewPage`) used to populate the
homepage / posts-page / default-category selects, `cacheKeys`, validation, the
snapshot/`isDirty` + `useRegisterSettingsDirty`, and the `ConfirmActionDialog`.
Only group the cards into `SettingsSection`s.

```tsx
// SiteSettingsPage.tsx — RENDER ONLY changes.
<div className="divide-y divide-border">
  <SettingsSection title="Identity" description="How your site is named and branded to visitors.">
    <SettingsField label="Site name" htmlFor="site-name">
      <Input id="site-name" value={form.siteName} onChange={…} /> {/* same binding */}
    </SettingsField>
    <SettingsField label="Site URL" htmlFor="site-url" hint="The public address where your site is served.">
      <Input id="site-url" type="url" value={form.siteUrl} onChange={…} />
    </SettingsField>
    {/* favicon row -> keep real upload control */}
  </SettingsSection>
  <SettingsSection title="Homepage" description="Choose what visitors see first.">
    {/* homepage / posts-page Select options come from the REAL pages cache
        (getCachedPages) — NOT the prototype's mock "Welcome/About/Landing".
        Keep the existing <Select> bound to form.homePageId etc. */}
  </SettingsSection>
  <SettingsSection title="Reading" description="How content is paginated and grouped.">
    {/* posts-per-page Input + default-category Select from real content types */}
  </SettingsSection>
  <SettingsSection title="Comments" description="Control how readers can respond.">
    {/* the real comment toggles as <Switch> rows bound to form.* */}
  </SettingsSection>
</div>
```

**Data flow:** General — `values` prop (route-provided, cache-hydrated upstream) →
`normalizeValues` → render-time `form`/`savedForm` → `setForm` edits → `isDirty` →
`handleSave(onSave)` → snapshot becomes `savedForm`. Site — cache hydrate
(`getCachedSiteSettings`) + background revalidate (`getSiteSettingsCached`),
homepage/posts selects hydrate from `getCachedPages`/`getCachedContentTypes`;
edits flow through the same snapshot/`isDirty` pattern → `updateSiteSettings`.
Both register dirty state and (General) drive auto-save — NO new effects, NO
mount-force refetch, NO dirty overwrite.

**Error handling:** unchanged — keep the `error` / `saveError` / `saveSuccess`
Alerts on General and the `isApiClientError` mapping + `ConfirmActionDialog` on
Site; keep site validation gating the save.

**Decision to honor:** The prototype's Localization (language/timezone/date/week)
and Branding accent swatch are MOCK lists. Port the *layout* (SettingsSection +
SettingsField), but bind only to values the real page persists. If General has no
language/timezone/accent value, do NOT add those controls — leave them out rather
than fabricate persistence. Likewise Site's homepage/category options come from
the real caches, not the prototype literals.

**Regression-test shape (see L07):** render `<GeneralSettingsPage values={seed}
onSave={spy} />`; assert SettingsSection group titles render, editing a field flips
`isDirty` and enables Save, Save calls `onSave` with the edited values, and the
dirty guard registers. Render `<SiteSettingsPage />` with mocked
`getCachedSiteSettings`/`getCachedPages`/`getCachedContentTypes`; assert the
homepage/posts selects are populated from the real caches (not mock literals).
(Interactive asserts — edit→Save, select population — use the happy-dom
`createRoot`/`React.act` mount idiom; static structure uses `renderAdminUi`.)

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/general-settings.test.tsx tests/vitest/ui/site-settings.test.tsx tests/vitest/ui/site-settings-validation.test.ts tests/vitest/ui-integration/settings.test.tsx`

Update literal class/markup assertions where the SettingsSection grouping
intentionally changes; keep all save/dirty-state/validation behavioral assertions.
State in the summary if any suite was skipped.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure, linking `TASK-479` + `TASK-479-28-L02`.
- No contract doc change (schema/cache/validation preserved). Note the
  SettingsSection grouping in any Settings UX doc that enumerates the fields.
