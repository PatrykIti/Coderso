# TASK-252-07-08: Search Box Copy Target Route Query Param and Display Mode

# FileName: TASK-252-07-08_Search_Box_Copy_Target_Route_Query_Param_and_Display_Mode.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime + Security
**Estimated Effort:** Medium
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-07
**Status:** To Do

---

## Overview

Expose search-box label, placeholder, button, compact/full modes, target route, and query param without persisting provider key/index configuration.

This is an execution leaf under `TASK-252-07`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/search-box/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/search-box/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/search-box/MATRIX.md` to bind the final option set to research decisions.
- Keep editor clarity separate from runtime ownership: source/display choices may be editable, but data resolution stays in existing service/runtime owners.
- Use shared TASK-252 editor controls and metadata without moving runtime-kernel behavior into Vitest-only code.
- Preserve cache, permission, public-write, and provider-secret boundaries for this widget family.

## Research Decisions

- Keep: only rows marked `Keep` in `_docs/_WIDGETS/tmp/search-box/MATRIX.md`; for this leaf, start from the current owner fields `mode`, `listingQueryId`, `endpoint`, `sources`, `autoApply`, `style`, `resolved` and add only the schema fields that the matrix explicitly keeps.
- Keep: accessible copy controls, compact/full modes, and result route/query
  binding from `_docs/_WIDGETS/tmp/search-box/MATRIX.md`; add schema-owned
  target route/query-param fields in `core/widgets/core/searchBox.tsx` and keep
  runtime normalization in `core/widgets/core/listingRuntimeScript.ts`.
- Keep: split public API endpoint ownership from result-page routing.
  `endpoint` remains the safe public-read `/api/search` API endpoint or a
  locked diagnostic field; `targetRoute` must default to a public page route
  such as `/search` and must not inherit `endpoint`.
- Adapt: suggestions/autocomplete remain conditional and backend-owned; implement only when schema/defaults/normalizer/render/editor/tests move together.
- Reject: arbitrary operators, client-owned provider/index config, raw scripts, and privileged settings in widget data.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `search-box`.
- `Visual`: `Copy`, `Display mode`, `Target route`, `Query parameter`, `Button`.
- `Advanced`: `Search diagnostics`, `Route mapping`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/searchBox.tsx`
- `core/widgets/core/listingRuntimeScript.ts` when query/reset/apply/query-param runtime behavior changes.
- `core/server/publicSite.tsx` when the public `/api/search` route or
  `public_read` handling changes.
- `core/admin/ui/widgets/editors/SearchBoxEditors.tsx`
- Bun-owned route/security suites when public endpoint behavior changes.
- `tests/unit/widgets/validator.test.ts` when schema validation changes.
- `tests/vitest/widgets/searchBox.test.tsx`
- `tests/vitest/ui/search-box-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/SEARCH_BOX.md`
- `_docs/_WIDGETS/tmp/search-box/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-07-08_Search_Box_Copy_Target_Route_Query_Param_and_Display_Mode.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
function normalizeSearchBoxData(data: SearchBoxData): SearchBoxData {
  return {
    mode: normalizeSearchBoxMode(data.mode),
    variant: normalizeSearchBoxVariant(data.variant ?? data.mode),
    size: normalizeSearchBoxSize(data.size),
    listingQueryId: normalizeSearchBoxListingQueryId(data.listingQueryId),
    title: normalizeSearchBoxTitle(data.title),
    description: normalizeSearchBoxDescription(data.description),
    label: normalizeSearchBoxLabel(data.label ?? data.title),
    placeholder: normalizeSearchBoxPlaceholder(data.placeholder),
    submitLabel: normalizeSearchBoxSubmitLabel(data.submitLabel),
    resetLabel: normalizeSearchBoxResetLabel(data.resetLabel),
    targetRoute: normalizeSearchBoxTargetRoute(data.targetRoute ?? "/search"),
    queryParam: normalizeSearchBoxQueryParam(data.queryParam ?? "q"),
    autoApply: normalizeSearchBoxAutoApply(data.autoApply),
    endpoint: normalizeSearchBoxPublicApiEndpoint(data.endpoint ?? "/api/search"),
    sources: normalizeSearchBoxSources(data.sources),
    style: normalizeSearchBoxStyle(data.style),
    resolved: normalizeSearchBoxResolved(data.resolved),
  };
}

function SearchBoxVisualEditor(props: WidgetEditorProps<SearchBoxData>) {
  const value = props.value;
  return (
    <WidgetEditorSection id="search-box.search-box" title="Search target">
      <WidgetControlRow id="search-box.mode" label="Mode" data-widget-control="search-box.mode">
        <SegmentedControl value={value.mode ?? "listing"} onChange={handleControlChange} />
      </WidgetControlRow>
      <WidgetControlRow id="search-box.targetRoute" label="Target route" data-widget-control="search-box.targetRoute">
        <Input value={value.targetRoute ?? "/search"} onChange={(targetRoute) => props.onChange(updateSearchBoxRoute(value, { targetRoute }))} />
      </WidgetControlRow>
      <WidgetControlRow id="search-box.queryParam" label="Query parameter" data-widget-control="search-box.queryParam">
        <Input value={value.queryParam ?? "q"} onChange={(queryParam) => props.onChange(updateSearchBoxRoute(value, { queryParam }))} />
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/search-box/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/searchBox.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Keep `endpoint` and `targetRoute` separate in schema, rendering, and editor
  controls: `endpoint` is the public-read API action, while `targetRoute` is the
  result page route. Do not migrate legacy `/api/search` endpoint values into
  `targetRoute`.
- Update `core/widgets/core/listingRuntimeScript.ts` so runtime query reads and
  writes use the normalized `queryParam` instead of hard-coding `q`.
- Refactor `core/admin/ui/widgets/editors/SearchBoxEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `search-box` output is public page/runtime output.
- Auth model:
  - no new endpoint is introduced by this leaf;
  - global search mode uses the existing public `GET /api/search` route in
    `core/server/publicSite.tsx`;
  - listing mode keeps route/query synchronization in
    `getListingRuntimeClientScript`;
  - edits persist through existing authenticated admin page/template save flows.
- RBAC:
  - unchanged page/template/widget-template write permissions.
- CSRF:
  - unchanged admin write CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets;
  - existing `/api/search` public reads stay on the `public_read` bucket.
- Reject-unknown validation:
  - changed `search-box` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/searchBox.tsx`.
- Anti-abuse:
  - target route/query param must be sanitized and bounded;
  - `targetRoute` must reject API endpoints and external URLs unless a later
    route owner explicitly allows them;
  - `/api/search` limits/sources stay clamped by the public route owner;
  - provider secrets must not enter widget data.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema validation, slot normalization, or widget validation changes.
- `bun run test:vitest -- tests/vitest/widgets/searchBox.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/search-box-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/search/searchIndexService.test.ts` when
  public search source/query behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add or update a regression around `getListingRuntimeClientScript` when query/
  reset/apply/query-param behavior changes.
- Add a regression proving `targetRoute` does not inherit `/api/search` from
  legacy `endpoint`, and that `queryParam` is rendered/read by runtime instead
  of hard-coded to `q`.
- `bun test tests/unit/security/rateLimit.test.ts` when `public_read` bucket
  behavior changes.
- Add Bun-owned route/security tests when `/api/search` endpoint behavior,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/SEARCH_BOX.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-07-08_Search_Box_Copy_Target_Route_Query_Param_and_Display_Mode.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `search-box` editor exposes the research-backed controls named in this leaf with stable metadata.
- Runtime/data source ownership remains in the existing backend or widget owner seam.
- Public-read/provider-secret boundaries are explicitly preserved in tests/docs when touched.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
