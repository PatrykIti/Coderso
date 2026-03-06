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
| Screens | content | preview | Yes (`Beta`) |
| Widgets | design | stable | Yes |
| Templates | design | stable | No (managed inside Widgets flows) |
| Forms | forms | stable | Yes |
| Posts | content | stable | No (promoted to top-level Main navigation) |

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
- 054-14 done: Composite-first widget strategy delivered:
  - widget metadata contract (`complexity`, `audience`, `module`, `presets`, `requires`) added to registry/catalog,
  - widget library default flow changed to `Recommended` composite-first mode,
  - `All widgets` + `Advanced mode` + module/complexity filters introduced for progressive disclosure UX.
- 054-15 done: Plugin contract and package manifest delivered:
  - strict `CodersoPluginManifest` contract with target version aliases and normalized provides/dependencies,
  - runtime manifest validator + contribution registrar + dependency fail-fast checks,
  - plugin route hardening (`write -> permission`, safe scoped paths, declared route enforcement),
  - internal admin plugin routes (`GET /plugins`, `POST /plugins/manifest/validate`).
- 054-16 done: Module widget pack matrix delivered:
  - explicit pack matrix contract (`page presets`, `section presets`, `composite widgets`) with strict/advisory enforcement profiles,
  - registry-level pack status + validator (`listModulePackStatus`, `validateModulePackMatrix`),
  - widget library module filter ordering and labels now pack-aware (`Ready`, `Needs coverage`).
- 054-10-05 done: Booking Admin UI delivered:
  - `/admin/coderso/booking` screen with resources/services/availability/reservations/slot preview tabs,
  - Coderso sidebar Booking module enabled as `Beta`,
  - admin cache + route prefetch support for booking section.
- 054-22 done: Custom Screens module delivered:
  - screen builder route (`/admin/coderso/custom-screens/:id`) now supports widget-to-field bindings and bound preview,
  - dedicated records routes (`/admin/coderso/custom-screens/:screenId/entries*`) reuse existing entries domain while hiding classic Entries from the main workflow,
  - classic Entries fallback remains available for metadata/publish operations outside the scoped custom-screen editor.
- 055 done: Posts module delivered:
  - dedicated `Posts` list + editor routes (`/admin/coderso/posts`, `/admin/coderso/posts/:id`),
  - internal API aliases (`/admin/api/posts*`) on top of reserved `post` content type,
  - editor workflow parity with entries/pages (publish, preview, metadata, duplicate, delete).
- 057 done: Gutenberg-like Posts editor finalized:
  - block document model + rich text sanitization + inserter/slash/list-view/transforms,
  - autosave/revisions/restore workflow and topbar editorial lifecycle statuses,
  - runtime/public parity renderer for post blocks (preview and published use the same pipeline),
  - fallback mode via `settings["posts.editor.mode"]` and query override `?editor=classic`.
- 060 done: Posts editor unified canvas + ribbon UX:
  - shared document canvas z inline editing wszystkich blokow,
  - tabbed ribbon (`Home`, `Insert`, `Review`, `View`) with grouped actions,
  - insert flow foundation moved do toolbar/ribbon; final primary insert entrypoint jest doprecyzowany w `063-11` (`Document Outline +`),
  - list view outline w kompaktowym ratio (`min 220`, `max 320`) i labels-only rows,
  - contextual details behavior (`Document`/`Block`) przy zachowaniu focusu/selekcji.
- 061 done: Writing Canvas + smart paste hardening:
  - 061-01..061-07 done: UX contract, writing-canvas block model, smart paste pipeline, clipboard image upload, image wrap semantics, writing-first shell integration, and runtime parity/compatibility,
  - posts now default to `writing-canvas` on empty document and expose writing-first insert actions (`Add writing section`, `Add CTA block`, `Add embed block`, `Add image block`),
  - runtime read path converts legacy text blocks to `writing-canvas` segments without destructive migration and exposes runtime warning diagnostics,
  - 061-08 done: final rollout QA/docs/changelog closure.
- 063-02 done: Gutenberg-parity shell region foundation delivered:
  - centralized panel state hook `usePostEditorLayout` (`list-view`, `inserter`, `details`),
  - regionized shell composition (`PostEditorLayout`, `PostEditorRegions`) with explicit `header/content/secondary-sidebar/sidebar/footer`,
  - responsive region behavior: desktop sidebars + mobile sheets share the same state contract.
- 063-03 done: Gutenberg-like header workflow foundation delivered:
  - modular header composition (`PostEditorHeader`) with shared lifecycle controls and publish/preview hooks,
  - revisions/details/focus/outline controls remain first-class header actions with regression coverage.
- 063-04 done: Gutenberg-like inserter sidebar delivered:
  - dedicated `PostInserterSidebar` shell with explicit close button and `Escape` close behavior,
  - block library supports category filters (`All/Text/Media/Interactive`), search, grouped rendering, and optional `Most used`,
  - focus return after closing inserter is standardized via `useFocusReturn` and returns to `Add` trigger in header tools.
- 063-05 done: Document overview list/outline/stats parity delivered:
  - `PostListViewSidebar` adds tabbed `List view` + `Outline` navigation for post structure (`Outline` default),
  - document stats are computed from block document selectors (`words/chars/read-time/headings/paragraphs/blocks`),
  - heading outline includes validation signals (`empty heading`, skipped levels, multiple H1),
  - stable heading anchors are shared with runtime TOC mapping for consistent editor/runtime navigation.
- 063-06 done: Writing canvas insertion and smart paste parity delivered:
  - insert orchestration is unified across sources via shared target resolver (`resolvePostInsertMutation`),
  - inserted block focus is deterministic (`insertFocusToken` + primary editable marker),
  - Word paste hardening improves heading fidelity and strips leftover static TOC anchors (`#_Toc...`) while keeping dynamic TOC directive behavior idempotent.
- 063-10 done: Stitch template migration + focus mode:
  - post editor shell visually aligned to `_docs/UI/admin_panel/46-post-editor/code.html` reference (left outline rail, center writing canvas, right details),
  - `Focus mode` persists in local storage and hides side panels for distraction-free writing.
- 063-11 done: Strict HTML parity + unified article canvas:
  - `Document Outline` has primary `+` block insertion (`outline-plus`) with shared insert resolver,
  - center canvas is a unified article flow (no per-block cards) with title field and borderless content rhythm,
  - right details tabs are fixed to `Post` / `Block` and switch context on selection,
  - media/interactive placeholders in canvas are clickable and route users to block settings context,
  - header right actions follow contract `Preview`, `Publish`, `Gear` (`Editor settings` modal),
  - editor preferences persist locally (`nextless.posts.editor.preferences.v1`).
- 063-12 done: Final reference parity closure:
  - right inspector flow matches template contract with progressive disclosure (`Advanced` collapsed) and `Danger zone` action,
  - `Move to trash` uses existing delete endpoint and redirects to `/admin/posts`,
  - gear modal upgraded to grouped editor UX settings (density/hints/default tab/restore sidebars),
  - preferences persistence is local-first (`nextless.posts.editor.preferences.v2`, compatibility `v1`) with background sync to user setting `posts.editor.preferences`,
  - focus mode now restores previous panel snapshot deterministically after exit.
- 063-07 done: Details inspector tabs + preferences:
  - `PostDetailsSidebar` owns `Post/Block` tabs with no-selection fallback,
  - `usePostEditorPreferences` encapsulates local-first + user-settings sync,
  - inspector sections share `InspectorSection` and numeric inputs clamp to safe ranges.
- 063-08 done: Keyboard shortcuts, focus, and accessibility:
  - `usePostEditorShortcuts` centralizes keymaps for inserter/overview/details and escape close,
  - `useFocusReturn` restores focus to the originating trigger,
  - header/content/sidebar landmarks expose consistent `aria-label` and `aria-keyshortcuts`.
