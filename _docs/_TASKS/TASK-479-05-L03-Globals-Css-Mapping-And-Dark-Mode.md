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
state utilities, set warm/violet defaults, and add the static `.dark { … }`
override layer per the L01 decision. After this leaf the admin renders the
prototype look in light, and `<html class="dark">` flips it to the prototype dark
palette.

- **Goal:** Map L02's new tokens to shadcn vars and ship a token-faithful dark
  layer, so Tailwind utilities (`bg-primary-soft`, `text-info`, `shadow-card`,
  `bg-success-soft`, sidebar accents) resolve.
- **Owning module/service:** `core/admin/styles/globals.css`.
- **Source-of-truth docs:** `_docs/_PROTOTYPE/src/styles/theme.css` (the
  authoritative @theme/:root/.dark to mirror), L01 mapping table.
- **Out of scope:** the contract/emitter (L02), the toggle that adds the `dark`
  class (L06), per-page utility adoption (TASK-479-07).

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). CSS-only leaf.

---

## Implementation Pseudocode

Target file `core/admin/styles/globals.css`. Mirror prototype `theme.css`
(`@theme inline` + `:root` + `.dark`) but keep the real admin's `--admin-*`
indirection so DB templates still drive light values.

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

### 3) `.dark { … }` static override layer (NEW — the L01 decision)

Override the derived **shadcn** vars (NOT `--admin-*`) with the prototype's dark
hexes so per-template custom light `--admin-*` never leak into dark. Copy values
verbatim from `_docs/_PROTOTYPE/src/styles/theme.css` `.dark`:

```css
.dark {
  --background: #18171a;
  --foreground: #ededec;
  --card: #211f24;
  --card-foreground: #ededec;
  --popover: #232127;
  --popover-foreground: #ededec;
  --primary: #8b5cf6;
  --primary-foreground: #ffffff;
  --primary-soft: #2a2440;
  --primary-soft-foreground: #c4b5fd;
  --secondary: #29272e;
  --secondary-foreground: #d8d4ce;
  --muted: #232128;
  --muted-foreground: #a09a91;
  --accent: #2b2930;
  --accent-foreground: #ededec;
  --destructive: #fb7185;
  --destructive-foreground: #1c1a17;
  --success: #34d399; --success-foreground: #06281c; --success-soft: #18342a;
  --warning: #fbbf24; --warning-foreground: #2a1c05; --warning-soft: #36290f;
  --info: #60a5fa;    --info-foreground: #07203f;    --info-soft: #16263f;
  --border: #2d2b32;
  --input: #36333c;
  --ring: #8b5cf6;
  --sidebar: #1c1b1f;
  --sidebar-foreground: #a8a29a;
  --sidebar-muted: #756f68;
  --sidebar-accent: #2c2542;
  --sidebar-accent-foreground: #c4b5fd;
  --sidebar-border: #2a282f;
  /* dark shadows read slightly stronger */
  --shadow-soft-token: 0 1px 2px rgba(0,0,0,.30), 0 4px 12px -6px rgba(0,0,0,.45);
  --shadow-card-token: 0 1px 3px rgba(0,0,0,.35), 0 12px 32px -16px rgba(0,0,0,.55);
  --shadow-pop-token:  0 10px 34px -10px rgba(0,0,0,.65);
}

/* the real admin maps shadcn --foo from --admin-* in :root; the injected
   coderso-theme-tokens <style> ALSO sets --admin-* at :root (light only). The
   .dark block above overrides the derived shadcn vars directly, so toggling the
   class wins regardless of the injected light --admin-* values. */
```

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

**Data flow:** injected `:root{--admin-*}` (DB light tokens) → `:root` shadcn
derivations → `.dark` overrides shadcn vars when `<html class="dark">`.

**Error handling:** none (CSS). Guard against the self-referential shadow cycle
(use the `-token` suffix). Verify no existing `--admin-*` name was renamed
(SidebarNav/TopBar/sonner.tsx/button.tsx read them literally).

**Regression-test shape (L07):** a Vitest assertion that the compiled/raw
globals.css contains `--color-primary-soft`, `--color-info`,
`--color-success-soft`, `--color-sidebar-accent`, the `.dark` block, and that
`.dark` sets `--background:#18171a`. A jsdom render test toggling
`document.documentElement.classList.add("dark")` asserts a card resolves the
dark `--card`.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Prototype/build parity: confirm the admin Tailwind build compiles
  (no missing-var warnings) — `bun --cwd core build` (or the admin css build
  task) if available.
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration`
  (dark-class render assertion) and the new globals.css token-presence test from
  L07.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + statistics on status change.
- `_docs/DESIGN_TOKENS.md` "Admin UI mapuje tokeny na zmienne shadcn …" line and
  the new dark-mode section are updated by L07; cross-link this leaf.
- Changelog entry on closure linking **TASK-479** + this leaf.
