# TASK-471: Page Editor Inline Color, Align, Badge, And Text Size
# FileName: TASK-471_Page_Editor_Inline_Color_Align_Badge_And_Text_Size.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Large
**Dependencies:** TASK-424 (typography inspector), TASK-449 (render defaults),
TASK-464 (authoring sanitizers), TASK-469 (rich-text inline edit fidelity — shared
`pageRendererV2.tsx` + `pageInlineEditContract.ts`)
**Status:** ⏳ To Do

---

## Overview

Owner-driven enhancement of the Page Editor V2 floating-panel + canvas editing
experience. Four gaps make it impossible to author rich marketing/landing
content with the current controls. This parent groups the four into one family
because they share the same surfaces (`pageDocumentV2.ts` schema,
`pageRendererV2.tsx` renderer, `pageEditorControlRegistry.ts` controls, the
floating panel, and the design-token typography scale) and have a clean
dependency order (the text-size scale is a foundation the badge widget consumes;
the per-fragment color reuses the inline-edit contract that TASK-469 also
touches).

The four features are additive and backward-compatible: legacy documents with no
new fields must render pixel-identically (the established `pageBlockRenderDefaults`
+ nullable-schema contract).

---

## Owner Requests (verbatim intent)

1. **Per-fragment text color** — select a *fragment* of text inside a
   text-presentation block (hero header, heading, paragraph) on the canvas and
   recolor only that fragment, so one header can carry 2–4 colors.
   → **TASK-471-03**.
2. **Block alignment `center` is broken for all blocks** — the Layout-panel
   `center` option left-aligns the block instead of centering the block box
   within its available space; wanted for *all* block types.
   → **TASK-471-02**.
3. **No flexible badge block** — a dedicated, fully configurable badge/pill the
   author can shape freely (text, color, size, shape, optional icon).
   → **TASK-471-04**.
4. **No small text sizes (x-small / xx-small …)** — the scale bottoms out at
   `sm` (14px); the author cannot make text smaller than other elements, which
   is needed for badges, captions, eyebrows, fine print.
   → **TASK-471-01**.

---

## Scope & Sub-Tasks

| ID | Title | Priority | Effort | Summary |
|----|-------|----------|--------|---------|
| TASK-471-01 | Extended Text Size Scale | High | Small | Add `xs` / `2xs` (x-small / xx-small) to the Page V2 typography scale: enum, token defaults, CSS vars, control labels, a11y floor. Foundation for the badge. |
| TASK-471-02 | Block Center Self-Alignment Fix | High | Medium | Make `align: center`/`right` actually center/end the block box within its column for every block type (incl. media), decoupling block self-alignment from text/content alignment. |
| TASK-471-03 | Per-Fragment Rich-Text Color | High | Large | Select a text fragment on the canvas and recolor it via an inline mini-toolbar; mark-based model + sanitizer + renderer, reusing the Posts inline-marks pattern. |
| TASK-471-04 | Flexible Badge Widget | Medium | Medium | New dedicated core widget (`badge`) following the divider/spacer contract: schema/defaults/normalize, wizard/visual/advanced editors, render, tests, pack-matrix + docs. |
| TASK-471-05 | Validation, Docs, And Closure | High | Small | Full lane validation, live `playwright-cli` smoke, docs (`PAGE_MODEL`/`DESIGN_TOKENS`/`WIDGETS`/`WIDGET_PACK_MATRIX`/`_WIDGETS/BADGE`), board sync, changelog, drift passes. |

### Dependency order (implement in this order)

1. **TASK-471-01** (foundation — the badge and small captions need it).
2. **TASK-471-02** (independent renderer bug; isolated CSS contract).
3. **TASK-471-03** (largest; coordinate with TASK-469 — same inline-edit
   contract + renderer file; land together or 469-first to avoid churn).
4. **TASK-471-04** (consumes the `xs`/`2xs` scale from 471-01; benefits from
   471-02 align and 471-03 color but does not block on them).
5. **TASK-471-05** (closure after all four are green).

---

## Shared Contracts & Constraints

- **Schema-first, reject-unknown, normalize:** every new field
  (`style.fontSize` enum members, text-block color marks, badge props) is owned
  by its domain module (`pageDocumentV2.ts` for blocks, the new `badge.tsx` for
  the widget), validated, and normalized through explicit `normalize*` helpers
  before persistence/render. Routes re-export; admin/runtime imports the owner.
- **Backward compatibility:** unset/legacy values render exactly as today via
  `pageBlockRenderDefaults` and nullable schema. No destructive migration.
- **Color safety (shared):** all author-supplied colors (fragment marks, badge
  colors) pass `isSafeAuthoringCssColor` / `sanitizeAuthoringCssColor`
  (`core/services/pages/pageAuthoringSanitizers.ts`). No `url()`, `calc()`,
  `expression()`, semicolons, or raw `style=`/`dangerouslySetInnerHTML` sinks.
- **Renderer parity:** admin canvas and public front use the same
  `pageRendererV2.tsx`; any new paint must produce identical output on both and
  keep responsive/cache contracts intact.
- **Floating-panel control routing:** new controls register in
  `pageEditorControlRegistry.ts` and flow through the existing UI-model adapter
  (`pageEditorControlUiModel.ts`) → segmented/swatch/etc. No hand-built panels.

## Security Contract (family-level)

- **No new API endpoints.** All changes ride the existing admin pages save/draft
  routes (`pages:write`, admin session, existing CSRF) and the existing widget
  persistence path. Per-leaf Security Contracts apply where new *validated input*
  is introduced (TASK-471-03 color marks, TASK-471-04 badge colors/icon).
- Inputs are schema-owned and reject unknown; colors fail closed to
  null/default; mark arrays and ranges are clamped; icon names are validated
  against a fixed allowlist. No secrets/provider keys touched.

---

## Adjacent gaps (candidate follow-ups — NOT in this task)

Surfaced during discovery; recorded for the owner to triage. Cheap, high-value
items are flagged. None are required for TASK-471 closure.

- **Inline formatting beyond color** — bold/italic/link/highlight on the same
  fragment selection built in 471-03 (natural next step once marks exist).
- **Margin controls are registered but not rendered** in any panel
  (`pageEditorControlRegistry.ts` margin entries exist; the Spacing panel filter
  drops them). *Cheap bugfix, high value.*
- **Border width / border style controls** — only `borderColor` is wired;
  `pageRendererV2.tsx` hardcodes `1px solid`. *Cheap.*
- **Design-token color picker** — color controls only take raw hex; no affordance
  to bind to site tokens (primary/secondary/accent). Ties into 471-03/04.
- **Copy/paste blocks & sections** (only `Cmd+D` duplicate exists) and
  **session undo/redo** (`Cmd+Z`) — power-user baselines.
- **Block background image / gradient editor** (gradient is raw CSS today; block
  background image isn't wired even though the schema allows it).
- **Per-breakpoint section visibility** (blocks have hide-on-screen; sections
  don't) and **drag-drop reorder** in canvas/layers (arrow-key only).
- **Empty widget registries** — `icon` (no picker), `gallery`, `embed` have no
  controls wired; **accessibility contrast warnings** on the new color pickers.

---

## Cross-References

- **TASK-469** (Rich-Text Inline Canvas Edit Fidelity) — shares
  `pageRendererV2.tsx` + `pageInlineEditContract.ts`; 471-03 must reconcile its
  mark-aware commit path with 469's rich-text round-trip. Do together / 469-first.
- **TASK-424** (Typography Inspector) — the per-block `fontSize` control 471-01
  extends; reuse its token-resolution + responsive contract.
- **TASK-449** (effective render defaults) — `pageBlockRenderDefaults` ownership;
  new defaults register there, never as "zero-value lies".
- **TASK-464** (authoring sanitizers) — color/HTML safety helpers reused by
  471-03/04; do not create a second allowlist.
- Posts inline-marks reference implementation:
  `tests/vitest/ui/post-richtext-inline-typography-selection.test.ts`,
  `post-richtext-inline-wrapper.test.ts` (pattern source for 471-03).

---

## Testing Requirements (family)

- `bun run test:vitest` (page renderer, control registry, inline-edit contract,
  XSS guards, widget contract + editor-wave suites).
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Per-leaf targeted suites listed in each child file.
- Live `coderso-dev-core-host` + `playwright-cli` smoke at closure (TASK-471-05).

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (text marks, align contract).
- `_docs/DESIGN_TOKENS.md` (`xs`/`2xs` scale, color-mark policy).
- `_docs/WIDGETS.md`, `_docs/WIDGET_PACK_MATRIX.md`, `_docs/_WIDGETS/BADGE.md`
  (new badge widget).
- `_docs/SECURITY_SPEC.md` (color-mark + badge color sink policy, if extended).
- `_docs/_TASKS/README.md` (board + statistics), `_docs/_CHANGELOG/` entry on
  completion.
