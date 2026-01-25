# TASK-007: Settings and Design Tokens
# FileName: TASK-007_Settings_and_Design_Tokens.md

**Priority:** Medium
**Category:** CMS/Settings
**Estimated Effort:** Medium
**Dependencies:** TASK-001, TASK-004
**Status:** To Do

---

## Overview

Implement global settings storage plus design token overrides. Provide admin
API and UI to update settings and generate CSS variables consumed by core
and plugins.

**Goals:**
- Settings CRUD aligned with `DATA_MODEL.md`.
- Token override pipeline (theme defaults -> global overrides).
- Admin UI for global settings and token editing.

---

## Architecture

```
core/db/schema.ts
core/services/settings/
  settingsService.ts
core/server/routes/
  settingsRoutes.ts
core/ui/settings/
  SettingsPage.tsx
  DesignTokensEditor.tsx
core/ui/theme/
  tokenCss.ts
```

---

## Sub-Tasks

### TASK-007-1: Settings schema and service

**Status:** To Do

Schema example:

```ts
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

Service example:

```ts
async function getSetting<T>(key: string): Promise<T | null> {
  const row = await db.select().from(settings).where(eq(settings.key, key));
  return row[0]?.value ?? null;
}

async function setSetting<T>(key: string, value: T) {
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({
    target: settings.key,
    set: { value, updatedAt: new Date() },
  });
}
```

---

### TASK-007-2: Settings admin API

**Status:** To Do

Endpoints:
- `GET /settings`
- `GET /settings/:key`
- `PATCH /settings/:key`
- `PATCH /settings`

Example payload:

```json
{
  "key": "site.locale",
  "value": "pl-PL"
}
```

---

### TASK-007-3: Design token pipeline

**Status:** To Do

Rules:
- Start from theme defaults.
- Merge `settings["design.tokens"]` overrides.
- Emit CSS variables in SSR layout and admin preview.

Example:

```ts
type Tokens = {
  colors: { primary: string; secondary: string; accent: string };
  neutrals: { bg: string; surface: string; text: string };
};

function buildTokenCss(tokens: Tokens) {
  return `:root{` +
    `--color-primary:${tokens.colors.primary};` +
    `--color-secondary:${tokens.colors.secondary};` +
    `--color-accent:${tokens.colors.accent};` +
    `--color-bg:${tokens.neutrals.bg};` +
    `--color-surface:${tokens.neutrals.surface};` +
    `--color-text:${tokens.neutrals.text};` +
  `}`;
}
```

---

### TASK-007-4: Admin UI for settings and tokens

**Status:** To Do

UI needs:
- Global settings page (site name, locale, etc.).
- Design tokens editor with live preview.
- Save token overrides to `settings["design.tokens"]`.

---

## Testing Requirements

- [ ] Settings CRUD (get/set/delete) works and persists in DB.
- [ ] Token CSS reflects defaults + overrides.
- [ ] Invalid keys or invalid token values are rejected by validation.

---

## Documentation Updates Required

- `_docs/DESIGN_TOKENS.md` (token merge order and storage key).
- `_docs/CMS_API.md` (settings endpoints).
- `_docs/DATA_MODEL.md` (if schema changes).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-settings-and-design-tokens.md`
- Notes: settings CRUD + token overrides.

---

## Additional Docs

- `_docs/CMS_SPEC.md`
- `_docs/THEMES_SPEC.md`
