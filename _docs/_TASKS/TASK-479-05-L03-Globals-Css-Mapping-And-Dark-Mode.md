# TASK-479-05-L03: globals.css Mapping + :root + Dark Block
# FileName: TASK-479-05-L03-Globals-Css-Mapping-And-Dark-Mode.md

**Parent Subtask:** TASK-479-05
**Priority:** Medium
**Category:** Admin UI / Design System / Theming
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05-L01, TASK-479-05-L02
**Status:** ⏳ To Do

---

## Overview

Wire the new `--admin-*` variables (emitted by L02) into the shadcn `@theme`
layer and `:root` of `core/admin/styles/globals.css`, add soft-shadow + soft-
state utilities, set warm/violet defaults, and keep `:root` deriving shadcn vars
FROM `--admin-*` so the dark `:root.dark{--admin-*}` block injected by the style
(per the L01 decision) propagates to both the chrome and the derived surfaces.
After this leaf the admin renders the prototype look in light, and
`<html class="dark">` flips it to the prototype dark palette — the chrome dark
comes from the injected style, NOT a static globals `.dark`.

- **Goal:** Map L02's new tokens to shadcn vars and ship a token-faithful dark
  layer, so Tailwind utilities (`bg-primary-soft`, `text-info`, `shadow-card`,
  `bg-success-soft`, sidebar accents) resolve.
- **Owning module/service:** `core/admin/styles/globals.css`.
- **Source-of-truth docs:** `_docs/_PROTOTYPE/src/styles/theme.css` (the
  authoritative @theme/:root/.dark to mirror), L01 mapping table.
- **Out of scope:** the contract/emitter (L02), the toggle that adds the `dark`
  class (L06), per-page utility adoption (TASK-479-07).
- **Coordinate with TASK-481** (page-editor canvas brand-token WYSIWYG): TASK-481
  also edits `globals.css` — its root cause is the `@theme` brand `--color-*`
  block + the `data-page-editor-canvas-frame` (see TASK-479-08-L02 for the
  canvas-frame work). This leaf only adds the admin `--admin-*`→shadcn mappings
  and the dark path; **no preview-token semantics change here** (the canvas
  neutral/brand emission in `core/ui/theme/tokenCss.ts`,
  `toPageCanvasColorCssVariableMap`, is untouched). Sequence this leaf
  alongside/after TASK-481 to avoid overlapping `@theme` edits.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). CSS-only leaf.

---

## Implementation Pseudocode

Target file `core/admin/styles/globals.css`. Mirror prototype `theme.css`'s
`@theme inline` + `:root` brand values, but keep the real admin's `--admin-*`
indirection so DB templates still drive light values. The prototype's `.dark`
hexes are NOT copied into a globals `.dark` block — they become the
`DEFAULT_ADMIN_THEME_TOKENS_DARK` palette (L04), emitted as the injected
`:root.dark{--admin-*}` block (D1); see §3.

### 1) `@theme` — expose new shadcn color/shadow vars (after existing entries)

```css
@theme {
  /* …existing… */
  --color-primary-soft: var(--primary-soft);
  --color-primary-soft-foreground: var(--primary-soft-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-success-soft: var(--success-soft);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-warning-soft: var(--warning-soft);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
  --color-info-soft: var(--info-soft);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-muted: var(--sidebar-muted);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --shadow-soft: var(--shadow-soft-token);
  --shadow-card: var(--shadow-card-token);
  --shadow-pop: var(--shadow-pop-token);
}
```

> Use `--shadow-soft-token` (etc.) as the resolved name to avoid a self-
> referential `--shadow-soft: var(--shadow-soft)` cycle; `:root` below defines
> `--shadow-soft-token: var(--admin-shadow-soft)`. (In the prototype the names
> don't collide because shadows are only set in `@theme`; here they must come
> from `--admin-*`, so introduce the `-token` indirection.)

### 2) `:root` — derive new shadcn vars from `--admin-*` (after existing block)

```css
:root {
  /* …existing --admin-* fallbacks (keep, but re-value to violet/warm to match
     DEFAULT_ADMIN_THEME_TOKENS so the FIRST paint before the injected <style>
     is already on-brand)… */
  --admin-base-bg: #f6f5f2;
  --admin-base-surface: #f3f1ed;
  --admin-base-text: #1c1a17;
  --admin-base-border: #eae7e0;
  --admin-button-primary-bg: #7c3aed;
  /* …all existing --admin-* re-valued to the L02 light defaults… */

  /* NEW --admin-* fallbacks (mirror L02 defaults so SSR/first-paint has them
     even before the injected coderso-theme-tokens <style> applies) */
  --admin-primary-soft: #f1ecfe;
  --admin-primary-soft-text: #6d28d9;
  --admin-state-info: #2563eb;
  --admin-state-info-foreground: #ffffff;
  --admin-state-success-soft: #e7f6ec;
  --admin-state-warning-soft: #fdf0db;
  --admin-state-info-soft: #e7eefe;
  --admin-sidebar-muted: #a8a29a;
  --admin-sidebar-accent: #ece6fb;
  --admin-sidebar-accent-foreground: #6d28d9;
  --admin-sidebar-border: #e7e3db;
  --admin-shadow-soft: 0 1px 2px rgba(28,25,23,.04), 0 4px 12px -6px rgba(28,25,23,.08);
  --admin-shadow-card: 0 1px 3px rgba(28,25,23,.05), 0 12px 32px -16px rgba(28,25,23,.14);
  --admin-shadow-pop: 0 10px 34px -10px rgba(28,25,23,.24);

  /* shadcn derivations (NEW) */
  --primary-soft: var(--admin-primary-soft);
  --primary-soft-foreground: var(--admin-primary-soft-text);
  --success: var(--admin-state-success);
  --success-foreground: #ffffff;
  --success-soft: var(--admin-state-success-soft);
  --warning: var(--admin-state-warning);
  --warning-foreground: #ffffff;
  --warning-soft: var(--admin-state-warning-soft);
  --info: var(--admin-state-info);
  --info-foreground: var(--admin-state-info-foreground);
  --info-soft: var(--admin-state-info-soft);
  --sidebar: var(--admin-sidebar-bg);
  --sidebar-foreground: var(--admin-sidebar-text);
  --sidebar-muted: var(--admin-sidebar-muted);
  --sidebar-accent: var(--admin-sidebar-accent);
  --sidebar-accent-foreground: var(--admin-sidebar-accent-foreground);
  --sidebar-border: var(--admin-sidebar-border);

  /* conflation fix (L01): popover should track the CARD surface, not base.surface.
     The real :root currently sets BOTH --muted AND --popover to
     var(--admin-base-surface); the prototype distinguishes them (--popover ≈ card
     white, --muted = neutral surface). Re-map --popover off card-bg; leave --muted
     on base.surface. There is no separate popover token, so this is the closest
     faithful mapping. */
  --popover: var(--admin-card-bg);
  --popover-foreground: var(--admin-base-text);

  --shadow-soft-token: var(--admin-shadow-soft);
  --shadow-card-token: var(--admin-shadow-card);
  --shadow-pop-token: var(--admin-shadow-pop);

  /* re-value violet/warm shadcn vars already present (font + radius optional) */
  --ring: var(--admin-input-ring);          /* now #a78bfa via admin token */
  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI",
    Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-display: "Inter Tight", "Inter", ui-sans-serif, system-ui, sans-serif;
}
```

### 3) Dark mode comes from the INJECTED style, not a static globals `.dark` (D1)

**Do NOT add a static `globals.css .dark{--admin-*}` block as the dark
mechanism.** The chrome reads `--admin-*` DIRECTLY and the injected
`<style id="coderso-theme-tokens">` (rendered in the app body) wins source order,
so a `globals.css .dark{--admin-*}` cannot recolor the chrome (the confirmed
audit High — overriding only the derived shadcn vars leaves the shell half-dark).
Per L01, the canonical dark `:root.dark{--admin-*}` block is emitted FROM the
injected style (emitter + `DEFAULT_ADMIN_THEME_TOKENS_DARK` in L02; AdminApp
wiring in L06).

globals.css's only dark responsibility is the `:root` shadcn derivations from
`--admin-*` already in step 2 — so when the injected `:root.dark` flips the
`--admin-*` values, the derived shadcn vars (`--background`,`--card`,`--primary`,
`--popover`,…) follow automatically; no per-var `.dark{--background:…}` override
is needed (and one would not reach the chrome anyway).

OPTIONAL pre-paint fallback ONLY (NOT relied upon — the injected per-profile
block is canonical and supersedes it by source order): to avoid a one-frame dark
flash before AdminApp mounts, a `:root.dark{--admin-*}` block MAY be added to
globals.css mirroring the L04 dark palette. Because it sets `--admin-*` (not the
shadcn vars), the chrome AND the derived shadcn surfaces both go dark from it:

```css
:root.dark {            /* pre-paint fallback ONLY; injected style is canonical */
  --admin-base-bg: #18171a;
  --admin-base-surface: #232128;
  --admin-base-text: #ededec;
  --admin-base-border: #2d2b32;
  --admin-card-bg: #211f24;
  --admin-button-primary-bg: #8b5cf6;
  --admin-button-primary-text: #ffffff;
  --admin-input-bg: #211f24;
  --admin-input-border: #36333c;
  --admin-input-ring: #8b5cf6;
  --admin-sidebar-bg: #1c1b1f;
  --admin-sidebar-text: #a8a29a;
  --admin-sidebar-active-bg: #2c2542;
  --admin-sidebar-active-text: #c4b5fd;
  --admin-topbar-bg: #18171a;
  --admin-topbar-text: #a8a29a;
  --admin-topbar-border: #2d2b32;
  --admin-state-success: #34d399;
  --admin-state-warning: #fbbf24;
  --admin-state-danger: #fb7185;
  /* …the remaining dark fields, identical to DEFAULT_ADMIN_THEME_TOKENS_DARK… */
  /* dark shadows read slightly stronger */
  --admin-shadow-soft: 0 1px 2px rgba(0,0,0,.30), 0 4px 12px -6px rgba(0,0,0,.45);
  --admin-shadow-card: 0 1px 3px rgba(0,0,0,.35), 0 12px 32px -16px rgba(0,0,0,.55);
  --admin-shadow-pop:  0 10px 34px -10px rgba(0,0,0,.65);
}
```

> The previous draft overrode the derived **shadcn** vars (`--background`,
> `--primary`, …) in `.dark` — that is the rejected approach: the chrome never
> reads those, so it stayed light. The block above overrides `--admin-*` (what
> the chrome reads) and is fallback-only; steady-state dark is the injected block.

### 4) Soft-shadow / texture utilities (port from prototype `@layer utilities`)

```css
@layer utilities {
  .shadow-soft { box-shadow: var(--shadow-soft-token); }
  .shadow-card { box-shadow: var(--shadow-card-token); }
  .shadow-pop  { box-shadow: var(--shadow-pop-token); }
  /* optional, used by hero/empty surfaces in the prototype */
  .bg-dotted { background-image: radial-gradient(
      color-mix(in oklab, var(--foreground) 8%, transparent) 1px, transparent 1px);
    background-size: 18px 18px; }
}
```

(Tailwind v4 already generates `shadow-soft`/`shadow-card`/`shadow-pop` from the
`@theme` `--shadow-*` entries; the explicit `@layer utilities` versions are a
belt-and-braces fallback — keep whichever the build resolves, do not duplicate
if Tailwind emits them.)

**Data flow:** injected `:root{--admin-*}` (DB light tokens) + injected
`:root.dark{--admin-*}` (shared default dark palette, L02/L04) → `:root` shadcn
derivations read `var(--admin-*)`, so toggling `<html class="dark">` flips both
the chrome (reads `--admin-*` directly) AND the derived shadcn surfaces.

**Error handling:** none (CSS). Guard against the self-referential shadow cycle
(use the `-token` suffix). Verify no existing `--admin-*` name was renamed
(SidebarNav/TopBar/sonner.tsx/button.tsx read them literally).

**Regression-test shape (L07):** assert (a) the raw `globals.css` `@theme`/`:root`
contains `--color-primary-soft`, `--color-info`, `--color-success-soft`,
`--color-sidebar-accent` and the `--popover: var(--admin-card-bg)` re-map, and
that `:root` derives them from `--admin-*` (so the dark `--admin-*` flip
propagates); (b) the emitter's dark pass
`toAdminThemeCssVariables(DEFAULT_ADMIN_THEME_TOKENS_DARK, ":root.dark")` produces
a `:root.dark{…}` block whose CHROME tokens carry the dark hexes
(`--admin-base-bg:#18171a`, `--admin-button-primary-bg:#8b5cf6`,
`--admin-sidebar-bg:#1c1b1f`, `--admin-topbar-bg:#18171a`). Parse the emitter
output / `globals.css` as TEXT — do NOT use jsdom `getComputedStyle`
(happy-dom/jsdom does not resolve `var()` cascade from a stylesheet).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Prototype/build parity: confirm the admin Tailwind build compiles
  (no missing-var warnings) — `bun --cwd core build` (or the admin css build
  task) if available.
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration`
  (injected dark-block emission assertion — the `:root.dark{--admin-*}` chrome
  hexes) and the new globals.css token-presence test from L07.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + statistics on status change.
- `_docs/DESIGN_TOKENS.md`: the "Admin UI maps tokens to shadcn variables" section
  (currently ~line 100) and the new dark-mode section are updated by L07; cross-link this leaf.
- Changelog entry on closure linking **TASK-479** + this leaf.
