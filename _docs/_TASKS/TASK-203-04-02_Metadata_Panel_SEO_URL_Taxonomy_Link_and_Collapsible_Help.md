# TASK-203-04-02: Metadata Panel SEO URL, Taxonomy Link, and Collapsible Help
# FileName: TASK-203-04-02_Metadata_Panel_SEO_URL_Taxonomy_Link_and_Collapsible_Help.md

**Priority:** Medium
**Category:** CMS/Entries + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-203-04
**Status:** To Do

---

## Overview

Repair metadata panel guidance: hardcoded SEO URL, disabled taxonomy without a
repair path, and always-expanded help. This leaf owns `BUG-8`, `UX-3`, and
`UX-5`.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/entries/EntryMetadataPanel.tsx:83-110`
- `core/admin/ui/entries/EntryMetadataPanel.tsx:314-333`
- `core/admin/ui/entries/EntryMetadataPanel.tsx:382-385`
- `core/admin/ui/entries/EntryEditor.tsx:545-555`
- `core/admin/services/siteSettingsClient.ts`
- `core/admin/services/contentTypesClient.ts`
- shared admin path helpers for Engine route if needed
- `tests/vitest/ui/entry-metadata.test.tsx`
- `tests/vitest/ui/entry-editor-shell-wave.test.tsx`
- `tests/vitest/admin/siteSettingsClient.test.ts`

## Implementation Sketch

```ts
const seoPreviewUrl =
  publicBaseUrl && routeUsesSlug
    ? `${publicBaseUrl}${entryPath}`
    : `yourdomain.com/${contentTypeSlug}/${slug || "[slug]"}`;
```

Direction:

- concrete URL only from trustworthy site settings and route context,
- otherwise show neutral placeholder/route hint,
- taxonomy link goes to current content type settings through shared helpers.

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF: no new route; existing reads only.
- Rate-limit bucket: `admin_read`.
- Reject-unknown validation: unchanged.
- Anti-abuse: no backend-only secrets in SEO preview props; local help-collapse
  state must not store content data.

## Testing Requirements

- configured public URL appears when available,
- fallback placeholder appears when context is missing,
- `nextless.cms` is not hardcoded,
- disabled taxonomy copy includes Engine settings link,
- help can collapse and remains accessible.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_SPEC.md`
- `docs/coderso/entries-list-type-selection-and-creation.md`
- `docs/coderso/content-type-editor-and-schema-builder.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. SEO preview URL is settings/route-derived or neutral placeholder.
2. Disabled taxonomy guidance gives a direct internal repair path.
3. Help no longer permanently occupies sidebar space.

