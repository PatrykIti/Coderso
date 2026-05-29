# TASK-343-29: Entry Teaser Audit Remediation Family

# FileName: TASK-343-29_Entry_Teaser_Audit_Remediation_Family.md

**Priority:** Medium
**Category:** Widgets + Entry Teaser + Accessibility + Admin UI + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343, TASK-343-30
**Status:** To Do

---

## Overview

Close Entry Teaser report drift where the public section lacks an accessible
name, custom/auto CTA paths can silently become non-links without enough editor
guidance, and repeated `Clear` buttons are hard to target by accessible name.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_ENTRY_TEASER_WIDGET.md:174-235`
- `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx`
- `core/widgets/core/entryTeaser.tsx`

## Sub-Tasks

- [ ] Add `aria-labelledby`/`aria-label` for the public Entry Teaser section.
- [ ] Add inline guidance when CTA destination mode cannot produce a safe link.
- [ ] Give color/action `Clear` buttons accessible names that include the field
  context; shared Clear-label semantics are owned by `TASK-343-30`.
- [ ] Keep listing-query populated rendering explicitly deferred to data-fixture
  work unless stable entry-backed listing rows are added.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx` | Add CTA non-link guidance and contextual Clear labels. |
| `core/widgets/core/entryTeaser.tsx` | Add accessible section naming and non-link CTA semantics. |
| `tests/vitest/widgets/entryTeaser.test.tsx` | Cover section a11y and CTA non-link output. |
| `tests/vitest/ui/entry-teaser-editor-wave.test.tsx` | Cover CTA guidance and contextual Clear labels. |

## Implementation Pseudocode

```ts
function resolveEntryTeaserA11y(data: EntryTeaserData, blockId: string) {
  const headingId = data.title ? `entry-teaser-${blockId}-title` : undefined;
  return headingId ? { "aria-labelledby": headingId } : { "aria-label": "Entry teaser" };
}

function resolveEntryTeaserCtaRenderState(data: EntryTeaserData, resolved: EntryTeaserResolvedState) {
  const linkAttrs = resolveWidgetLinkAttrs(resolved.ctaHref);
  if (!linkAttrs) return { mode: "non_link", reason: "missing_safe_destination" };
  return { mode: "link", linkAttrs };
}
```

## Regression Test Shape

- Public section has a usable accessible name with and without a visible title.
- CTA non-link states are explained in the editor.
- Clear controls can be selected by unique accessible names.

## Security Contract

No API routes are added. Safe href normalization remains unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/entryTeaser.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/entry-teaser-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_ENTRY_TEASER_WIDGET.md`.
- Update `_docs/_WIDGETS/ENTRY_TEASER.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Entry Teaser has accessible public section naming.
- CTA and Clear controls are truthful and accessible in authoring flows.
