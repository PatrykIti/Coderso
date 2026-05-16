# TASK-265-02: Entry Teaser Editor IA, Fallback, and Variant Preview

# FileName: TASK-265-02_Entry_Teaser_Editor_IA_Fallback_and_Variant_Preview.md

**Priority:** High
**Category:** Widgets + Admin UI + Editor IA
**Estimated Effort:** Large
**Dependencies:** TASK-265-01
**Status:** To Do

---

## Overview

Repair Entry Teaser editor organization and preview affordances from
`REPORT_ENTRY_TEASER_WIDGET.md`.

This leaf owns report findings E-01, E-02, E-03, E-04, E-09, E-10, and E-12.
It keeps the editor beginner-friendly by moving duplicated source controls to
one intentional owner, adding visual variant thumbnails, grouping fallback copy
with fallback behavior, showing field-toggle effects, explaining Auto URL, and
making the runtime snapshot copyable.

## Scope Boundary

In scope:

- Entry Teaser-only editor wording and section organization.
- Entry Teaser variant cards with small layout thumbnails.
- Local field-toggle preview hints that do not rely on public runtime
  publication.
- Fallback copy and `fallbackToLatest` grouped in one editor section.
- Copy-to-clipboard action for the Entry Teaser runtime snapshot.

Out of scope:

- Cross-widget editor mode ownership helpers from TASK-256-01.
- Generic design-token/color picker controls from TASK-256-02.
- Global page-builder panel redesign.

## Files To Create Or Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx` | Update labels, section ownership, variant thumbnails, fallback grouping, field preview hints, Auto URL copy, and snapshot copy action. |
| `core/widgets/core/entryTeaser.tsx` | Add schema/default fields only if editor changes need persisted data. Avoid editor-only persistence. |
| `tests/vitest/ui/entry-teaser-editor-wave.test.tsx` | Cover source control ownership, thumbnails, fallback grouping, field preview hints, Auto URL copy, and snapshot copy action. |
| `tests/vitest/widgets/entryTeaser.test.tsx` | Update Bun-free render smoke assertions when labels or preview defaults change. |
| `_docs/_WIDGETS/ENTRY_TEASER.md` | Document final Wizard/Visual/Advanced responsibilities. |

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged admin UI and public runtime widget rendering.
- RBAC: unchanged page/template/widget-template permissions.
- CSRF: unchanged because no write route is introduced.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: preserve `entryTeaserSchema.additionalProperties`
  behavior for any persisted fields.
- Anti-abuse: editor snapshot copy must copy already-redacted widget/runtime
  data only; do not include credentials, cookies, private URLs, or tokens.
- Secret handling: no secrets in snapshot copy, browser cache, or docs.

## Implementation Pseudocode

```tsx
const sourceLabels = {
  legacy: "Content type",
  listing: "Listing query",
};

function EntryTeaserWizardEditor(...) {
  return (
    <>
      <SourceOverviewSection /> // choose source type and source mode only here
      <VariantThumbnailSelect />
    </>
  );
}

function EntryTeaserVisualEditor(...) {
  return (
    <>
      <VariantThumbnailSelect />
      <SourceSummaryCard /> // shows selected source and links back to Wizard
      <FieldTogglePreview /> // local skeleton using resolved/fallback data
      <CtaHelpCopy />
      <FallbackSection includeFallbackToLatest />
    </>
  );
}

function EntryTeaserAdvancedEditor(...) {
  return (
    <>
      <StyleTokens />
      <RuntimeSnapshot copyToClipboard={navigator.clipboard.writeText} />
    </>
  );
}
```

Data flow:

- Keep source data in the existing `EntryTeaserData.source` and `sourceMode`
  fields.
- Do not duplicate source type selectors in all three modes. One mode owns the
  mutation; other modes may render read-only summaries or route guidance.
- Field-toggle previews use `normalized.resolved.item` when available and
  fallback copy otherwise.

Error handling:

- Clipboard failures show non-blocking inline feedback and leave the snapshot
  visible.
- Read-only source summaries must not silently mutate stale source values.
- Variant thumbnail buttons must still no-op safely when `onVariantChange` is
  unavailable.

Regression-test shape:

- Assert technical labels `Legacy content type source` and `Listings query
  source` are gone from primary editor UI.
- Assert only the intended editor section contains the mutable source type
  selector.
- Assert variant cards include thumbnail markers and update variant.
- Assert fallback title/description and fallback-to-latest toggle are in one
  section.
- Assert runtime snapshot copy calls clipboard with JSON and reports failure
  without throwing.

## Sub-Tasks

- [ ] Replace technical source labels with editor-friendly labels.
- [ ] Consolidate source mutation ownership across Wizard/Visual/Advanced.
- [ ] Add visual variant thumbnails.
- [ ] Group fallback copy and fallback behavior.
- [ ] Add field-toggle preview hints and Auto URL explanation.
- [ ] Add copy action for runtime snapshot diagnostics.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/entry-teaser-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/entryTeaser.test.tsx`

## Documentation Updates Required

- `_docs/_WIDGETS/ENTRY_TEASER.md`
- `_docs/PLAYWRIGHT/REPORT_ENTRY_TEASER_WIDGET.md`
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when this leaf moves to
  `Done`.

## Acceptance Criteria

- The editor presents source selection in one clear owner mode and does not show
  the same mutable source selector three times.
- Variant choices are visually distinguishable before selection.
- Fallback content and fallback behavior are edited together.
- Field toggles have visible local preview feedback.
- Runtime payload snapshot remains read-only but can be copied safely.
