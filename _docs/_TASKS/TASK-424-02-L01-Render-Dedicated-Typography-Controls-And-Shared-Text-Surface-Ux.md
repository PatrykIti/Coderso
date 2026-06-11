# TASK-424-02-L01: Render Dedicated Typography Controls And Shared Text Surface Ux
# FileName: TASK-424-02-L01-Render-Dedicated-Typography-Controls-And-Shared-Text-Surface-Ux.md

**Parent Subtask:** TASK-424-02
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Large
**Dependencies:** TASK-424-02, TASK-424-01-L01
**Status:** ⏳ To Do

---

## Overview

Replace the missing typography path from the audit with a real inspector surface
for font family, size, weight, line height, letter spacing, align, and text
color, using the dedicated widgets introduced by TASK-421.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
function TypographyPanel({ target }) {
  const controls = getTypographyControlsForTarget(target);
  return controls.map((control) => renderRegistryControl(control, { panel: "typography" }));
}
```

Symbol anchors: `getTypographyControlsForTarget` and `renderRegistryControl`
above are pseudocode stand-ins. The real registry accessor is
`getPageEditorControlsForTarget`
(`core/services/pages/pageEditorControlRegistry.ts:508`), and the real editor
control renderers are `RegistryControlField` / `SectionRegistryControlField`
(`core/admin/ui/pages/PageEditor.tsx:2379-2614`); any typography-group
filtering helper is a new helper, to be created in
`core/admin/ui/pages/PageEditor.tsx`.

Owner files:

- `core/admin/ui/pages/PageEditor.tsx`
- `core/services/pages/pageEditorControlRegistry.ts`
- `core/services/pages/pageDocumentV2.ts`
- `core/services/pages/pageRendererV2.tsx` (mandatory renderer layer per the
  4-layer rule, `_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md:175-182`:
  registry descriptor + schema/normalizer + renderer + panel widget — verify the
  typography mapping introduced in TASK-424-01-L01 paints the panel's writes,
  otherwise the controls are dummies)

Validation commands:

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Expected data flow:

- Text-bearing blocks and sections read/write the same typography fields.
- `textAlign` and `textColor` move into a coherent typography surface.
- Inspector changes immediately re-render canvas and front-preview content:
  the typography fields are painted on the same rendered node by
  `toPageBlockStyle` / `renderPageBlockContent` in
  `core/services/pages/pageRendererV2.tsx`, consumed by the editor canvas
  (`PageSectionContent`, PageEditor.tsx:111/660) and the published front
  (`PageDocumentRender`, core/site/pageRuntimeV2.tsx:1).

Error handling:

- Unsupported targets hide the panel instead of exposing invalid controls.
- Long token labels stay human-readable and accessible.

Regression-test shape:

- Vitest UI coverage for typography panel rendering and value propagation.
- Renderer regression: Vitest asserts that typography values written from the
  panel emit the expected CSS through `core/services/pages/pageRendererV2.tsx`
  on both the canvas and published-front render surfaces.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** inspector writes must stay inside registry-owned typography
  fields only.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
