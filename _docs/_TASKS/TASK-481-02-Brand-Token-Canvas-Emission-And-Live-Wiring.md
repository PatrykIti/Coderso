# TASK-481-02: Brand-Token Canvas Emission & Live Wiring

# FileName: TASK-481-02-Brand-Token-Canvas-Emission-And-Live-Wiring.md

**Parent Task:** TASK-481
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Medium
**Dependencies:** TASK-481-01 (content scope + chrome isolation)
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Emit the SITE brand `--color-primary/-secondary/-accent/-border` on the content
scope introduced by TASK-481-01 so a block/inline brand color renders the same
effective value the front uses (true WYSIWYG), while the chrome (which re-asserts
admin brand from 481-01-L02) stays admin-themed.

Two pieces:
1. A new pure owner helper `toPageCanvasBrandColorCssVariableMap(tokens)` in
   `core/ui/theme/tokenCss.ts` that returns the four brand vars from the resolved
   site `DesignTokens` (mirroring the brand half of `toCssVariableMap`:113 lines
   115–121 of that file).
2. Wiring that map onto the `data-page-editor-content` scope from
   `core/admin/ui/pages/PageEditor.tsx` → `SectionCanvas`/`renderBlockFrame`,
   memoized off `useCanvasSiteTokens` (PageEditor.tsx:373) so the existing
   settings cache-bus (`subscribeCacheEvents` on `cacheKeys.settingsRedacted`)
   live-repaints the canvas when the owner changes site tokens — with NO
   setState-in-effect and NO change to the neutral `canvasSiteTokenVariables`
   that stays on the frame.

## Sub-Tasks

| ID | Title | Effort | Status |
| --- | --- | --- | --- |
| TASK-481-02-L01 | `toPageCanvasBrandColorCssVariableMap` + contract tests | Small | ⏳ To Do |
| TASK-481-02-L02 | Wire brand map onto the content scope (live repaint) | Medium | ⏳ To Do |

## Dependencies

- TASK-481-01 (content scope must exist before brand can be emitted on it).
- L01 (the helper) → L02 (the wiring consumes the helper).
- Reuses `useCanvasSiteTokens`, `mergeTokens`, `readSiteDesignTokenOverrides`,
  `DEFAULT_TOKENS`, and the cache-bus already present in `PageEditor.tsx`.

## Testing Requirements

- Vitest lane only:
  - L01 contract: `tests/vitest/ui/themeTokens.test.ts` — exact 4-key shape,
    values sourced from `tokens.colors.*` + `tokens.neutrals.border`, parity with
    the brand half of `toCssVariableMap`.
  - L02 render/live-repaint: `tests/vitest/ui/page-authoring-canvas.test.tsx` —
    site brand resolves on the content scope; neutrals unchanged on the frame; a
    `settingsRedacted` cache event re-paints the brand map without remount.
- No runtime/route/DB surface; no Bun-lane test required.
