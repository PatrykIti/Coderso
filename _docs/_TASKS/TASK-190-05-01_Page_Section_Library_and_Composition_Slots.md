# TASK-190-05-01: Page Section Library and Composition Slots
# FileName: TASK-190-05-01_Page_Section_Library_and_Composition_Slots.md

**Priority:** High
**Category:** Assistant/Core + Page Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-190-03-01, TASK-190-04
**Status:** Done (2026-05-07)

---

## Overview

Define reusable page section contribution types and slots.

This library should be a thin assistant-facing mapping layer over the existing
widget contract, not a second unrelated section catalog. Where the repo already
has source-of-truth metadata for composite widgets, section presets, module pack
coverage, and widget surfaces, this task should reuse it.

Delivered slice note:
- Added `blueprintPageSectionTypes.ts` for assistant-facing section alias and
  slot vocabulary.
- Added `blueprintPageSectionLibrary.ts` as the deterministic mapping layer from
  those aliases to existing page-builder widget contracts and module pack
  coverage.
- Unsupported aliases such as `steps` now stay gated instead of creating
  assistant-only pseudo-sections.
- Section seed blocks are normalized through the existing widget owner
  (`normalizeWidgetBlock`) rather than a parallel defaults registry.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintPageSectionTypes.ts`
- Add `core/services/assistant/blueprints/blueprintPageSectionLibrary.ts`
- Update `core/widgets/modulePackMatrix.ts` or existing widget preset metadata
  only if the current section-preset contract needs a small helper seam for the
  composer
- Add `tests/vitest/assistant/blueprint-page-section-library.test.ts`

Owner rule:

- `core/widgets/modulePackMatrix.ts` and existing widget/preset metadata remain
  the source of truth for which module packs, section presets, composite
  widgets, and surfaces actually exist.
- `blueprintPageSectionTypes.ts` owns only the assistant-facing normalized alias
  and merge-slot vocabulary used during composition review/planning.
- `blueprintPageSectionLibrary.ts` owns deterministic mapping from those
  assistant-facing aliases to existing widget/preset contracts.
- If a business-facing alias cannot be mapped from current widget/preset
  metadata, extend that existing metadata with a minimal helper seam instead of
  hardcoding section support in the blueprint layer.

## Reuse Rules

- `blueprintPageSectionLibrary.ts` derives section availability from existing
  registered widgets, composite widget metadata, and current
  `pagePresets` / `sectionPresets` coverage instead of redefining those concepts
  in parallel.
- `Section Kinds` are assistant-facing aliases over current widget/preset
  building blocks, not a second source of truth for product readiness.
- Only widgets valid for current page-facing surfaces should participate in the
  page section library unless a later task explicitly extends the widget
  contract.
- Missing section coverage should stay gated/needs-input rather than creating ad
  hoc pseudo-sections outside the widget registry/module pack contract.
- `slot` is planner-owned ordering metadata only. It helps merge/composition but
  does not become a new product/runtime source of truth for Pages, widget
  presets, or public rendering.
- Widget defaults and section seed data must come from existing widget
  schema/default owners wherever possible; the assistant layer must not fork
  those defaults into a second config registry.
- Section data may reference media only through existing media-library ids and
  the target widget schema. Prompts such as "use the attached images in the hero
  and gallery" stay `needs_input`/gated until those files have trusted media ids;
  prompts such as "use these existing gallery items" may compose page/widget data
  that references the selected media ids.

## Initial Assistant Aliases

- `hero` -> current `hero` widget / preset coverage.
- `listing-filters` -> current listing filter/query widget coverage.
- `content-list` -> current `content-list` widget / listing preset coverage.
- `cta` -> current CTA-oriented widget/preset coverage such as `cta-banner`.
- `form-embed` -> current `form-embed` / contact-oriented widget coverage.
- `testimonials` -> current `testimonials` widget/preset coverage.
- `contact` -> current `contact` widget/preset coverage.
- `faq` -> current `faq-accordion` widget/preset coverage.
- `posts-feed` -> current `posts-feed` widget/preset coverage.
- `steps` -> allowed only when existing widget/preset metadata exposes a
  deterministic mapping; otherwise the composer returns `needs_input` or
  `gated`, not a synthetic assistant-only pseudo-section.

## Pseudocode

```ts
type BlueprintPageSectionContribution = {
  id: string;
  slot: "hero" | "before-listing" | "listing" | "after-listing" | "footer";
  widgetType: string;
  data: Record<string, unknown>;
  requires?: string[];
  mergeKey?: string;
};
```

Rules:

- `slot` is owned by `blueprintPageSectionTypes.ts` as merge-order metadata for
  composition only.
- `widgetType` must resolve to an already registered widget valid for the
  current page-facing surface.
- `data` must normalize through the existing widget schema/default owner; this
  leaf must not create a parallel section-defaults registry.
- media-bearing `data` fields must use the existing widget/media schema shape for
  asset references and must not embed raw bytes, base64 payloads, signed URLs, or
  upload tokens.

## Security Contract

- Visibility: internal planning.
- Auth model: unchanged.
- RBAC: page write permissions still enforced by page actions.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: section data must pass widget schema.
- Anti-abuse: no arbitrary HTML/scripts.
- Secret handling: no secret-like defaults.

## Testing Requirements

- Section schema tests.
- Slot ordering tests.
- Missing widget capability tests.
- Alias-to-widget/preset mapping tests prove the assistant layer reuses current
  widget/preset metadata instead of becoming a second registry.
- Unsupported aliases such as `steps` stay `needs_input` / `gated` until the
  current widget/preset owner seam exposes a deterministic mapping.
- Section-library resolution stays aligned with current widget pack / preset
  metadata instead of drifting into a second section registry.
- Media-bearing section fixtures cover existing media ids for hero/gallery/card
  image fields and prove raw upload bytes are gated before widget data is
  assembled.

## Documentation Updates Required

- `_docs/WIDGET_PACK_MATRIX.md`
