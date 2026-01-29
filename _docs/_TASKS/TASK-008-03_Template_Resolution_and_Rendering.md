# TASK-008-03: Template Resolution and Rendering
# FileName: TASK-008-03_Template_Resolution_and_Rendering.md

**Priority:** Medium  
**Category:** CMS/Themes  
**Estimated Effort:** Medium  
**Dependencies:** TASK-008-01, TASK-008-02  
**Status:** Done (2026-01-29)  

---

## Overview

Deterministyczny resolver templatek. Kolejność:
1. Theme template
2. Plugin view
3. Core default
4. 404 fallback

Resolver działa per request i cache'uje wyniki, aby nie sprawdzać dysku wielokrotnie.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/themes/resolver.ts` | new | resolve template paths |
| `core/themes/cache.ts` | new | in-memory cache per request |
| `tests/unit/themes/resolver.test.ts` | new | order + fallback |

**Resolver API:**
```ts
export type TemplateType = "page" | "content" | "error";

export function resolveTemplate(input: {
  themeName: string;
  type: TemplateType;
  key?: string; // np. page slug, content type
}): string | null;
```

**Search order example:**
```
/themes/<theme>/templates/page-<key>.tsx
/themes/<theme>/templates/page.tsx
/plugins/views/page-<key>.tsx
/core/templates/page.tsx
```

---

## Testing Requirements

- Resolves specific template when exists.
- Falls back to generic template.
- Falls back to core 404 when no match.

---

## Documentation Updates Required

- `_docs/THEMES_SPEC.md`
- `_docs/ARCHITECTURE.md`

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-template-resolution.md`
