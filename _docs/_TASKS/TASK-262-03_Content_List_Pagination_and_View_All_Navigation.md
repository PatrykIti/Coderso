# TASK-262-03: Content List Pagination and View All Navigation

# FileName: TASK-262-03_Content_List_Pagination_and_View_All_Navigation.md

**Priority:** High
**Category:** Widgets + Runtime Render + Listings + Public Read UX
**Estimated Effort:** Very Large
**Dependencies:** TASK-262, TASK-262-01, TASK-262-02
**Status:** To Do

---

## Overview

Add bounded Content List pagination and a Content List-owned View all/Load more
action model.

`REPORT_CONTENT_LIST_WIDGET.md` notes that `resolved.runtime.page` already
exists in schema, but the renderer and editors expose no page navigation and no
`View all` or `Load more` path. The widget hard-limits visible items to the
configured limit, currently capped at 24, without a user-facing route to
continue browsing.

## Scope Boundary

This leaf owns Content List read-only navigation:

- Schema/defaults/normalizer for a bounded pagination/action model.
- Runtime metadata for current page, page size, total items, and whether next
  page exists.
- Renderer pagination links or Load more links that use bounded GET/query
  parameters and existing runtime resolver seams.
- View all link config for a known content route or listing target.
- Editor controls for the above with safe source-aware defaults.

This leaf does not own infinite scroll, client-side mutation APIs, public write
endpoints, arbitrary endpoint URLs, a generic Listings pagination platform, or
changes to unrelated dynamic widgets.

## Sub-Tasks

- [ ] Design a Content List `pagination` data object with mode, page size,
  query param key, and optional View all target fields.
- [ ] Keep `source.limit` backward compatible; map it to page size unless an
  explicit pagination object overrides it.
- [ ] Resolve current page from existing runtime search params, clamp it to
  `>= 1`, and ensure page size remains bounded by the existing max.
- [ ] Update legacy content-type runtime to slice by page offset and expose
  total/page metadata.
- [ ] Update listing-mode runtime to pass bounded pagination overrides through
  existing `parseListingRuntimeOverrides` / `resolveListingRuntimeOverrides`
  rather than inventing a second query parser.
- [ ] Render previous/next or Load more controls only when the source is
  configured and total/page metadata proves more results exist.
- [ ] Add View all link behavior from known route/listing targets and reject
  unsafe arbitrary schemes.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/contentList.tsx` | Add pagination/action schema, defaults, normalizer, renderer controls, runtime metadata consumption, and safe link handling. |
| `core/services/content/contentListResolver.ts` | Resolve page/page size/total metadata for legacy and listing modes through existing runtime query seams. |
| `core/services/search/filterEngine.ts` | Update only if Content List pagination needs a new bounded runtime token beyond current listing runtime page support. |
| `core/admin/ui/widgets/editors/ContentListEditors.tsx` | Add source-aware pagination and View all/Load more controls. |
| `tests/unit/content/contentListResolver.test.ts` | Cover Content List runtime metadata and listing-source pagination resolution. |
| `tests/unit/widgets/contentList.test.tsx` | Cover schema/defaults/rendered controls/safe links. |
| `tests/vitest/search/filterEngine.test.ts` | Cover listing runtime page token parsing/resolution if `filterEngine.ts` changes. |
| `tests/vitest/ui/content-list-editor-wave.test.tsx` | Cover editor controls and source-aware options. |
| `tests/vitest/site/publicRenderer.test.tsx` | Cover public HTML markers/links if output changes. |
| `_docs/_WIDGETS/CONTENT_LIST.md` | Document pagination, View all, and Load more behavior. |

## Implementation Pseudocode

```ts
type ContentListPaginationMode = "none" | "paged" | "load-more" | "view-all";

type ContentListPagination = {
  mode?: ContentListPaginationMode;
  pageSize?: number;
  pageParam?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  loadMoreLabel?: string;
};

function normalizeContentListPagination(value: unknown): Required<ContentListPagination> {
  return {
    mode: resolveEnum(value.mode, ["none", "paged", "load-more", "view-all"], "none"),
    pageSize: normalizeContentListLimit(value.pageSize ?? source.limit ?? 6),
    pageParam: normalizeSafeQueryParamName(value.pageParam, "cl_page"),
    viewAllHref: normalizeSafeHref(value.viewAllHref),
    viewAllLabel: normalizeNonEmptyString(value.viewAllLabel, "View all"),
    loadMoreLabel: normalizeNonEmptyString(value.loadMoreLabel, "Load more"),
  };
}

function resolveContentListPage(params: URLSearchParams, pageParam: string) {
  const raw = Number(params.get(pageParam) ?? "1");
  return Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : 1;
}
```

Legacy resolver shape:

```ts
const page = resolveContentListPage(options.runtimeSearchParams, pagination.pageParam);
const pageSize = normalizeContentListLimit(pagination.pageSize);
const offset = (page - 1) * pageSize;
const sliced = sorted.slice(offset, offset + pageSize);

return {
  items,
  total: filtered.length,
  runtime: { page, pageSize, hasNextPage: offset + pageSize < filtered.length },
};
```

Error handling:

- Invalid page params resolve to page 1.
- Page size is clamped to the existing Content List max.
- Unsafe View all hrefs normalize to undefined and render no link.
- If total is unknown, render no next/load-more control rather than guessing.
- Public output must not include raw runtime search params in diagnostics.

## Security Contract

No public write API is added.

- Endpoint visibility: public runtime remains GET/read-only through existing
  page and listing runtime paths; admin editing remains internal.
- Auth/RBAC/CSRF: unchanged; public pagination does not require CSRF because it
  performs no write.
- Rate-limit bucket: unchanged public page-render/read behavior.
- Reject-unknown validation: pagination fields must be schema-declared and
  reject unknown nested keys.
- Anti-abuse: page and page size are clamped; page param names are allowlisted
  to safe query-key characters; View all href accepts only `/`, `http://`, or
  `https://` if external links are intentionally allowed by the existing safe
  href policy.
- Secret handling: do not expose private listing query data or unpublished
  entry payloads in pagination metadata.

## Testing Requirements

- `bun test tests/unit/widgets/contentList.test.tsx`
- `bun test tests/unit/content/contentListResolver.test.ts` when Content List
  runtime metadata or listing-source resolution changes
- `bun run test:vitest -- tests/vitest/search/filterEngine.test.ts` when
  listing runtime page parsing changes
- `bun run test:vitest -- tests/vitest/ui/content-list-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx` when
  public output changes
- `bun test tests/unit/widgets/validator.test.ts` when schema changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/CONTENT_LIST.md` with pagination and View all/Load more
  behavior.
- Update `_docs/PLAYWRIGHT/REPORT_CONTENT_LIST_WIDGET.md` rows B-01 and B-03
  after validation.

## Changelog Policy

- Covered by the TASK-262 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Content List can expose bounded page navigation or Load more links when more
  items exist.
- View all is a safe configured link or known route target, not an arbitrary
  public write/execute endpoint.
- Legacy and listing modes agree on current page, page size, and total metadata
  where their resolver seams can supply it.
- Existing blocks with no pagination config preserve current output.
