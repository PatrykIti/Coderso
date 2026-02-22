# Kanban Tasks - Nextless

Task board for project work. Keep task files and this board in sync.

## Workflow
1. Create a task file in `_docs/_TASKS/` using the format below.
2. Add the task to the **To Do** table and update **Statistics**.
3. Move to **In Progress** when work starts; update the task file status.
4. When complete, move to **Done**, update the task file status, and add a changelog entry.
5. Update any impacted docs after each task.

## Task file format
- File name: `TASK-XXX_Short_Title.md` (see `EXAMPLE_TASK.md`).
- Header lines:
  - `# TASK-XXX: Title`
  - `# FileName: TASK-XXX_Short_Title.md`
- Required fields: Priority, Category, Estimated Effort, Dependencies, Status.
- Required sections: Overview, Sub-Tasks, Testing Requirements, Documentation Updates Required.
- For API-related tasks/subtasks add mandatory section: `Security Contract` (visibility: `internal/public`, auth path, rate-limit bucket, nonce/signature/HMAC expectations, optional reCAPTCHA, internal mode via session/API key where applicable).
- Optional sections: Architecture, Implementation Order, New Files to Create.
- Detail level: match `EXAMPLE_TASK.md` (explicit files/paths, example code or payloads, testing checklist with unit tests, and planned docs/changelog).

## Status rules
- Use: To Do, In Progress, Done.
- Include dates for In Progress/Done in the task file.
- Update **Statistics** and the appropriate table on every status change.

## Changelog link
- Every completed task must have a matching entry in `_docs/_CHANGELOG/` and list the task ID there.

## Statistics
- **To Do:** 22 tasks
- **In Progress:** 3 tasks
- **Done:** 452 tasks

---

## To Do

| ID | Title | Priority | Effort | Notes |
|----|-------|----------|--------|-------|
| TASK-061-03 | Smart Paste (Word/Docs/HTML) Parsing and Sanitization | High | Large | Deterministic paste parser/sanitizer for long documents |
| TASK-061-04 | Clipboard Image Upload and Inline Media Insertion | High | Medium | Clipboard image -> media upload -> inline node insertion |
| TASK-061-05 | Image Wrap Controls and Layout Semantics | High | Medium | `wrap none/left/right` + width controls + mobile fallback |
| TASK-061-06 | Editor UI Integration (Ribbon + Canvas + List View) | High | Large | Writing-first editor flow integrated with ribbon/list/details |
| TASK-061-07 | Runtime Renderer Parity and Backward Compatibility | High | Medium | Writing canvas runtime rendering + legacy adapter path |
| TASK-061-08 | QA, Docs, Changelog, and Closure | Medium | Medium | Full regression, docs sync, changelog, kanban closure |
| TASK-054-20 | Coderso Membership and Client Portal Suite | High | Large | Authenticated client portal and per-content access rules |
| TASK-054-21 | Coderso Multilingual and i18n Suite | High | Large | Locales, translated content, and localized routing |
| TASK-101-09 | Assistant Action Engine (RAG + Typed Actions) | High | Large | Prompt -> typed plan -> dry-run/confirm -> execute with audit/idempotency |
| TASK-020-11 | Security Hardening + Settings UX | High | Large | Auth/public/admin protection & UX presets |
| TASK-020-11-01 | Rate Limit Buckets + Keying | High | Medium | New buckets + keying strategy |
| TASK-020-11-02 | Auth Hardening + Bot Protection | High | Medium | Login throttling + CAPTCHA |
| TASK-020-11-03 | Public Endpoint Protection | High | Medium | Public read/write buckets + guardrails |
| TASK-020-11-04 | Security Settings Model + API | High | Medium | Per-bucket config + validation |
| TASK-020-11-05 | Security Settings UI + Presets | High | Large | New sections + presets + tooltips |
| TASK-020-11-06 | PII Email Encryption | Medium | Large | Decision + optional implementation |
| TASK-053 | Page Editor Templates Mode | High | Large | 053-01..06 |
| TASK-053-06 | Page Settings Autosave + History | Medium | Large | Autosave + history labels |
| TASK-021 | Store Backend Core | High | Large | Public API + signing |
| TASK-022 | Store Publish Pipeline and Security Scans | High | Large | Publish validation + scans |
| TASK-023 | Store Auth and Publisher Accounts | Medium | Medium | Authors + tokens |
| TASK-054-199 | Security Gate (SAST, SCA, Secrets, CVE) | High | Medium | CI security gate with fail thresholds and exception policy |

---

## In Progress

| ID | Title | Priority | Effort | Notes |
|----|-------|----------|--------|-------|
| TASK-061 | Post Editor Writing Canvas and Smart Paste | High | Large | In progress: contract + block model done, implementation continues in 061-03+ |
| TASK-054 | Coderso Modular Admin IA | High | Large | Umbrella section + IA + routing compatibility |
| TASK-054-19 | Coderso QA, Performance, and Security Gates | High | Medium | Baseline gates delivered; final closure pending TASK-054-199 |

---

## Done

| ID | Title | Priority | Effort | Notes |
|----|-------|----------|--------|-------|
| TASK-061-02 | Writing Canvas Block Contract and Normalization | High | Large | Done: `writing-canvas` type + normalization + compatibility hooks for legacy/runtime text extraction |
| TASK-061-01 | Writing Canvas UX Contract and User Flows | High | Medium | Done: writing-first UX contract, flow boundaries, and editor anchors documented |
| TASK-060-06 | Regression Tests, Docs, Changelog, and Closure | Medium | Medium | Full lint/types/full-tests + docs/changelog/kanban closure for TASK-060 |
| TASK-060 | Post Editor Unified Canvas and Ribbon UX | High | Large | Closed: unified shared canvas + ribbon controls + compact outline + contextual details flow |
| TASK-060-05 | Details Panel and Responsive Behavior | High | Medium | Details opened on-demand from ribbon with contextual tab mode and responsive sheet behavior |
| TASK-060-04 | Compact List View Layout and Navigation | High | Medium | Outline compact ratio (`220-320px`) with labels-only rows and selection/scroll sync |
| TASK-060-03 | Ribbon Toolbar and Block Inserter Migration | High | Large | Persistent left inserter removed; insert/actions moved to ribbon with Add block trigger |
| TASK-060-02 | Shared Canvas Rendering and Inline Editing | High | Large | Shared canvas renders all blocks with inline editing and block-level actions |
| TASK-060-01 | Unified Canvas UX Contract and Interaction Model | High | Medium | Finalized UX contract for ribbon, outline, details, and selection focus model |
| TASK-059-08 | Posts Decoupling QA, Docs, and Closure | Medium | Medium | Full lint/types/tests regression + final docs/changelog/kanban sync |
| TASK-059 | Posts Domain Decoupling From Entries | High | Large | Closed: posts domain fully decoupled from entries (schema/service/API/UI/runtime/backfill/widget) |
| TASK-059-07 | Posts Embed Widget and Page Integration | High | Medium | Added `posts-feed` widget (latest/featured/category/manual) + SSR runtime resolver + page builder integration |
| TASK-059-06 | Posts Data Backfill and Cutover | High | Medium | Idempotent backfill (`entries -> posts`) + shadow-read parity report + internal trigger endpoint |
| TASK-059-05 | Posts Runtime, Listings, and Search Source Cutover | High | Medium | Runtime/listings/search source `posts` przepiety na dedykowany storage (`posts`), bez `entries` dependency |
| TASK-059-04 | Posts Admin UI Decoupling From Entries | High | Large | `PostEditorPage` classic fallback przeniesiony do `PostClassicEditorShell`; `EntryEditor` uproszczony do entries-only |
| TASK-059-03 | Posts Admin API Decoupling | High | Medium | `/admin/api/posts*` domkniete na post-native kontrakcie (bez `entry_*` fallbackow) + route RBAC/error mapping tests |
| TASK-059-02 | Posts Domain Service Extraction | High | Large | `postsService` refactored to `posts*` tables with post-native metadata/revisions/autosave |
| TASK-059-01 | Posts DB Schema and Migration Foundation | High | Medium | Added dedicated `posts*` tables + migration `0045_posts_decoupled` + DB contract tests |
| TASK-058 | Admin Cache, Prefetch, and Request Stability | High | Large | Completed closure: request instrumentation + dedupe cache + hydration/prefetch policy + shell read minimization + full regression/docs sync |
| TASK-058-06 | Regression Tests, Docs, Changelog, and Closure | Medium | Medium | Final lint/types/full-tests green + docs/changelog/kanban closure for TASK-058 |
| TASK-058-05 | Admin Shell Global Request Minimization | High | Large | Single-shot auth bootstrap + assistant lazy-load runtime + cached theme switcher and narrowed theme:update refresh scope |
| TASK-058-04 | Admin Prefetch Policy Rework and Request Budgeting | High | Medium | Prefetch switched to force:false warmup with active-route skip, fresh/cooldown throttling, queue concurrency, and budget tests |
| TASK-058-03 | Pages and Menus Hydration and Force Refresh Policy | High | Large | Mount hydration policy fixed for pages/menus with explicit-only force refresh and no redundant active-menu reload |
| TASK-058-02 | Shared Dedupe Cache for Global Admin Reads | High | Large | Shared read-through cache for global admin reads + invalidation + tests |
| TASK-058-01 | Request Storm Instrumentation and Baseline | High | Medium | apiClient request metrics + baseline perf gate + docs sync |
| TASK-057 | Gutenberg-Like Posts Block Editor | High | Large | Full WordPress-like block editor rollout complete with fallback and runtime parity |
| TASK-057-08 | Post Editor QA, Docs, Changelog, and Rollout | Medium | Medium | Full lint/types/tests validation + docs/changelog + rollout fallback mode |
| TASK-057-03 | Rich Text Engine and Text Formatting Capabilities | High | Large | Rich text adapter/toolbars/serializer/sanitizer integrated in post block editor |
| TASK-057-07 | Post Block Runtime Renderer and Public Parity | High | Medium | Post block runtime renderer with legacy fallback and preview/published parity |
| TASK-057-06 | Post Autosave, Revisions, Preview, and Publish Flow | High | Large | Autosave endpoint + revisions restore UI + post editor status lifecycle |
| TASK-057-05 | Document and Block Inspector Panels | High | Medium | Document/Block inspector split with full metadata/block options and user-friendly hints |
| TASK-057-04 | Block Inserter, Slash Command, List View, and Transforms | High | Large | Inserter with search/categories + slash menu + list view DnD/keyboard + transforms |
| TASK-057-02 | Post Editor Shell and State Architecture | High | Large | Modular post editor shell + state store + preview workflow route integration |
| TASK-057-01 | Post Block Document Contract and Backward Compatibility | High | Medium | Versioned post block document + strict normalization + legacy adapter |
| TASK-055 | Posts Screen and Editor for Widget/Template Runtime | High | Large | Dedicated posts module (`/admin/coderso/posts`) delivered |
| TASK-055-06 | Posts Tests, Migrations, and Documentation | Medium | Medium | Lint/types/tests + docs/changelog/kanban closure |
| TASK-055-05 | Posts Public Routes and Rendering | High | Medium | Posts preview/runtime contract documented and aligned with entry pipeline |
| TASK-055-04 | Posts Widget/Template Binding and Query Controls | High | Medium | Listings/search/widget source contract confirmed for posts |
| TASK-055-03 | Post Editor Workflow and Metadata Panels | High | Large | Post editor route/context parity with entries/pages workflow |
| TASK-055-02 | Posts List Screen (WordPress-Like Table) | High | Medium | Dedicated posts list with row actions and title navigation |
| TASK-055-01 | Posts Domain Model and API Contract | High | Medium | Reserved `post` type + `/admin/api/posts*` aliases |
| TASK-056 | Forms Editor Logic, Style, Runtime Preview, and Action Logs | High | Medium | Forms editor parity: logic/style tabs + runtime test flow + action logs clarity |
| TASK-056-06 | Forms QA, Docs, Changelog, and Closure | Medium | Medium | Lint/types/full tests + docs/changelog/task board sync |
| TASK-056-05 | Form Submission Access Adjustments for Admin Testing | Medium | Small | Authenticated admin can test public forms without captcha friction |
| TASK-056-04 | Form Runtime Preview and Action Logs Test Flow | High | Medium | Interactive runtime preview dialog with test submit and logs CTA |
| TASK-056-03 | Form Editor Logic/Style UI | High | Medium | Real controls for field logic/style tabs and canvas parity |
| TASK-056-02 | Form Field Style Contract and Runtime Rendering | High | Medium | Typed style contract + runtime width/label-position rendering |
| TASK-056-01 | Form Field Logic Contract and Normalization | High | Medium | Typed logic contract + normalization + evaluator |
| TASK-054-19-04 | Docs, Changelog, and Kanban Closure | Medium | Medium | Release gates docs/spec/changelog/task sync (parent pending 054-199) |
| TASK-054-19-03 | Gate Runner and CI Pipeline Wiring | High | Medium | Gate runner script + package scripts + CI workflow |
| TASK-054-19-02 | Performance and Security Gate Test Suites | High | Medium | Dedicated `tests/perf` and `tests/security` suites |
| TASK-054-19-01 | Release Gates Contract and Runbook | High | Medium | Mandatory gate matrix + budgets + execution contract |
| TASK-054-18 | Coderso AI Assistant Guided Builder Workflow | High | Large | Full guided executor (`plan/actions/execute/validate`) + assistant routes + modular wizard UX |
| TASK-054-18-04 | QA, Docs, Changelog, and Closure | Medium | Medium | Lint/types/tests + assistant site-builder docs/changelog/kanban sync |
| TASK-054-18-03 | AI Wizard UI Modularization and Explainable Execution | High | Large | `AiSiteWizard` orchestration split + action map + validation UI |
| TASK-054-18-02 | Assistant Site Builder Routes and Client Contract | High | Medium | Internal assistant routes + schemas + typed client + rate-limit bucket mapping |
| TASK-054-18-01 | Site Builder Executor Domain and Schemas | High | Medium | Typed executor service with deterministic action mapping and validation checks |
| TASK-054-17 | Coderso Presets, Templates, and Kits Contract | High | Large | Manifest contract + template installer orchestration + kits UI exposure |
| TASK-054-17-04 | QA, Docs, Changelog, and Closure | Medium | Medium | Lint/types/tests + docs/changelog/kanban closure |
| TASK-054-17-03 | Solution Kits API and Admin UX Contract | High | Medium | Manifest payload exposure + kits detail UI checklist |
| TASK-054-17-02 | Template and Preset Installer Service | High | Large | Deterministic template install/rollback + kit orchestration |
| TASK-054-17-01 | Kit Manifest Contract and Normalization | High | Medium | `SolutionKitManifest` builder + catalog normalization |
| TASK-054-16 | Coderso Module Widget Pack Matrix | High | Medium | Pack matrix contract + strict/advisory validation + pack-aware widget module UX |
| TASK-054-16-04 | Pack Matrix QA, Docs, and Closure | Medium | Medium | Lint/types/tests + docs/changelog/board closure |
| TASK-054-16-03 | Widget Library Pack-Aware Module UX | Medium | Medium | Module option ordering/labels driven by pack readiness |
| TASK-054-16-02 | Registry Pack Validator and Coverage Report | High | Medium | `listModulePackStatus` + `validateModulePackMatrix` |
| TASK-054-16-01 | Matrix Contract and Module Pack Definitions | High | Medium | Static pack matrix + enforcement profile contract |
| TASK-054-15 | Coderso Plugin Contract and Package Manifest | High | Large | Strict manifest contract + runtime/plugin route guardrails |
| TASK-054-15-04 | Plugin Contract QA, Docs, and Closure | Medium | Medium | Lint/types/tests + docs/changelog/board closure |
| TASK-054-15-03 | Plugin Routes Hardening and Internal Plugins API | High | Medium | Internal plugin routes + route scope/permission hardening |
| TASK-054-15-02 | Core Runtime Manifest Validator and Module Registrar | High | Large | strict manifest validation + contributions registry + dependency checks |
| TASK-054-15-01 | SDK Manifest Contract and Normalization | High | Medium | `@core/sdk/pluginManifest` contract + alias normalization |
| TASK-054-14 | Coderso Composite-First Widget Strategy | High | Large | Metadata contract + composite-first widget library flow |
| TASK-054-13 | Coderso Solution Kits and AI Wizard | High | Large | Vertical kits + guided AI setup |
| TASK-054-13-07 | Solution Kits QA, Docs, and Closure | Medium | Medium | Full regression matrix + docs/changelog closure |
| TASK-054-13-06 | Solution Kits Content Packs and Installers | High | Large | Expanded per-kit packs: taxonomy/forms/pages/menu/seo installer |
| TASK-054-13-05 | AI Site Wizard Guided Flow | High | Large | Guided multi-step solution-kit flow with editable plan and execute timeline |
| TASK-054-13-05-04 | Wizard Tests, Docs, Changelog, and Closure | Medium | Medium | Unit/integration coverage + docs/changelog/board sync |
| TASK-054-13-05-03 | Wizard Execute Timeline, Rerun, Rollback, and Clone | High | Medium | Apply/dry-run timeline with rerun/rollback/clone-as-draft actions |
| TASK-054-13-05-02 | AiSiteWizard Step Flow and Review Editor | High | Medium | Guided steps with plan review and pre-apply editing |
| TASK-054-13-05-01 | Wizard Apply Contract and Planner Step Selection | High | Medium | Typed apply plan payload + blueprint filtering + run options metadata |
| TASK-054-13-04 | Solution Kits Admin UI, Cache, and Prefetch | High | Medium | Install actions + run history UI + cache/prefetch + docs sync |
| TASK-054-13-03 | Solution Kits Internal API and RBAC | High | Medium | Full kits internal API + RBAC split + schema/error mapping tests |
| TASK-054-13-02 | Solution Kits Install Engine, Idempotency, and Rollback | High | Large | Install run DB model + idempotent apply/rollback service + audit trace |
| TASK-054-13-01 | Solution Kits Domain, Catalog, and Planner | High | Medium | Typed catalog + planner + internal routes + admin foundation |
| TASK-054-12 | Coderso Menu, Popup, Reviews, Engagement Suite | Medium | Medium | Mega menu metadata + popups/reviews modules + utility widgets + QA/docs closure |
| TASK-054-12-06 | Engagement QA, Docs, and Closure | Medium | Medium | Full QA matrix + docs sync + changelog/kanban closure |
| TASK-054-12-05 | Mega Menu Extensions and Utility Widgets | Medium | Medium | Menu metadata UX/runtime + tabs/accordion/toggle-block widgets |
| TASK-054-12-04 | Admin UI for Popups and Reviews Modules | High | Medium | Popups list/editor + reviews moderation UI with cache/prefetch/nav wiring |
| TASK-054-12-03 | Popup and Reviews API Routes and RBAC | High | Medium | Internal `/popups` + `/reviews` routes, RBAC scopes, and error mapping tests |
| TASK-054-12-02 | Popup and Reviews Services and Validation | High | Medium | popup/review domain services + mega-menu settings normalization |
| TASK-054-12-01 | Engagement Domain and DB Schema | High | Medium | menu metadata + popups/reviews tables + migration 0043 |
| TASK-054-11 | Coderso Commerce Suite | Medium | Large | Product templates, compare, wishlist, tables |
| TASK-054-11-08 | Commerce QA, Docs, and Changelog Closure | Medium | Medium | Regression matrix + docs/changelog closure |
| TASK-054-11-07 | Checkout/Cart Adapter Contract | Medium | Medium | Pluggable checkout adapter contract with registry + plugin hook bridge |
| TASK-054-11-07-03 | Checkout Adapter Tests, Docs, and Closure | Medium | Medium | Unit coverage + lint/types + docs/changelog sync |
| TASK-054-11-07-02 | Checkout Adapter Registry and Plugin Hook Bridge | High | Medium | Registry resolution + plugin filter extension point |
| TASK-054-11-07-01 | Checkout Adapter Domain Contract and Default Behavior | High | Medium | Typed add-to-cart/checkout contract + internal noop adapter |
| TASK-054-11-06 | Commerce Runtime Widgets (Gallery/Compare/Table) | High | Large | Runtime product widgets + resolver integration |
| TASK-054-11-05 | Commerce Admin UI Catalog and Editor | High | Large | Product list/editor UX with cache/prefetch patterns |
| TASK-054-11-04 | Commerce Admin API Routes and RBAC | High | Medium | Internal `/commerce/*` routes + RBAC + error mapping tests |
| TASK-054-11-03 | Commerce Service and Query Engine | High | Large | Product/collection services + deterministic query engine + runtime payload resolver |
| TASK-054-11-02 | Commerce DB Schema and Migrations | High | Medium | `commerce_*` tables + migration metadata + DB constraint tests |
| TASK-054-11-01 | Commerce Domain Contract and Schemas | High | Medium | Commerce types + normalization helpers + schema validation tests |
| TASK-054-10-07 | Booking QA, Docs, and Closure | Medium | Medium | Regression matrix complete + docs/changelog closure |
| TASK-054-10 | Coderso Booking and Appointment Suite | High | Large | Domain, API, admin UI, runtime widgets, access modes, and QA closure delivered |
| TASK-054-10-09-03 | Media Access Tests and Docs | Medium | Medium | Coverage + docs/changelog closure for media delivery access |
| TASK-054-10-09-02 | Media Runtime Access Enforcement | High | Medium | `/media/*` gate requires session or `media.read` API key in internal mode |
| TASK-054-10-09-01 | Storage Settings Delivery Access Model and UI | High | Medium | `delivery.accessMode` in model/API/UI |
| TASK-054-10-09 | Media Delivery Access Modes | High | Medium | Global media runtime access mode for public/internal delivery |
| TASK-054-10-08-03 | Booking Access Mode Tests and Docs | Medium | Medium | Booking access tests + docs/changelog closure |
| TASK-054-10-08-02 | Booking Public API Access Enforcement | High | Medium | Service-level runtime access checks for slots/reservations |
| TASK-054-10-08-01 | Booking Access Mode Model and Admin UI | High | Medium | Per-service submission access in booking settings/UI |
| TASK-054-10-08 | Booking Runtime Access Modes and Internal Portal | High | Medium | `public` vs `internal` booking runtime behavior |
| TASK-054-10-06-04 | Booking Runtime Widgets QA and Docs | Medium | Medium | Widgets/runtime API tests + architecture/API docs + changelog |
| TASK-054-10-06-03 | Appointment Form Widget + Runtime Script | High | Large | Shared `flowId` runtime sync + booking submit UX |
| TASK-054-10-06-02 | Booking Calendar Widget | High | Medium | Runtime slot picker widget + editors |
| TASK-054-10-06-01 | Booking Runtime API and Resolver | High | Medium | Public booking endpoints + nonce/bot protection + runtime resolver |
| TASK-054-10-06 | Booking Runtime Widgets | High | Large | `booking-calendar` + `appointment-form` runtime flow delivered |
| TASK-054-10-05-01 | Booking Admin UI Modularization | High | Medium | Split booking page into tabs + shared helpers/types |
| TASK-054-10-05 | Booking Admin UI | High | Large | Coderso booking screen with resources/services/availability/reservations/slot preview |
| TASK-054-09 | Coderso Forms and Automation Suite | High | Large | Form actions, automation logs, multi-step runtime, presets, progress save |
| TASK-054-08 | Coderso Filters and Search Suite | High | Large | Faceted runtime filters + scoped public search + widgets/UI/API |
| TASK-054-07-08 | Coderso Listings QA, Tests, and Documentation | High | Medium | Regression matrix + docs/contracts + changelog |
| TASK-054-07 | Coderso Dynamic Data and Listing Suite | High | Large | Query/listing templates/runtime integration with QA closure |
| TASK-054-07-07 | Coderso Conditional Visibility and Dynamic Field Binding | Medium | Medium | Row-based visibility ops + template binding editor + runtime hide/show |
| TASK-054-07-06 | Coderso Runtime Widget Integration for Listings | High | Large | `contentList` + `entryTeaser` listing mode with query/template runtime binding |
| TASK-054-07-05 | Coderso Listings Admin UI Query Builder and Template Manager | High | Large | Listings table/editor/template manager + coderso nav beta exposure |
| TASK-054-07-04 | Coderso Listings API and Routes | High | Medium | Listings queries/templates routes + preview + persistence |
| TASK-054-07-03 | Coderso Listing Templates Model and Service | High | Medium | listing_templates DB model + normalized CRUD/config validation |
| TASK-054-07-02 | Coderso Listing Query Execution Service and Safety | High | Large | Source adapters + allowlisted filters/sort + deterministic pagination |
| TASK-054-07-01 | Coderso Listing Query Contract and Validation | High | Medium | Query schema + semantic parser + deterministic validation codes |
| TASK-054-06 | Coderso Module Catalog and Tiers | High | Medium | Full module registry + release tiers |
| TASK-054-05 | Coderso Docs and Regression Tests | Medium | Medium | Navigation docs + tests |
| TASK-054-04 | Coderso Module Shell and Responsive Behavior | Medium | Medium | Desktop/mobile shell consistency |
| TASK-054-03 | Coderso Routes and Backward Compatibility | High | Medium | Canonical coderso paths + legacy aliases |
| TASK-054-02 | Coderso Sidebar Navigation and Permissions | High | Medium | Collapsible nav + RBAC visibility |
| TASK-054-01 | Coderso Information Architecture and Naming | High | Medium | Naming contract and module boundaries |
| TASK-053-08 | Admin SPA Navigation and Prefetch | High | Large | SPA route transitions + optional hover/focus prefetch |
| TASK-053-08-01 | Admin Router Core | High | Medium | History-based admin router context |
| TASK-053-08-02 | Admin Links and Redirects | High | Medium | Internal `AdminLink` + hard-redirect exceptions |
| TASK-053-08-03 | Route Prefetch Strategy | Medium | Medium | Optional list prefetch on intent |
| TASK-053-08-04 | Tests and Docs | Medium | Medium | Router/link/prefetch tests + docs updates |
| TASK-053-07 | Admin Cache Layer | High | Large | WordPress-like cache with cross-tab refresh |
| TASK-053-01 | Page Builder Templates Mode | High | Large | Templates tab + template sections |
| TASK-053-05 | Runtime Preview FOUC Reduction | Medium | Medium | CSS preload + preview hide |
| TASK-053-04 | Page Revisions Retention Policy | Medium | Medium | Per-page retention + pruning |
| TASK-053-03 | Runtime Preview Dialog UX + Device Sync | Medium | Medium | Single close + device sync |
| TASK-053-02 | Page Settings Drawer Usability | High | Medium | Scroll + retention input |
| TASK-052 | Page Template and Navigation Runtime Parity | High | Large | 052-01..05 complete |
| TASK-052-05 | Regression Tests and Documentation Parity | Medium | Medium | QA matrix + docs/contracts sync |
| TASK-052-04 | Admin UI Template and Navigation Source Wiring | High | Medium | Dynamic template options + navigation source UX |
| TASK-052-03 | Navigation Runtime Pages Source and ShowInNav | High | Large | `linksSource=pages` + runtime resolver + fallback rules |
| TASK-052-02 | Page Runtime Template Wiring | High | Medium | Public + preview page render use resolved page templates |
| TASK-052-01 | Page Template Contract and Resolver | High | Medium | Normalize template key + resolver + fallback |
| TASK-099 | Dashboard Data Wiring (Functional) | Medium | Medium | 099-01/02/03 complete |
| TASK-099-03 | Dashboard UI Wiring | Medium | Medium | Dashboard page wired to API + loading/error states |
| TASK-099-02 | Dashboard API | Medium | Medium | GET /dashboard route + registration + test |
| TASK-099-01 | Dashboard Service | Medium | Medium | Dashboard aggregate service + DTO + tests |
| TASK-050 | Widget Templates Preview + Revisions | Medium | Medium | 050-01..15 complete |
| TASK-050-05 | Hero Widget Expansion + Slots | High | Medium | 050-05-01/02 complete |
| TASK-050-04 | Widget Slot System (Core) | High | Large | Slot model + insert UI + rendering complete |
| TASK-101 | Doc Navigator Assistant + Optional LLM Connector | High | Large | 101-01/02/03/04/05/06/07/08 complete |
| TASK-101-07 | Assistant Security, Quotas, Observability and Hardening | High | Medium | Quota enforcement + assistant metrics + audit redaction hardening |
| TASK-100 | Runtime Base URL + Auth TTL + Setup Wizard | High | Large | 100-01/02/03/04/05 complete |
| TASK-101-06 | Assistant Avatar Rendering and Preferences | Medium | Medium | Optional avatar layer + user preferences + 2D fallback |
| TASK-101-05 | Admin UI Assistant Chat and Modes | High | Large | Global assistant drawer in AdminShell + mode persistence + sources/fallback UX |
| TASK-101-04 | LLM Provider Abstraction and OpenRouter Adapter | Medium | Medium | Provider abstraction + OpenRouter adapter + llm-rag fallback path |
| TASK-101-08 | Internal Docs KB Schema, Ingest, and DB Retrieval | High | Large | DB KB tables + `_docs/_internal` ingest + DB retriever + runtime fallback |
| TASK-100-05 | First-Run Setup Wizard and Gating | High | Medium | Setup wizard + authenticated gate + setup.completed flow |
| TASK-100-04 | Admin UI Runtime URL and Auth TTL Wiring | High | Medium | General/Security UI fields + runtime settings payload wiring |
| TASK-100-03 | Auth TTL Runtime Sources | High | Medium | Session/reset TTL precedence + auth runtime settings source |
| TASK-100-02 | Public Base URL Resolver and Consumers | High | Medium | Unified resolver + request fallback for preview URLs |
| TASK-100-01 | Settings Keys and Runtime Validation | High | Medium | New runtime/auth settings keys + alias + validation |
| TASK-049 | Widget Library — Core + Templates + Favorites | High | Large | 049-01/02/03/04/05/06 complete |
| TASK-049-06 | Widget Template Editor UI | Medium | Medium | Template editor route + builder reuse + DnD wiring |
| TASK-049-05 | Widget Library UI Wiring | High | Large | Catalog API wiring + insert + details/favorites UX |
| TASK-049-04 | Widget Favorites (User Settings) | Medium | Small | `widgets.favorites` persistence + validation |
| TASK-049-03 | Widget Catalog + API Routes | High | Medium | `/widgets` + template CRUD aliases |
| TASK-049-02 | Widget Templates Service | High | Medium | Service CRUD + structural block validation |
| TASK-049-01 | Widget Templates DB Schema | High | Medium | `widget_templates` schema + migration |
| TASK-101-03 | Assistant API (Doc Navigator Runtime) | High | Medium | `/assistant/status` + `/assistant/chat` + `/assistant/reindex` docs-only runtime |
| TASK-101-02 | Documentation Index and Retrieval Engine | High | Large | Docs parser/chunking + in-memory BM25 retriever + deterministic answer composer |
| TASK-101-01 | Assistant Settings and Data Model | High | Medium | Global/user assistant settings + validation + General Settings UI |
| TASK-048 | Content Types & Content UX Expansion | Medium | Large | 048-01..09 complete |
| TASK-048-04 | Taxonomy System & Terms | Medium | Large | Categories/tags model + terms + assignments |
| TASK-048-03 | Media Field UX & Storage Integration | Medium | Medium | Media picker + schema/meta + entry validation |
| TASK-048-02 | Relation Field UX & Data Model | Medium | Medium | Relation config (single/multi) + picker UX |
| TASK-048-01 | Field Types & Schema Meta | Medium | Medium | `xFieldConfig` schema meta and strict validation |
| TASK-050-15 | Layout Primitives Widgets Pack | High | Large | 050-15-01/02/03/04/05/06/07 complete |
| TASK-050-15-07 | Divider Widget | Medium | Small | Visual separator primitive |
| TASK-050-15-06 | Spacer Widget | Medium | Small | Responsive spacing primitive |
| TASK-050-15-05 | Split Layout Widget | Medium | Medium | Two-pane layout with ratio controls |
| TASK-050-15-04 | Stack Layout Widget | Medium | Medium | Vertical/horizontal flow container |
| TASK-050-15-03 | Grid/Columns Layout Widget | High | Large | Dynamic columns with per-breakpoint sizing |
| TASK-050-15-02 | Section Layout Widget | High | Medium | Section wrapper + semantic regions + repeatable slots |
| TASK-050-15-01 | Repeatable Slots Core for Layout Widgets | High | Large | Slot kind contract + repeatable slot normalization + insertion flow |
| TASK-050-14-02 | Entry Teaser Widget | High | Medium | Dynamic entry teaser widget + runtime resolver + Wizard/Visual/Advanced |
| TASK-050-14 | Dynamic Content Widgets Pack | High | Large | 050-14-01/02 complete |
| TASK-050-14-01 | Content List Widget | High | Large | Dynamic content list widget + runtime resolver + Wizard/Visual/Advanced |
| TASK-050-13-05 | Rich Text Section Widget | Medium | Medium | Schema + renderer + Wizard/Visual/Advanced + tests complete |
| TASK-050-13 | Trust and Content Widgets Pack | Medium | Large | 050-13-01/02/03/04/05 complete |
| TASK-050-13-04 | Team Widget | Medium | Medium | Schema + renderer + Wizard/Visual/Advanced + tests complete |
| TASK-050-13-03 | Stats KPI Widget | Medium | Medium | Schema + renderer + Wizard/Visual/Advanced + tests complete |
| TASK-050-13-02 | Gallery Mosaic Widget | Medium | Large | Schema + renderer + Wizard/Visual/Advanced + tests complete |
| TASK-050-13-01 | Logo Cloud Widget | Medium | Medium | Schema + renderer + Wizard/Visual/Advanced + tests complete |
| TASK-050-12 | Conversion Widgets Pack | High | Large | 050-12-01/02/03/04/05 complete |
| TASK-050-12-05 | CTA Banner Widget | Medium | Medium | Schema + renderer + Wizard/Visual/Advanced + tests complete |
| TASK-050-12-04 | FAQ Accordion Widget | Medium | Medium | Schema + renderer + Wizard/Visual/Advanced + tests complete |
| TASK-050-12-03 | Pricing Plans Widget | High | Large | Schema + renderer + Wizard/Visual/Advanced + tests complete |
| TASK-050-12-02 | Testimonials Widget | High | Medium | Schema + renderer + Wizard/Visual/Advanced + tests complete |
| TASK-050-12-01 | Feature Grid Widget | High | Medium | Schema + renderer + Wizard/Visual/Advanced + tests complete |
| TASK-050-11 | Contact Widget Expansion | Medium | Medium | 050-11-01/02 complete |
| TASK-050-11-02 | Contact Widget Visual Rebuild and Advanced Cleanup | Medium | Large | Visual-first IA + advanced technical cleanup |
| TASK-050-11-01 | Contact Widget Bugfixes and UX Hardening | Medium | Medium | Model/schema parity + renderer/wizard hardening |
| TASK-050-10 | Newsletter Widget Expansion | Medium | Medium | 050-10-01/02 complete |
| TASK-050-10-02 | Newsletter Widget Visual Rebuild and Advanced Cleanup | Medium | Large | Visual-first IA + advanced technical cleanup |
| TASK-050-10-01 | Newsletter Widget Bugfixes and UX Hardening | Medium | Medium | Model/schema parity + wizard hardening + baseline tests |
| TASK-050-09 | Compare Timeline Widget Expansion | Medium | Medium | 050-09-01/02 complete |
| TASK-050-09-02 | Compare Timeline Widget Visual Rebuild and Advanced Cleanup | Medium | Large | Visual-first IA + advanced technical cleanup |
| TASK-050-09-01 | Compare Timeline Widget Bugfixes and UX Hardening | Medium | Medium | Model/schema parity + normalized markers/segments + editor hardening |
| TASK-050-08 | Timeline Widget Expansion | Medium | Medium | 050-08-01/02 complete |
| TASK-050-08-02 | Timeline Widget Visual Rebuild and Advanced Cleanup | Medium | Large | Visual-first timeline IA + advanced technical cleanup |
| TASK-050-08-01 | Timeline Widget Bugfixes and UX Hardening | Medium | Medium | Data model + renderer parity + wizard hardening |
| TASK-050-07 | Footer Widget Expansion + Slots | High | Medium | 050-07-01/02 complete |
| TASK-050-07-02 | Footer Widget Visual Rebuild and Advanced Cleanup | High | Large | Visual-first Footer IA + advanced technical scope |
| TASK-050-07-01 | Footer Widget Bugfixes and UX Hardening | High | Medium | Footer slots MVP + editor hardening + baseline tests |
| TASK-050-06 | Navigation Widget Expansion + Slots | High | Medium | 050-06-01/02 complete |
| TASK-050-06-02 | Navigation Widget Visual Rebuild and Advanced Cleanup | High | Large | Visual IA rebuild + advanced technical cleanup |
| TASK-050-06-01 | Navigation Widget Bugfixes and UX Hardening | High | Medium | Wizard/visual hardening + behavior parity + right slot MVP |
| TASK-051 | Page Wrapper & Layout Settings | High | Large | 051-01/02/03 complete |
| TASK-051-03 | Admin UI — Page Layout Settings | High | Medium | Page settings drawer + shared runtime preview UX |
| TASK-051-02 | Page Wrapper Rendering + Inheritance | High | Medium | Runtime wrapper + inherit + preview parity |
| TASK-051-01 | Page Layout Model + Validation | High | Medium | Normalized settings.layout + strict schema |
| TASK-050-05-02 | Hero Widget Visual Rebuild and Advanced Cleanup | High | Large | Visual-first IA + presets modal + advanced scope cleanup |
| TASK-050-05-01 | Hero Widget Bugfixes and UX Hardening | High | Medium | Wizard media stability + centered media clarity + slot copy |
| TASK-048-06 | Content Modeling Docs & Examples | Medium | Medium | Cookbook + docs |
| TASK-048-05 | Content Editor Help & Tooltips | Low | Small | UI guidance |
| TASK-048-07 | Field Layout & Grouping UX | Medium | Medium | Sections + display |
| TASK-048-08 | Entry Workflow & Validation UX | Medium | Medium | Checklist + required |
| TASK-048-09 | Entry List UX & Bulk Actions | Medium | Medium | Filters + bulk |
| TASK-050-01 | Widget Template Preview | Medium | Medium | Preview modal + API |
| TASK-050-02 | Widget Template Revision History | Medium | Medium | Revisions table + restore |
| TASK-050-03 | Widget Nesting (Insert Into Existing Block) | Medium | Large | Nested blocks support |
| TASK-044 | Public Pages Rendering and Preview | High | Medium | Public site + preview |
| TASK-045 | Public Site Themes | High | Large | Public themes system + CSS pipeline |
| TASK-045-01 | Site Theme DB Schema | High | Medium | theme_profiles + theme_routes |
| TASK-045-02 | Site Theme Service + Resolver | High | Medium | Active theme + css vars |
| TASK-045-03 | Public CSS Build Pipeline | High | Medium | dist/site css build |
| TASK-045-04 | Admin UI — Site Themes | High | Large | Theme editor + preview |
| TASK-045-05 | Site Themes API Routes | High | Medium | /themes + profiles |
| TASK-046-01 | Site Settings Model | High | Medium | baseUrl + homepage |
| TASK-046-02 | Public Routes & Preview | High | Medium | content routes |
| TASK-046-03 | Content Entry Rendering | High | Large | list + detail templates |
| TASK-046-04 | SSR Cache & Revalidation | High | Medium | cache + invalidation |
| TASK-046-05 | Admin UI — Site Settings | High | Large | site settings UI |
| TASK-046 | Public Site Runtime | High | Large | Index for TASK-046-01..05 |
| TASK-047 | Admin/Public Base URLs (Routing Policy) | High | Medium | split admin/public hosts |
| TASK-047-01 | Admin/Public Base URL Settings | High | Small | settings keys |
| TASK-047-02 | Routing Policy Middleware | High | Medium | host-based routing |
| TASK-047-03 | Admin UI — Base URL Settings | High | Small | general settings fields |
| TASK-043 | Content Entry Metadata Integration | High | Large | Index for TASK-043-01..04 |
| TASK-043-01 | Entry Metadata DB + Schema | High | Medium | tags + scheduled_at |
| TASK-043-02 | Entry Metadata Services | High | Medium | tags + seo + author |
| TASK-043-03 | Entry Metadata API + Validation | High | Medium | /metadata endpoint |
| TASK-043-04 | Entry Metadata UI Wiring | High | Medium | Admin UI metadata panel |
| TASK-020 | Security Middleware and Request Pipeline | High | Medium | Request pipeline security |
| TASK-020-01 | Security Settings Model and Defaults | High | Medium | DB-backed security config |
| TASK-020-02 | Security Settings API and Validation | High | Medium | /settings/security |
| TASK-020-03 | Request Context and Request ID | High | Medium | requestId + context |
| TASK-020-04 | CSRF Protection Middleware | High | Medium | CSRF enforcement |
| TASK-020-05 | CORS Policy Middleware | High | Medium | allowlist + preflight |
| TASK-020-06 | Rate Limiting Middleware | High | Medium | auth/admin buckets |
| TASK-020-07 | Security Headers Middleware | Medium | Small | CSP/HSTS/etc |
| TASK-020-08 | Input Validation Middleware | Medium | Medium | AJV validate helper |
| TASK-020-09 | Security Settings UI Wiring | High | Medium | Admin UI config |
| TASK-020-10 | Session Limits in Security Settings | High | Medium | TTL + max sessions per user |
| TASK-028 | Analytics Core and UI | Medium | Large | KPIs + top content |
| TASK-028-01 | Analytics Service | Medium | Medium | aggregate metrics |
| TASK-028-02 | Analytics API Routes | Medium | Medium | /analytics endpoints |
| TASK-028-03 | Analytics UI Wiring | Medium | Medium | UI -> API |
| TASK-029 | Backups Core and UI | Medium | Large | backup registry |
| TASK-029-01 | Backups DB and Service | Medium | Medium | backups + schedule |
| TASK-029-02 | Backups API Routes | Medium | Medium | /backups endpoints |
| TASK-029-03 | Backups UI Wiring | Medium | Medium | UI -> API |
| TASK-030 | Import / Export Core and UI | Medium | Large | config bundles |
| TASK-030-01 | Import / Export Service | Medium | Medium | export/import |
| TASK-030-02 | Import / Export API Routes | Medium | Medium | /tools/export |
| TASK-030-03 | Import / Export UI Wiring | Medium | Medium | UI -> API |
| TASK-031 | Redirects Core and UI | Medium | Large | redirect CRUD |
| TASK-031-01 | Redirects DB and Service | Medium | Medium | redirects table |
| TASK-031-02 | Redirects API Routes | Medium | Medium | /redirects endpoints |
| TASK-031-03 | Redirects UI Wiring | Medium | Medium | UI -> API |
| TASK-033 | Security Sessions Core and UI | Medium | Medium | sessions list + revoke |
| TASK-033-01 | Sessions Service and API | Medium | Medium | /sessions endpoints |
| TASK-033-02 | Sessions UI Wiring | Medium | Medium | UI -> API |
| TASK-034 | Audit Logs UI Wiring | Medium | Medium | audit list + details |
| TASK-035 | Access Logs Core and UI | Medium | Large | request access logs |
| TASK-035-01 | Access Logs DB and Service | Medium | Medium | access_logs table |
| TASK-035-02 | Access Logs API Routes | Medium | Medium | /access-logs |
| TASK-035-03 | Access Logs UI Wiring | Medium | Medium | UI -> API |
| TASK-036 | IP Allowlist Core and UI | Medium | Large | allowlist + enforcement |
| TASK-036-01 | IP Allowlist Service | Medium | Medium | CRUD + CIDR |
| TASK-036-02 | IP Allowlist API and Middleware | Medium | Medium | /ip-allowlist |
| TASK-036-03 | IP Allowlist UI Wiring | Medium | Medium | UI -> API |
| TASK-037 | Login Alerts Core and UI | Medium | Medium | settings + alerts |
| TASK-037-01 | Login Alerts Settings | Medium | Medium | security settings |
| TASK-037-02 | Login Alerts UI Wiring | Medium | Medium | UI -> API |
| TASK-038 | Forms Core and UI | Medium | Large | Forms CRUD + submissions |
| TASK-038-01 | Forms DB Schema | Medium | Medium | forms + fields + submissions |
| TASK-038-02 | Forms Service and Validation | Medium | Medium | CRUD + validation |
| TASK-038-03 | Forms API Routes | Medium | Medium | /forms endpoints |
| TASK-038-04 | Forms UI Wiring | Medium | Medium | UI -> API |
| TASK-038-05 | Forms List and Editor Split | High | Large | list + /forms/:id editor |
| TASK-038-06 | Form Embed Widget + Page Editor Tab | Medium | Large | form widget + page editor integration |
| TASK-038-07 | Form Submission Access Modes | Medium | Medium | per-form public vs internal submissions |
| TASK-039 | API Keys Core and UI | Medium | Medium | keys + scopes |
| TASK-039-01 | API Keys DB and Service | Medium | Medium | api_keys table |
| TASK-039-02 | API Keys API Routes | Medium | Medium | /settings/api-keys |
| TASK-039-03 | API Keys UI Wiring | Medium | Medium | UI -> API |
| TASK-040 | Webhooks Core and UI | Medium | Large | webhooks + delivery |
| TASK-040-01 | Webhooks DB and Service | Medium | Medium | webhooks tables |
| TASK-040-02 | Webhooks Delivery and Retry | Medium | Medium | worker + signing |
| TASK-040-03 | Webhooks API Routes | Medium | Medium | /settings/webhooks |
| TASK-040-04 | Webhooks UI Wiring | Medium | Medium | UI -> API |
| TASK-041 | Email Settings Core and UI | Medium | Medium | SMTP + logs |
| TASK-041-01 | Email Settings Service | Medium | Medium | config + test |
| TASK-041-02 | Email API Routes | Medium | Medium | /settings/email |
| TASK-041-03 | Email UI Wiring | Medium | Medium | UI -> API |
| TASK-042 | Integrations Core and UI | Medium | Medium | registry + configs |
| TASK-042-01 | Integrations Service and Registry | Medium | Medium | tables + catalog |
| TASK-042-02 | Integrations API Routes | Medium | Medium | /settings/integrations |
| TASK-042-03 | Integrations UI Wiring | Medium | Medium | UI -> API |
| TASK-002 | Pages, Revisions, and Preview (Index) | High | Medium | Index for TASK-002-01..05 |
| TASK-002-01 | Page DB Schema & Migrations | High | Medium | Pages tables + revisions + preview tokens |
| TASK-002-02 | Page Services & Revisions | High | Medium | CRUD + publish + restore |
| TASK-002-03 | Preview Tokens & TTL | High | Medium | Secure preview links |
| TASK-002-04 | Pages Admin API & Validation | High | Medium | REST endpoints + schemas |
| TASK-002-05 | Pages UI Wiring (Admin) | High | Medium | Replace mocks with API |
| TASK-003 | Content Types Engine (Index) | High | Large | Index for TASK-003-01..06 |
| TASK-003-01 | Content DB Schema | High | Medium | Tables + indexes |
| TASK-003-02 | Content Schema Validation | High | Medium | AJV + strict schema |
| TASK-003-03 | Content Services and Revisions | High | Large | CRUD + publish + revisions |
| TASK-003-04 | Content Admin API | High | Medium | REST endpoints + guards |
| TASK-003-05 | Content Preview Tokens | Medium | Medium | Preview links for entries |
| TASK-003-06 | Content UI Wiring (Admin) | High | Medium | Replace mocks with API |
| TASK-006-14 | API Keys UI (Visual) | Medium | Medium | Settings API keys |
| TASK-006-15 | Audit Logs UI (Visual) | Medium | Medium | Filters + details drawer |
| TASK-006-16 | Content Entries List UI (Visual) | High | Medium | Entries list + sidebar |
| TASK-006-17 | Content Entry Editor UI (Visual) | High | Large | Entry editor layout |
| TASK-006-18 | Settings Security UI (Visual) | Medium | Medium | Security settings |
| TASK-006-19 | Webhooks UI (Visual) | Medium | Medium | Webhooks list + drawer |
| TASK-006-20 | Analytics UI (Visual) | Medium | Medium | KPIs + charts |
| TASK-006-21 | Backups UI (Visual) | Medium | Medium | Backups list + schedule |
| TASK-006-22 | Global Search UI (Visual) | Medium | Medium | Search results page |
| TASK-006-23 | Media Details UI (Visual) | Medium | Medium | Media details drawer |
| TASK-006-24 | Permissions Matrix UI (Visual) | Medium | Medium | RBAC matrix |
| TASK-006-25 | Plugin Details UI (Visual) | Medium | Medium | Plugin detail tabs |
| TASK-006-26 | SEO Manager UI (Visual) | Medium | Medium | SEO table + drawer |
| TASK-006-27 | Themes UI (Visual) | Medium | Medium | Themes list |
| TASK-006-28 | Theme Editor UI (Visual) | Medium | Large | Theme editor layout |
| TASK-006-29 | Widget Library UI (Visual) | High | Medium | Widget library grid |
| TASK-006-30 | Access Logs UI (Visual) | Medium | Medium | Access logs table |
| TASK-006-31 | Email Settings UI (Visual) | Medium | Medium | SMTP settings |
| TASK-006-33 | General Settings UI (Visual) | Medium | Medium | General settings |
| TASK-006-34 | Integrations UI (Visual) | Medium | Medium | Integrations cards |
| TASK-006-35 | Invite Users UI (Visual) | Medium | Medium | Invite modal |
| TASK-006-36 | IP Allowlist UI (Visual) | Medium | Medium | IP allowlist |
| TASK-006-37 | Redirects UI (Visual) | Medium | Medium | Redirects list |
| TASK-006-38 | Security Sessions UI (Visual) | Medium | Medium | Active sessions |
| TASK-006-39 | Storage Settings UI (Visual) | Medium | Medium | Storage config |
| TASK-006-40 | Import & Export UI (Visual) | Medium | Medium | Import/export |
| TASK-006-41 | Login Alerts UI (Visual) | Medium | Medium | Login alerts |
| TASK-006-42 | Admin UI Integration | High | Medium | Routing + navigation |
| TASK-009 | Widget Registry and Core Widgets | High | Large | Core widgets + schema |
| TASK-009-01 | Widget Registry | High | Medium | Registry contract |
| TASK-009-02 | Widget Schema Validation | High | Medium | AJV validate + defaults |
| TASK-009-03 | Core Widget: Hero | High | Medium | Schema + editor + render |
| TASK-009-04 | Core Widget: Timeline | High | Medium | Schema + editor + render |
| TASK-009-05 | Core Widget: Compare Timeline | High | Medium | Schema + editor + render |
| TASK-009-06 | Core Widget: Newsletter | Medium | Small | Schema + editor + render |
| TASK-009-07 | Core Widget: Contact | Medium | Medium | Schema + editor + render |
| TASK-009-08 | Core Widget: Navigation | Medium | Medium | Menu integration |
| TASK-009-09 | Core Widget: Footer | Medium | Medium | Columns + contact |
| TASK-009-10 | Widget Renderer Pipeline | Medium | Medium | normalize + render |
| TASK-009-11 | Widgets UI Wiring | High | Medium | Page builder integration |
| TASK-001 | ORM Foundation and Auth Tables | High | Medium | Drizzle + auth tables |
| TASK-004 | Auth, RBAC, and Admin API Base (Index) | High | Large | Index for TASK-004-01..07 |
| TASK-004-03 | Password Hashing and Sessions | High | Medium | argon2 + sessions |
| TASK-004-04 | Auth Middleware | High | Medium | attachUser + requireAuth |
| TASK-004-05 | RBAC Middleware | High | Medium | requirePermission |
| TASK-006 | Menus and Navigation | Medium | Medium | Menu CRUD + admin UI |
| TASK-007 | Settings and Design Tokens | Medium | Medium | Index for TASK-007-01..04 |
| TASK-007-01 | Settings Model and Service | Medium | Medium | Settings table + service |
| TASK-007-02 | Settings Admin API and Validation | Medium | Medium | Endpoints + schemas |
| TASK-007-03 | Design Token Pipeline | Medium | Medium | Merge + CSS vars |
| TASK-007-04 | Settings UI and Tokens UI | Medium | Medium | Settings pages + tokens |
| TASK-007-05 | Settings UI Wiring | Medium | Medium | Admin UI -> settings API |
| TASK-008 | Themes and Theme Profiles | Medium | Large | Theme registry + profiles |
| TASK-008-01 | Theme Registry and Loader | Medium | Medium | Scan /themes + theme.json |
| TASK-008-02 | Theme Profiles and Routes | Medium | Medium | DB + routes + active profile |
| TASK-008-03 | Template Resolution and Rendering | Medium | Medium | Resolver order + fallback |
| TASK-008-04 | Themes Admin API | Medium | Medium | /themes + profiles endpoints |
| TASK-008-05 | Themes Admin UI Wiring | Medium | Medium | Wire themes UI to API |
| TASK-008-06 | Admin UI Theme Templates | High | Large | UI-only templates + profiles split |
| TASK-008-07 | Admin UI Theme Tokens Tabs | Medium | Medium | Tabs + per-section previews |
| TASK-024 | Shadcn UI and Tailwind v4 Setup | High | Medium | Admin UI base |
| TASK-006-09 | Login UI (Visual) | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-10 | Two Factor UI (Visual) | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-11 | Reset Password UI (Visual) | Medium | Small | HTML -> shadcn conversion |
| TASK-006-12 | Set Password UI (Visual) | Medium | Small | HTML -> shadcn conversion |
| TASK-006-01 | Dashboard UI (Visual) | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-02 | Menu Editor UI (Visual) | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-03 | Media Library UI (Visual) | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-04 | Schema Builder UI (Visual) | High | Large | HTML -> shadcn conversion |
| TASK-006-05 | Plugin Store UI (Visual) | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-06 | Page List UI (Visual) | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-07 | Page Editor UI (Visual) | High | Large | HTML -> shadcn conversion |
| TASK-006-08 | Design Tokens UI (Visual) | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-13 | Users and Roles UI (Visual) | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-32 | Form Builder UI (Visual) | High | Large | Form builder layout |
| TASK-010 | Page Builder UI (Functional) | High | Large | Wizard/Visual/Advanced |
| TASK-011 | Content Types Admin UI (Functional) | High | Large | Schema builder + entries |
| TASK-012 | Media Library Admin UI (Functional) | Medium | Medium | Uploads + metadata UI |
| TASK-013 | Search and Indexing | Medium | Medium | Admin search + DB indexes |
| TASK-014 | Audit Logs | Medium | Medium | Audit events + UI |
| TASK-015 | Plugin Runtime Loader and Registry | High | Large | Runtime load + safe mode |
| TASK-016 | SDK Package and Plugin API | High | Large | @core/sdk package |
| TASK-017 | Store Client and Update Policy | High | Large | Signatures + updates |
| TASK-018 | Plugin Store Admin UI (Functional) | Medium | Medium | Store browse + install |
| TASK-019 | Users and Roles Admin UI (Functional) | Medium | Medium | Users + roles UI |
| TASK-025 | Auth UI Wiring (Functional) | High | Medium | Login + 2FA + reset wiring |
| TASK-004-01 | Core HTTP Server and Admin UI Bootstrap | High | Large | Bun server + admin entry |
| TASK-004-06 | Auth Routes and Base API Layer | High | Medium | login/logout/me base |
| TASK-004-07 | Auth UI Wiring (Functional) | High | Medium | Login + 2FA + reset wiring |
| TASK-004-02 | Auth Advanced Endpoints (CSRF/OTP/Reset) | High | Medium | CSRF + reset + OTP |
| TASK-005 | Media Storage and Uploads (Index) | Medium | Medium | Index for TASK-005-01..08 |
| TASK-005-01 | Media DB Schema | Medium | Small | Table + migration |
| TASK-005-02 | Storage Adapter Interface | Medium | Small | Adapter contract + resolver |
| TASK-005-03 | Local Storage Adapter | Medium | Small | Local file storage |
| TASK-005-04 | S3 Storage Adapter | Medium | Medium | AWS S3 integration |
| TASK-005-05 | Azure Storage Adapter | Medium | Medium | Azure Blob integration |
| TASK-005-06 | Media Service + Validation | Medium | Medium | Upload metadata + validation |
| TASK-005-07 | Media API Routes | Medium | Medium | Upload + CRUD endpoints |
| TASK-005-08 | Media UI Wiring (Admin) | Medium | Medium | Admin upload + metadata UI |
| TASK-005-09 | Storage Settings Runtime Config | High | Medium | DB config + encryption + UI |
| TASK-026 | Search UI Wiring | Medium | Medium | Wire global search to /search |
| TASK-027 | SEO Manager Core and UI | High | Large | SEO data + audit + UI |
| TASK-027-01 | SEO DB Schema | High | Medium | seo_documents |
| TASK-027-02 | SEO Service and Audit Runner | High | Medium | audit scoring |
| TASK-027-03 | SEO API Routes | High | Medium | /seo endpoints |
| TASK-027-04 | SEO UI Wiring | High | Medium | UI -> API |
