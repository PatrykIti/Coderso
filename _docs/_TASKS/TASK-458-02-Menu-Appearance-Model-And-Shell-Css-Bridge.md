# TASK-458-02: Menu Appearance Model And Shell Css Bridge
# FileName: TASK-458-02-Menu-Appearance-Model-And-Shell-Css-Bridge.md

**Parent Task:** TASK-458
**Priority:** High
**Category:** Menus / Data Model / Public Runtime
**Estimated Effort:** Large
**Dependencies:** None
**Status:** ⏳ To Do

---

## Overview

Give menus a persisted appearance model and make the public shell consume it.

Verified starting state:

- The menus table has NO appearance/settings column — only id, name,
  location, status, publishedAt, createdAt (`core/db/schema.ts:1076-1090`);
  `menu_items.settings` is content/visibility only (visibility, badge,
  description, icon — `core/services/menus/menuItemSettings.ts:1-35`).
- `SiteHeaderNav`'s entire look is the hardcoded `SITE_SHELL_CSS` string
  constant (`core/site/siteShell.tsx:58-84`) — colors, spacing, breakpoints
  baked in — injected by `renderPublicPage.tsx:366` on every public page.
- The only appearance vocabulary in the codebase is the legacy navigation
  widget's `NavigationStyle` (`core/widgets/core/navigation.tsx:79-119`):
  link/hover/active/surface/border colors, fontSize/Weight, textTransform,
  shadow, dropdownDirection, plus layout (alignment, itemGap, paddingY) and
  behavior (sticky, mobileMode) — with a color-value schema accepting
  hex / `var(--color-*)` / rgb / hsl / `transparent`
  (`navigation.tsx:121-135`). It is widget-coupled; nothing maps it to the
  shell today. We borrow the VOCABULARY, not the widget code.
- Menu lifecycle: `publishMenu` / `moveMenuToDraft`
  (`core/services/menus/menuService.ts:155-157`), full-replace transactional
  `replaceMenuItems` (`:255-257`); the shell resolves published menus only
  (`core/services/pages/publicSiteShell.ts`).

Deliverables:

1. **Schema:** new `settings` jsonb column on `menus` with FULL migration
   artifacts — drizzle SQL migration (next `core/db/migrations/00NN_*.sql`),
   `meta/_journal.json` snapshot, and `core/db/schema.ts` update. Nullable;
   null = legacy appearance.
2. **Normalizer:** new `core/services/menus/normalizeMenuAppearance.ts`
   owning the `MenuAppearance` model. Fields (NavigationStyle-inspired,
   token-backed values): surface/link/hover/active colors (transparent is a
   first-class value), item gap and padding, alignment, font size / weight /
   transform, border (color + width), shadow, sticky, dropdown direction,
   mobile mode. Every field optional with the CURRENT hardcoded look as the
   default; unknown keys rejected; colors validated against the
   hex/var-token/rgb/hsl/transparent shapes; numeric values clamped to sane
   ranges.
3. **Service plumbing:** `updateMenu` accepts the appearance through
   `normalizeMenuAppearance` (machine-readable `menu_appearance_invalid`
   errors); appearance ships with the menu's publish/draft lifecycle exactly
   like items do — the published shell renders the published appearance,
   draft edits do not leak.
4. **CSS bridge:** `buildSiteShellCss(appearance: MenuAppearance | null):
   string` replacing the static `SITE_SHELL_CSS` injection — a builder
   mapping each normalized field onto the existing rule set. HARD
   REQUIREMENT: `buildSiteShellCss(null)` (and the all-defaults model)
   reproduces the current stylesheet byte-identically — legacy menus render
   exactly as today (fail-closed defaults). `resolvePublicSiteShell` /
   `publicSite.tsx` thread the published menu's appearance to the builder.

---

## Sub-Tasks

- [ ] Migration artifacts: `menus.settings` jsonb (SQL + journal +
      schema.ts).
- [ ] `normalizeMenuAppearance` module: model, defaults pinned to the current
      look, color/enum/clamp validation, reject-unknown,
      `menu_appearance_invalid` sentinel.
- [ ] Menu service + routes: persist appearance on update, carry it through
      publish/draft, expose it on `getMenuWithItems`/shell resolution.
- [ ] `buildSiteShellCss` builder + byte-identity guarantee; swap the static
      constant injection in `renderPublicPage.tsx` for the built CSS threaded
      from the resolved shell.
- [ ] Bun + vitest coverage (below).

---

## Implementation Pseudocode

```ts
// core/services/menus/normalizeMenuAppearance.ts
export type MenuAppearance = {
  surfaceColor?: string;   // hex | var(--color-*) | rgb()/hsl() | "transparent"
  linkColor?: string; linkHoverColor?: string; linkActiveColor?: string;
  itemGap?: number;        // clamp e.g. 0..64 px
  paddingY?: number; paddingX?: number;
  alignment?: "start" | "center" | "end" | "space-between";
  fontSize?: number;       // clamp
  fontWeight?: 400 | 500 | 600 | 700;
  textTransform?: "none" | "uppercase" | "capitalize";
  borderColor?: string; borderWidth?: number;
  shadow?: "none" | "sm" | "md";
  sticky?: boolean;
  dropdownDirection?: "bottom" | "top";
  mobileMode?: "disclosure" | "inline"; // disclosure = current <details> UX
};
export function normalizeMenuAppearance(value: unknown): MenuAppearance
// throws { code: "menu_appearance_invalid", field } on bad shapes;
// silently fills nothing — defaults are applied at CSS-build time.

// core/site/siteShell.tsx (or sibling module)
export function buildSiteShellCss(appearance: MenuAppearance | null): string {
  const a = { ...SHELL_APPEARANCE_DEFAULTS, ...(appearance ?? {}) };
  return `...same selectors as SITE_SHELL_CSS, values from a...`;
}
// SHELL_APPEARANCE_DEFAULTS encodes today's hardcoded values so that
// buildSiteShellCss(null) === <current SITE_SHELL_CSS output>.
```

Expected data flow: admin saves appearance (TASK-458-03 panel) -> menu route
-> `normalizeMenuAppearance` -> `menus.settings` (draft) -> `publishMenu`
snapshots it -> `resolvePublicSiteShell` returns the published menu incl.
appearance -> `renderPublicPage` injects `buildSiteShellCss(appearance)`
instead of the constant.

Error handling: invalid appearance rejected at write time with
`menu_appearance_invalid` (never persisted); render path NEVER throws — any
missing/legacy/unparsable stored value degrades to the default look. CSS
output contains only builder-emitted values (validated colors, clamped
numbers, enum strings) — stored input is never interpolated raw.

Regression-test shape: Bun — byte-identity (`buildSiteShellCss(null)` vs the
pinned current stylesheet), per-field CSS mapping, publish/draft appearance
isolation, menu service round-trip; vitest — normalizer accept/reject/clamp
matrix incl. transparent and `var(--color-*)` tokens, reject-unknown.

---

## Security Contract

- **Endpoint visibility:** no new endpoints — appearance rides the existing
  internal menu update/publish routes; public surface is read-only CSS.
- **Auth model:** admin session for writes; anonymous public read.
- **RBAC:** existing `menus:write` for appearance changes (same routes).
- **CSRF:** unchanged — existing menu route write behavior.
- **Rate-limit bucket:** unchanged.
- **Validation:** appearance is schema-owned by `normalizeMenuAppearance`
  (enum/clamp/color-shape validation, reject-unknown); PUBLIC CSS IS BUILT
  ONLY FROM SCHEMA-CLAMPED VALUES — no raw user strings reach the stylesheet
  (prevents CSS/HTML injection through the style channel); draft appearance
  never renders publicly (published snapshot only).
- **Anti-abuse controls:** not applicable (no public writes).

---

## Testing Requirements

- Bun: menu service appearance suites, shell CSS builder byte-identity +
  mapping, public-site render with styled published menu (env loaded).
- `bun run test:vitest` (normalizer matrix).
- Migration applies cleanly on a fresh DB and on the existing dev DB
  (nullable column, no backfill needed).
- `bun --cwd core lint`, `bun --cwd core lint:types`, root tsc.

---

## Documentation Updates Required

- `_docs/DATA_MODEL.md` (menus.settings).
- `_docs/PAGE_MODEL.md` (shell appearance contract + fail-closed defaults).
