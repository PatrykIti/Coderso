# TASK-479-05-L04: admin-default Theme + DB Default Template
# FileName: TASK-479-05-L04-Admin-Default-Theme-And-DB-Template.md

**Parent Subtask:** TASK-479-05
**Priority:** Medium
**Category:** Admin UI / Design System / Theming
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05-L02
**Status:** ✅ Done (2026-06-28; see "Closeout" below)

---

## Overview

Make a **fresh install** ship the violet/soft theme, and seed a discoverable
"Soft Violet" admin theme template in the DB so the look is editable from the
Visual → Admin UI Theme screen. Preserve backward compat for existing custom
templates and profiles.

- **Goal:** Update `themes/admin-default/theme.json` to the violet/warm palette,
  add an **idempotent** default `admin_theme_templates` seed row, and define the
  shared **dark** token palette `DEFAULT_ADMIN_THEME_TOKENS_DARK` (per-token dark
  values) that the injected style emits for every profile (D1) — all without
  forcing any DB schema migration (tokens are `jsonb`; the dark palette is a
  code-side constant, no DB row).
- **Owning module/service:** `themes/admin-default/theme.json`,
  `core/db/seed.ts` (+ `core/services/adminThemes/adminThemeTemplateService.ts`
  /`adminThemeProfileService.ts` if the seed reuses service create paths),
  `core/services/adminThemes/tokenTypes.ts` (`DEFAULT_ADMIN_THEME_TOKENS_DARK`).
- **Source-of-truth docs:** `_docs/THEMES_SPEC.md`, `_docs/DESIGN_TOKENS.md`,
  L01/L02 default values.
- **Out of scope:** contract/emitter (L02), CSS mapping (L03), editor UI (L05),
  dark toggle (L06).

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). The seed runs in the existing trusted
seeding path; it must be idempotent (upsert by unique `name`) and must NOT
deactivate or overwrite an operator's existing active profile/templates.

---

## Schema-versioning determination (do this first)

`admin_theme_templates.tokens` is a `jsonb` column (`core/db/schema.ts` ~L1065);
the token shape is enforced in the app layer (`assertAdminThemeTokens`), NOT by
DB columns. **Therefore NO new SQL migration / `meta` snapshot / `_journal.json`
entry is required** to carry the L02 token fields — the new keys are just more
jsonb. Only create migration artifacts (`core/db/migrations/00NN_*.sql` + meta
snapshot + journal bump) IF this leaf adds a NEW column or constraint (it does
not). State this explicitly in the closeout so no one adds a needless migration.

There are two "default" surfaces, keep them distinct:

1. `themes/admin-default/theme.json` — a `theme.json` in the **site/front theme**
   token shape (`colors/neutrals/spacing/radius/typography` = `DesignTokens`),
   labelled "Default admin UI theme template." Update its palette for brand
   consistency, but it is NOT the `AdminThemeTokens` source.
2. The **code default** `DEFAULT_ADMIN_THEME_TOKENS` (L02) — the actual resolved
   admin tokens when no active profile/template exists
   (`getResolvedAdminThemeTokens` → `mergeAdminThemeTokens(defaults, null)`).
   Updating it (L02) already makes a fresh install boot violet/soft. This leaf
   additionally seeds a DB ROW so the theme is visible/editable.

---

## Implementation Pseudocode

### 1) `themes/admin-default/theme.json` — re-palette to violet/warm

```jsonc
{
  "name": "admin-default",
  "version": "1.1.0",                 // bump
  "description": "Default admin UI theme — Soft & Friendly (violet).",
  "templates": ["page", "content", "error"],
  "tokens": {
    "colors": { "primary": "#7c3aed", "secondary": "#f1efeb", "accent": "#ece6fb" },
    "neutrals": { "bg": "#f6f5f2", "surface": "#f3f1ed", "border": "#eae7e0", "text": "#1c1a17" },
    "spacing": { /* unchanged */ },
    "radius": { "sm": "8px", "md": "12px", "lg": "16px", "xl": "24px" },  // softer rounding
    "typography": {
      "sans": "\"Inter\", ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
      "display": "\"Inter Tight\", \"Inter\", ui-sans-serif, system-ui, sans-serif",
      "sm": "0.875rem", "md": "1rem", "lg": "1.125rem", "xl": "1.25rem", "2xl": "1.5rem"
    }
  }
}
```

> Keep the existing key SHAPE (front `DesignTokens`); only re-value. If any
> snapshot test pins this file, update the snapshot in the same commit.

### 2) DB seed — idempotent "Soft Violet" admin template — `core/db/seed.ts`

```ts
import { DEFAULT_ADMIN_THEME_TOKENS } from "../services/adminThemes/tokenTypes";
import { adminThemeTemplates, adminThemeProfiles } from "./schema";

const DEFAULT_ADMIN_TEMPLATE_NAME = "Soft Violet";

async function seedDefaultAdminTheme() {
  // idempotent: unique index admin_theme_templates_name_idx on (name)
  const [existing] = await db.select().from(adminThemeTemplates)
    .where(eq(adminThemeTemplates.name, DEFAULT_ADMIN_TEMPLATE_NAME));

  const tokens = DEFAULT_ADMIN_THEME_TOKENS;       // single source of truth (L02)
  let templateId = existing?.id;
  if (!existing) {
    const [row] = await db.insert(adminThemeTemplates).values({
      name: DEFAULT_ADMIN_TEMPLATE_NAME,
      description: "Soft & Friendly violet admin look (default).",
      tokens,                                       // jsonb; passes assertAdminThemeTokens
      createdAt: new Date(), updatedAt: new Date(),
    }).returning();
    templateId = row.id;
  } else {
    // refresh tokens to current defaults ONLY if operator never edited it
    // (skip if description/tokens diverged — never clobber custom edits)
  }

  // Activate ONLY if there is no active profile yet (don't override operator choice)
  const [active] = await db.select().from(adminThemeProfiles)
    .where(eq(adminThemeProfiles.isActive, true));
  if (!active && templateId) {
    await db.insert(adminThemeProfiles).values({
      name: "Default", templateId, isActive: true,
      createdAt: new Date(), updatedAt: new Date(),
    });
  }
}
```

- Run `seedDefaultAdminTheme()` from the existing seed entrypoint.
- Validate `tokens` with `assertAdminThemeTokens` before insert (or rely on
  `createAdminThemeTemplate` service which already asserts).

**Data flow:** seed → DB row (jsonb) → `getResolvedAdminThemeTokens` resolves it
(or, with no active profile, falls back to `DEFAULT_ADMIN_THEME_TOKENS`, same
values) → emitter → CSS.

**Error handling:** idempotent on the unique `name`; never deactivate an
existing active profile; never overwrite operator-edited token values (only
insert-if-missing). On insert failure, seed continues (log, do not crash the
seed run).

**Backward compat:** existing custom templates are untouched. Existing rows that
predate L02's new groups resolve through `normalizeAdminThemeTokens`/
`mergeAdminThemeTokens` (L02) — they keep working and gain violet defaults for
the new fields.

### 3) Dark token palette — `DEFAULT_ADMIN_THEME_TOKENS_DARK` (D1)

Define a full-shape dark default next to the light `DEFAULT_ADMIN_THEME_TOKENS`
(declared in L02 `tokenTypes.ts`; **values frozen here**). Per D1 the injected
`<style>` emits this as the `:root.dark{--admin-*}` block for EVERY profile, so
the real chrome (which reads `--admin-*` directly) recolors in dark with zero
data migration. Values are the prototype `_PROTOTYPE/src/styles/theme.css`
`.dark` hexes — **including the `topbar` values the inventory previously omitted**:

```ts
export const DEFAULT_ADMIN_THEME_TOKENS_DARK: AdminThemeTokens = {
  base: { bg: "#18171a", surface: "#232128", text: "#ededec", border: "#2d2b32" },
  buttons: {
    primary: { bg: "#8b5cf6", text: "#ffffff", hoverBg: "#7c3aed", hoverText: "#ffffff" },
    secondary: { bg: "#29272e", text: "#d8d4ce", hoverBg: "#34313a", hoverText: "#ededec" },
    outline: { border: "#2d2b32", text: "#ededec", hoverBg: "#2b2930", hoverText: "#ededec" },
    ghost: { hoverBg: "#2b2930", hoverText: "#ededec" },
  },
  primarySoft: { bg: "#2a2440", text: "#c4b5fd" },             // NEW (L02)
  inputs: { bg: "#211f24", border: "#36333c", text: "#ededec",
            placeholder: "#756f68", focusRing: "#8b5cf6" },
  sidebar: {
    bg: "#1c1b1f", text: "#a8a29a", activeBg: "#2c2542", activeText: "#c4b5fd",
    hoverBg: "#2b2930",
    muted: "#756f68", accent: "#2c2542", accentForeground: "#c4b5fd", border: "#2a282f", // NEW
  },
  topbar: { bg: "#18171a", text: "#a8a29a", border: "#2d2b32" }, // dark chrome path (was missing)
  card: { bg: "#211f24", border: "#2d2b32" },
  typography: { /* same fonts/sizes as light */ mutedText: "#a09a91" },
  state: {
    success: "#34d399", warning: "#fbbf24", danger: "#fb7185",
    info: "#60a5fa", infoForeground: "#07203f",                 // NEW
    successSoft: "#18342a", warningSoft: "#36290f", infoSoft: "#16263f", // NEW
  },
  effects: {                                                    // NEW (dark = slightly stronger)
    shadowSoft: "0 1px 2px rgba(0,0,0,.30), 0 4px 12px -6px rgba(0,0,0,.45)",
    shadowCard: "0 1px 3px rgba(0,0,0,.35), 0 12px 32px -16px rgba(0,0,0,.55)",
    shadowPop: "0 10px 34px -10px rgba(0,0,0,.65)",
  },
};
```

- `assertAdminThemeTokens(DEFAULT_ADMIN_THEME_TOKENS_DARK)` must pass (same
  strict shape as light).
- The seeded "Soft Violet" DB template stays **light-only**; dark is the SHARED
  default constant above, not a separate template/profile (per-template dark is
  the deferred L01 follow-up). No DB row, no migration for the dark palette.

**Regression-test shape (L07 + here):**

- Seed is idempotent: running twice yields exactly one "Soft Violet" template
  and at most one active profile.
- Seed does NOT flip an already-active profile.
- `themes/admin-default/theme.json` parses and its tokens match the violet
  palette (snapshot or field assertions).
- `assertAdminThemeTokens(DEFAULT_ADMIN_THEME_TOKENS)` passes (guards the seed
  payload).
- `assertAdminThemeTokens(DEFAULT_ADMIN_THEME_TOKENS_DARK)` passes and carries the
  dark chrome hexes (`base.bg === "#18171a"`, `topbar.bg === "#18171a"`,
  `sidebar.bg === "#1c1b1f"`, `buttons.primary.bg === "#8b5cf6"`).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/unit/adminThemes`
  (seed-shape + theme.json assertions; mock the db layer or use the existing
  seed test harness — do NOT hit a real DB in Vitest).
- If a DB-backed seed integration test exists in the runtime lane, run it there;
  do not port it to Vitest for coverage.
- State explicitly whether the seed was exercised against a live DB.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + statistics on status change.
- `_docs/THEMES_SPEC.md`: note the seeded default "Soft Violet" admin template
  + that admin token fields are jsonb (no migration needed for new tokens).
- Changelog entry on closure linking **TASK-479** + this leaf.

---

## Closeout (2026-06-28)

**Delivered**

1. **`themes/admin-default/theme.json` re-paletted** to the violet/warm
   "Soft & Friendly" look (version `1.1.0`, violet primary `#7c3aed`, warm
   neutrals, softer `8/12/16/24px` radii, Inter/Inter Tight). Same front
   `DesignTokens` key SHAPE — re-valued only — so `parseThemeJson` /
   `assertTokenOverrides` still accept it (smoke-verified; new
   `tests/unit/adminThemes/adminDefaultThemeJson.test.ts`).
2. **Idempotent default-admin-theme seed.** Pure, DB-agnostic orchestration in
   `core/db/seedAdminTheme.ts` (`runDefaultAdminThemeSeed(store, log?)` over an
   `AdminThemeSeedStore` port + the `DEFAULT_ADMIN_TEMPLATE_NAME = "Soft Violet"`
   constant), wired to the real Drizzle tables by `seedDefaultAdminTheme()` in
   `core/db/seed.ts` and run from the seed entrypoint after `seedAdmin()`. It
   inserts the template only when missing (upsert by unique `name`), activates a
   `"Default"` profile ONLY when no active profile exists, never deactivates an
   operator's active profile, never overwrites operator-edited tokens, and is
   non-fatal on insert failure. The seeded `tokens` payload is the single source
   of truth `DEFAULT_ADMIN_THEME_TOKENS` (L02) and is `assertAdminThemeTokens`-guarded.
3. **`DEFAULT_ADMIN_THEME_TOKENS_DARK` values frozen** (constant declared by
   L02). One value corrected to honor this leaf's frozen spec: dark
   `inputs.placeholder` `#79716b → #756f68` (the dark muted tone), mirrored in
   L03's `globals.css :root.dark` pre-paint fallback to keep that block's
   documented "mirror of the constant" invariant. All other dark chrome hexes
   already matched (incl. `topbar`, and the L01 §B non-white solid-status
   foregrounds `successForeground #06281c` / `warningForeground #2a1c05` /
   `dangerForeground #1c1a17` / `infoForeground #07203f`).

**Reconciliation note (effects shadows).** The leaf pseudocode's "dark = slightly
stronger" `rgba(0,0,0,…)` shadow values were NOT applied: the authoritative L01
inventory lists the dark shadow column as `(same)` and the prototype
`theme.css` defines `--shadow-*` once (no `.dark` override). Per the
orchestration directive to honor the L01 inventory (and to keep the constant ==
globals fallback invariant), `effects` in `DEFAULT_ADMIN_THEME_TOKENS_DARK`
stays identical to the light values, matching L02/L03 as shipped.

**Schema-versioning determination.** Confirmed NO SQL migration / `meta`
snapshot / `_journal.json` bump was added: `admin_theme_templates.tokens` is a
`jsonb` column and the new L02 token fields are just more jsonb; the dark palette
is a code-side constant with no DB row. (Latest journal tag at impl time:
`0063_yummy_glorian`; untouched.)

**Validation**

- `bun --cwd core lint` — clean.
- `bun --cwd core lint:types` — clean.
- `bun test tests/unit/adminThemes` — 26 pass / 0 fail (5 files). NOTE: the
  `tests/unit/**` suites are the **Bun** test lane (`import … "bun:test"`), run
  via `bun test`; they are NOT collected by `vitest.config.ts` (`include:
  tests/vitest/**`). The seed test uses an in-memory fake `AdminThemeSeedStore`
  — it does NOT hit a live DB (the seed was NOT exercised against a real
  database in this leaf).

**Pre-existing, out-of-scope (flagged for L05/L06):** the repo-wide
`tsc -p tsconfig.json` (root, includes `tests/`) reports 12 errors in 5 vitest
fixtures (`tests/vitest/ui/theme-editor`, `theme-profile-drawer`,
`theme-template-drawer-wave`, `drawers`, `admin/adminThemeClient`) that build
`AdminThemeTokens` literals WITHOUT the L02-added `primarySoft`/`effects` groups.
These were introduced by L02's contract extension (the required L02 gate is only
`core` typecheck) and belong to the L05 editor-controls fixtures — none are in
files this leaf touched.
