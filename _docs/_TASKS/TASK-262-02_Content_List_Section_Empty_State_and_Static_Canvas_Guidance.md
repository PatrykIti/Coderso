# TASK-262-02: Content List Section Empty State and Static Canvas Guidance

# FileName: TASK-262-02_Content_List_Section_Empty_State_and_Static_Canvas_Guidance.md

**Priority:** High
**Category:** Widgets + Runtime Render + Admin UI + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-262, TASK-262-01
**Status:** Done (2026-05-17)

---

## Overview

Add Content List-owned section context, source-aware empty copy, and truthful
admin-canvas guidance.

`REPORT_CONTENT_LIST_WIDGET.md` shows that editors must wrap Content List in a
separate text widget to provide a heading, that empty copy still references
`content type` in listing mode, and that the page-builder canvas displays saved
`resolved.items` without explaining that it is not live-resolved after each
editor change.

## Scope Boundary

This leaf owns Content List copy and render feedback:

- Optional section `title` and `description` in Content List data.
- Accessible section labelling through stable IDs or a deterministic fallback
  label.
- Source-aware default empty-state description for legacy vs listing mode.
- More actionable `missing-source` guidance for legacy and listing modes.
- Admin/editor canvas hint that saved resolved data updates after saving or via
  preview dialog, without adding live resolver calls to every canvas edit.
- Lightweight loading/skeleton messaging only where the current admin preview
  flow already has an async boundary.

This leaf does not own a new live canvas resolver, page-builder persistence
architecture, shared placeholder gating, or generic editor preview framework
changes.

## Sub-Tasks

- [ ] Extend `ContentListData` with optional section `title` and
  `description`.
- [ ] Add schema/defaults/normalizer support without changing old blocks that
  omit those fields.
- [ ] Render section title/description above the list and connect the section
  with `aria-labelledby` when a title exists.
- [ ] Split empty-state default description by `source.mode` while preserving
  explicit custom empty-state text.
- [ ] Update missing-source copy with source-specific next steps.
- [ ] Add editor-facing saved-data guidance for admin canvas/static preview
  behavior without leaking admin-only copy to public runtime output unless the
  widget is truly in editor/preview context.
- [ ] Add tests that prove public output stays stable and source-aware.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/contentList.tsx` | Add section fields, source-aware empty copy, accessible heading IDs, and missing-source guidance. |
| `core/admin/ui/widgets/editors/ContentListEditors.tsx` | Add title/description controls and editor-only static-canvas/help copy in the appropriate mode. |
| `tests/unit/widgets/contentList.test.tsx` | Cover section headings, source-aware empty copy, missing-source copy, and backward-compatible defaults. |
| `tests/vitest/ui/content-list-editor-wave.test.tsx` | Cover editor updates for title/description and static preview guidance. |
| `tests/vitest/site/publicRenderer.test.tsx` | Update if public renderer snapshots/markers change. |
| `_docs/_WIDGETS/CONTENT_LIST.md` | Document section heading, empty-state, and preview/canvas behavior. |

## Implementation Pseudocode

```ts
type ContentListData = {
  title?: string;
  description?: string;
  emptyState?: {
    title?: string;
    description?: string;
  };
};

function resolveContentListEmptyDescription(
  sourceMode: ContentListSourceMode,
  configuredDescription?: string
) {
  if (configuredDescription?.trim()) return configuredDescription;
  return sourceMode === "listing"
    ? "Adjust the listing query or publish matching entries."
    : "Adjust filters or publish entries for this content type.";
}

function buildContentListSectionIds(blockId?: string) {
  const stableId = blockId?.trim() || "content-list";
  return {
    titleId: `${stableId}-title`,
    descriptionId: `${stableId}-description`,
  };
}
```

Renderer shape:

```tsx
const title = resolveTrimmedOptionalString(normalized.title);
const description = resolveTrimmedOptionalString(normalized.description);

<section aria-labelledby={title ? titleId : undefined} aria-label={title ? undefined : "Content list"}>
  {title ? <h2 id={titleId}>{title}</h2> : null}
  {description ? <p id={descriptionId}>{description}</p> : null}
  {renderListState()}
</section>
```

Error handling:

- Empty configured title/description values normalize to undefined, not blank
  DOM headings.
- Explicit custom empty-state copy always wins over source-aware defaults.
- Admin canvas guidance must be editor-only if it references saving or preview
  dialogs.
- Old blocks without title/description must render with no visual heading so
  existing pages do not gain unexpected copy.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: new title/description fields must be declared in
  schema and reject unknown nested keys.
- Anti-abuse: section/empty copy is plain text React output, not arbitrary HTML.
- Secret handling: admin preview guidance must not expose internal IDs, private
  query payloads, or unpublished entry content in public output.

## Testing Requirements

- `bun test tests/unit/widgets/contentList.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/content-list-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx` when public output changes
- `bun test tests/unit/widgets/validator.test.ts` when schema changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/CONTENT_LIST.md` with section heading, empty-state, and
  admin canvas/static preview behavior.
- Update `_docs/PLAYWRIGHT/REPORT_CONTENT_LIST_WIDGET.md` rows B-02, E-09,
  T-02, T-05, and the Admin Canvas comparison rows after validation.

## Changelog Policy

- Covered by the TASK-262 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Content List can provide its own section title and description.
- Empty-state copy no longer says `content type` for listing-mode widgets unless
  a user explicitly configured that text.
- Missing-source and admin canvas states explain the next editor action without
  adding expensive live resolver calls on every canvas edit.
- Public runtime output remains plain text, accessible, and backwards
  compatible for old blocks.
