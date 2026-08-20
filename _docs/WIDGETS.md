# Widgets Spec (v1) — Removed

> **Tombstone (TASK-580):** the v1 widget system was fully removed with
> TASK-580. The `core/widgets/**` kernel, `core/admin/ui/widgets/**`, the
> `core/admin/ui/pages/builder/**` editor surface, the v1 public page runtime
> (`core/site/pageRuntime.tsx`, `renderPublicPageHtml`,
> `renderPublicPageRuntimeHtml`), and the module-pack gate
> (`core/widgets/modulePackMatrix.ts`) are **removed**, not retained. Stored v1
> detail-page documents were backfilled (migration 0079) and unmapped v1 widget
> types survive only as read-only `legacy-widget` placeholder blocks inside
> converted Page V2 documents; the surviving render contracts live in
> `core/services/renderContracts/*` and are consumed by the Page V2 pipeline.
>
> **Removed in TASK-580-02:** the Widget Library admin page, the widget-template
> authoring stack (services, category/revision services, assistant actions, kit
> installer), and the `modulePackMatrix` pack gate were deleted earlier in the
> family.
>
> Configurable product widgets are an Admin Dashboard-only surface owned by
> `_docs/DASHBOARD_WIDGETS_SPEC.md`. Pages, Page Templates, Forms, Menus, Posts,
> and Custom Screens own their sections and blocks. This document and
> `_docs/_WIDGETS/*` are historical tombstones only; they do not authorize any
> new widget type, preset, editor, registry entry, or module-pack expansion.
> Do not reintroduce the v1 widget surface.

## Removed system

- **V1 render kernel** (`core/widgets/**`): per-type widget renderers,
  normalizers, and the registry were deleted in TASK-580-04.
- **V1 public page runtime** (`core/site/pageRuntime.tsx`,
  `renderPublicPageHtml`, `renderPublicPageRuntimeHtml`): deleted in
  TASK-580-04; public pages and entry detail pages render through
  `renderPublicPageV2RuntimeHtml` (Page V2).
- **Per-type block hydration** (`hydrateRuntimeBlocks` and v1 hydration):
  deleted in TASK-580-04.
- **Admin widget surface** (`core/admin/ui/widgets/**`,
  `core/admin/ui/pages/builder/**`): widget editors, preview routes, admin
  preview clients, and the v1 builder editor were deleted in TASK-580-04.
- **Widget Templates / Widget Library / module-pack gate**: deleted in
  TASK-580-02.

## Where work belongs now

- Configurable product widgets: `_docs/DASHBOARD_WIDGETS_SPEC.md`.
- Pages, Page Templates, Forms, Menus, Posts, Custom Screens: the owning
  domain's section/block contract (e.g. `_docs/PAGE_MODEL.md`,
  `_docs/CONTENT_TYPES_SPEC.md`) and the Page V2 render pipeline.
- Surviving v1-derived render contracts: `core/services/renderContracts/*`.

## Historical catalog (removed)

The former per-widget catalog and configuration contract (formerly the body of
this document) documented the v1 compatibility renderers. All of those
renderers are deleted; the per-widget documentation was removed from
`_docs/_WIDGETS/*` with the kernel. No permissive wording from the old catalog
survives, and none of it re-authorizes a widget surface.
