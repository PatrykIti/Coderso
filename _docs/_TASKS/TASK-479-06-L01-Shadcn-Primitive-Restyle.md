# TASK-479-06-L01: Shared shadcn Primitive Restyle
# FileName: TASK-479-06-L01-Shadcn-Primitive-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Design System / Primitives
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05 (tokens: `--primary-soft`, `--success-soft`, `--warning-soft`, `--info-soft`, soft shadows, radii)
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-06

---

## Overview

- **Goal:** Bring the prototype's primitive look into the real Radix-backed
  shadcn primitives so every consumer inherits the soft/violet style: rounded
  buttons + a new `soft` variant, soft/success/warning/info `Badge` variants,
  `rounded-2xl` soft-shadow cards with a `CardAction` slot, and matching
  input/textarea/select/switch/checkbox/table/tabs/avatar/separator/progress/
  skeleton/dropdown/tooltip styling. Keep the Radix internals and the existing
  `data-slot` / `asChild` / `VariantProps` API so it is a drop-in.
- **Owning module/service:** `core/admin/components/ui/{button,card,badge,input,textarea,select,switch,checkbox,table,tabs,avatar,separator,progress,dropdown-menu,tooltip}.tsx`
  (all exist today) **plus a new `skeleton.tsx`** — core has **no** `skeleton.tsx`,
  so this leaf **creates** it by porting `_docs/_PROTOTYPE/src/components/ui/skeleton.tsx`
  (the only new file; it is the base primitive that L02's `ListSkeleton`/
  `FormTableSkeleton` compose).
- **Source-of-truth docs:** `_docs/_PROTOTYPE/src/components/ui/*` (port source);
  `_docs/DESIGN_TOKENS.md`; `_docs/_PROTOTYPE/README.md` §"Primitives".
- **Out of scope:** New primitive components **(except the base `skeleton.tsx`,
  which does not yet exist and is created here)**, behavior changes, removing any
  existing variant/size that real code already imports (additive only), and
  `accordion/alert/collapsible/dialog/scroll-area/sheet/slider/sonner` retheme
  beyond token inheritance (they restyle via tokens from TASK-479-05).

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

## Implementation Pseudocode

Ports `_docs/_PROTOTYPE/src/components/ui/{button,badge,card}.tsx` (and siblings)
into the **real** Radix primitives. Additive CVA merge — never drop a variant/
size that real callers already use (`xs`, `icon-xs`, `icon-lg`, `ghost`, `link`).

### `core/admin/components/ui/button.tsx`

```ts
// KEEP: Slot/asChild, data-slot/data-variant/data-size, focus-visible ring.
// ADD prototype "soft" variant; soften radius + add soft shadow + active press.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl " + // was rounded-md
    "text-sm font-medium transition-all outline-none active:scale-[0.98] " +
    "disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 " +
    "[&_svg:not([class*='size-'])]:size-4 shrink-0 " +
    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] " +
    "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // Keep var-indirection so TASK-479-05 token swap flows through.
        default:
          "bg-[var(--admin-button-primary-bg)] text-[var(--admin-button-primary-text)] shadow-soft hover:bg-[var(--admin-button-primary-hover-bg)]",
        soft: "bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft/70", // NEW (proto)
        secondary:
          "bg-[var(--admin-button-secondary-bg)] text-[var(--admin-button-secondary-text)] border border-border hover:bg-[var(--admin-button-secondary-hover-bg)]",
        outline:
          "border border-[var(--admin-button-outline-border)] bg-card text-[var(--admin-button-outline-text)] shadow-soft hover:bg-[var(--admin-button-outline-hover-bg)]",
        ghost:
          "hover:bg-[var(--admin-button-ghost-hover-bg)] hover:text-[var(--admin-button-ghost-hover-text)]",
        destructive:
          "bg-destructive text-white shadow-soft hover:bg-destructive/90 focus-visible:ring-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // KEEP all existing sizes; only adjust rounding to match proto scale.
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-lg px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-lg gap-1.5 px-3 text-[13px] has-[>svg]:px-2.5",
        lg: "h-11 rounded-2xl px-6 text-[15px] has-[>svg]:px-4",
        icon: "size-9 rounded-xl",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-10 rounded-xl",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);
```

### `core/admin/components/ui/badge.tsx`

```ts
// ADD proto soft/success/warning/info variants (keep default/secondary/destructive/outline/ghost/link).
variant: {
  default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
  soft: "border-transparent bg-primary-soft text-primary-soft-foreground",            // NEW
  secondary: "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
  success: "border-transparent bg-success-soft text-success",                          // NEW
  warning: "border-transparent bg-warning-soft text-warning",                          // NEW
  info: "border-transparent bg-info-soft text-info",                                   // NEW
  destructive: "border-transparent bg-destructive/12 text-destructive",               // soften
  outline: "border-border text-foreground [a&]:hover:bg-accent",
  ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
  link: "text-primary underline-offset-4 [a&]:hover:underline",
}
// NOTE: StatusBadge (L02) maps domain status -> these variants; keep names stable.
```

### `core/admin/components/ui/card.tsx`

```ts
// rounded-xl -> rounded-2xl, add shadow-soft; font-display title; add CardAction slot.
function Card(props) {
  return <div data-slot="card"
    className={cn("rounded-2xl border border-border bg-card text-card-foreground shadow-soft", className)} {...props} />;
}
function CardTitle(props) {  // was text-lg/leading-none — match proto display type
  return <div data-slot="card-title"
    className={cn("font-display text-[15px] font-semibold leading-none", className)} {...props} />;
}
function CardAction(props) { // NEW slot (top-right actions) — proto card.tsx
  return <div data-slot="card-action" className={cn("absolute right-5 top-5 flex items-center gap-2", className)} {...props} />;
}
// Keep CardHeader/CardDescription/CardContent/CardFooter; nudge padding to px-5.
export { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter };
```

### Remaining primitives (token + radius pass; skeleton.tsx is NEW)

```text
input.tsx / textarea.tsx               -> rounded-xl, KEEP --admin-input-* (bg/border/placeholder/ring/text), shadow-soft
select.tsx                             -> rounded-xl trigger, KEEP --admin-input-* (bg/border/text), focus ring, shadow-soft
switch.tsx / checkbox.tsx              -> checked uses --primary; rounded; ring tokens
table.tsx                              -> header text muted-foreground, row hover bg-muted/40, soft borders
tabs.tsx                               -> default(pill)/`line`-underline active in --primary; rounded triggers
                                          (real tabs.tsx already exposes variant `line`, data-variant=line — NOT `underline`)
avatar.tsx                             -> rounded-xl fallback bg-muted (proto Avatar shape)
separator.tsx / progress.tsx          -> token colors, progress fill --primary
skeleton.tsx (NEW — create)           -> port proto ui/skeleton.tsx: bg-muted shimmer, rounded
dropdown-menu.tsx / tooltip.tsx        -> rounded-2xl content, shadow-pop, bg-popover, soft item rounding
// Each keeps its Radix root/portal/trigger structure unchanged.
```

**Data flow:** purely presentational — only `className` / CVA variant strings
change. No prop renames, no removed exports, no Radix structural edits. Token
names (`primary-soft`, `success-soft`, `shadow-soft`, `shadow-pop`) are the ones
TASK-479-05 introduces into `core/admin/styles/globals.css`; do not inline hexes.

**Dark-mode tokens (D1):** the chrome primitives keep reading their existing
`--admin-*` variables **directly** — `button` stays on `--admin-button-*`,
`input`/`textarea`/`select` on `--admin-input-*`; do NOT re-route them to derived
shadcn vars (e.g. `border-input`). Their dark values arrive from the per-profile injected
`<style id="coderso-theme-tokens">` `:root.dark{--admin-*}` block (TASK-479-05-L04/
L06), which wins source order, so dark recolors chrome without a static
`globals.css .dark{--admin-*}` rule. The additive `soft`/`success`/`warning`/`info`
variants use derived `--primary-soft`/`--*-soft` tokens whose dark values come from
`globals.css .dark` (05) — those are not chrome the injected style overrides.

**Error handling:** N/A (no runtime branches). Guard against breaking callers:
grep usages of each variant/size before merge; additive-only.

**Regression-test shape:** (covered in L07)
- Render each primitive once per variant/size; assert the variant marker class
  (e.g. `data-variant="soft"`, `bg-primary-soft`, `rounded-2xl`) is present.
- Assert all pre-existing variants/sizes still render (no removed enum members).

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/primitives-variants` (added in L07)
- Confirm no existing admin suite that imports these primitives regresses:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin`

## Documentation Updates Required

- `_docs/_TASKS/README.md` board + Statistics on status change.
- `_docs/DESIGN_TOKENS.md` — list the new primitive variants (`button: soft`;
  `badge: soft/success/warning/info`; `card: rounded-2xl + CardAction`).
- `_docs/_CHANGELOG/` entry on closure linking TASK-479 + TASK-479-06-L01.
