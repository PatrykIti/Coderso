# TASK-277-06: Posts Feed Editor Flow, Variant Previews, and Style Controls

# FileName: TASK-277-06_Posts_Feed_Editor_Flow_Variant_Previews_and_Style_Controls.md

**Priority:** Medium
**Category:** Widgets + Posts Feed + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-277, TASK-256-01, TASK-256-02, TASK-277-01, TASK-277-02, TASK-277-04
**Status:** To Do

---

## Overview

Improve Posts Feed editor ergonomics while preserving the same normalized data
model across Wizard, Visual, and Advanced modes.

This leaf owns the Posts Feed-specific style-control gap and editor flow
improvements. Shared mode-update, Clear undo, and generic variant-control
truthfulness remain in TASK-256.

## Source Findings

- BUG-02 `style.textColor` is schema/default owned but not exposed in the editor:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:128-133`.
- UX-02 variant selector has no visual preview:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:189-191`.
- UX-03 Wizard is not progressive:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:193-195,305`.
- Current style defaults include `textColor`:
  `core/widgets/core/postsFeed.tsx:208-216,295-310,365-372`.
- Current editor exposes only background and border clearable fields:
  `core/admin/ui/widgets/editors/PostsFeedEditors.tsx:540-555`.
- Current Wizard renders Source + Display in one panel:
  `core/admin/ui/widgets/editors/PostsFeedEditors.tsx:620-626`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` | Add text color control, variant preview affordances, and progressive Wizard flow. |
| `core/widgets/core/postsFeed.tsx` | Update schema/normalizer only if textColor clear behavior changes. |
| `tests/vitest/ui/posts-feed-editor-wave.test.tsx` | Cover textColor edit/clear, variant preview selection, Wizard progression, and no data reset across modes. |
| `tests/unit/widgets/postsFeedWidget.test.tsx` | Cover textColor mapping only if normalizer/render behavior changes. |
| `_docs/_WIDGETS/POSTS_FEED.md` | Document editor mode ownership and text color behavior. |
| `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md` | Record fixed evidence for BUG-02, UX-02, and UX-03. |

## Implementation Pseudocode

```tsx
function PostsFeedVariantPreviewGroup({ value, onChange }) {
  return variantOptions.map((option) => (
    <button
      type="button"
      aria-pressed={value === option.id}
      data-widget-control={`posts-feed.variant.${option.id}`}
      onClick={() => onChange(option.id)}
    >
      <VariantMiniPreview variant={option.id} />
      <span>{option.label}</span>
    </button>
  ));
}

function PostsFeedWizardEditor(props: WidgetEditorProps<PostsFeedData>) {
  const [step, setStep] = useState<"source" | "display" | "layout">("source");
  return renderStep(step, props);
}
```

Error handling:

- Wizard step state must not reset the underlying widget data when users switch
  to Visual/Advanced and back.
- Text color `Clear` must remove the key if it is treated as clearable; do not
  serialize empty strings or `transparent` as an off-state sentinel.
- Variant preview buttons must call the existing `onVariantChange` contract and
  must not mutate unrelated data.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged unless text color clear semantics alter
  schema/default behavior.
- Anti-abuse: style controls accept only existing safe token/string behavior; no
  raw HTML or arbitrary class fields.
- Secret handling: no secrets in editor state or widget payload.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `bun test tests/unit/widgets/postsFeedWidget.test.tsx` if normalizer/render
  behavior changes.
- `bun test tests/unit/widgets/validator.test.ts` if schema changes.
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/POSTS_FEED.md`
- `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md`
- `_docs/_TASKS/TASK-277-06_Posts_Feed_Editor_Flow_Variant_Previews_and_Style_Controls.md`

## Acceptance Criteria

- Text color can be edited from the Posts Feed UI and maps to runtime cards.
- Variant choice uses a clear visual affordance and preserves the existing
  variant contract.
- Wizard is progressive and beginner-safe while preserving the shared Posts Feed
  data model.
- No shared TASK-256 mode or Clear semantics are reimplemented ad hoc.
