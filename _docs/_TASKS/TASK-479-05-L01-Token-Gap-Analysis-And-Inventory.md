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
`globals.css :root`. This matters for the dark decision below.

## Token mapping table (prototype → admin owner)

Status legend: **EXISTS** = already in `AdminThemeTokens` + emitter;
**NEW** = must be added (L02 contract + L03 mapping).

| Prototype var (theme.css) | Light value | Dark value | `AdminThemeTokens` path | `--admin-*` owner | shadcn var (globals.css) | Status |
|---|---|---|---|---|---|---|
| `--background` | `#f6f5f2` | `#18171a` | `base.bg` | `--admin-base-bg` | `--background` | EXISTS (re-color) |
| `--foreground` | `#1c1a17` | `#ededec` | `base.text` | `--admin-base-text` | `--foreground` | EXISTS (re-color) |
| (surface) | `#f3f1ed` | `#232128` | `base.surface` | `--admin-base-surface` | `--muted`/`--popover` | EXISTS (re-color) |
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

**Decision: ship dark mode as a static `.dark { … }` override LAYER in
`core/admin/styles/globals.css`, driven by `<html class="dark">`, re-declaring
the same shadcn vars (and the new shadow/soft vars) with the prototype's dark
hexes. Keep `AdminThemeTokens` single-mode (light = the canonical DB token
set).**

Justification (record verbatim in DESIGN_TOKENS.md):

- **Backward compatibility:** every existing `admin_theme_templates` row stores
  only light values. A per-template `dark` token set would be empty/broken for
  them and would force a data migration; a static `.dark` layer gives every
  template a correct dark mode with zero migration.
- **Smaller blast radius:** the contract, validator, emitter, and editor stay
  single-set; only CSS + a toggle change. Preserves the cache contract and the
  `assertAdminThemeTokens` reject-unknown behavior.
- **Mirrors the prototype 1:1:** `theme.css` already implements dark exactly
  this way (`:root` light + `.dark` override of the same names), so the port is
  a copy of resolved hexes.
- **Specificity is safe:** the injected `<style id="coderso-theme-tokens">` sets
  only `--admin-*` at `:root` (0,1,0). The `.dark` layer overrides the derived
  **shadcn** vars (`--background`, `--primary`, …) directly, so per-template
  custom `--admin-*` light values never leak into dark. Use `.dark` (not
  `:root.dark`) to keep parity with the prototype selector.

**Deferred (note, do not build now):** an OPTIONAL per-template dark set
(`dark?: Partial<AdminThemeTokens>`) emitted as a `.dark{--admin-*}` block from
the injected style could later let templates recolor dark. It would override the
static layer because the injected `<style>` renders after `globals.css`. Tracked
as a future follow-up, NOT this subtask.

---

## Implementation Pseudocode

This leaf produces a document, not code. The "implementation" is the frozen
delta above, consumed as:

```text
L02 ← "Net NEW additions" list (exact field names + default values column)
L03 ← mapping table columns 5–6 (--admin-* owner → shadcn var) + .dark hex set
L04 ← light default values column → DEFAULT_ADMIN_THEME_TOKENS + theme.json + seed
L05 ← NEW rows → which pickers/preview blocks to add
L06 ← dark-mode strategy decision (class toggle, no contract dark set)
L07 ← whole table + justification → DESIGN_TOKENS.md
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
