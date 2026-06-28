# TASK-479-05-L07: Token Docs & Tests
# FileName: TASK-479-05-L07-Docs-And-Token-Tests.md

**Parent Subtask:** TASK-479-05
**Priority:** Medium
**Category:** Admin UI / Design System / Theming / Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05-L02, TASK-479-05-L03, TASK-479-05-L04, TASK-479-05-L05, TASK-479-05-L06
**Status:** ✅ Done (2026-06-28; see "Closeout" below)

---

## Overview

Close the subtask: document the new Admin UI Theme groups + dark mode in
`_docs/DESIGN_TOKENS.md`, and add the consolidated Vitest coverage for the token
contract, normalize/validation, CSS-var emission, and the dark-class behavior.

- **Goal:** Source-of-truth docs reflect the extended contract + dark mode; an
  automated test suite guards the new tokens against drift.
- **Owning module/service:** `_docs/DESIGN_TOKENS.md`, `_docs/THEMES_SPEC.md`,
  test suites under `tests/unit/adminThemes/`, `tests/vitest/ui/` (theme editor
  drawer), `tests/vitest/ui-integration/` (dark toggle + injected dark block).
- **Source-of-truth docs:** L01 frozen mapping table + dark decision; L02–L06
  implementations.
- **Out of scope:** any new product behavior (this leaf only documents/tests
  what L02–L06 shipped).

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Docs + tests only.

---

## Implementation Pseudocode

### 1) `_docs/DESIGN_TOKENS.md` updates

Under **Admin UI Theme Tokens (granular)** replace/extend the token-group block
with the L02 shape and append a dark-mode section:

```md
### Admin UI Theme Tokens (granular)  — Soft & Friendly (violet)

base: { bg, surface, text, border }
buttons: { primary{…}, secondary{…}, outline{…}, ghost{…} }
primarySoft: { bg, text }                 # NEW (TASK-479-05)
inputs: { bg, border, text, placeholder, focusRing }
sidebar: { bg, text, activeBg, activeText, hoverBg,
           muted, accent, accentForeground, border }   # + NEW
topbar: { bg, text, border }
card: { bg, border }
typography: { sans, display, sm, md, lg, xl, 2xl, mutedText }  # Inter / Inter Tight
state: { success, warning, danger,
         info, infoForeground, successSoft, warningSoft, infoSoft }  # + NEW
effects: { shadowSoft, shadowCard, shadowPop }    # NEW

CSS-var owners: each field → `--admin-*` via toAdminThemeCssVariables/
toAdminThemeCssVariableMap (core/ui/theme/tokenCss.ts); globals.css maps
`--admin-*` → shadcn `--color-*`. (paste the L01 mapping table here)

### Admin UI dark mode (TASK-479-05)
- Light = the canonical AdminThemeTokens DB set (single-mode contract).
- Dark = a `:root.dark{--admin-*}` block emitted FROM the injected
  `<style id="coderso-theme-tokens">` (AdminApp), alongside the light
  `:root{--admin-*}`; values come from the shared default
  `DEFAULT_ADMIN_THEME_TOKENS_DARK` (L02/L04). The admin chrome reads `--admin-*`
  DIRECTLY, so flipping these recolors the WHOLE shell (button/sidebar/topbar/
  input/alert); the derived shadcn vars in globals.css `:root` follow
  automatically. It is NOT a static globals `.dark{--admin-*}` — that cannot win
  source order against the injected style and would never reach the chrome.
- Toggle: TopBar AdminColorModeToggle, persisted to
  `localStorage["coderso-admin-color-mode"]`, applied pre-paint in
  core/admin/index.html (no flash). (Distinct from the admin-theme TOKENS cache
  key `localStorage["coderso.adminThemeTokens"]`.)
- Rationale: zero migration for existing templates (their dark comes from the
  shared default palette emitted by the injected style); per-template dark
  (`dark?: Partial<AdminThemeTokens>`) is a deferred optional follow-up — purely
  additive since the injected style already owns the dark block.
```

Also update the line "Admin UI mapuje tokeny na zmienne shadcn (`--background`,
…)" to mention the new `--color-primary-soft` / `--color-info` / soft-state /
sidebar-accent / shadow vars, and add the seeded "Soft Violet" default note in
`_docs/THEMES_SPEC.md`.

### 2) Test matrix (consolidated; some suites started in L02–L06)

```text
tests/unit/adminThemes/tokenTypes.test.ts
  - DEFAULT_ADMIN_THEME_TOKENS contains every NEW key (primarySoft, effects,
    state.info/*Soft, sidebar.muted/accent/accentForeground/border) with the
    violet/warm values from L02.
  - mergeAdminThemeTokens(defaults, {}) === deep-equal complete object.
  - mergeAdminThemeTokens(defaults, LEGACY_WITHOUT_NEW_GROUPS) back-fills new
    groups from defaults (no undefined).

tests/unit/adminThemes/tokenValidation.test.ts   (extend existing)
  - assertAdminThemeTokens(DEFAULT_ADMIN_THEME_TOKENS) passes.
  - throws on unknown key in effects / sidebar / state.
  - throws on numeric leaf.
  - normalizeAdminThemeTokens(LEGACY_ROW) does NOT throw and fills new groups.

tests/unit/adminThemes/tokenCss.test.ts           (new)
  - toAdminThemeCssVariables(defaults) string includes every NEW --admin-* name
    (assert against the L01-frozen list — guards inventory↔emitter drift).
  - toAdminThemeCssVariableMap(defaults) has matching keys/values.

tests/vitest/ui-integration/admin-dark-mode.test.tsx   (new)
  - toAdminThemeCssVariables(DEFAULT_ADMIN_THEME_TOKENS_DARK, ":root.dark") emits a
    ":root.dark{…}" block whose REAL chrome colors are the dark hexes — assert
    --admin-button-primary-bg:#8b5cf6, --admin-sidebar-bg:#1c1b1f,
    --admin-topbar-bg:#18171a, --admin-base-bg:#18171a (button + sidebar + topbar
    recolor in dark — NOT merely that the `.dark` class is present).
  - globals.css `@theme`/`:root` contains --color-primary-soft, --color-info,
    --color-success-soft, --color-sidebar-accent, the --popover→--admin-card-bg
    re-map, and a .shadow-card utility; `:root` derives them from --admin-* (so
    the dark --admin-* flip propagates).
  - Parse the emitter output / globals.css as TEXT; do NOT rely on jsdom
    getComputedStyle to resolve var() cascade (happy-dom/jsdom does not).

tests/vitest/ui/theme-template-drawer-new-tokens.test.tsx   (from L05)
  - new pickers render (activate the "Accents" tab first — Radix unmounts inactive
    panels); updating primarySoft.bg updates state + preview var; onSave payload
    passes assertAdminThemeTokens.

tests/vitest/ui-integration/admin-color-mode-toggle.test.tsx    (from L06)
  - lazy init, class toggle, localStorage persistence.
```

**Data flow:** tests import the real modules
(`core/services/adminThemes/*`, `core/ui/theme/tokenCss.ts`) — no DB. The
globals.css assertions read the file as text (raw import or `fs`) since Vitest
does not run the Tailwind compiler.

**Error handling:** keep tests deterministic (no network/DB); seed
`localStorage`/`document` per case and clean up in `afterEach`.

**Regression-test shape:** the L01 frozen NEW-token list is encoded as a const in
`tokenCss.test.ts` so any future field added/removed without updating the
inventory fails the build.

### 3) Closeout

- Flip L01–L07 + the subtask to `✅ Done` only when all suites are green.
- Add the changelog entry and sync the board statistics.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/unit/adminThemes`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration`
- Record pass counts in the closeout; note any skipped suite.

---

## Documentation Updates Required

- `_docs/DESIGN_TOKENS.md` — new groups + dark-mode section + mapping table
  (this leaf is the owner of that edit).
- `_docs/THEMES_SPEC.md` — seeded "Soft Violet" default + jsonb-no-migration note.
- `_docs/_TASKS/README.md` — move TASK-479-05 (and leaves) to Done; update
  statistics.
- `_docs/_CHANGELOG/` — add a closure entry linking **TASK-479** + TASK-479-05
  (and enumerate L01–L07) on subtask completion.

---

## Closeout (2026-06-28)

**Docs**

- `_docs/DESIGN_TOKENS.md` — replaced the "Admin UI Theme Tokens (granular)"
  block with the full TASK-479-05 group shape, pasted the L01 frozen prototype →
  `--admin-*` → shadcn mapping table, added the "Admin UI dark mode" section, and
  extended the shadcn-var mapping line with the new `--color-*`/`--shadow-*`
  names. (L07 owns this edit.)
- `_docs/THEMES_SPEC.md` — seeded "Soft Violet" default + jsonb-no-migration note
  were already added by L04; left intact (no duplication).

**Tests (all green)**

- `tests/vitest/ui-integration/admin-dark-mode.test.tsx` (NEW, 5 tests) — the
  injected `:root.dark` block carries the real dark chrome hexes
  (`--admin-button-primary-bg:#8b5cf6`, `--admin-sidebar-bg:#1c1b1f`,
  `--admin-topbar-bg:#18171a`, `--admin-base-bg:#18171a`); globals.css `@theme`
  exposes the new `--color-*`, `:root` derives them FROM `--admin-*`, the
  `--popover`→`--admin-card-bg` re-map and the `shadow-card` wiring are present,
  and the pre-paint `:root.dark` fallback mirrors `DEFAULT_ADMIN_THEME_TOKENS_DARK`.
  globals.css is parsed as TEXT (no jsdom `var()` resolution).
- `tests/unit/adminThemes/tokenValidation.test.ts` — extended with an
  unknown-key-in-`sidebar`/`state` rejection case (now 10 tests in the file).
- Existing suites consumed as the consolidated matrix:
  `tests/unit/adminThemes/{tokenTypes,tokenCss,tokenValidation}.test.ts` (bun),
  `tests/vitest/ui/theme-template-drawer-new-tokens.test.tsx` (L05),
  `tests/vitest/ui-integration/admin-color-mode-toggle.test.tsx` (L06).

**Drift fix (closure)** — L02's contract extension (`primarySoft`/`effects`) had
left several pre-existing admin-theme test fixtures missing the new groups, so
the repo-level `tsc -p tsconfig.json` gate was red. Reconciled with type-only
assertions that preserve the intentional partial-legacy runtime shapes
(`tests/vitest/ui/{theme-editor,drawers,theme-profile-drawer,theme-template-drawer-wave,theme-template-drawer-new-tokens}.test.tsx`,
`tests/vitest/admin/adminThemeClient.test.ts`). No product code touched.

**Validation**

- `bun --cwd core lint` — clean.
- `bun --cwd core lint:types` — clean; repo-level `tsc -p tsconfig.json` — 0 errors.
- `bun test tests/unit/adminThemes` — 27/27 pass (5 files).
- `NODE_ENV=test vitest run tests/vitest/ui tests/vitest/ui-integration tests/vitest/admin`
  — 432 files / 2002 tests pass.

**Deferred (not this subtask):** the LIVE single-window "dark recolors the real
chrome" verification is sequenced AFTER the TASK-479-06 chrome migration; the
optional per-template `dark?: Partial<AdminThemeTokens>` remains a purely-additive
follow-up.
