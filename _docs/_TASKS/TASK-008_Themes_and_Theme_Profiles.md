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
admin/ui/themes/
  ThemeList.tsx
  ThemeProfileEditor.tsx

tests/unit/themes/
  registry.test.ts
  resolver.test.ts
```

---

## Sub-Tasks

### TASK-008-01_Theme_registry_and_loader

**Status:** To Do

Rules:
- Theme package lives in `/themes/<name>`.
- Each theme has `theme.json` + templates + styles.
- Registry indexes themes at boot.
- Validate `theme.json` schema (name, version, tokens, templates list).
- Ignore invalid themes and log warnings.

Example loader:

```ts
type ThemeMeta = { name: string; version: string; tokens: Record<string, any> };

function loadThemes(themeDir: string): ThemeMeta[] {
  // Read /themes/*/theme.json and return metadata
  return [];
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/themes/registry.ts` | theme scanning + cache |
| `core/services/themes/themeService.ts` | list themes |

---

### TASK-008-02_Theme_profiles_and_routes

**Status:** To Do

Profiles map paths to pages without duplicating page data.

Rules:
- Only one active profile at a time (transactional update).
- `path` is unique per profile.
- Path normalization (leading `/`, no trailing `/` except root).

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

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/services/themes/themeProfileService.ts` | CRUD + activate |
| `core/db/schema.ts` | theme_profiles, theme_routes |

---

### TASK-008-03_Template_resolution_order

**Status:** To Do

Resolution:
1. Theme template
2. Plugin view
3. Core default

Rules:
- Cache resolved templates per request (avoid disk re-check).
- Fallback to 404 template if none found.

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

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/themes/resolver.ts` | template resolution |

---

### TASK-008-04_Admin_API_for_themes

**Status:** To Do

Endpoints:
- `GET /themes`
- `POST /themes/activate`
- `GET /theme-profiles`
- `POST /theme-profiles`
- `PATCH /theme-profiles/:id`
- `POST /theme-profiles/:id/activate`
- `PUT /theme-profiles/:id/routes`

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/server/routes/themeRoutes.ts` | theme endpoints |

---

### TASK-008-05_Admin_UI_for_themes

**Status:** To Do

UI:
- Theme list (installed).
- Theme profile list with activate action.
- Profile editor (tokens + routes).
- Route editor validates paths and duplicate routes.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `admin/ui/themes/ThemeList.tsx` | list installed themes |
| `admin/ui/themes/ThemeProfileEditor.tsx` | profile edit UI |

---

## Testing Requirements

- [ ] `tests/unit/themes/registry.test.ts` loads theme.json.
- [ ] `tests/unit/themes/resolver.test.ts` enforces resolution order.
- [ ] `tests/unit/themes/profileService.test.ts` enforces single active profile.
- [ ] `tests/integration/routes/themes.test.ts` validates endpoints.

---

## New Files to Create

- `core/themes/registry.ts`
- `core/themes/resolver.ts`
- `core/services/themes/themeService.ts`
- `core/services/themes/themeProfileService.ts`
- `core/server/routes/themeRoutes.ts`
- `admin/ui/themes/ThemeList.tsx`
- `admin/ui/themes/ThemeProfileEditor.tsx`
- `tests/unit/themes/registry.test.ts`
- `tests/unit/themes/resolver.test.ts`
- `tests/unit/themes/profileService.test.ts`
- `tests/integration/routes/themes.test.ts`

---

## Documentation Updates Required

- `_docs/THEMES_SPEC.md` (admin flow changes).
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
