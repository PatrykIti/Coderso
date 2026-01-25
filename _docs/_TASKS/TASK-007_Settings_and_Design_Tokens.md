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
core/services/theme/
  tokenService.ts
core/server/routes/
  settingsRoutes.ts
core/server/validation/
  settingsSchemas.ts
core/admin/ui/settings/
  SettingsPage.tsx
  DesignTokensEditor.tsx
core/ui/theme/
  tokenCss.ts

tests/unit/settings/
  settingsService.test.ts
  tokenService.test.ts
```

---

## Sub-Tasks

### TASK-007-01_Settings_schema_and_service

**Status:** To Do

Schema example:

```ts
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

Rules:
- Keys are namespaced (e.g. `site.*`, `design.tokens`, `media.*`).
- Reject unknown keys unless explicitly allowlisted.
- Values are validated per key (type-safe).

Service example:

```ts
async function getSetting<T>(key: string): Promise<T | null> {
  const row = await db.select().from(settings).where(eq(settings.key, key));
  return row[0]?.value ?? null;
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/db/schema.ts` | settings table |
| `core/services/settings/settingsService.ts` | get/set/delete |

Service sketch:

```ts
const ALLOWED_KEYS = new Set([
  "site.name",
  "site.locale",
  "design.tokens",
]);

export async function setSetting(key: string, value: unknown) {
  if (!ALLOWED_KEYS.has(key)) throw new Error("Unknown setting key");
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({
    target: settings.key,
    set: { value, updatedAt: new Date() },
  });
}
```

---

### TASK-007-02_Settings_admin_API

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

Rules:
- `PATCH /settings` accepts a map of keys -> values and writes atomically.
- Reject unknown keys and invalid value types.
- Return merged view for `GET /settings` (with defaults applied).

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/server/routes/settingsRoutes.ts` | settings endpoints |
| `core/server/validation/settingsSchemas.ts` | validation rules |

Validation sketch:

```ts
export const setSettingSchema = {
  type: "object",
  required: ["key", "value"],
  properties: {
    key: { type: "string" },
    value: {},
  },
  additionalProperties: false,
};
```

Route sketch:

```ts
router.patch("/settings/:key", requirePermission("settings:write"), async (req) => {
  await setSetting(req.params.key, req.body.value);
  return json({ ok: true });
});
```

---

### TASK-007-03_Design_token_pipeline

**Status:** To Do

Rules:
- Start from theme defaults.
- Merge `settings["design.tokens"]` overrides.
- Emit CSS variables in SSR layout and admin preview.
- Cache merged tokens in memory and invalidate on update.

Example:

```ts
function buildTokenCss(tokens) {
  return `:root{` +
    `--color-primary:${tokens.colors.primary};` +
    `--color-secondary:${tokens.colors.secondary};` +
  `}`;
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/services/theme/tokenService.ts` | merge + resolve tokens |
| `core/ui/theme/tokenCss.ts` | css output helper |

Token service sketch:

```ts
export function mergeTokens(defaults: Tokens, overrides?: Tokens): Tokens {
  return {
    ...defaults,
    colors: { ...defaults.colors, ...overrides?.colors },
    spacing: { ...defaults.spacing, ...overrides?.spacing },
  };
}
```

Token CSS sketch:

```ts
export function toCssVariables(tokens: Tokens) {
  return `:root{--color-primary:${tokens.colors.primary};}`;
}
```

---

### TASK-007-04_Admin_UI_for_settings_and_tokens

**Status:** To Do

UI:
- Global settings page (site name, locale, etc.).
- Design tokens editor with live preview.
- Save token overrides to `settings["design.tokens"]`.
- Reset to defaults button (clears overrides).

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/admin/ui/settings/SettingsPage.tsx` | settings form |
| `core/admin/ui/settings/DesignTokensEditor.tsx` | token editor |

UI sketch:

```tsx
<DesignTokensEditor
  value={tokens}
  onChange={setTokens}
  onReset={resetToDefaults}
/>
```

Settings page sketch:

```tsx
<SettingsPage
  values={settings}
  onSave={(next) => saveSettings(next)}
/>
```

---

## Testing Requirements

- [ ] `tests/unit/settings/settingsService.test.ts` CRUD for settings.
- [ ] `tests/unit/settings/tokenService.test.ts` merges defaults + overrides.
- [ ] `tests/integration/routes/settings.test.ts` validates endpoints.
- [ ] `tests/integration/routes/settings.test.ts` rejects invalid keys.

Test sketch (settings.test.ts):

```ts
it("rejects unknown key", async () => {
  const res = await api.patch("/settings/unknown.key", { value: "x" });
  expect(res.status).toBe(400);
});
```

---

## New Files to Create

- `core/services/settings/settingsService.ts`
- `core/services/theme/tokenService.ts`
- `core/server/routes/settingsRoutes.ts`
- `core/server/validation/settingsSchemas.ts`
- `core/ui/theme/tokenCss.ts`
- `core/admin/ui/settings/SettingsPage.tsx`
- `core/admin/ui/settings/DesignTokensEditor.tsx`
- `tests/unit/settings/settingsService.test.ts`
- `tests/unit/settings/tokenService.test.ts`
- `tests/integration/routes/settings.test.ts`

---

## Documentation Updates Required

- `_docs/DESIGN_TOKENS.md` (merge order and storage key).
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
