# TASK-262-04: Content List Layout Media Tags and Card Preview Controls

# FileName: TASK-262-04_Content_List_Layout_Media_Tags_and_Card_Preview_Controls.md

**Priority:** High
**Category:** Widgets + Runtime Render + Admin UI + Visual Editing
**Estimated Effort:** Large
**Dependencies:** TASK-262, TASK-262-01, TASK-262-02
**Status:** To Do

---

## Overview

Repair Content List layout truthfulness and item-presentation controls that are
specific to this widget.

The report confirms that `columns` appears for all variants even though it only
affects `cards`, images use a hardcoded `h-40`, tags are collapsed into a meta
line, CTA output disappears when no item href exists, and variant/card style
choices lack meaningful previews.

## Scope Boundary

This leaf owns Content List item presentation:

- Hide or explain `columns` when the active variant is not `cards`; keep `gap`
  visible because it does affect all variants.
- Add Content List-owned image ratio/height options with safe enum defaults.
- Add tag display options such as `meta-line` vs `badges`, with bounded tag
  count and plain text output.
- Add CTA fallback behavior when `showCta` is enabled but an item has no href.
- Add visual variant cards and card-style previews for Content List only.

This leaf does not own the generic `Clear` behavior for `textColor`, generic
color pickers, global visual control preview components, or TASK-256 shared
truthfulness helpers for unrelated widgets.

## Sub-Tasks

- [ ] Make the Visual editor show `columns` only for `cards`, or render a
  disabled explanatory row for `list`/`compact`.
- [ ] Add schema/defaults/normalizer fields for image aspect ratio or height
  using a bounded enum, not arbitrary Tailwind class input.
- [ ] Update renderer image classes from hardcoded `h-40` to normalized image
  option classes.
- [ ] Add tag display mode and bounded badge count while preserving the current
  meta-line default.
- [ ] Add CTA fallback copy/diagnostics for items without href so `showCta`
  does not silently disappear without editor explanation.
- [ ] Replace text-only variant/card-style controls with Content List-local
  previews that show cards/list/compact and outlined/elevated/minimal effects.
- [ ] Preserve posts-feed compatibility because `postsFeed.tsx` maps through
  `ContentListBlock`.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/contentList.tsx` | Add image/tag/action presentation fields, normalizer, renderer classes, bounded tag badges, and CTA fallback behavior. |
| `core/widgets/core/postsFeed.tsx` | Update only if Content List data mapping needs new safe defaults for shared renderer compatibility. |
| `core/admin/ui/widgets/editors/ContentListEditors.tsx` | Add variant-aware layout controls and local preview cards. |
| `tests/unit/widgets/contentList.test.tsx` | Cover variant-aware columns, image classes, tag badge mode, CTA fallback, and schema defaults. |
| `tests/unit/widgets/postsFeedWidget.test.tsx` | Update if mapped Content List defaults affect Posts Feed output. |
| `tests/vitest/ui/content-list-editor-wave.test.tsx` | Cover editor visibility/previews and new controls. |
| `_docs/_WIDGETS/CONTENT_LIST.md` | Document layout/media/tag/card presentation options. |

## Implementation Pseudocode

```ts
type ContentListImageAspect = "compact" | "standard" | "wide" | "square";
type ContentListTagMode = "meta-line" | "badges" | "hidden";

type ContentListStyle = {
  columns?: "1" | "2" | "3";
  gap?: ContentListGap;
  cardStyle?: ContentListCardStyle;
  imageAspect?: ContentListImageAspect;
  tagMode?: ContentListTagMode;
  tagLimit?: number;
  ctaMissingHrefBehavior?: "hide" | "disabled-label";
};

function resolveContentListImageAspect(value: unknown): ContentListImageAspect {
  return value === "compact" || value === "wide" || value === "square" ? value : "standard";
}

function getImageAspectClass(aspect: ContentListImageAspect) {
  if (aspect === "square") return "aspect-square";
  if (aspect === "wide") return "aspect-[16/9]";
  if (aspect === "compact") return "h-32";
  return "h-40";
}
```

Renderer shape:

```tsx
const tagMode = style.tagMode ?? "meta-line";
const tagLimit = clampTagLimit(style.tagLimit ?? 2);
const tags = item.tags?.slice(0, tagLimit) ?? [];

{tagMode === "badges" ? <TagBadgeList tags={tags} /> : renderMetaLine()}
{showCta && href ? <a href={href}>{ctaLabel}</a> : null}
{showCta && !href && behavior === "disabled-label" ? <span aria-disabled="true">{ctaLabel}</span> : null}
```

Error handling:

- Invalid image aspect/tag mode values fall back to existing visual behavior.
- Tag labels are plain text, trimmed, and bounded.
- CTA fallback must never render an unsafe placeholder href.
- Posts Feed mapping must keep old Posts Feed output unchanged unless it
  intentionally opts into new Content List style fields.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: new image/tag/action fields must be schema-owned
  and reject unknown nested keys.
- Anti-abuse: no arbitrary class names, HTML, SVG, or scripts in image/tag/card
  options; CTA fallback must not create unsafe hrefs.
- Secret handling: runtime diagnostics must not expose private listing/query
  payloads or unpublished entry content.

## Testing Requirements

- `bun test tests/unit/widgets/contentList.test.tsx`
- `bun test tests/unit/widgets/postsFeedWidget.test.tsx` if Posts Feed mapping changes
- `bun run test:vitest -- tests/vitest/ui/content-list-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` when schema changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/CONTENT_LIST.md` with layout, image, tag, CTA, and
  preview behavior.
- Update `_docs/PLAYWRIGHT/REPORT_CONTENT_LIST_WIDGET.md` rows B-04, B-05,
  B-06, E-01, E-07, E-10, and T-01 after validation.

## Changelog Policy

- Covered by the TASK-262 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- `columns` is no longer presented as an effective control for `list` or
  `compact` variants.
- Image size/aspect is configurable through bounded schema fields.
- Tags can render as bounded badges without losing the current meta-line
  default.
- Enabled CTA behavior is truthful when an item has no href.
- Variant and card-style previews are Content List-local and do not introduce a
  generic preview framework.
