# TASK-479-05-L04: admin-default Theme + DB Default Template
# FileName: TASK-479-05-L04-Admin-Default-Theme-And-DB-Template.md

**Parent Subtask:** TASK-479-05
**Priority:** Medium
**Category:** Admin UI / Design System / Theming
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05-L02
**Status:** ⏳ To Do

---

## Overview

Make a **fresh install** ship the violet/soft theme, and seed a discoverable
"Soft Violet" admin theme template in the DB so the look is editable from the
Visual → Admin UI Theme screen. Preserve backward compat for existing custom
templates and profiles.

- **Goal:** Update `themes/admin-default/theme.json` to the violet/warm palette
  and add an **idempotent** default `admin_theme_templates` seed row, without
  forcing any DB schema migration (tokens are `jsonb`).
- **Owning module/service:** `themes/admin-default/theme.json`,
  `core/db/seed.ts` (+ `core/services/adminThemes/adminThemeTemplateService.ts`
  /`adminThemeProfileService.ts` if the seed reuses service create paths).
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

**Regression-test shape (L07 + here):**

- Seed is idempotent: running twice yields exactly one "Soft Violet" template
  and at most one active profile.
- Seed does NOT flip an already-active profile.
- `themes/admin-default/theme.json` parses and its tokens match the violet
  palette (snapshot or field assertions).
- `assertAdminThemeTokens(DEFAULT_ADMIN_THEME_TOKENS)` passes (guards the seed
  payload).

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
