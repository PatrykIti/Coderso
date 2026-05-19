# TASK-302: Content List Block Shared Renderer and Color Control Residuals

# FileName: TASK-302_Content_List_Block_Shared_Renderer_and_Color_Control_Residuals.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render + Shared Contracts
**Estimated Effort:** Large
**Dependencies:** TASK-256-02, TASK-262
**Status:** Done (2026-05-17)

---

## Overview

Fix the shared residuals surfaced while auditing TASK-262 that must not be
patched only as Content List-local behavior.

`content-list` and `posts-feed` both render through `ContentListBlock`, and the
closed TASK-256 shared color-control contract already claimed `ContentList`
`textColor` clear/picker adoption. That means the following drifts are shared
contract residuals, not purely TASK-262 product scope:

- ineffective `Columns` controls outside `cards` because renderer/editor truth
  diverges across `content-list` and `posts-feed`,
- hardcoded image height / CTA fallback behavior inside `ContentListBlock`,
- missing `textColor` clear and color-picker adoption still left behind after
  TASK-256-02 closed.

## Scope Boundary

This task owns only shared residuals that cross the `ContentListBlock` or
completed TASK-256 color-control seam:

- `Columns` truthfulness for any editor surface that feeds `ContentListBlock`.
- Shared image presentation and CTA fallback semantics in the renderer.
- Residual `textColor` clear / color-picker adoption in `ContentListEditors.tsx`
  using the already-established shared helper pattern rather than inventing a
  new one-off control.
- Backward-compatible `posts-feed` mapping and tests when the shared renderer or
  style contract changes.

This task does not own Content List pagination, section heading/canvas guidance,
source picker/filter IA, tag badge product semantics, or Content List report
closure. Those stay with TASK-262.

## Sub-Tasks

- [x] Make `Columns` truthful for `content-list` and `posts-feed` variants that
  do not actually use multi-column layout.
- [x] Add bounded shared image presentation and CTA fallback behavior in
  `ContentListBlock` without breaking existing `posts-feed` output.
- [x] Replace the plain `textColor` input in `ContentListEditors.tsx` with the
  existing shared clear/picker pattern expected by the closed TASK-256-02
  contract.
- [x] Expand shared tests/docs so Content List and Posts Feed prove the same
  renderer/style contract after the fix.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/contentList.tsx` | Repair shared renderer truthfulness for columns/image/CTA behavior and keep style/runtime defaults backward compatible. |
| `core/widgets/core/postsFeed.tsx` | Update mapping/defaults only if the shared Content List renderer contract needs explicit compatibility wiring. |
| `core/admin/ui/widgets/editors/ContentListEditors.tsx` | Adopt the shared text-color clear/picker control and align local copy with the shared renderer contract. |
| `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` | Align `Columns` truthfulness if the shared renderer fix also changes Posts Feed editor affordances. |
| `tests/unit/widgets/contentList.test.tsx` | Cover shared renderer HTML/state changes and cleared text-color behavior. |
| `tests/unit/widgets/postsFeedWidget.test.tsx` | Cover shared renderer compatibility when `postsFeed.tsx` or `ContentListBlock` output changes. |
| `tests/vitest/ui/content-list-editor-wave.test.tsx` | Cover shared text-color clear/picker adoption and local editor truthfulness. |
| `tests/vitest/ui/posts-feed-editor-wave.test.tsx` | Update when Posts Feed editor truthfulness changes. |
| `tests/vitest/site/publicRenderer.test.tsx` | Cover public HTML/output changes from shared renderer updates. |
| `tests/unit/widgets/validator.test.ts` | Update when shared schema/defaults change. |
| `_docs/_WIDGETS/CONTENT_LIST.md` | Document the final shared renderer/style contract consumed by Content List. |
| `_docs/_WIDGETS/POSTS_FEED.md` | Update only if shared renderer behavior changes visible Posts Feed product/runtime behavior. |

## Implementation Pseudocode

```tsx
const supportsColumns = resolvedVariant === "cards";

function renderColumnsControl(variant: ContentListVariantId) {
  if (variant === "cards") return <ColumnsSelect />;
  return <DisabledInfoRow reason="Columns only affect the cards variant." />;
}

type ContentListImageAspect = "compact" | "standard" | "wide" | "square";

function resolveImagePresentation(style: ContentListStyle) {
  const aspect = normalizeImageAspect(style.imageAspect);
  return {
    className:
      aspect === "square"
        ? "aspect-square"
        : aspect === "wide"
          ? "aspect-[16/9]"
          : aspect === "compact"
            ? "h-32"
            : "h-40",
  };
}

function renderCta(fields: ContentListFields, style: ContentListStyle, href?: string) {
  if (!fields.showCta) return null;
  if (href) return <a href={href}>{style.ctaLabel}</a>;
  if (style.ctaMissingHrefBehavior === "label-only") {
    return <span aria-disabled="true">{style.ctaLabel}</span>;
  }
  return null;
}
```

Error handling:

- Shared renderer changes must preserve the old visual default when new fields
  are omitted.
- `posts-feed` must keep current output unless it explicitly opts into a new
  shared style field or editor truthfulness change.
- `Clear` still deletes the owning style key; do not introduce empty-string
  sentinels for text color.
- Public output must not render unsafe placeholder hrefs or raw debug payloads.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: any new shared style fields must be schema-owned
  and covered by validator tests.
- Anti-abuse: renderer changes must stay plain React output with safe href
  normalization; no arbitrary HTML or script injection paths.
- Secret handling: tests/docs must not expose internal runtime payloads beyond
  existing safe markers.

## Testing Requirements

- `bun test tests/unit/widgets/contentList.test.tsx`
- `bun test tests/unit/widgets/postsFeedWidget.test.tsx` when `postsFeed.tsx` or
  shared renderer output changes
- `bun run test:vitest -- tests/vitest/ui/content-list-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx` when
  Posts Feed editor truthfulness changes
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx` when
  public HTML/output changes
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/CONTENT_LIST.md`.
- Update `_docs/_WIDGETS/POSTS_FEED.md` when shared output changes are
  user-visible there.
- Update `_docs/PLAYWRIGHT/REPORT_CONTENT_LIST_WIDGET.md` shared rows that move
  out of TASK-262.
- Update `_docs/_TASKS/README.md` on status changes.

## Changelog Policy

- Covered by a dedicated changelog entry or the final TASK-262 family changelog
  entry once the shared residual is complete and validated.

## Completion Notes

- Done (2026-05-17). Shared `ContentListBlock` truthfulness, bounded image/CTA
  renderer behavior, and Content List `textColor` clear/picker adoption are
  closed and synchronized with the final report/docs state.
- Final family closure evidence is recorded in
  `_docs/PLAYWRIGHT/REPORT_CONTENT_LIST_WIDGET.md` and
  `_docs/_TASKS/TASK-262-05_Content_List_Report_Docs_and_Closure.md`.

## Acceptance Criteria

- `Columns` is no longer a misleading control for any editor surface that feeds
  `ContentListBlock`.
- Shared image and CTA behavior are truthful and backward compatible for both
  `content-list` and `posts-feed`.
- `ContentListEditors.tsx` uses the expected shared clear/picker pattern for
  `textColor`.
- Shared tests and docs prove the final contract instead of relying on the old
  TASK-256 closure note.
