# TASK-273-07: Wizard, Diagnostics, and Mode Onboarding

# FileName: TASK-273-07_Wizard_Diagnostics_and_Mode_Onboarding.md

**Priority:** Medium
**Category:** Widgets + Listing Filters + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-273-01, TASK-273-02, TASK-273-06
**Status:** To Do

---

## Overview

Polish the Listing Filters editor modes after the functional repairs land:
Wizard should support safe first-run facet setup or clearly route to Visual,
Visual should expose enough diagnostics to explain runtime state, and Advanced
should link the contract instead of being the only place where authors can see
resolved payload information.

This leaf owns Listing Filters mode content. Shared mode switching, generic
metadata requirements, and Advanced duplicate-control policy remain TASK-256.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:114` - Wizard lacks
  `FacetsEditor`.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:116-117` - missing query
  setup guidance and diagnostics outside Advanced.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:178-182` - Advanced
  runtime payload is always empty in editor context and contract text lacks doc
  linkage.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:340,358-360` - Wizard and
  Advanced state are marked incomplete.
- `_docs/WIDGETS.md:56-88` - required Wizard, Visual, and Advanced ownership.
- `_docs/WIDGETS.md:97-105` - one-control-per-line and stable editor metadata.
- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx:629-674` - current
  Wizard/Visual/Advanced section split.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx` | Add Wizard facet setup/onboarding, Visual diagnostics summary, Advanced contract doc link, and stable `data-widget-control` metadata for new controls. |
| `tests/vitest/ui/listing-filters-editor-wave.test.tsx` | Cover mode-specific sections, diagnostics visibility, and onboarding flows. |
| `_docs/_WIDGETS/LISTING_FILTERS.md` | Update mode ownership and diagnostics docs. |
| `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md` | Mark E-07, E-09, and E-10 fixed or record deferral evidence. |

## Implementation Pseudocode

```tsx
function ListingFiltersWizardEditor(props: WidgetEditorProps<ListingFiltersData>) {
  return (
    <div className="space-y-3" data-widget-editor="listing-filters" data-widget-editor-mode="wizard">
      <ListingQuerySelect {...props} setupRequiredNotice />
      <WizardFacetStarter {...props} maxInitialFacets={3} />
      <RuntimeBehavior value={props.value} onChange={props.onChange} compact />
    </div>
  );
}

function RuntimeDiagnosticsSummary({ value }: { value: ListingFiltersData }) {
  const normalized = normalizeListingFiltersData(value);
  return (
    <EditorSection id="listing-filters.diagnostics" title="Diagnostics">
      <DiagnosticRow label="Runtime query" value={normalized.resolved?.listingQueryId || normalized.listingQueryId || "Not selected"} />
      <DiagnosticRow label="Rejected tokens" value={(normalized.resolved?.rejectedTokens ?? []).join(", ") || "None"} />
      {normalized.resolved?.error ? <InlineError>{normalized.resolved.error}</InlineError> : null}
    </EditorSection>
  );
}
```

Data flow:

- Wizard writes the same `ListingFiltersData` model as Visual/Advanced.
- Diagnostics read normalized `resolved` state and configured query ID; they do
  not run SSR or fetch public runtime data from the editor.
- Advanced keeps raw payload visibility but links to
  `_docs/_WIDGETS/LISTING_FILTERS.md` and names the `lq.<queryId>.*` contract.

Error handling:

- When `listingQueryId` is empty, Wizard and Visual show blocking setup guidance
  near the query picker.
- When `resolved` is empty in editor context, diagnostics explain that public SSR
  fills it on runtime pages instead of implying a broken payload.
- Do not persist diagnostic-only state.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged authenticated admin UI.
- RBAC: unchanged page/template/widget write permissions.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: diagnostics and onboarding state must not add
  persisted unknown fields unless schema/defaults/normalizer are updated.
- Anti-abuse: diagnostics must not expose secrets, provider keys, raw request
  payloads, or privileged settings.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/listing-filters-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/listingFilters.test.tsx` if
  diagnostics helpers move into widget owner code.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/LISTING_FILTERS.md`
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md`
- `_docs/_TASKS/TASK-273-07_Wizard_Diagnostics_and_Mode_Onboarding.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- First-run Wizard users can configure a useful query/facet baseline or are
  explicitly routed to Visual with no hidden required step.
- Visual exposes enough diagnostics to explain missing query, rejected tokens,
  and runtime errors.
- Advanced remains the expert view and links the documented Listing Filters
  contract.
- Mode content uses stable editor metadata and does not duplicate TASK-256 mode
  mechanics.
