# TASK-479-05-L01: Token Gap Analysis & Inventory
# FileName: TASK-479-05-L01-Token-Gap-Analysis-And-Inventory.md

**Parent Subtask:** TASK-479-05
**Priority:** Medium
**Category:** Admin UI / Design System / Theming
**Estimated Effort:** Small
**Dependencies:** TASK-479 prototype (01–04)
**Status:** ⏳ To Do

---

## Overview

Read-only analysis leaf. Enumerate **every** CSS variable the prototype
`theme.css` defines, map each to its current/target `--admin-*` owner in the
real admin, and produce the authoritative list of NEW tokens/groups the
`AdminThemeTokens` contract must gain. Also make the **dark-mode strategy
decision** that L02/L03/L06 follow. No product code changes — output is the
mapping table + decision recorded inside this leaf (and copied into
`_docs/DESIGN_TOKENS.md` by L07).

- **Goal:** Freeze the exact token delta + dark strategy so downstream leaves
  never re-discover scope.
- **Owning module/service:** analysis only; references
  `_docs/_PROTOTYPE/src/styles/theme.css`,
  `core/services/adminThemes/tokenTypes.ts`,
  `core/ui/theme/tokenCss.ts`, `core/admin/styles/globals.css`,
  `core/admin/app/AdminApp.tsx`.
- **Source-of-truth docs:** `_docs/DESIGN_TOKENS.md`, `_docs/THEMES_SPEC.md`.
- **Out of scope:** Any edit to types, CSS, seeds, or UI (those are L02–L06).

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Read-only inventory leaf.

---

## Pipeline recap (verified, so the gap is unambiguous)

```
DB admin_theme_templates.tokens (jsonb, AdminThemeTokens)
  → mergeAdminThemeTokens(DEFAULT_ADMIN_THEME_TOKENS, template.tokens)   [tokenUtils.ts]
  → toAdminThemeCssVariables(tokens) => ":root{--admin-*:…}"             [core/ui/theme/tokenCss.ts]
  → injected by AdminApp via <style id="coderso-theme-tokens">           [AdminApp.tsx]
  → globals.css :root maps --admin-* → shadcn vars (--background,…)      [globals.css]
  → Tailwind v4 @theme exposes bg-background / text-primary / …          [globals.css]
```

The injected `<style>` only sets `--admin-*` (+ `--font-*`/`--text-*`); the
shadcn vars (`--background`, `--primary`, …) are derived from `--admin-*` inside
`globals.css :root`. **Crucially, the admin chrome primitives read `--admin-*`
DIRECTLY, not the derived shadcn vars** (verified in core): `button.tsx`
(`bg-[var(--admin-button-primary-bg)]`), `input.tsx`/`textarea.tsx`
(`--admin-input-*`), `alert.tsx` (`--admin-state-*`), `SidebarNav.tsx`
(`--admin-sidebar-*`/`--admin-base-border`), `TopBar.tsx` (`--admin-topbar-*`).
The injected `<style id="coderso-theme-tokens">` is rendered in the app body, so
it WINS source order over `globals.css`. Both facts drive the dark decision
below: dark must flip the `--admin-*` values themselves (not merely the derived
shadcn vars), and it must do so **from the injected style** (the source-order
winner) — a static `globals.css .dark{--admin-*}` would lose to the later
injected `:root{--admin-*}` and would never reach the chrome.

## Token mapping table (prototype → admin owner)

Status legend: **EXISTS** = already in `AdminThemeTokens` + emitter;
**NEW** = must be added (L02 contract + L03 mapping).

| Prototype var (theme.css) | Light value | Dark value | `AdminThemeTokens` path | `--admin-*` owner | shadcn var (globals.css) | Status |
|---|---|---|---|---|---|---|
| `--background` | `#f6f5f2` | `#18171a` | `base.bg` | `--admin-base-bg` | `--background` | EXISTS (re-color) |
| `--foreground` | `#1c1a17` | `#ededec` | `base.text` | `--admin-base-text` | `--foreground` | EXISTS (re-color) |
| (surface) | `#f3f1ed` | `#232128` | `base.surface` | `--admin-base-surface` | `--muted` | EXISTS (re-color) |
| `--popover` | `#ffffff` | `#232127` | `card.bg` (shared) | `--admin-card-bg` | `--popover` | EXISTS (re-map) |
| `--border` | `#eae7e0` | `#2d2b32` | `base.border` | `--admin-base-border` | `--border` | EXISTS (re-color) |
| `--card` | `#ffffff` | `#211f24` | `card.bg` | `--admin-card-bg` | `--card` | EXISTS (re-color) |
| `--input` | `#e5e1d9` | `#36333c` | `inputs.border` | `--admin-input-border` | `--input` | EXISTS (re-color) |
| `--ring` | `#a78bfa` | `#8b5cf6` | `inputs.focusRing` | `--admin-input-ring` | `--ring` | EXISTS (re-color) |
| `--primary` | `#7c3aed` | `#8b5cf6` | `buttons.primary.bg` | `--admin-button-primary-bg` | `--primary` | EXISTS (re-color) |
| `--primary-foreground` | `#ffffff` | `#ffffff` | `buttons.primary.text` | `--admin-button-primary-text` | `--primary-foreground` | EXISTS (re-color) |
| `--primary-soft` | `#f1ecfe` | `#2a2440` | **`primarySoft.bg`** (NEW) | **`--admin-primary-soft`** | `--primary-soft` | **NEW** |
| `--primary-soft-foreground` | `#6d28d9` | `#c4b5fd` | **`primarySoft.text`** (NEW) | **`--admin-primary-soft-text`** | `--primary-soft-foreground` | **NEW** |
| `--secondary` | `#f1efeb` | `#29272e` | `buttons.secondary.bg` | `--admin-button-secondary-bg` | `--secondary` | EXISTS (re-color) |
| `--destructive` | `#e11d48` | `#fb7185` | `state.danger` | `--admin-state-danger` | `--destructive` | EXISTS (re-color) |
| `--success` | `#16a34a` | `#34d399` | `state.success` | `--admin-state-success` | `--success` | EXISTS (re-color) |
| `--success-soft` | `#e7f6ec` | `#18342a` | **`state.successSoft`** (NEW) | **`--admin-state-success-soft`** | `--success-soft` | **NEW** |
| `--warning` | `#d97706` | `#fbbf24` | `state.warning` | `--admin-state-warning` | `--warning` | EXISTS (re-color) |
| `--warning-soft` | `#fdf0db` | `#36290f` | **`state.warningSoft`** (NEW) | **`--admin-state-warning-soft`** | `--warning-soft` | **NEW** |
| `--info` | `#2563eb` | `#60a5fa` | **`state.info`** (NEW) | **`--admin-state-info`** | `--info` | **NEW** |
| `--info-foreground` | `#ffffff` | `#07203f` | **`state.infoForeground`** (NEW) | **`--admin-state-info-foreground`** | `--info-foreground` | **NEW** |
| `--info-soft` | `#e7eefe` | `#16263f` | **`state.infoSoft`** (NEW) | **`--admin-state-info-soft`** | `--info-soft` | **NEW** |
| `--sidebar` | `#f1efea` | `#1c1b1f` | `sidebar.bg` | `--admin-sidebar-bg` | `--sidebar` | EXISTS (re-color) |
| `--sidebar-foreground` | `#57534e` | `#a8a29a` | `sidebar.text` | `--admin-sidebar-text` | `--sidebar-foreground` | EXISTS (re-color) |
| `--sidebar-muted` | `#a8a29a` | `#756f68` | **`sidebar.muted`** (NEW) | **`--admin-sidebar-muted`** | `--sidebar-muted` | **NEW** |
| `--sidebar-accent` | `#ece6fb` | `#2c2542` | **`sidebar.accent`** (NEW) | **`--admin-sidebar-accent`** | `--sidebar-accent` | **NEW** |
| `--sidebar-accent-foreground` | `#6d28d9` | `#c4b5fd` | **`sidebar.accentForeground`** (NEW) | **`--admin-sidebar-accent-foreground`** | `--sidebar-accent-foreground` | **NEW** |
| `--sidebar-border` | `#e7e3db` | `#2a282f` | **`sidebar.border`** (NEW) | **`--admin-sidebar-border`** | `--sidebar-border` | **NEW** |
| (topbar bg) | `#f6f5f2` | `#18171a` | `topbar.bg` | `--admin-topbar-bg` | — (chrome reads `--admin-*`) | EXISTS (re-color) |
| (topbar text) | `#57534e` | `#a8a29a` | `topbar.text` | `--admin-topbar-text` | — (chrome reads `--admin-*`) | EXISTS (re-color) |
| (topbar border) | `#eae7e0` | `#2d2b32` | `topbar.border` | `--admin-topbar-border` | — (chrome reads `--admin-*`) | EXISTS (re-color) |
| `--shadow-soft` | `0 1px 2px …` | (same) | **`effects.shadowSoft`** (NEW) | **`--admin-shadow-soft`** | `--shadow-soft` | **NEW** |
| `--shadow-card` | `0 1px 3px …` | (same) | **`effects.shadowCard`** (NEW) | **`--admin-shadow-card`** | `--shadow-card` | **NEW** |
| `--shadow-pop` | `0 10px 34px …` | (same) | **`effects.shadowPop`** (NEW) | **`--admin-shadow-pop`** | `--shadow-pop` | **NEW** |
| `--font-sans` (Inter) | Inter stack | (same) | `typography.sans` | `--font-sans` | `--font-sans` | EXISTS (re-value) |
| `--font-display` (Inter Tight) | Inter Tight | (same) | `typography.display` | `--font-display` | `--font-display` | EXISTS (re-value) |

Note: the prototype maps `sidebar.activeBg`/`activeText` onto
`--sidebar-accent`/`--sidebar-accent-foreground`. Keep the existing
`sidebar.activeBg`/`activeText`/`hoverBg` fields (still emitted) AND add the new
`sidebar.accent*`/`muted`/`border` so both the existing real shell and the
prototype shell (TASK-479-06) resolve.

Note (popover conflation fix): the **real** `globals.css :root` currently maps
BOTH `--muted` AND `--popover` to `--admin-base-surface`. The prototype, however,
distinguishes them — `--muted` = the neutral surface (`#f3f1ed`/dark `#232128`)
while `--popover` ≈ the card surface (`#ffffff`/dark `#232127`). There is no
separate "popover" token in `AdminThemeTokens`, so L03 re-maps `--popover` off
`--admin-card-bg` (white) and leaves `--muted` on `--admin-base-surface`; the
minor dark delta (`#211f24` card vs `#232127` popover) is acceptable without a
new token.

Note (topbar has no shadcn var): `TopBar.tsx` reads `--admin-topbar-bg/text/
border` DIRECTLY (no `--topbar-*` shadcn indirection), so the topbar rows have no
shadcn-var owner. Light values already exist; the dark column above is the dark
chrome path the previous draft omitted — it is supplied by the dark
`--admin-*` block (decision below), NOT by any globals derivation.

### Net NEW additions to the contract (frozen list for L02)

1. `primarySoft: { bg, text }`
2. `state.info`, `state.infoForeground`, `state.successSoft`,
   `state.warningSoft`, `state.infoSoft`
3. `sidebar.muted`, `sidebar.accent`, `sidebar.accentForeground`,
   `sidebar.border`
4. `effects: { shadowSoft, shadowCard, shadowPop }`
5. Re-valued defaults (not new keys): warm-neutral base, violet primary,
   Inter fonts (L02 default values; L04 seed/theme.json).

## Dark-mode strategy decision (DECIDE HERE — downstream binds to this)

**Decision (canonical architecture fork): emit dark mode as a
`:root.dark{--admin-*}` block FROM the injected
`<style id="coderso-theme-tokens">`, alongside the existing light
`:root{--admin-*}` block, driven by `<html class="dark">`. The chrome KEEPS
reading `--admin-*` directly; the dark `--admin-*` values recolor it because the
injected style WINS source order (and `:root.dark` adds a specificity point over
the light `:root`). The derived shadcn vars in `globals.css :root`
(`--background: var(--admin-base-bg)`, …) then follow automatically. Keep
`AdminThemeTokens` single-mode for now (light = the canonical DB token set); the
canonical DARK palette is a shared default `DEFAULT_ADMIN_THEME_TOKENS_DARK`
(L02 constant, values owned/seeded by L04) emitted for every profile.**

Why NOT a static `globals.css .dark{ … }` layer (the REJECTED approach — it is
the confirmed audit High):

- **It does not recolor the chrome.** The admin chrome primitives
  (`button`/`input`/`textarea`/`alert`/`SidebarNav`/`TopBar`) read `--admin-*`
  DIRECTLY, not the derived shadcn vars. A static `.dark` that overrides only the
  shadcn vars (`--background`, `--primary`, …) leaves the chrome on its light
  `--admin-*` → a visibly half-dark admin while the closure gate (which only
  checks the `.dark` class) passes.
- **It loses source order.** The injected `<style>` sets `--admin-*` on `:root`
  LATER in source order than `globals.css`, so a `globals.css .dark{--admin-*}`
  cannot win. The dark `--admin-*` must therefore come FROM the injected style.

Justification for the chosen injected-dark approach (record in DESIGN_TOKENS.md):

- **Recolors the real chrome:** flipping `--admin-*` in `:root.dark` is exactly
  what `button`/`sidebar`/`topbar`/`input`/`alert` read, so dark applies to the
  WHOLE shell, not half of it.
- **No data migration:** existing light-only `admin_theme_templates` rows are
  untouched; their chrome dark comes from the SHARED default dark palette emitted
  by the injected style, so every template gets a correct dark with zero
  migration. (This covers the audited token set; the chrome dark values are
  supplied by the injected per-profile style — no "1:1 mirror of every template"
  claim is made.)
- **Smaller contract blast radius:** the `AdminThemeTokens` TYPE stays
  single-mode (no per-template `dark?` field yet); only a parallel default dark
  constant + a dark emitter pass are added. Preserves the cache contract and the
  `assertAdminThemeTokens` reject-unknown behavior.
- **Sequencing:** the dark toggle and the "dark works" closure gate are sequenced
  AFTER the TASK-479-06 chrome migration (which keeps chrome on `--admin-*`); the
  gate asserts a REAL computed chrome background in dark for button + sidebar +
  topbar (L07), not merely that the `.dark` class is present.

**Deferred (note, do not build now):** an OPTIONAL per-template dark set
(`dark?: Partial<AdminThemeTokens>`) emitted as the per-profile
`:root.dark{--admin-*}` block (replacing the shared default for that profile).
Because the injected `<style>` already OWNS the dark block, adding this later is
purely additive — no `globals.css` change. Tracked as a future follow-up, NOT
this subtask.

---

## Implementation Pseudocode

This leaf produces a document, not code. The "implementation" is the frozen
delta above, consumed as:

```text
L02 ← "Net NEW additions" list (exact field names + light default values) +
      DEFAULT_ADMIN_THEME_TOKENS_DARK + the emitter's dark :root.dark{--admin-*} pass
L03 ← mapping table columns 5–6 (--admin-* owner → shadcn var); globals.css keeps
      :root deriving shadcn from --admin-* + the --popover re-map; chrome dark
      comes from the INJECTED style, NOT a static globals .dark
L04 ← light default column → DEFAULT_ADMIN_THEME_TOKENS + theme.json + seed;
      dark column → DEFAULT_ADMIN_THEME_TOKENS_DARK (per-token dark values, incl. topbar)
L05 ← NEW rows → which pickers/preview blocks to add
L06 ← dark toggle (class) + AdminApp injects the dark :root.dark{--admin-*} block;
      "dark works" gate sequenced AFTER the 06 chrome migration
L07 ← whole table + justification → DESIGN_TOKENS.md; dark test asserts real chrome
      background (button/sidebar/topbar)
```

**Data flow:** none (read-only). **Error handling:** if any prototype var is
found with no obvious `--admin-*` owner, STOP and add a row rather than guess.
**Regression-test shape:** none for this leaf; L07 adds a test that asserts the
emitter output contains exactly the NEW `--admin-*` keys this table froze (guards
against drift between this inventory and the shipped emitter).

---

## Testing Requirements

- No code; validate the inventory by grepping the two sources and confirming the
  table is exhaustive:
  - `grep -nE '^\s*--' _docs/_PROTOTYPE/src/styles/theme.css`
  - cross-check against `core/ui/theme/tokenCss.ts` `toAdminThemeCssVariables`.
- `bun --cwd core lint` / `bun --cwd core lint:types` (no-op; run to confirm no
  stray edits).

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + statistics on status change.
- The frozen table + dark decision are copied into `_docs/DESIGN_TOKENS.md` by
  **L07** (this leaf is the source for that edit).
- Changelog entry is added at the subtask's first shipping leaf (L02), not here.
