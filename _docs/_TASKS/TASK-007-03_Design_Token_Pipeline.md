# TASK-007-03: Design Token Pipeline
# FileName: TASK-007-03_Design_Token_Pipeline.md

**Priority:** Medium  
**Category:** CMS/Settings  
**Estimated Effort:** Medium  
**Dependencies:** TASK-007-01  
**Status:** Done (2026-01-29)  

---

## Overview

Pipeline dla tokenow designu: walidacja overrides, merge z defaultami,
generowanie CSS variables i udostepnianie z serwisu theme.

---

## Architecture

```
core/services/theme/
  tokenService.ts
  tokenTypes.ts
  tokenValidation.ts
core/ui/theme/tokenCss.ts
tests/unit/settings/tokenService.test.ts
tests/unit/ui/themeTokens.test.ts
```

---

## Core rules

- Default tokeny pochodza z theme (static).
- Overrides trzymane w `settings["design.tokens"]`.
- `assertTokenOverrides()` waliduje shape (bez nieznanych pol).
- `getResolvedTokens()` zwraca zmergowane tokeny dla UI + SSR.
- `toCssVariables()` mapuje tokeny na `:root` CSS vars.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/services/theme/tokenTypes.ts` | token types | schema types |
| `core/services/theme/tokenValidation.ts` | validator | strict shape |
| `core/services/theme/tokenService.ts` | merge + resolved tokens | cached |
| `core/ui/theme/tokenCss.ts` | css variables | output `:root{...}` |
| `tests/unit/settings/tokenService.test.ts` | merge tests | overrides |
| `tests/unit/ui/themeTokens.test.ts` | css output | variables |

---

## Testing Requirements

- Token merge respects overrides.
- `toCssVariables()` outputs stable `:root` vars.
- Invalid overrides throw error.

---

## Documentation Updates Required

- `_docs/DESIGN_TOKENS.md`
- `_docs/THEMES_SPEC.md`

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-settings-and-design-tokens.md`
