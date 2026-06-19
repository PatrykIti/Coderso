# TASK-471: Page Editor Inline Color, Align, Badge, And Text Size
# FileName: TASK-471_Page_Editor_Inline_Color_Align_Badge_And_Text_Size.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Large
**Dependencies:** TASK-424 (typography inspector), TASK-449 (render defaults),
TASK-464 (authoring sanitizers), TASK-469 (rich-text inline edit fidelity)
**Status:** ⏳ To Do

---

## Business Goal (umbrella)

Authors building marketing/landing pages on the Page Editor V2 canvas cannot
express common visual intent with the current controls. This umbrella raises the
**visual authoring ceiling** for the four capabilities the site owner asked for,
so a non-technical author can produce on-brand, polished pages without touching
markup or CSS.

Each capability is a **technical subtask** (one per topic); the executable work
lives in the leaves under each subtask. This file stays business-level — no
implementation detail.

### Capabilities delivered (owner requests)

1. **Multi-color headings** — recolor a *selected fragment* of text so one hero
   header/heading/paragraph can carry 2–4 colors. → `TASK-471-03`.
2. **Real block centering** — the Layout `center` option centers the block box in
   its space for *every* block type (today it left-aligns). → `TASK-471-02`.
3. **Flexible badges** — a dedicated, fully configurable badge/pill (text, color,
   size, shape, optional icon). → `TASK-471-04`.
4. **Smaller text** — x-small / xx-small sizes for captions, eyebrows, fine
   print, and badge labels (today the floor is `sm`/14px). → `TASK-471-01`.

### Success criteria

- An author can, with no code: make a 3-color heading, center any block, drop a
  styled badge, and set text below 14px — on the canvas, and it renders
  identically on the published front.
- Fully additive: legacy pages render byte-identically (no destructive
  migration).

---

## Topic Subtasks

| ID | Topic | Priority | Effort | Leaves |
|----|-------|----------|--------|--------|
| TASK-471-01 | Extended Text Size Scale | High | Small | L01 |
| TASK-471-02 | Block Center Self-Alignment Fix | High | Medium | L01 |
| TASK-471-03 | Per-Fragment Rich-Text Color | High | Large | L01 |
| TASK-471-04 | Flexible Badge Widget | Medium | Medium | L01 |
| TASK-471-05 | Validation, Docs, And Closure | High | Small | L01 |

### Dependency order

1. **471-01** (foundation — badge + small captions need the scale).
2. **471-02** (independent renderer bug).
3. **471-03** (largest; coordinate with TASK-469 — shared `pageRendererV2.tsx` +
   `pageInlineEditContract.ts`).
4. **471-04** (consumes the `xs`/`2xs` scale from 471-01).
5. **471-05** (closure once 01–04 are green).

---

## Shared constraints (apply to every leaf)

- **Schema-first / reject-unknown / normalize** — new fields owned by their
  domain module, validated and normalized before persist/render. Backward
  compatible via `pageBlockRenderDefaults` + nullable schema.
- **Color safety** — all author colors pass `isSafeAuthoringCssColor` /
  `sanitizeAuthoringCssColor`; no `url()`/`calc()`/`expression()`/raw-HTML sinks;
  no `dangerouslySetInnerHTML`.
- **Renderer parity** — admin canvas and public front share `pageRendererV2.tsx`;
  output must match and keep responsive/cache contracts intact.
- **Control routing** — controls register in `pageEditorControlRegistry.ts` and
  flow through the existing UI-model adapter; no hand-built panels.

## Security Contract (umbrella)

No new API endpoints; all changes ride the existing admin pages save/draft routes
(`pages:write`, admin session, existing CSRF) and the widget persistence path.
Per-leaf Security Contracts apply where new validated input is introduced
(471-03 color marks, 471-04 badge colors/icon).

---

## Related

- **TASK-472** — sibling umbrella for the additional power-user authoring backlog
  surfaced during discovery (style completeness, background authoring, undo/redo
  + clipboard, design-token color binding, inline formatting beyond color).
- **TASK-469 / TASK-424 / TASK-449 / TASK-464** — see leaf Dependencies.
- Posts inline-marks reference for 471-03:
  `tests/vitest/ui/post-richtext-inline-typography-selection.test.ts`.

## Documentation Updates Required (rolled up by 471-05)

`_docs/PAGE_MODEL.md`, `_docs/DESIGN_TOKENS.md`, `_docs/WIDGETS.md`,
`_docs/WIDGET_PACK_MATRIX.md`, `_docs/_WIDGETS/BADGE.md`, `_docs/SECURITY_SPEC.md`,
`_docs/_TASKS/README.md`, `_docs/_CHANGELOG/`.
