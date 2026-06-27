# TASK-479-05-L05: Admin UI Theme Editor Controls for New Tokens
# FileName: TASK-479-05-L05-Admin-UI-Theme-Editor-Controls.md

**Parent Subtask:** TASK-479-05
**Priority:** Medium
**Category:** Admin UI / Design System / Theming
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05-L02, TASK-479-05-L03
**Status:** ⏳ To Do

---

## Overview

Surface the NEW tokens in the Admin UI Theme editor so operators can pick
`primarySoft`, `state.info` + soft states, the new sidebar accents, and the
effect shadows, with the live preview reflecting them and JSON import/export
staying in sync.

- **Goal:** Add pickers + preview for every NEW field added in L02, in the real
  per-token editor.
- **Owning module/service:** `core/admin/ui/themes/ThemeTemplateDrawer.tsx`
  (the REAL per-token color editor: tabs Base/Typography/Buttons/Inputs/
  Navigation/Cards/States, `ColorField`, `updateToken`, `invertSection`,
  `previewStyle` via `toAdminThemeCssVariableMap`, `onSave({name,description,
  tokens})`). Also `core/admin/ui/themes/ThemePreviewPanel.tsx` and
  `core/admin/ui/themes/ThemeTokensEditor.tsx` per the parent's file list.
- **Source-of-truth docs:** L01 mapping table, `_docs/DESIGN_TOKENS.md`.
- **Out of scope:** contract (L02), CSS (L03), dark toggle (L06).

> Note (verified): `ThemeTokensEditor.tsx` is the **site** `DesignTokens` JSON
> editor and `ThemePreviewPanel.tsx` is a static preview surface — NEITHER edits
> `AdminThemeTokens`. The authoritative Admin-UI-Theme per-token pickers live in
> `ThemeTemplateDrawer.tsx`. Implement the new pickers THERE; touch the other two
> only if they render admin-theme samples that should show the new tokens.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Saves go through the existing
`onSave → createAdminThemeTemplate/updateAdminThemeTemplate` path, which already
runs `assertAdminThemeTokens` (extended in L02) — keep that validation; do not
add a bypass.

---

## Implementation Pseudocode

### 1) New pickers — `ThemeTemplateDrawer.tsx`

Reuse the existing `ColorField` + `updateToken(path, value)` plumbing. Add a new
tab (e.g. **"Accents"**) and extend the **Navigation** and **States** tabs:

```tsx
// TabsList: add a trigger
<TabsTrigger value="accents">Accents</TabsTrigger>

// --- Accents tab (NEW) ---
<TabsContent value="accents">
  <PreviewPanel title="Soft primary & shadows" style={previewStyle}>
    <SoftAccentPreview />
  </PreviewPanel>
  <ColorField label="Primary soft (bg)" value={tokens.primarySoft.bg}
    onChange={(v) => updateToken(["primarySoft", "bg"], v)} />
  <ColorField label="Primary soft (text)" value={tokens.primarySoft.text}
    onChange={(v) => updateToken(["primarySoft", "text"], v)} />
  {/* shadows are CSS strings, not colors → use TextField, not ColorField */}
  <TextField label="Shadow · soft" value={tokens.effects.shadowSoft}
    onChange={(v) => updateToken(["effects", "shadowSoft"], v)} />
  <TextField label="Shadow · card" value={tokens.effects.shadowCard}
    onChange={(v) => updateToken(["effects", "shadowCard"], v)} />
  <TextField label="Shadow · pop" value={tokens.effects.shadowPop}
    onChange={(v) => updateToken(["effects", "shadowPop"], v)} />
</TabsContent>

// --- States tab: append info + soft variants ---
<ColorField label="Info" value={tokens.state.info}
  onChange={(v) => updateToken(["state", "info"], v)} />
<ColorField label="Info text" value={tokens.state.infoForeground}
  onChange={(v) => updateToken(["state", "infoForeground"], v)} />
<ColorField label="Success soft" value={tokens.state.successSoft}
  onChange={(v) => updateToken(["state", "successSoft"], v)} />
<ColorField label="Warning soft" value={tokens.state.warningSoft}
  onChange={(v) => updateToken(["state", "warningSoft"], v)} />
<ColorField label="Info soft" value={tokens.state.infoSoft}
  onChange={(v) => updateToken(["state", "infoSoft"], v)} />

// --- Navigation tab: append the new sidebar accents ---
<ColorField label="Sidebar muted" value={tokens.sidebar.muted}
  onChange={(v) => updateToken(["sidebar", "muted"], v)} />
<ColorField label="Sidebar accent" value={tokens.sidebar.accent}
  onChange={(v) => updateToken(["sidebar", "accent"], v)} />
<ColorField label="Sidebar accent text" value={tokens.sidebar.accentForeground}
  onChange={(v) => updateToken(["sidebar", "accentForeground"], v)} />
<ColorField label="Sidebar border" value={tokens.sidebar.border}
  onChange={(v) => updateToken(["sidebar", "border"], v)} />
```

### 2) Live preview reflects new tokens

`previewStyle` already spreads `toAdminThemeCssVariableMap(tokens)` — L02 made
that emit the new `--admin-*` vars, so the preview surfaces inherit them with NO
extra wiring. Add preview samples that READ the new vars so the change is
visible:

```tsx
function SoftAccentPreview() {
  return (
    <div className="space-y-3">
      <span className="inline-flex rounded-full px-3 py-1 text-xs"
        style={{ background: "var(--admin-primary-soft)",
                 color: "var(--admin-primary-soft-text)" }}>Soft badge</span>
      <div className="rounded-xl border p-4"
        style={{ boxShadow: "var(--admin-shadow-card)" }}>Card shadow</div>
    </div>
  );
}
// extend StatesPreview with Info + soft chips:
<StateSample label="Info" color="var(--admin-state-info)" />
<div style={{ background: "var(--admin-state-info-soft)" }} /> // soft swatch row
```

### 3) `invertSection` (dark-preview helper) — include new paths

The drawer's `invertSection`/section invert helpers list explicit paths; add the
new fields so the "invert" affordance covers them (optional but keeps parity):

```ts
invertSection([
  ["primarySoft", "bg"], ["primarySoft", "text"],
  ["state", "info"], ["state", "infoForeground"],
  ["state", "successSoft"], ["state", "warningSoft"], ["state", "infoSoft"],
  ["sidebar", "muted"], ["sidebar", "accent"],
  ["sidebar", "accentForeground"], ["sidebar", "border"],
]);
// effects shadows are strings → exclude from invert.
```

### 4) JSON import/export stays in sync

If the editor (or an adjacent screen) imports a tokens JSON, it must validate
with the L02-extended `assertAdminThemeTokens` and back-fill missing NEW groups
via `mergeAdminThemeTokens(DEFAULT_ADMIN_THEME_TOKENS, imported)` BEFORE setting
state, so importing an OLD export (without new groups) doesn't crash:

```ts
function importTokens(raw: unknown): AdminThemeTokens {
  const filled = mergeAdminThemeTokens(DEFAULT_ADMIN_THEME_TOKENS,
                                       raw as Partial<AdminThemeTokens>);
  assertAdminThemeTokens(filled);   // strict, complete shape
  return filled;
}
// export = JSON.stringify(tokens) — automatically includes new groups.
```

**Data flow:** picker `onChange` → `updateToken(path,value)` (structuredClone +
set) → `tokens` state → `previewStyle = {…toAdminThemeCssVariableMap(tokens)}`
→ preview re-paints → `onSave({name,description,tokens})` →
`assertAdminThemeTokens` → persist.

**Error handling:** `ColorField` already `normalizeHex`-guards color leaves;
shadow `TextField`s accept arbitrary CSS strings (still string-typed → passes
validation). Save errors surface through the existing `onSave` rejection path.
Obey ESLint 9 react-hooks rules: no sync `setState` in effects — `updateToken`
is an event handler; `previewStyle` stays a `useMemo` over `tokens`.

**Regression-test shape (L07 + here):**

- Rendering the drawer shows the new pickers; changing the "Primary soft (bg)"
  picker updates `tokens.primarySoft.bg` and the preview style var.
- `onSave` payload contains the new groups and passes `assertAdminThemeTokens`.
- `importTokens(oldExportWithoutNewGroups)` returns a complete object (no throw).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin`
  (extend the existing admin-theme editor coverage; add a
  `tests/vitest/admin/theme-template-drawer-new-tokens.test.tsx` suite).
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui` if the
  existing `theme-tokens-editor.test.tsx` asserts the drawer.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + statistics on status change.
- `_docs/DESIGN_TOKENS.md` editor note (pickers cover the new groups) — owned by
  L07; cross-link here.
- Changelog entry on closure linking **TASK-479** + this leaf.
