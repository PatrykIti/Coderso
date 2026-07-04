# TASK-429-01-L01: Media Split Variant Layout And Dedicated Controls
# FileName: TASK-429-01-L01-Media-Split-Variant-Layout-And-Dedicated-Controls.md

**Parent Subtask:** TASK-429-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Large
**Dependencies:** TASK-429-01
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Make the `default`/`split`/`horizontal` Media Split variants visibly distinct
on the published front. The renderer ALREADY maps non-default variants to
`md:grid-cols-2` (plus `items-center` for `horizontal`) and emits per-variant
marker classes on the inner content node (closed TASK-418-04-L04 contract,
`core/services/pages/pageRendererV2.tsx`) — do not re-implement that mapping.
The genuine gap is a true media-beside-content presentation (media
slot/ordering, media-bearing default blocks) and a VISIBLE split-vs-horizontal
difference. The shared widget primitives (media, toggle, color, segmented) are
owned by TASK-421 (TASK-421-02-L01/L02, TASK-421-03-L01 panels); this leaf
only verifies their adoption for Media Split panels and wires any
media-split-specific registry entries.

---

## Sub-Tasks

- [x] Implement the scoped owner-file changes described below.
- [x] Add or update the targeted regression coverage for this leaf.
- [x] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
// Real contract anchors (verified): the variant lives at section.variant
// (top-level on PageSectionV2 in core/services/pages/pageDocumentV2.ts),
// NOT section.layout.variant, and resolves through the shared resolver.
const template = resolvePageSectionTemplate(section); // core/services/pages/pageSectionTemplates.ts

// Existing behavior — do NOT re-implement: resolvePageSectionTemplateColumns
// gives non-default media-split variants 2 columns (md:grid-cols-2 via
// pageSectionGridClass). Add the missing semantic media/content grouping on
// the inner content div; the outer <section> keeps the static sectionClassName.
//
// New work: extend the media-split handling in pageRendererV2.tsx so the
// published section renders media beside content — e.g. a media slot with
// deterministic ordering of media-bearing vs copy blocks (new helper, to be
// created in core/services/pages/pageRendererV2.tsx) — with a VISIBLE
// split-vs-horizontal difference on the published front.
```

Owner files:

- `core/admin/ui/pages/PageEditor.tsx` (verification only — shared widget
  rendering is owned by TASK-421; no new widget code here)
- `core/services/pages/pageEditorControlRegistry.ts` (media-split-specific
  registry entries only)
- `core/services/pages/pageRendererV2.tsx`
- `core/services/pages/pageSectionTemplates.ts` (do not change the
  media-split `fallbackVariant: "split"`)

Validation commands:

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Expected data flow:

- Variant changes produce a VISIBLE published-front layout difference (real
  media-beside-content split, distinct horizontal presentation), not merely
  different class strings — `md:grid-cols-2` and the marker classes are
  already emitted at HEAD.
- Media-related inspector fields render the shared picker/segmented/toggle
  widgets owned by TASK-421-02-L02; this leaf verifies adoption only.
- Responsive controls integrate with TASK-425 panel ownership.

Error handling:

- Unknown variants fall back to the registry `fallbackVariant` (`split` for
  media-split) via `resolvePageSectionTemplate`; the schema-level normalizer
  in `core/services/pages/pageDocumentV2.ts` maps out-of-enum strings to
  `default`. Do not change the closed TASK-418-04-L04 fallback contract.
- Missing media assets degrade to safe empty/media-placeholder states already
  owned by runtime rules.

Regression-test shape:

- Runtime coverage asserting a visible layout difference between
  split/horizontal/default published output (media placement/structure, not a
  class-string diff — the class strings already differ at HEAD) and UI
  coverage verifying the shared TASK-421 widgets render for Media Split
  controls.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Media Split fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Media Split runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.

---

## Completion Notes

Completed on 2026-06-16 from the merged Phase 3B section audit (`_TMP_AUDYT_PAGES_EDITOR_V2_FAZA_3B_SCALONY_2026-06-16.md`). Runtime/control evidence, public smoke, and final validation are recorded in changelog 1177 and the task-board closeout. The public smoke used a disposable published page (`/phase3b-smoke-2d0dbd92`) and removed the owned page/user fixture after verification.
