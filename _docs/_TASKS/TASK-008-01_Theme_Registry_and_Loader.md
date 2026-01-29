# TASK-008-01: Theme Registry and Loader
# FileName: TASK-008-01_Theme_Registry_and_Loader.md

**Priority:** Medium  
**Category:** CMS/Themes  
**Estimated Effort:** Medium  
**Dependencies:** TASK-001  
**Status:** To Do  

---

## Overview

Skanowanie katalogu `/themes` i budowa registry theme'ów. Każdy theme ma
`theme.json` + foldery `templates/`, `assets/`, `styles/`.
Registry ma być deterministyczny, bezpieczny i odporny na błędne paczki.

---

## Theme package layout

```
/themes/<themeName>/
  theme.json
  templates/
    page.tsx
    page-landing.tsx
    content.tsx
    error.tsx
  assets/
  styles/
    theme.css
```

**theme.json (schema):**
```json
{
  "name": "default",
  "version": "1.0.0",
  "templates": ["page", "content", "error"],
  "tokens": {
    "colors": { "primary": "#111" },
    "neutrals": { "bg": "#fff" }
  }
}
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/themes/registry.ts` | new | scan `/themes`, build registry, cache |
| `core/themes/schema.ts` | new | theme.json validation (zod/JSON schema) |
| `core/services/themes/themeService.ts` | new | list/get themes |
| `tests/unit/themes/registry.test.ts` | new | scans valid/invalid themes |

**Registry behavior:**
- `scanThemes()` runs at boot.
- Ignores invalid themes but logs warnings.
- Caches metadata in memory for fast lookup.

**Registry API (example):**
```ts
export type ThemeMeta = {
  name: string;
  version: string;
  templates: string[];
  tokens?: unknown;
};

export function listThemes(): ThemeMeta[];
export function getTheme(name: string): ThemeMeta | null;
```

---

## Testing Requirements

- Theme with valid `theme.json` is indexed.
- Invalid schema is ignored and does not crash.
- Registry returns deterministic order (sort by name).

---

## Documentation Updates Required

- `_docs/THEMES_SPEC.md` (package layout + theme.json schema)
- `_docs/ARCHITECTURE.md` (theme registry lifecycle)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-themes-registry.md`
