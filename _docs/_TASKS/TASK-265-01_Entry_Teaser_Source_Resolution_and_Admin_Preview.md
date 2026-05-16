# TASK-265-01: Entry Teaser Source Resolution and Admin Preview

# FileName: TASK-265-01_Entry_Teaser_Source_Resolution_and_Admin_Preview.md

**Priority:** High
**Category:** Widgets + Dynamic Content + Admin UI + Runtime Resolver
**Estimated Effort:** Large
**Dependencies:** TASK-265, TASK-256-07
**Status:** To Do

---

## Overview

Repair Entry Teaser source resolution and editor preview drift from
`REPORT_ENTRY_TEASER_WIDGET.md` without changing the generic widget preview
contract.

This leaf owns report findings E-05, E-06, E-07, E-13, T-05, T-07, and B-06.
It must let editors inspect the resolved teaser item in admin, distinguish API
errors from empty data, keep manual entry status visible, dedupe confusing
content-type picker rows, and make listing-mode source behavior explicit.

## Scope Boundary

In scope:

- Use the existing `resolveEntryTeaserRuntimeData()` owner for resolved preview
  data instead of duplicating resolver logic in the editor.
- Add an internal admin preview read seam only if the current page/template
  editor cannot reuse an existing preview/resolver mechanism.
- Keep resolved preview data transient. Editor preview state must not be written
  through `onChange` into persisted page/widget JSON unless the save path strips
  `resolved` before draft/publish persistence.
- Preserve public runtime behavior for published pages.
- Make source picker loading, auth/error, empty, and retry states distinct.
- Group or annotate confusing content type options by display name/slug/status
  while preserving distinct IDs; do not collapse legitimately different content
  types solely because they share a display name.
- Show manual entry status in Wizard compact mode.
- Implement an explicit Entry Teaser listing-mode source decision for B-06:
  `latest` uses the first listing result, `featured` selects the first result
  tagged or flagged as featured when that data is present and falls back
  according to `fallbackToLatest`, while unsupported manual listing selection is
  deferred to a named future listing-picker task during TASK-265-05 closure.

Out of scope:

- Generic admin preview architecture for every widget.
- Generic cache invalidation helpers outside Entry Teaser source clients.
- Broad Listing Query builder redesign.

## Files To Create Or Change

| File | Required change |
|---|---|
| `core/services/content/entryTeaserResolver.ts` | Keep resolver as the single source of truth; add listing source-mode handling only through explicit one-item semantics and tests. |
| `core/widgets/core/entryTeaser.tsx` | Preserve public normalized `resolved` payload for runtime injection, but do not require editor preview to persist `resolved` in widget JSON. |
| `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx` | Add transient resolved preview state, retryable source picker errors, grouped/annotated content type options, and compact entry status labels. |
| `core/admin/services/entryTeaserPreviewClient.ts` | Create only if an internal preview endpoint is needed; keep it uncached/transient with strict response guards so `_docs/ADMIN_CACHE.md` is not needed. |
| `core/server/routes/widgetRoutes.ts` or a dedicated route file | Add internal preview route only if needed; route must validate payload, require `content:read`, and resolve content routes server-side. |
| `tests/vitest/widgets/entryTeaser.test.tsx` | Add Bun-free normalizer/render coverage for listing and legacy preview behavior. |
| `tests/unit/widgets/entryTeaser.test.tsx` | Keep only Bun-coupled resolver/runtime cases if any remain after migration; otherwise use as a one-time comparison smoke before removal. |
| `tests/vitest/ui/entry-teaser-editor-wave.test.tsx` | Add editor states for resolved preview, retry, auth failure, empty entries, dedupe, and compact status labels. |
| `tests/integration/routes/widgets.test.ts` | Update route registration/permission coverage if an internal preview route is added. |
| `tests/integration/runtime/*` | Add focused Bun runtime/public-site hydration coverage if `publicSite.tsx` resolver injection changes. |

## Security Contract

This leaf may add an internal read-only preview endpoint, but no public endpoint.

- Endpoint visibility: internal admin only, for example
  `POST /admin/api/widgets/entry-teaser/preview` if required.
- Auth model: authenticated admin session or API key with `content:read`.
- RBAC: `content:read`; no write permission is required for preview.
- CSRF: required for POST admin preview payloads through the existing admin API
  CSRF path.
- Rate-limit bucket: default/internal admin read bucket; no public write bucket.
- Reject-unknown validation: request body must be schema-first and must reject
  unknown widget payload keys before resolver execution.
- Anti-abuse: preview accepts only Entry Teaser data and bounded runtime search
  params; content routes/settings must be resolved server-side and not accepted
  from browser payloads. It must not fetch arbitrary URLs or execute
  user-authored scripts.
- Secret handling: no secrets, nonce values, CAPTCHA tokens, private URLs, or
  raw auth metadata in preview payloads, browser cache, logs, or report output.

## Implementation Pseudocode

```ts
type EntryTeaserPreviewRequest = {
  data: EntryTeaserData;
  runtimeSearchParams?: Record<string, string>;
};

async function previewEntryTeaser(input: EntryTeaserPreviewRequest) {
  validate(entryTeaserPreviewSchema, input);
  const normalized = normalizeEntryTeaserData(input.data);
  const contentRoutes = await loadServerContentRoutesForPreview();
  const resolved = await resolveEntryTeaserRuntimeData(normalized, {
    preview: true,
    contentRoutes,
    runtimeSearchParams: new URLSearchParams(input.runtimeSearchParams),
  });
  return {
    data: stripPreviewResolvedData(normalized),
    resolved,
  };
}

function buildContentTypeOptions(items: ContentTypeSummary[]) {
  const nameCounts = countBy(items, (item) => item.name.trim().toLowerCase());
  return items.map((item) => ({
    value: item.id,
    label:
      nameCounts[item.name.trim().toLowerCase()] > 1
        ? `${item.name} (${item.slug}, ${item.status})`
        : item.name,
  }));
}

function SourcePickerFields(...) {
  // Data flow:
  // 1. load content types/listing options with abort-safe state.
  // 2. render loading, error with Retry, empty, and ready states separately.
  // 3. when manual mode and type is selected, load entries and show status
  //    labels even in compact Wizard mode.
  // 4. call preview client after normalized source changes and store resolved
  //    preview in local component/page-editor state, not persisted widget data.
}
```

Error handling:

- Map 401/403 to actionable admin copy and a retry action.
- Map missing content type to the existing resolver error
  `Selected content type no longer exists.`
- Keep empty entries distinct from failed API loads.
- Do not replace user-authored fallback copy with error copy.

Regression-test shape:

- Mock content types with duplicate labels and IDs and assert only unique
  options render.
- Mock content type 401 and entries 401 separately and assert user-facing copy
  plus retry controls.
- Assert compact manual picker includes `(published)` or equivalent status.
- Assert resolved preview updates transient preview state while preserving
  source/CTA edits and without calling `onChange` with `resolved.item`.
- Assert preview route resolves content routes server-side and rejects any
  client-supplied route/settings keys.
- Assert listing mode `latest` and `featured` selection rules over listing
  results, and record unsupported manual listing selection as a named TASK-265-05
  deferral if it remains out of scope.
- If a route is added, assert route registration, `content:read` permission,
  strict validation, and mapped errors.

## Sub-Tasks

- [ ] Add resolved preview data path through the current resolver owner.
- [ ] Add source picker state model for loading, error, empty, and retry.
- [ ] Group or annotate confusing content type options and preserve selected values.
- [ ] Show manual entry status in compact Wizard mode.
- [ ] Implement concrete listing-mode latest/featured semantics and add
      resolver/editor tests.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/entry-teaser-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/entryTeaser.test.tsx`
- `bun test tests/unit/widgets/entryTeaser.test.tsx` only as a comparison smoke
  or when a retained resolver/runtime case still depends on Bun.
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx` when
  resolved payload rendering changes.
- `bun test tests/integration/routes/widgets.test.ts` if an internal preview
  route is added or changed.
- Focused Bun runtime/public-site coverage when `publicSite.tsx` resolver
  injection changes.

## Documentation Updates Required

- `_docs/_WIDGETS/ENTRY_TEASER.md`
- `_docs/PLAYWRIGHT/REPORT_ENTRY_TEASER_WIDGET.md`
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when this leaf moves to
  `Done`.

## Acceptance Criteria

- Admin preview can show the same resolved teaser item that public preview would
  render for the current widget data without persisting preview-only
  `resolved.item` snapshots into page/widget JSON.
- API/auth failures, empty content, and missing source states are visibly
  different and retryable where applicable.
- Listing mode has tested `latest`/`featured` one-item behavior or a named
  future task for any deliberately unsupported manual listing picker.
- No shared preview helper is created inside Entry Teaser unless TASK-256 owns
  the shared contract first.
