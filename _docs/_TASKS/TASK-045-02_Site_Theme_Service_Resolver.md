# TASK-045-02: Site Theme Service + Resolver
# FileName: TASK-045-02_Site_Theme_Service_Resolver.md

**Priority:** 🔴 High  
**Category:** Site/Appearance  
**Estimated Effort:** Medium  
**Dependencies:** TASK-045-01  
**Status:** 🟡 To Do

---

## Overview

Implement backend services to manage site theme templates/profiles, resolve the **active profile**, and generate CSS variables for public pages.

Goal: **runtime themes** without rebuilds. Admin UI updates should immediately affect public rendering.

---

## Service API (core/services/siteThemes)

### Core functions
- `listSiteThemeTemplates()`
- `createSiteThemeTemplate(payload)`
- `updateSiteThemeTemplate(id, payload)`
- `deleteSiteThemeTemplate(id)`

- `listSiteThemeProfiles()`
- `createSiteThemeProfile(payload)`
- `updateSiteThemeProfile(id, payload)`
- `deleteSiteThemeProfile(id)`
- `activateSiteThemeProfile(id)`

### Resolver
- `getActiveSiteThemeProfile()`  
  Returns active profile (fallback to system default).

- `getResolvedSiteThemeTokens()`  
  Returns active token set with defaults merged.

### CSS Output
- `getSiteThemeCssVariables()`  
  Returns `Record<string,string>` (e.g. `--site-bg`, `--site-text`)

---

## Token Structure (example)

```json
{
  "base": { "bg": "#0f172a", "text": "#f8fafc", "surface": "#111827" },
  "buttons": {
    "primary": { "bg": "#2563eb", "text": "#fff", "hoverBg": "#1d4ed8" },
    "outline": { "border": "#334155", "text": "#e2e8f0", "hoverBg": "#0f172a" }
  },
  "typography": { "body": "Inter", "heading": "Poppins", "scale": "md" }
}
```

---

## Implementation Checklist

| Layer | File | Change |
|------|------|--------|
| Service | `core/services/siteThemes/siteThemeService.ts` | CRUD + activation |
| Resolver | `core/services/siteThemes/siteThemeResolver.ts` | active profile + css vars |
| Validation | `core/services/siteThemes/siteThemeValidation.ts` | schema validation (AJV) |
| Defaults | `core/services/siteThemes/siteThemeDefaults.ts` | fallback tokens |
| Tests | `tests/unit/themes/siteThemeService.test.ts` | CRUD + active logic |
| Tests | `tests/unit/themes/siteThemeResolver.test.ts` | css var output |

---

## Testing Requirements

- Unit: CRUD + activation (only one active)
- Unit: resolver merges defaults and outputs CSS variables
- Typecheck + lint

---

## Documentation Updates Required

- `_docs/SITE_THEMES.md`
- `_docs/CMS_API.md` (data shape)
- `_docs/_CHANGELOG/<new>.md`
