# TASK-265-04: Entry Teaser Layout, Media, Tags, and Heading Controls

# FileName: TASK-265-04_Entry_Teaser_Layout_Media_Tags_and_Heading_Controls.md

**Priority:** High
**Category:** Widgets + Runtime Render + Admin UI + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-265-03
**Status:** Done (2026-05-18)

---

## Overview

Expand Entry Teaser renderer controls and technical hardening from
`REPORT_ENTRY_TEASER_WIDGET.md`.

This leaf owns report findings B-01, B-02, B-03, B-07, B-08, T-01, T-02, T-03,
and T-06. It adds section heading/context options, media sizing controls,
configurable tag limits, max-width controls, optional icon/logo media mode,
image dimensions, separate section and entry heading controls, and explicit enum
normalization.

## Scope Boundary

In scope:

- Entry Teaser schema/defaults/normalizer/render/editor/tests for local layout
  and media options.
- Fixed token maps for max-width, media aspect/height/object-fit, section
  heading level, entry heading level, and tag count.
- Backward-compatible normalizer defaults for existing saved widgets.
- Accessibility-safe heading semantics and image dimensions.

Out of scope:

- Generic image/media control system for all widgets.
- Generic typography scale system unless TASK-256 creates a shared primitive.
- Listing query/card renderer redesign outside Entry Teaser's one-item output.

## Files To Create Or Change

| File | Required change |
|---|---|
| `core/widgets/core/entryTeaser.tsx` | Extend schema/defaults/types/normalizer/render with section heading, separate section/entry heading levels, media settings, tag limit, max-width, icon/logo mode, image dimensions, and explicit enum guards. |
| `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx` | Add Wizard/Visual/Advanced controls for section heading, entry title heading level, layout width, media, and tags according to final editor IA. |
| `tests/vitest/widgets/entryTeaser.test.tsx` | Create or extend Bun-free render, schema, and normalizer coverage for every new field and legacy default. |
| `tests/vitest/ui/entry-teaser-editor-wave.test.tsx` | Add editor coverage for controls and fixed token updates. |
| `tests/vitest/site/publicRenderer.test.tsx` | Add public HTML coverage for heading level, image dimensions, tag limit, and width markers/classes. |
| `_docs/_WIDGETS/ENTRY_TEASER.md` | Update data model, runtime behavior, accessibility, and editor notes. |

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged admin UI and public runtime widget rendering.
- RBAC: unchanged.
- CSRF: unchanged because no route is introduced.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: all new fields must be in `entryTeaserSchema` with
  `additionalProperties: false`.
- Anti-abuse: layout/media controls must use fixed enums, clamped numbers, and
  safe image/icon sources. Do not add raw class-name, raw style-object, raw SVG,
  or arbitrary HTML fields.
- Secret handling: no secrets, signed private URLs, or privileged media tokens
  in widget data, diagnostics, docs, or DOM markers.

## Implementation Pseudocode

```ts
type EntryTeaserMediaMode = "image" | "icon" | "none";
type EntryTeaserImageAspect = "auto" | "16:9" | "4:3" | "1:1";
type EntryTeaserObjectFit = "cover" | "contain";
type EntryTeaserMaxWidth = "sm" | "md" | "lg" | "xl" | "full";
type EntryTeaserHeadingLevel = "h2" | "h3" | "h4";

function resolveEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function normalizeEntryTeaserData(data: EntryTeaserData): EntryTeaserData {
  return {
    ...currentFields,
    section: {
      title: trimOptional(data.section?.title),
      headingLevel: resolveHeadingLevel(data.section?.headingLevel, "h2"),
    },
    title: {
      headingLevel: resolveHeadingLevel(data.title?.headingLevel, "h3"),
    },
    media: {
      mode: resolveMediaMode(data.media?.mode),
      aspect: resolveImageAspect(data.media?.aspect),
      fit: resolveObjectFit(data.media?.fit),
      width: clampInt(data.media?.width, 1, 4096),
      height: clampInt(data.media?.height, 1, 4096),
    },
    fields: {
      ...currentFields,
      tagLimit: clampInt(data.fields?.tagLimit, 0, 12),
    },
    layout: {
      maxWidth: resolveMaxWidth(data.layout?.maxWidth),
    },
  };
}

function EntryTeaserBlock(...) {
  const SectionHeadingTag = normalized.section?.headingLevel ?? "h2";
  const EntryHeadingTag = normalized.title?.headingLevel ?? "h3";
  const visibleTags = item.tags.slice(0, fields.tagLimit);
  // Render section heading only when configured.
  // Render item title with the separate entry heading level.
  // Add width/height attrs and fixed classes from maps only.
}
```

Error handling:

- Unknown enum values normalize to documented defaults and remain backward
  compatible.
- Tag limit clamps to a documented range.
- Missing image dimensions use deterministic defaults to reduce layout shift.
- Icon/logo mode must fall back to regular image or no media without crashing
  if no safe source is present.

Regression-test shape:

- Assert `lg` radius normalizes explicitly instead of by fallback accident.
- Assert unknown variant values are normalized intentionally and documented.
- Assert image output includes width/height when image is present.
- Assert heading level changes the rendered tag without invalid nesting.
- Assert section heading and entry title heading can differ and render in a
  deterministic hierarchy.
- Assert tag limit controls visible tag count.
- Assert max-width and media controls map only through fixed class maps.

## Sub-Tasks

- [ ] Add section title plus separate section and entry heading-level models.
- [ ] Add media size/aspect/object-fit and optional icon/logo mode.
- [ ] Add tag limit and max-width controls.
- [ ] Make enum normalizers explicit and backward compatible.
- [ ] Add image dimension and heading accessibility coverage.
- [ ] Update widget docs and source report evidence.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- if this leaf creates or extends `tests/vitest/widgets/entryTeaser.test.tsx`,
  run `bun run test:vitest -- tests/vitest/widgets/entryTeaser.test.tsx`
- `bun test tests/unit/widgets/entryTeaser.test.tsx` while render/normalizer
  assertions still remain in the Bun-owned suite
- `bun run test:vitest -- tests/vitest/ui/entry-teaser-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx`
- Entry Teaser schema rejection coverage belongs in
  `tests/vitest/widgets/entryTeaser.test.tsx`; touch generic validator suites
  only if the shared validator contract changes.

## Documentation Updates Required

- `_docs/_WIDGETS/ENTRY_TEASER.md`
- `_docs/PLAYWRIGHT/REPORT_ENTRY_TEASER_WIDGET.md`
- `_docs/WIDGET_PACK_MATRIX.md` only if Listings pack readiness changes.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when this leaf moves to
  `Done`.

## Acceptance Criteria

- Entry Teaser can render its own section context without requiring a separate
  Heading widget for every use.
- Media, width, section heading, entry heading, and tag controls are
  schema-backed, fixed-map, and tested.
- Public images avoid avoidable CLS through deterministic dimensions.
- Existing saved Entry Teaser widgets still render with current defaults.
