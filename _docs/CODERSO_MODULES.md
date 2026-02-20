# Coderso Modules Catalog

Source of truth for Coderso module scope, tiering, and navigation rollout.

## Registry Contract
- Runtime registry lives in `core/admin/ui/navigation/codersoModules.ts`.
- Every module defines:
  - `id`, `label`, `tier`, `ownerArea`, `lifecycle`
  - `description`, `dependencies`
  - optional `nav` config (`href`, `icon`, `defaultEnabled`, `badge`)
- Sidebar group `Coderso` is generated from registry via `buildCodersoNavItems(flags)`.

## Tier Overview

### v1 Core Builder
| Module | Owner | Lifecycle | Default Nav |
|---|---|---|---|
| Engine | content | stable | Yes |
| Entries | content | stable | Yes |
| Widgets | design | stable | Yes |
| Templates | design | stable | No (managed inside Widgets flows) |
| Forms | forms | stable | Yes |
| Posts | content | planned | Yes (`Soon`) |

### v2 Business Builder
| Module | Owner | Lifecycle | Default Nav |
|---|---|---|---|
| Listings | operations | preview | Yes (`Beta`) |
| Filters | operations | preview | Yes (`Beta`) |
| Search | operations | preview | Yes (`Beta`) |
| Booking | operations | preview | Yes (`Beta`) |
| Appointments | operations | planned | No |
| Reviews | operations | preview | Yes (`Beta`) |

### v3 Growth Builder
| Module | Owner | Lifecycle | Default Nav |
|---|---|---|---|
| Commerce | growth | preview | Yes (`Beta`) |
| Popups | marketing | preview | Yes (`Beta`) |
| Mega Menu | design | planned | No |
| Portal | platform | planned | No |
| Multilingual | platform | planned | No |
| Solution Kits | growth | preview | Yes (`Beta`) |

Note:
- Mega Menu remains a planned standalone module, but base metadata controls are already available in the existing Menus editor and runtime navigation contract.

## Navigation Rollout Rules
1. `defaultEnabled=true` modules appear in sidebar by default.
2. `defaultEnabled=false` modules are hidden unless enabled by feature flags.
3. Feature flags are passed as `CodersoFeatureFlags` to `buildDefaultNavSections(flags)`.
4. Planned modules should keep badge `Soon` when exposed before full delivery.

## Feature Flag Example

```ts
import { buildDefaultNavSections } from "@/ui/navigation/sidebarConfig";

const sections = buildDefaultNavSections({
  listings: true,
  filters: true,
  search: true,
});
```

## Dependency Notes
- Listings/Filters/Search depend on Engine + Entries foundation.
- Booking/Appointments/Reviews depend on Forms + Listings.
- Growth modules depend on v2 data/query modules and kits/templates contracts.

## Listings Progress (TASK-054-07)
- 054-07-01 done: query contract + parser validation in `core/server/validation/listingSchemas.ts` and `core/services/content/queryBuilderService.ts`.
- 054-07-02 done: source adapters (`entries/posts/users/taxonomies`) and allowlisted execution plan with deterministic filter/sort/pagination.
- 054-07-03 done: `listing_templates` DB model + migration + normalized template CRUD service.
- 054-07-04 done: Listings API routes + saved query persistence (`listing_queries`) + preview wiring.
- 054-07-05 done: Admin UI query builder + template manager + Coderso navigation/routing/prefetch exposure (`Beta`).
- 054-07-06 done: Runtime integration for `contentList` and `entryTeaser` with new `legacy|listing` source mode + listing query/template binding.
- 054-07-07 done: Conditional visibility + dynamic binding (`eq/neq/in/contains/exists/gt/gte/lt/lte`) with runtime-safe row evaluation and template binding editor UX.
- 054-07-08 done: QA matrix closed (unit/integration/runtime back-compat), API/architecture docs finalized.
- 054-08 done: Filters/Search suite delivered:
  - `listing-filters` + `search-box` widgets (SSR/runtime URL sync),
  - `/admin/api/filters/preview` + `/api/search`,
  - Coderso Filters/Search pages and nav exposure (`Beta`),
  - full tests for filter engine/search index/runtime/widget layers.
- 054-09 done: Forms automation + runtime UX delivered:
  - action contract + runner (`email`, `webhook`, `entry_sync`, `redirect`, `success_message`),
  - action/log tables (`form_actions`, `form_action_runs`) + retry path,
  - forms API: `/forms/:id/actions`, `/forms/:id/action-runs`, `/forms/action-runs/:runId/retry`,
  - form editor `Automation` panel + dedicated action logs screen,
  - form settings model (`forms.settings`) for multi-step, save-progress, presets, retry policy,
  - runtime form embed inline submit + multi-step navigation + local progress restore.
- 054-10 done: Booking suite delivered:
  - DB model/migration: resources, services, schedules, blackouts, reservations,
  - internal API: `/booking/*` with RBAC (`booking:read`, `booking:write`),
  - runtime widgets + access modes + QA/docs closure.
- 054-11 done: Commerce suite delivered:
  - domain contract + DB schema + service/query engine + admin API RBAC,
  - Coderso Commerce list/editor UI with cache/prefetch,
  - runtime widgets (`product-gallery`, `product-compare`, `product-table`) with SSR hydration,
  - checkout/cart adapter registry with plugin extension hook (`commerce:checkout:adapters`).
- 054-12 done: Engagement suite delivered:
  - popups and reviews modules (domain + API + admin UI),
  - mega-menu metadata contract in menu editor (`visibility`, `badge`, `description`, `icon`),
  - navigation runtime `items[].meta` mapping from menu metadata,
  - utility widgets for engagement layouts (`tabs`, `accordion`, `toggle-block`).
- 054-13-01 done: Solution Kits foundation delivered:
  - deterministic kit catalog with five starter verticals,
  - planner engine (`/solution-kits/plan`) with transparent steps and settings patch preview,
  - Coderso navigation/module activation for `Solution Kits` (`Beta`) with internal RBAC route surface.
- 054-13-05 done: AI Site Wizard guided flow delivered:
  - `AiSiteWizard` multi-step UX (`profile -> goals -> recommendation -> review -> execute`),
  - review-stage execution step editing (`enabledStepIds`) before apply,
  - execute timeline with apply/dry-run/rerun/rollback/clone-as-draft actions,
  - typed apply plan payload persisted in `run.options.wizard`.
- 054-13-06 done: Solution Kits content packs and installers delivered:
  - expanded per-kit packs (content type schema+taxonomy, forms with fields, pages with SEO defaults, menus with items),
  - installer sync for nested resources (`content_terms`, `form_fields`, `seo_documents`, `menu_items`),
  - rollback restore path extended to nested snapshots for update/create scenarios,
  - catalog validation coverage and installer regression tests updated.
- 054-13-07 done: Solution Kits QA/docs closure delivered:
  - full QA matrix executed for kits/client/UI/routes suites,
  - docs contracts synchronized (`SOLUTION_KITS`, `CMS_API`, `ARCHITECTURE`),
  - parent `TASK-054-13` moved to Done.
- 054-10-05 done: Booking Admin UI delivered:
  - `/admin/coderso/booking` screen with resources/services/availability/reservations/slot preview tabs,
  - Coderso sidebar Booking module enabled as `Beta`,
  - admin cache + route prefetch support for booking section.
