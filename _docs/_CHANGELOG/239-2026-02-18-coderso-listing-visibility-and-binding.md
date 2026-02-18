# 239-2026-02-18 - Coderso listing visibility and dynamic binding

Date: 2026-02-18
Version: Unreleased
Tasks: TASK-054-07-07

## Key Changes
- Runtime/Resolver: Added `listingRuntimeResolver` for deterministic row-based condition evaluation (`eq`, `neq`, `in`, `contains`, `exists`, `gt`, `gte`, `lt`, `lte`) and safe nested field reads.
- Templates/Contract: Extended listing template field bindings with `conditions` and normalized validation in `listingTemplatesService`.
- Widgets/Runtime: Wired binding visibility into `contentList` listing mapping so template-bound fields can be conditionally hidden without leaking fallback fields.
- Widgets/UI: `ContentList` now suppresses CTA when a row has no resolved safe href (instead of linking to `#`).
- Admin/UI: Added Listings `BindingEditor` (add/remove/reorder bindings and conditions) and integrated it into Listing Template Manager.
- Tests: Added unit coverage for condition operators/edge cases, template condition normalization, binding editor rendering, and listing runtime hide/show behavior.
