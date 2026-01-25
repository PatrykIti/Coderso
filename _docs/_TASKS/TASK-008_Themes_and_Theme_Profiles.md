# TASK-008: Themes and Theme Profiles
# FileName: TASK-008_Themes_and_Theme_Profiles.md

**Priority:** Medium
**Category:** CMS/Themes
**Estimated Effort:** Large
**Dependencies:** TASK-001, TASK-007
**Status:** To Do

---

## Overview

Implement theme registry, theme profiles, route mapping, and template
resolution. This enables multiple site looks and quick switching between
profiles (front 1, front 2).

**Goals:**
- Load theme packages from `/themes`.
- CRUD theme profiles with tokens and route mapping.
- Deterministic template resolution order.

---

## Architecture

```
core/themes/
  registry.ts
  resolver.ts
core/services/themes/
  themeService.ts
  themeProfileService.ts
core/server/routes/
  themeRoutes.ts
core/ui/themes/
  ThemeList.tsx
  ThemeProfileEditor.tsx
```

---

## Sub-Tasks

### TASK-008-1: Theme registry and loader

**Status:** To Do

Rules:
- Theme package lives in `/themes/<name>`.
- Each theme has `theme.json` + templates + styles.
- Registry indexes themes at boot.

Example loader:

```ts
type ThemeMeta = { name: string; version: string; tokens: Record<string, any> };

function loadThemes(themeDir: string): ThemeMeta[] {
  // Read /themes/*/theme.json and return metadata
  return [];
}
```

---

### TASK-008-2: Theme profiles and routes

**Status:** To Do

Profiles map paths to pages without duplicating page data.

Example:

```ts
await createThemeProfile({
  name: "front-a",
  themeId,
  tokens: { colors: { primary: "#111" } },
  settings: { header: "minimal" },
  isActive: true,
});

await setThemeRoutes(profileId, [
  { path: "/", pageId: "homeA" },
  { path: "/kontakt", pageId: "contactA" },
]);
```

Enforce only one active profile at a time.

---

### TASK-008-3: Template resolution order

**Status:** To Do

Resolution:
1. Theme template
2. Plugin view
3. Core default

Example resolver:

```ts
function resolveTemplate(input: {
  theme: string;
  type: "page" | "content" | "error";
  key: string;
}) {
  const candidates = [
    `themes/${input.theme}/templates/${input.type}-${input.key}.tsx`,
    `themes/${input.theme}/templates/${input.type}.tsx`,
    `plugins/views/${input.type}-${input.key}.tsx`,
    `core/templates/${input.type}.tsx`,
  ];
  return firstExisting(candidates);
}
```

---

### TASK-008-4: Admin API for themes

**Status:** To Do

Endpoints:
- `GET /themes`
- `POST /themes/activate`
- `GET /theme-profiles`
- `POST /theme-profiles`
- `PATCH /theme-profiles/:id`
- `POST /theme-profiles/:id/activate`
- `PUT /theme-profiles/:id/routes`

---

### TASK-008-5: Admin UI for themes

**Status:** To Do

UI:
- Theme list (installed).
- Theme profile list with activate action.
- Profile editor (tokens + routes).

---

## Testing Requirements

- [ ] Theme registry loads `theme.json` correctly.
- [ ] Only one theme profile can be active.
- [ ] Route mapping returns expected page for a profile.
- [ ] Template resolution follows the specified order.

---

## Documentation Updates Required

- `_docs/THEMES_SPEC.md` (if admin flow changes).
- `_docs/CMS_API.md` (theme endpoints details).
- `_docs/DESIGN_TOKENS.md` (token overrides with profiles).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-themes-and-profiles.md`
- Notes: theme registry, profiles, route mapping.

---

## Additional Docs

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_SPEC.md`
