# TASK-424-01-L01: Add Normalized Typography Fields And Shared Text Control Descriptors
# FileName: TASK-424-01-L01-Add-Normalized-Typography-Fields-And-Shared-Text-Control-Descriptors.md

**Parent Subtask:** TASK-424-01
**Priority:** High
**Category:** Pages / Admin UI / Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-424-01
**Status:** ⏳ To Do

---

## Overview

Extend `pageDocumentV2` and `pageEditorControlRegistry` with schema-owned
typography fields and registry descriptors that can be consumed by both the
floating inspector and the inline-edit text path.

Per the audit's same-leaf rule
(`_docs/AUDIT/_cross-canvas-inline-typography-2026-06-10.md:96`) and the
follow-up 4-layer rule (`_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md:175-182`:
registry descriptor + schema/normalizer + renderer + panel widget, otherwise the
control is a dummy), this leaf also extends the renderer style mapping in
`core/services/pages/pageRendererV2.tsx` so the new fields actually paint
instead of being saved but never rendered.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```ts
export type PageTypographyStyleV2 = {
  fontFamily?: TypographyToken;
  fontSize?: TypographyScaleToken;
  fontWeight?: TypographyWeightToken;
  lineHeight?: TypographyLineHeightToken;
  letterSpacing?: TypographyTrackingToken;
};

export const pageTypographyControls = defineControls([
  control("fontFamily", "style", "select"),
  control("fontSize", "style", "segmented"),
  control("fontWeight", "style", "segmented"),
]);
```

Symbol anchors: `TypographyToken` / `TypographyScaleToken` /
`TypographyWeightToken` / `TypographyLineHeightToken` /
`TypographyTrackingToken`, `pageTypographyControls`, `defineControls`, and
`control` above are new symbols, to be created in
`core/services/pages/pageDocumentV2.ts` and
`core/services/pages/pageEditorControlRegistry.ts`; the descriptors surface
through the existing registry accessor `getPageEditorControlsForTarget`
(`core/services/pages/pageEditorControlRegistry.ts:508`).

Token backing: the source audit's `core/render/tokens.ts` anchor is stale — no
such module exists and no `font.size.*` token naming exists in core. The real
typography token owner is the theme token stack: `DesignTokens.typography` in
`core/services/theme/tokenTypes.ts` (sans/display family plus the
`sm`–`2xl` size scale, with `DEFAULT_TOKENS`), emitted as `--font-sans`,
`--font-display`, `--text-sm` ... `--text-2xl` CSS variables by
`toCssVariableMap`/`toCssVariables` in `core/ui/theme/tokenCss.ts` and consumed
on the public front via `core/server/publicSite.tsx:173`; the token catalog is
documented in `_docs/DESIGN_TOKENS.md`. Any Pages-specific typography token
mapping for these option arrays is a new helper, to be created in
`core/services/pages/pageDocumentV2.ts`, referencing those theme tokens.

Owner files:

- `core/admin/ui/pages/PageEditor.tsx`
- `core/services/pages/pageEditorControlRegistry.ts`
- `core/services/pages/pageDocumentV2.ts`
- `core/services/pages/pageRendererV2.tsx` (style-to-CSS emission for the new
  typography fields in `toPageBlockStyle`, pageRendererV2.tsx:262, in the same
  leaf as the schema/normalizer/defaults change per the audit's same-leaf and
  4-layer rules)

Validation commands:

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Expected data flow:

- Typography defaults and clamps live in the Pages owner.
- Registry descriptors reuse owner-owned option arrays/tokens (backed by the
  theme token stack named above).
- Shared text targets can opt into one typography-control cluster.
- `toPageBlockStyle` (pageRendererV2.tsx:262) maps the new typography fields to
  CSS painted on the same rendered node on the editor canvas
  (`PageSectionContent`, consumed at PageEditor.tsx:111/660) and on the
  published front (`PageDocumentRender`, consumed at
  core/site/pageRuntimeV2.tsx:1).

Error handling:

- Unknown typography values are rejected or normalized to defaults.
- UI cannot emit raw free-form style strings.

Regression-test shape:

- Vitest covers type ownership, default normalization, and registry-path
  validity.
- Renderer regression: Vitest asserts that blocks with the new typography
  style fields emit the expected CSS through `toPageBlockStyle` / render
  output in `core/services/pages/pageRendererV2.tsx` on both the canvas and
  published-front surfaces (no saved-but-never-rendered dead-control drift).

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only tokenized/schema-owned values may persist.

---

## Testing Requirements

- New Vitest coverage for `pageDocumentV2` and `pageEditorControlRegistry`.
- New Vitest renderer regression for the typography style-to-CSS emission in
  `core/services/pages/pageRendererV2.tsx`.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
