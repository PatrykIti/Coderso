# TASK-262-04: Content List Layout Media Tags and Card Preview Controls

# FileName: TASK-262-04_Content_List_Layout_Media_Tags_and_Card_Preview_Controls.md

**Priority:** High
**Category:** Widgets + Runtime Render + Admin UI + Visual Editing
**Estimated Effort:** Large
**Dependencies:** TASK-262, TASK-262-01, TASK-262-02, TASK-262-03
**Status:** To Do

---

## Overview

Repair only the Content List-local presentation controls that remain after
shared `ContentListBlock` / `PostsFeedBlock` residuals are routed out.

The report confirms that tags are still collapsed into a meta line and that
variant/card-style choices still lack meaningful previews. Shared renderer
truthfulness such as `Columns`, hardcoded image height, and CTA fallback must be
handled through TASK-293 instead of being patched only in this widget family.

## Scope Boundary

This leaf owns Content List item presentation that stays local to this widget:

- Add tag display options such as `meta-line` vs `badges`, with bounded tag
  count and plain text output.
- Add visual variant cards and card-style previews for Content List only.

This leaf does not own the generic `Clear` behavior for `textColor`, generic
color pickers, shared renderer truthfulness in `ContentListBlock`, or
`PostsFeed` compatibility fixes that require the same runtime/editor contract.
Those rows move through TASK-293.

## Sub-Tasks

- [ ] Add tag display mode and bounded badge count while preserving the current
  meta-line default.
- [ ] Replace text-only variant/card-style controls with Content List-local
  previews that show cards/list/compact and outlined/elevated/minimal effects.
- [ ] If implementation uncovers another `ContentListBlock` / `PostsFeedBlock`
  shared renderer dependency, stop and route it to TASK-293 before continuing.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/contentList.tsx` | Add tag presentation fields, normalizer, renderer output, and bounded badge rendering without widening the shared renderer contract routed to TASK-293. |
| `core/admin/ui/widgets/editors/ContentListEditors.tsx` | Add local tag presentation controls plus variant/card-style preview cards without re-owning shared renderer truthfulness. |
| `tests/unit/widgets/contentList.test.tsx` | Cover tag badge mode, local preview-driven schema defaults, and renderer output that remains in TASK-262 scope. |
| `tests/vitest/ui/content-list-editor-wave.test.tsx` | Cover editor visibility/previews and new controls. |
| `tests/vitest/site/publicRenderer.test.tsx` | Update when tag rendering or other public HTML/output changes. |
| `_docs/_WIDGETS/CONTENT_LIST.md` | Document layout/media/tag/card presentation options. |

## Implementation Pseudocode

```ts
type ContentListTagMode = "meta-line" | "badges" | "hidden";

type ContentListStyle = {
  columns?: "1" | "2" | "3";
  gap?: ContentListGap;
  cardStyle?: ContentListCardStyle;
  tagMode?: ContentListTagMode;
  tagLimit?: number;
};
```

Renderer shape:

```tsx
const tagMode = style.tagMode ?? "meta-line";
const tagLimit = clampTagLimit(style.tagLimit ?? 2);
const tags = item.tags?.slice(0, tagLimit) ?? [];

{tagMode === "badges" ? <TagBadgeList tags={tags} /> : renderMetaLine()}
```

Error handling:

- Invalid tag mode values fall back to existing visual behavior.
- Tag labels are plain text, trimmed, and bounded.
- Public preview changes that alter rendered HTML must be covered in
  `tests/vitest/site/publicRenderer.test.tsx`.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: new tag/presentation fields must be schema-owned
  and reject unknown nested keys.
- Anti-abuse: no arbitrary class names, HTML, SVG, or scripts in tag/card presentation
  options.
- Secret handling: runtime diagnostics must not expose private listing/query
  payloads or unpublished entry content.

## Testing Requirements

- `bun test tests/unit/widgets/contentList.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/content-list-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx` when
  public HTML/output changes
- `bun test tests/unit/widgets/validator.test.ts` when schema changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/CONTENT_LIST.md` with tag presentation and local preview behavior.
- Update `_docs/PLAYWRIGHT/REPORT_CONTENT_LIST_WIDGET.md` rows B-06, E-07, and
  E-10 after validation. Route B-04, B-05, E-01, and T-01 through TASK-293.

## Changelog Policy

- Covered by the TASK-262 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Tags can render as bounded badges without losing the current meta-line
  default.
- Variant and card-style previews are Content List-local and do not introduce a
  generic preview framework.
