# TASK-051-01: Page Layout Model + Validation
# FileName: TASK-051-01_Page_Layout_Model_and_Validation.md

**Priority:** High  
**Category:** CMS/Pages  
**Estimated Effort:** Medium  
**Dependencies:** TASK-002-04, TASK-051 (Index)  
**Status:** To Do

---

## Overview

Define a **page-level layout settings object** stored in `page.data.settings`.
This object controls wrapper width, background, and default section spacing.
This model is the single source of truth for both runtime preview and published
page rendering.

---

## Data Model (proposal)

```ts
type PageLayoutSettings = {
  wrapper: {
    container: "default" | "narrow" | "full";
    maxWidth?: "4xl" | "5xl" | "6xl" | "7xl";
    padding: { top: SpacingToken; bottom: SpacingToken };
    background: { color: string; image?: string | null };
  };
  sections: {
    gap: SpacingToken;              // vertical spacing between widgets
    defaults?: {
      container?: "default" | "narrow" | "full";
      padding?: { top: SpacingToken; bottom: SpacingToken };
      margin?: { top: SpacingToken; bottom: SpacingToken };
    };
  };
  typographyPreset?: string;         // future, optional
  applyDefaultsToNewBlocks?: boolean; // editor only
};
```

Notes:
- Use existing `SpacingToken` for consistent scales.
- Keep `typographyPreset` optional to align with theme system.
- Store in `page.data.settings.layout`.
- Define canonical defaults server-side so every renderer receives the same
  normalized shape.

---

## Consistency Requirements (Model Layer)

1) The same normalized layout object must be used by:
- page runtime render
- page runtime preview
- any admin runtime-preview endpoint that renders pages/templates with page context

2) Validation must reject unknown keys and invalid token values to prevent
render drift between admin and runtime.

3) The model must be version-safe for future wrapper extensions.

---

## Validation Requirements

Update page schemas to accept:
```
data.settings.layout
```
with strict keys only.

Add/extend unit tests:
`tests/unit/pages/validation.test.ts`

Add normalization tests:
`tests/unit/pages/layoutSettings.test.ts` (or equivalent)
- applies defaults deterministically
- rejects invalid enum/token/color values
- preserves valid explicit overrides

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/server/validation/pageSchemas.ts` | add layout schema | under `data.settings` |
| `core/services/pages/layoutSettings.ts` | create normalizer + defaults | shared by runtime/preview |
| `core/services/pages/pageService.ts` | no DB changes needed | JSONB already |
| `tests/unit/pages/validation.test.ts` | add valid/invalid layout cases | tokens only |
| `tests/unit/pages/layoutSettings.test.ts` | add normalization tests | defaulting + strictness |

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (layout structure + example)
- `_docs/WIDGETS.md` (inheritance rules)
- `_docs/CMS_API.md` (page payload fields)
- `_docs/SITE_RUNTIME.md` (normalization and precedence notes)
