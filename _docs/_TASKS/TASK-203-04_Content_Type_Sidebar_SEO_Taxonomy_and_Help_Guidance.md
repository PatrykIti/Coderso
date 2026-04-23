# TASK-203-04: Content Type Sidebar, SEO, Taxonomy, and Help Guidance
# FileName: TASK-203-04_Content_Type_Sidebar_SEO_Taxonomy_and_Help_Guidance.md

**Priority:** Medium
**Category:** CMS/Entries + Admin/UI + UX
**Estimated Effort:** Large
**Dependencies:** TASK-203, TASK-203-01
**Status:** To Do

---

## Overview

Tighten non-destructive guidance and navigation gaps from `UX-1`, `UX-3`,
`UX-5`, and `BUG-8`.

Current owner evidence:

- `EntryTypeSidebar.tsx:33-127` renders a flat content-type list.
- `EntryTypeSidebar.tsx:96-107` renders only the type name plus count, so
  duplicate names such as `News`/`Notes` are still ambiguous without slug or
  route context.
- `EntryMetadataPanel.tsx:107-110` hardcodes `Nextless CMS` and
  `https://nextless.cms/blog/...`.
- `EntryMetadataPanel.tsx:314-333` renders `What is this?` expanded.
- `EntryMetadataPanel.tsx:382-385` shows disabled taxonomy copy without an
  Engine settings route.

## Sub-Tasks

- `TASK-203-04-01_Content_Type_Sidebar_Grouping_Counts_and_Hide_Empty_Types.md`
- `TASK-203-04-02_Metadata_Panel_SEO_URL_Taxonomy_Link_and_Collapsible_Help.md`

## Scope

- Improve content-type sidebar scanability without mutating content types.
- Preserve search behavior and entry counts.
- Disambiguate duplicate content-type names with current slug/path context.
- Add hide-empty/grouping affordances when derivable from current summaries.
- Replace hardcoded SEO domain with settings/content-route context.
- Add Engine settings navigation for disabled taxonomy.
- Collapse or persist-dismiss help without removing first-use guidance.

Out of scope:

- deleting or archiving generated content types,
- taxonomy schema redesign,
- Engine IA redesign,
- adding public routes only to make SEO preview concrete.

## Files to Change

- `core/admin/ui/entries/EntryTypeSidebar.tsx:33-127`
- `core/admin/ui/entries/EntryList.tsx:177-187`
- `core/admin/ui/entries/EntryMetadataPanel.tsx:83-110`
- `core/admin/ui/entries/EntryMetadataPanel.tsx:314-385`
- `core/admin/ui/entries/EntryEditor.tsx:545-555`
- `core/admin/services/contentTypesClient.ts`
- `core/admin/services/siteSettingsClient.ts`
- shared admin path helpers if an Engine settings link is added
- `core/admin/ui/shared/AdminLink.tsx`
- `tests/vitest/ui/entry-list-wave.test.tsx`
- `tests/vitest/ui/content-entries.test.tsx`
- `tests/vitest/ui/entry-metadata.test.tsx`
- `tests/vitest/admin/contentTypesClient.test.ts`
- `tests/vitest/admin/siteSettingsClient.test.ts`

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF: existing read routes and admin navigation; no new mutation is
  expected.
- Rate-limit bucket: `admin_read`.
- Reject-unknown validation: unchanged.
- Anti-abuse: sidebar hiding is presentation-only; SEO preview must not expose
  backend-only settings; taxonomy links stay internal.

## Testing Requirements

- sidebar grouping/hide-empty/search/count behavior,
- duplicate type names remain readable by showing slug or equivalent current
  content-type context,
- SEO preview configured URL and fallback placeholder,
- taxonomy disabled state includes internal settings link,
- help is collapsible/persistently dismissible,
- new links use shared admin path helpers.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_SPEC.md`
- `docs/coderso/entries-list-type-selection-and-creation.md`
- `docs/coderso/entry-editor-and-metadata.md`
- `docs/coderso/content-type-editor-and-schema-builder.md` if taxonomy linking
  changes
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. The content-type sidebar remains searchable but is easier to scan.
2. Duplicate type names are visually disambiguated without changing stored
   content-type data.
3. SEO preview never hardcodes `nextless.cms`.
4. Disabled taxonomy guidance links to the owning Engine configuration.
5. Help guidance is available without permanently occupying sidebar space.
