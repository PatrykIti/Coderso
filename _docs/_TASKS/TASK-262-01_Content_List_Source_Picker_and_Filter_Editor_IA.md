# TASK-262-01: Content List Source Picker and Filter Editor IA

# FileName: TASK-262-01_Content_List_Source_Picker_and_Filter_Editor_IA.md

**Priority:** High
**Category:** Widgets + Dynamic Content + Admin UI + Listings
**Estimated Effort:** Large
**Dependencies:** TASK-262, TASK-256-07
**Status:** Done (2026-05-17)

---

## Overview

Repair Content List source and filter editor UX found in
`REPORT_CONTENT_LIST_WIDGET.md`.

The current editor exposes technical source labels, a raw content type dropdown
that can contain duplicate/technical names, free-text taxonomy and author
filters, and listing-mode disabled controls that can still visually imply active
legacy filters. This leaf makes source selection understandable without moving
generic editor-mode helpers out of TASK-256.

## Scope Boundary

This leaf owns only Content List source/filter editor behavior:

- Friendly source labels such as `By content type` and `By listing query`.
- One clear source-owner placement per editor mode: Wizard is onboarding;
  Visual is day-to-day source/filter editing; Advanced is diagnostic/technical.
- Searchable/deduplicated content type selection with stable disambiguation for
  duplicate names and hidden technical screen names.
- Taxonomy/tag suggestions through the existing taxonomy overview read seam when
  the selected legacy content type exposes tags/categories.
- Author selection/search through the existing admin-users read seam while
  keeping manual fallback / diagnostics where author summaries are unavailable.
- Listing-mode read-only feedback that clears, hides, or explains legacy-only
  filters instead of leaving stale active-looking values.

This leaf does not own shared atomic update helpers, a generic searchable
select component, generic token pickers, or changes to Listings query builder
semantics.

## Sub-Tasks

- [ ] Replace technical source-mode labels in Content List editor options while
  keeping stored `source.mode` values unchanged.
- [ ] Move or narrow duplicated source-mode controls so Wizard and Visual do not
  compete for the same beginner-facing decision.
- [ ] Build a Content List-local content type option normalizer that groups or
  disambiguates duplicate names using existing `id`, `slug`, `status`, and
  available metadata without persisting labels.
- [ ] Add search/filter affordance for long content type lists.
- [ ] Replace raw taxonomy text entry with suggestions from existing content
  type/listing metadata when available; keep manual entry as a fallback.
- [ ] Replace raw author UUID entry with an author picker/search when existing
  author summaries are available; keep UUID entry only in Advanced diagnostics.
- [ ] In listing mode, hide or render legacy-only `statusScope`, `searchQuery`,
  `authorId`, and `featuredOnly` as inactive explanatory rows, and ensure the
  disabled switch cannot look active.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/ContentListEditors.tsx` | Update source labels, picker normalization/search, filter controls, and listing-mode inactive feedback. |
| `core/admin/services/taxonomyClient.ts` | Reuse `getTaxonomyOverview(typeId)` for legacy taxonomy suggestions if the current response shape is sufficient; change the client only if cache/error handling must expand. |
| `core/admin/services/adminUsersClient.ts` | Reuse `listAdminUsers()` for author picker/search if the current response shape is sufficient; change the client only if cache/error handling must expand. |
| `core/widgets/core/contentList.tsx` | Update defaults/normalizer only if editor-owned filter display needs schema-backed state. |
| `tests/vitest/ui/content-list-editor-wave.test.tsx` | Cover friendly labels, duplicate content type handling, search/filter behavior, listing-mode disabled feedback, taxonomy suggestions, and author picker fallback. |
| `tests/vitest/admin/taxonomyClient.test.ts` | Update only if the existing taxonomy client contract changes. |
| `tests/vitest/admin/adminUsersClient.test.ts` | Update only if the existing admin-users client contract changes. |
| `tests/unit/widgets/contentList.test.tsx` | Update only if schema/defaults/normalizer change. |
| `_docs/_WIDGETS/CONTENT_LIST.md` | Document source modes, picker behavior, and legacy-vs-listing filter ownership. |

## Implementation Pseudocode

```ts
type ContentListSourceOption = {
  id: string;
  label: string;
  description?: string;
  searchText: string;
  status?: string;
};

function normalizeContentTypeOptions(types: ContentTypeSummary[]): ContentListSourceOption[] {
  const byName = new Map<string, number>();
  for (const type of types) {
    byName.set(type.name.trim().toLowerCase(), (byName.get(type.name.trim().toLowerCase()) ?? 0) + 1);
  }

  return types
    .filter((type) => type.status !== "deleted")
    .map((type) => ({
      id: type.id,
      label: buildFriendlyContentTypeLabel(type, byName),
      description: buildContentTypeDescription(type),
      searchText: `${type.name} ${type.slug} ${type.id}`.toLowerCase(),
      status: type.status,
    }))
    .sort(compareContentTypeOptions);
}

async function loadLegacyFilterSuggestions(contentTypeId: string) {
  const [taxonomyOverview, users] = await Promise.all([
    contentTypeId ? getTaxonomyOverview(contentTypeId) : null,
    listAdminUsers(),
  ]);

  return {
    tagSuggestions: taxonomyOverview?.terms.tags.map((term) => term.name) ?? [],
    authorOptions: users.map((user) => ({
      id: user.id,
      label: user.name?.trim() || user.email,
      description: user.email,
    })),
  };
}

function renderLegacyFilterControl(sourceMode: ContentListSourceMode, control: ReactNode) {
  if (sourceMode === "listing") {
    return <InactiveControlNote reason="Listing queries own filters and sorting." />;
  }
  return control;
}
```

Error handling:

- If source option loading fails, keep the existing error path and do not clear
  the stored source ID.
- If duplicate names cannot be disambiguated cleanly, append a short slug/id
  suffix in the option label but keep persisted data as the source ID only.
- If taxonomy/author suggestions are unavailable, keep manual text entry with
  clearer copy rather than blocking editors.
- Existing read clients should be reused first. Only widen admin read endpoints
  if `getTaxonomyOverview()` or `listAdminUsers()` cannot supply the needed
  labels/search text.
- Switching source modes must clear only source-specific incompatible IDs; it
  must not wipe shared presentation/empty/style fields.

## Security Contract

No API routes are added by default.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged unless existing
  internal admin read endpoints are extended with non-secret option metadata.
- Existing internal read seams expected by this leaf are `GET /content-types/:id/terms`
  via `getTaxonomyOverview()` and `GET /admin-users` via `listAdminUsers()`.
- Reject-unknown validation: widget JSON still stores source/filter IDs and
  strings through the Content List schema, not resolved labels.
- Anti-abuse: search/filter UI is client-side over already-authorized admin
  summaries unless a later implementation explicitly extends internal read
  endpoints with existing RBAC.
- Secret handling: option labels, docs, and report evidence must not expose raw
  private entry data, emails, provider keys, or privileged URLs.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/content-list-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/admin/taxonomyClient.test.ts` when the
  taxonomy client contract changes
- `bun run test:vitest -- tests/vitest/admin/adminUsersClient.test.ts` when the
  admin-users client contract changes
- `bun test tests/unit/widgets/contentList.test.tsx` if schema/defaults change
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/CONTENT_LIST.md` with source mode labels, picker
  behavior, and legacy/listing filter ownership.
- Update `_docs/PLAYWRIGHT/REPORT_CONTENT_LIST_WIDGET.md` rows E-02, E-03,
  E-04, E-06, E-11, T-03, T-04, and T-06 after validation.

## Changelog Policy

- Covered by the TASK-262 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Editors no longer see raw `Legacy content type source` / `Listings query
  source` copy.
- Duplicate content type names are searchable and disambiguated without
  persisting labels.
- Listing mode cannot present stale legacy filters as active behavior.
- Taxonomy and author filters are editor-friendly while preserving existing
  runtime filter semantics.
