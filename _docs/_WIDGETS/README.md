# Widgets Index (v1) — Removed

> **Tombstone (TASK-580):** the v1 per-widget documentation was removed together
> with the v1 widget kernel (`core/widgets/**`) and the v1 admin widget surface
> (`core/admin/ui/widgets/**`, `core/admin/ui/pages/builder/**`). The former
> per-widget `*.md` files and the `tmp/` scratch directory were deleted; do not
> recreate them.

Configurable product widgets are limited to the Admin Dashboard and are
documented in `_docs/DASHBOARD_WIDGETS_SPEC.md`; Page, Menu, Form, and
Custom Screen authoring uses the owning domain's sections and blocks. The
surviving v1-derived render contracts live in `core/services/renderContracts/*`
and are consumed by the Page V2 pipeline. See `_docs/WIDGETS.md` for the full
TASK-580 removal tombstone.
