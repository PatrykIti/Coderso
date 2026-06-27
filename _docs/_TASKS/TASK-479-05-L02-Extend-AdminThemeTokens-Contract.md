# TASK-479-05-L02: Extend AdminThemeTokens Type, Defaults, Normalize & Validation
# FileName: TASK-479-05-L02-Extend-AdminThemeTokens-Contract.md

**Parent Subtask:** TASK-479-05
**Priority:** Medium
**Category:** Admin UI / Design System / Theming
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05-L01
**Status:** ⏳ To Do

---

## Overview

Extend the `AdminThemeTokens` contract with the NEW groups/fields frozen in L01,
seed violet/warm default values, emit the new `--admin-*` CSS variables, and keep
validation strict (reject-unknown) while non-destructively defaulting old
templates that predate the new tokens.

- **Goal:** Make the token type, defaults, merge, validator, and CSS-var emitter
  carry `primarySoft`, `state.info`/soft variants, `sidebar.muted/accent/
  accentForeground/border`, and `effects` shadows — without breaking existing
  templates.
- **Owning module/service:** `core/services/adminThemes/tokenTypes.ts`,
  `core/services/adminThemes/tokenUtils.ts`,
  `core/services/adminThemes/tokenValidation.ts`,
  `core/ui/theme/tokenCss.ts`.
- **Source-of-truth docs:** `_docs/DESIGN_TOKENS.md`, L01 frozen delta,
  `_docs/_PROTOTYPE/src/styles/theme.css`.
- **Out of scope:** globals.css mapping (L03), seed/theme.json (L04), editor
  pickers (L05), dark toggle (L06).

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). `assertAdminThemeTokens` is the schema
owner for `admin_theme_templates.tokens` (jsonb) — it MUST keep rejecting unknown
keys/non-string values. No secrets in tokens.

---

## Implementation Pseudocode

### 1) Type extension — `core/services/adminThemes/tokenTypes.ts`

```ts
export type AdminThemeTokens = {
  base: { bg; surface; text; border };
  buttons: { primary; secondary; outline; ghost };           // unchanged
  primarySoft: { bg: string; text: string };                 // NEW
  inputs: { bg; border; text; placeholder; focusRing };      // unchanged
  sidebar: {
    bg; text; activeBg; activeText; hoverBg;                  // unchanged
    muted: string;                                            // NEW
    accent: string;                                           // NEW
    accentForeground: string;                                 // NEW
    border: string;                                           // NEW
  };
  topbar: { bg; text; border };                              // unchanged
  card: { bg; border };                                       // unchanged
  typography: { sans; display; sm; md; lg; xl; "2xl"; mutedText }; // unchanged
  state: {
    success; warning; danger;                                 // unchanged
    info: string;                                             // NEW
    infoForeground: string;                                   // NEW
    successSoft: string;                                      // NEW
    warningSoft: string;                                      // NEW
    infoSoft: string;                                         // NEW
  };
  effects: { shadowSoft: string; shadowCard: string; shadowPop: string }; // NEW group
};
```

### 2) Defaults — `DEFAULT_ADMIN_THEME_TOKENS` (violet / warm, from L01 light column)

```ts
export const DEFAULT_ADMIN_THEME_TOKENS: AdminThemeTokens = {
  base: { bg: "#f6f5f2", surface: "#f3f1ed", text: "#1c1a17", border: "#eae7e0" },
  buttons: {
    primary: { bg: "#7c3aed", text: "#ffffff", hoverBg: "#6d28d9", hoverText: "#ffffff" },
    secondary: { bg: "#f1efeb", text: "#44403c", hoverBg: "#e7e3db", hoverText: "#1c1a17" },
    outline: { border: "#eae7e0", text: "#1c1a17", hoverBg: "#efece6", hoverText: "#1c1a17" },
    ghost: { hoverBg: "#efece6", hoverText: "#1c1a17" },
  },
  primarySoft: { bg: "#f1ecfe", text: "#6d28d9" },            // NEW
  inputs: { bg: "#ffffff", border: "#e5e1d9", text: "#1c1a17",
            placeholder: "#a8a29a", focusRing: "#a78bfa" },
  sidebar: {
    bg: "#f1efea", text: "#57534e", activeBg: "#ece6fb", activeText: "#6d28d9",
    hoverBg: "#efece6",
    muted: "#a8a29a", accent: "#ece6fb", accentForeground: "#6d28d9", border: "#e7e3db", // NEW
  },
  topbar: { bg: "#f6f5f2", text: "#57534e", border: "#eae7e0" },
  card: { bg: "#ffffff", border: "#eae7e0" },
  typography: {
    sans: "\"Inter\", ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
    display: "\"Inter Tight\", \"Inter\", ui-sans-serif, system-ui, sans-serif",
    sm: "0.875rem", md: "1rem", lg: "1.125rem", xl: "1.25rem", "2xl": "1.5rem",
    mutedText: "#79716b",
  },
  state: {
    success: "#16a34a", warning: "#d97706", danger: "#e11d48",
    info: "#2563eb", infoForeground: "#ffffff",               // NEW
    successSoft: "#e7f6ec", warningSoft: "#fdf0db", infoSoft: "#e7eefe", // NEW
  },
  effects: {                                                  // NEW
    shadowSoft: "0 1px 2px rgba(28, 25, 23, 0.04), 0 4px 12px -6px rgba(28, 25, 23, 0.08)",
    shadowCard: "0 1px 3px rgba(28, 25, 23, 0.05), 0 12px 32px -16px rgba(28, 25, 23, 0.14)",
    shadowPop: "0 10px 34px -10px rgba(28, 25, 23, 0.24)",
  },
};
```

### 3) Non-destructive merge — `core/services/adminThemes/tokenUtils.ts`

`mergeAdminThemeTokens(defaults, overrides)` already shallow-merges per group.
Add the NEW groups so a legacy template (missing `primarySoft`/`effects`/new
`sidebar`+`state` keys) is back-filled from defaults instead of producing
`undefined`:

```ts
return {
  base: { ...defaults.base, ...overrides.base },
  buttons: { primary: {…}, secondary: {…}, outline: {…}, ghost: {…} }, // unchanged
  primarySoft: { ...defaults.primarySoft, ...overrides.primarySoft },   // NEW
  inputs: { ...defaults.inputs, ...overrides.inputs },
  sidebar: { ...defaults.sidebar, ...overrides.sidebar },               // new keys back-filled
  topbar: { ...defaults.topbar, ...overrides.topbar },
  card: { ...defaults.card, ...overrides.card },
  typography: { ...defaults.typography, ...overrides.typography },
  state: { ...defaults.state, ...overrides.state },                     // new keys back-filled
  effects: { ...defaults.effects, ...overrides.effects },               // NEW
};
```

This is the backward-compat path: `getResolvedAdminThemeTokens` already calls
`mergeAdminThemeTokens(getDefaultAdminThemeTokens(), template?.tokens ?? null)`,
so old rows resolve with full new tokens for free.

### 4) Validation — `core/services/adminThemes/tokenValidation.ts`

Extend `tokenGroups` and the assertions. The validator runs on WRITE
(`createAdminThemeTemplate`/`updateAdminThemeTemplate`); the read path uses
merge, so this stays strict-on-write only.

```ts
const tokenGroups = {
  base: ["bg", "surface", "text", "border"],
  buttons: ["primary", "secondary", "outline", "ghost"],
  buttonPrimary: ["bg", "text", "hoverBg", "hoverText"],
  buttonSecondary: ["bg", "text", "hoverBg", "hoverText"],
  buttonOutline: ["border", "text", "hoverBg", "hoverText"],
  buttonGhost: ["hoverBg", "hoverText"],
  primarySoft: ["bg", "text"],                                  // NEW
  inputs: ["bg", "border", "text", "placeholder", "focusRing"],
  sidebar: ["bg", "text", "activeBg", "activeText", "hoverBg",
            "muted", "accent", "accentForeground", "border"],   // + NEW keys
  topbar: ["bg", "text", "border"],
  card: ["bg", "border"],
  typography: ["sans", "display", "sm", "md", "lg", "xl", "2xl", "mutedText"],
  state: ["success", "warning", "danger",
          "info", "infoForeground",
          "successSoft", "warningSoft", "infoSoft"],            // + NEW keys
  effects: ["shadowSoft", "shadowCard", "shadowPop"],           // NEW
} as const;
```

**Backward-compat adapter (REQUIRED):** old persisted templates were written
under the smaller `sidebar`/`state` shape and have NO `primarySoft`/`effects`
groups. `assertAdminThemeTokens` currently throws on a MISSING required group and
on unknown keys. To avoid breaking reads of legacy rows while keeping writes
strict, split the two behaviors:

```ts
// NEW: normalize legacy → current shape. Pure, non-destructive, additive.
export function normalizeAdminThemeTokens(input: unknown): AdminThemeTokens {
  // Validate the input is a partial-but-known shape (reject UNKNOWN keys/types),
  // then merge over defaults so missing NEW groups are filled.
  assertKnownAdminThemeTokenShape(input); // reject-unknown, allow-missing
  return mergeAdminThemeTokens(getDefaultAdminThemeTokens(), input as Partial<AdminThemeTokens>);
}
```

- `assertAdminThemeTokens` (strict, used on template WRITE) keeps requiring ALL
  groups incl. the new ones → editor always saves a complete object.
- `assertKnownAdminThemeTokenShape` (lenient: reject unknown keys + non-string
  leaves, but allow MISSING groups) is the read-time guard used by
  `getResolvedAdminThemeTokens`/`readStoredAdminThemeTokens` so a pre-existing
  row or a stale `localStorage` cache (key `coderso.adminThemeTokens`, legacy
  `nextless.adminThemeTokens` — both read in `AdminApp.tsx`; NOT the
  `coderso-theme-tokens` style-element id) normalizes instead of falling back to
  `DEFAULT_ADMIN_THEME_TOKENS` wholesale.

> Confirm whether `adminThemeTemplateService.ts` read path should switch from
> raw cast to `normalizeAdminThemeTokens(row.tokens)` — recommended, so legacy
> rows surface in the editor pre-filled with violet defaults for the new fields.

### 5) CSS-var emission — `core/ui/theme/tokenCss.ts`

Both emitters must gain the NEW vars (array form `toAdminThemeCssVariables` used
by `AdminApp`'s injected `<style>`, and `toAdminThemeCssVariableMap` used by the
editor live preview). Add, keeping the existing entries:

```ts
// in toAdminThemeCssVariables(tokens) entries[] AND toAdminThemeCssVariableMap(tokens):
`--admin-primary-soft:${tokens.primarySoft.bg}`,
`--admin-primary-soft-text:${tokens.primarySoft.text}`,
`--admin-state-info:${tokens.state.info}`,
`--admin-state-info-foreground:${tokens.state.infoForeground}`,
`--admin-state-success-soft:${tokens.state.successSoft}`,
`--admin-state-warning-soft:${tokens.state.warningSoft}`,
`--admin-state-info-soft:${tokens.state.infoSoft}`,
`--admin-sidebar-muted:${tokens.sidebar.muted}`,
`--admin-sidebar-accent:${tokens.sidebar.accent}`,
`--admin-sidebar-accent-foreground:${tokens.sidebar.accentForeground}`,
`--admin-sidebar-border:${tokens.sidebar.border}`,
`--admin-shadow-soft:${tokens.effects.shadowSoft}`,
`--admin-shadow-card:${tokens.effects.shadowCard}`,
`--admin-shadow-pop:${tokens.effects.shadowPop}`,
```

**Dark emission (D1 — the dark `--admin-*` block):** because the chrome reads
`--admin-*` DIRECTLY and the injected `<style id="coderso-theme-tokens">` wins
source order, dark must be emitted as a `:root.dark{--admin-*}` block FROM that
same injected style (NOT a static `globals.css .dark`, per L01). Give the array
emitter an optional selector so it can target light or dark — backward compatible
(default `:root`, so existing `toAdminThemeCssVariables(tokens)` calls are
unchanged):

```ts
export function toAdminThemeCssVariables(
  tokens: AdminThemeTokens,
  selector: string = ":root",          // pass ":root.dark" for the dark block
): string {
  // …same entries[] (incl. the NEW vars above)…
  return `${selector}{${entries.join(";")};}`;
}
```

The dark VALUES are a parallel default constant — single source, full
`AdminThemeTokens` shape, per-token dark hexes frozen in L01's dark column and
owned/seeded by L04 (incl. the dark `topbar` values the previous draft omitted):

```ts
export const DEFAULT_ADMIN_THEME_TOKENS_DARK: AdminThemeTokens = { /* L04 dark palette */ };
```

`AdminApp` then injects BOTH blocks into the one `<style>` (wired in L06):
`toAdminThemeCssVariables(activeLightTokens) +
toAdminThemeCssVariables(DEFAULT_ADMIN_THEME_TOKENS_DARK, ":root.dark")`. The
contract TYPE stays single-mode (no per-template `dark?`); per-template dark is
the deferred follow-up from L01. `toAdminThemeCssVariableMap` (editor preview)
needs no selector — it stays a `Record` for inline styles.

**Data flow:** write → `assertAdminThemeTokens` (strict) → persist jsonb. Read →
`normalizeAdminThemeTokens`/`mergeAdminThemeTokens` → emitter → injected
`:root{--admin-*}` (+ `:root.dark{--admin-*}` from the dark default) → globals.css
map (L03).

**Error handling:** keep machine-readable `admin_theme_tokens_invalid` on
unknown keys / non-string leaves; never silently drop fields. Read path must
never throw on a legacy-but-known shape — it normalizes.

**Regression-test shape (full coverage lands in L07):**

- Defaults snapshot includes every NEW key with the violet/warm values above.
- `mergeAdminThemeTokens(defaults, {})` and `mergeAdminThemeTokens(defaults,
  legacyShapeWithoutNewGroups)` both return a complete object.
- `assertAdminThemeTokens` throws on `{ effects: { unknown: "#000" } }` and on a
  numeric leaf; accepts the full default object.
- `normalizeAdminThemeTokens(legacyRow)` fills `primarySoft`/`effects`/new
  sidebar+state keys from defaults (no throw).
- `toAdminThemeCssVariables(defaults)` string contains all NEW `--admin-*` names
  and is wrapped in `:root{…}`.
- `toAdminThemeCssVariables(DEFAULT_ADMIN_THEME_TOKENS_DARK, ":root.dark")` is
  wrapped in `:root.dark{…}` and carries the dark chrome hexes
  (`--admin-base-bg:#18171a`, `--admin-button-primary-bg:#8b5cf6`,
  `--admin-sidebar-bg:#1c1b1f`, `--admin-topbar-bg:#18171a`).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/unit/adminThemes`
  (extend `tests/unit/adminThemes/tokenValidation.test.ts`; add
  `tests/unit/adminThemes/tokenTypes.test.ts` for defaults/merge/normalize and
  `tests/unit/adminThemes/tokenCss.test.ts` for emission).
- State explicitly in the summary if any suite was skipped.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + statistics on status change.
- Add a `_docs/_CHANGELOG/` entry on closure linking **TASK-479** + this leaf
  (first shipping change of the subtask).
- `_docs/DESIGN_TOKENS.md` group list update is owned by L07 but cross-link the
  new fields here.
