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

---

## Validation Requirements

Update page schemas to accept:
```
data.settings.layout
```
with strict keys only.

Add/extend unit tests:
`tests/unit/pages/validation.test.ts`

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/server/validation/pageSchemas.ts` | add layout schema | under `data.settings` |
| `core/services/pages/pageService.ts` | no DB changes needed | JSONB already |
| `tests/unit/pages/validation.test.ts` | add valid/invalid layout cases | tokens only |

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (layout structure + example)
- `_docs/WIDGETS.md` (inheritance rules)
- `_docs/CMS_API.md` (page payload fields)
