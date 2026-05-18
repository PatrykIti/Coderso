# TASK-294: Entry Teaser Listing Manual Picker

# FileName: TASK-294_Entry_Teaser_Listing_Manual_Picker.md

**Priority:** Medium
**Category:** Widgets + Runtime Render + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-265
**Status:** To Do

---

## Overview

Add an explicit manual listing picker for the Entry Teaser widget when the
source type is `listing`.

`TASK-265` closes the report-driven `latest` and `featured` listing semantics,
but intentionally does not introduce a one-off listing-row picker in the same
slice. This follow-up owns the remaining product question: how editors choose a
specific listing result deterministically without inventing unsafe or unstable
row identifiers in widget data.

## Scope Boundary

In scope:

- Decide the persisted contract for a manual listing item target.
- Extend Entry Teaser editor/runtime/tests/docs for manual listing selection.
- Keep listing manual selection explicit and deterministic.

Out of scope:

- Reworking generic Listings query execution.
- Adding arbitrary client-side row search against public listing endpoints.
- Changing the `latest` or `featured` semantics already implemented in
  `TASK-265`.

## Files To Create Or Change

| File | Required change |
|---|---|
| `core/widgets/core/entryTeaser.tsx` | Extend schema/defaults/normalizer if a persisted manual listing selection field is introduced. |
| `core/services/content/entryTeaserResolver.ts` | Resolve manual listing selection deterministically after the contract is defined. |
| `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx` | Add the manual listing picker UX in the intended editor mode without reintroducing source-control duplication. |
| `tests/unit/widgets/entryTeaser.test.tsx` | Add Bun runtime coverage for manual listing selection rules. |
| `tests/vitest/ui/entry-teaser-editor-wave.test.tsx` | Add editor coverage for the manual listing picker flow. |
| `_docs/_WIDGETS/ENTRY_TEASER.md` | Document the final listing manual-selection contract. |

## Security Contract

No API routes are introduced by this planning leaf.

- Endpoint visibility: none.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: any new persisted widget field must be added to
  `entryTeaserSchema` with `additionalProperties: false`.
- Anti-abuse: manual listing selection must use deterministic IDs already owned
  by trusted admin/runtime data, not arbitrary user-supplied HTML, URLs, or
  ad-hoc query fragments.

## Implementation Pseudocode

```ts
type EntryTeaserListingManualTarget = {
  rowId?: string;
  entryId?: string;
};

function normalizeEntryTeaserData(data: EntryTeaserData): EntryTeaserData {
  return {
    ...current,
    source: {
      ...current.source,
      listingManualTarget: normalizeManualListingTarget(data.source?.listingManualTarget),
    },
  };
}

function resolveListingManualTarget(rows, target) {
  // Prefer stable entry IDs when present.
  // Fall back to explicit row IDs only if the source contract guarantees them.
}

function SourcePickerFields(...) {
  // In listing mode:
  // 1. choose latest / featured / manual
  // 2. when manual is selected, render a bounded picker for resolved listing rows
  // 3. preserve TASK-265 single-owner source mutation rules
}
```

## Sub-Tasks

- [ ] Decide the persisted manual-listing target shape.
- [ ] Add editor support without duplicating source ownership across modes.
- [ ] Add runtime resolution for listing manual selection.
- [ ] Add Bun and Vitest regression coverage.
- [ ] Update widget docs after the contract lands.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/entryTeaser.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/entry-teaser-editor-wave.test.tsx`

## Documentation Updates Required

- `_docs/_WIDGETS/ENTRY_TEASER.md`
- `_docs/PLAYWRIGHT/REPORT_ENTRY_TEASER_WIDGET.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` if the task is completed.

## Acceptance Criteria

- Listing mode can intentionally pick `latest`, `featured`, or one manual row
  through a documented contract.
- Manual listing selection remains deterministic across preview and public
  runtime.
- Editor ownership stays aligned with `TASK-265` Wizard/Visual/Advanced rules.
