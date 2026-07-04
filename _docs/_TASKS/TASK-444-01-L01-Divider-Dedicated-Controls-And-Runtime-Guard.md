# TASK-444-01-L01: Divider Dedicated Controls And Runtime Guard
# FileName: TASK-444-01-L01-Divider-Dedicated-Controls-And-Runtime-Guard.md

**Parent Subtask:** TASK-444-01
**Priority:** Low
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Small
**Dependencies:** TASK-444-01
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Adopt the shared dedicated controls for Divider tone/style/visibility while
preserving the currently-correct `<hr>` runtime output. Ownership boundary:
TASK-421-02-L01 owns the divider-tone segmented conversion and the dedicated
widget primitives, and TASK-421-03-L02 owns the universal block panels
(including the audit's Layout Width/Align and Background panel drift rows) —
this leaf verifies the divider target after those land and owns only the
`<hr>` runtime guard plus divider regression tests.

---

## Sub-Tasks

- [x] Implement the scoped owner-file changes described below.
- [x] Add or update the targeted regression coverage for this leaf.
- [x] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
// Controls: the real registry accessor is getPageEditorControlsForTarget
// (core/services/pages/pageEditorControlRegistry.ts:870-890); divider rows (Tone
// select over pageDividerTones, Thickness clamp 1..16) live at
// pageEditorControlRegistry.ts:795-806. Verify they render through the shared
// TASK-421 widgets in PageEditor, with
// Tone as the dedicated segmented widget and Visible as a switch.
const dividerControls = getPageEditorControlsForTarget({ kind: "block", type: "divider" });

// Runtime guard: published divider output comes from the `case "divider"`
// branch of renderPageBlockContent (core/services/pages/pageRendererV2.tsx
// :1508-1516); assert against PageDocumentRender output in
// tests/vitest/pages/page-renderer-v2.test.tsx:
expect(html).toContain("<hr");
expect(html).toContain("border-width"); // thickness reaches the style attribute
expect(html).toContain("border-color"); // tone reaches inline style, not a Tailwind arbitrary class
```

Owner files:

- `core/admin/ui/pages/PageEditor.tsx`
- `core/services/pages/pageEditorControlRegistry.ts`
- `core/services/pages/pageRendererV2.tsx`
- `core/services/pages/pageDocumentV2.ts`

Validation commands:

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Expected data flow:

- Divider tone/style controls render through the shared TASK-421 dedicated
  widgets (conversion owned by TASK-421-02-L01/421-03-L02; this leaf verifies).
- Published runtime keeps rendering a real divider element.
- Accent tone paints through inline `borderColor` instead of a Tailwind
  arbitrary class, so the runtime does not depend on generated utility
  availability.

Error handling:

- Unsupported tones fall back to the current neutral default.
- Control migration must not alter divider persistence semantics.

Regression-test shape:

- UI coverage for dedicated controls and runtime coverage for divider output,
  including tone as an inline border-color style.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Divider fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
