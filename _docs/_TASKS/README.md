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
- **To Do:** 25 tasks
- **In Progress:** 5 tasks
- **Done:** 815 tasks

---

## To Do

| ID | Title | Priority | Effort | Notes |
|----|-------|----------|--------|-------|
| TASK-054-20 | Coderso Membership and Client Portal Suite | High | Large | Authenticated client portal and per-content access rules |
| TASK-054-21 | Coderso Multilingual and i18n Suite | High | Large | Locales, translated content, and localized routing |
| TASK-105-08 | Final Per-File 100% Gap Closure | High | Large | Close final file-level line/branch/function gaps |
| TASK-105-09 | QA, Docs, Changelog, and Closure | Medium | Medium | Final metrics, docs, board, and changelog closure |
| TASK-021 | Store Backend Core | High | Large | Public API + signing |
| TASK-022 | Store Publish Pipeline and Security Scans | High | Large | Publish validation + scans |
| TASK-023 | Store Auth and Publisher Accounts | Medium | Medium | Authors + tokens |
| TASK-172 | LLM Guide Business Blueprint Packs | High | Large | More concrete business outcomes beyond the current catalog/site-kit slice |
| TASK-173 | LLM Guide Production Readiness and Acceptance | High | Large | Acceptance, security, observability, and docs hardening for declared guide capabilities |
| TASK-172-01 | Blueprint Pack Contract and Shared Builder Expansion | High | Medium | Typed pack interface for business blueprint outcomes |
| TASK-172-02 | Lead Capture Site Pack | High | Large | Landing page plus hardened inquiry form blueprint |
| TASK-172-03 | Booking Service Business Pack | High | Large | Booking setup pack gated by safe booking service reuse |
| TASK-172-04 | Product Inquiry and Ecommerce Starter Pack | High | Large | Product catalog/inquiry pack without overclaiming checkout scope |
| TASK-172-05 | Portfolio Case Study Pack | Medium | Medium | Portfolio/case-study list/detail blueprint |
| TASK-172-06 | Editorial Content Hub Pack | Medium | Large | Posts/pages/listings hub respecting posts domain split |
| TASK-172-07 | Solution Kit Refinement Packs and No-Reinstall Flow | High | Large | Installed-kit refinements without duplicate reinstall |
| TASK-172-08 | Runtime Acceptance, Docs, and Widget Pack Matrix Closure | High | Medium | Runtime acceptance and docs/matrix sync for implemented packs |
| TASK-173-01 | Acceptance Matrix and Flow Inventory | High | Medium | Declared capability matrix with Bun/Vitest ownership |
| TASK-173-01-01 | Docs-Only Cannot Mutate Regression | High | Small | Regression proving docs-only stays read-only |
| TASK-173-01-02 | Action Family Route Error Matrix | High | Medium | Route errors, permissions, CSRF, and idempotency per action family |
| TASK-173-02 | Partial Success and Recovery UX | Medium | Medium | Clear failed/partial execution state and retry guidance |
| TASK-173-03 | Idempotency Replay Diagnostics and Support Metadata | High | Medium | Replay/conflict diagnostics without secret leakage |
| TASK-173-04 | Security and Performance Gates for Action Endpoints | High | Medium | Security/perf gates for expanded assistant actions |
| TASK-173-05 | Observability, Audit, and Admin Diagnostics | Medium | Medium | Support-useful redacted metrics/audit diagnostics |
| TASK-173-06 | Docs Corpus Capability Limits and Closure | High | Medium | Honest docs/corpus/board/changelog readiness closure |

---

## In Progress

| ID | Title | Priority | Effort | Notes |
|----|-------|----------|--------|-------|
| TASK-105 | Real Vitest 100% Coverage Program | High | Large | In progress: fresh 2026-03-15 baseline is `74.04%` lines with `61.35%` branches; `ThemeTemplateDrawer` and `UserList` are now line-closed, `UsersRolesPage` jumped into the high 80s, and the remaining backlog is increasingly broader low-line admin page/drawer tail |
| TASK-105-04 | Themes, Booking, Listings, and Forms Wave | High | Large | In progress: booking leaf tabs, `ListingListPage`, `FormCanvas`, and `ThemeTemplateDrawer` are now line-closed; the wave tail is mostly branch-only theme/page-shell cleanup |
| TASK-105-05 | Entries, Pages, and Posts Editor Wave | High | Large | In progress: `PageEditor` jumped above `82%` branches, and the next ROI is concentrated in smaller editor shell/media/async residue rather than broad component gaps |
| TASK-105-06 | Widget Editor New Tests Wave | High | Large | In progress: widget editors are now 100% lines in the full-lane report; remaining work is branch-only hardening plus barrel import ownership noise |
| TASK-054 | Coderso Modular Admin IA | High | Large | Umbrella section + IA + routing compatibility; remaining product work tracked in 054-20 and 054-21 |

---

## Done

| ID | Title | Priority | Effort | Notes |
|----|-------|----------|--------|-------|
| TASK-170-01 | Action Family Contract and Permission Model | High | Medium | Done: non-executable action family contract registry and permission model added |
| TASK-170-01-01 | Entry Action Contracts | High | Medium | Done: entry contracts documented; `entry.upsert-draft` was later promoted by TASK-170-03-01 |
| TASK-170-01-02 | Menu, SEO, and Media Action Contracts | High | Medium | Done: menu/SEO/media contracts documented; menu item and SEO were later promoted by TASK-170-03-02 leaves |
| TASK-170-01-03 | Form, Page, and Listing Expansion Contracts | High | Medium | Done: form automation and page/listing patch contracts stay contract-only |
| TASK-170-02 | Registry, Diff, and Preview Metadata Expansion | High | Medium | Done: preview metadata redaction and contract-only conflict/dependency helpers added |
| TASK-170-03-01 | Entry Draft Action Executor Adapters | High | Medium | Done: `entry.upsert-draft` executes draft create/update through existing entry services |
| TASK-170-03-02 | Menu, SEO, and Media Action Executor Adapters | High | Large | Done: menu item, SEO document, and entry media-reference adapters execute through existing services |
| TASK-170-03-02-01 | Menu Item Upsert Executor Adapter | High | Medium | Done: `menu.item.upsert` executes through existing menu services and rejects unsafe hrefs |
| TASK-170-03-02-02 | SEO Document Upsert Executor Adapter | High | Medium | Done: `seo.document.upsert` executes through existing SEO service for page/entry targets |
| TASK-170-03-02-03 | Media Reference Attach Executor Adapter | High | Large | Done: `media.reference.attach` attaches existing media to entry targets only |
| TASK-170-03-02-04 | Menu, SEO, and Media Adapters Docs, Tests, and Closure | High | Small | Done: docs, board, and changelog synced for menu/SEO/media adapter wave |
| TASK-170-03-03-01 | Listing Query Filters Patch Executor Adapter | High | Medium | Done: `listing-query.filters.patch` updates query filters through existing listing query service |
| TASK-170-03-03-02 | Listing Template Card Patch Executor Adapter | High | Medium | Done: `listing-template.card.patch` updates card config through existing listing template service |
| TASK-170-03-03-03 | Page Widget Patch Executor Adapter | High | Large | Done: `page.widget.patch` upserts one validated top-level widget block while preserving unrelated blocks |
| TASK-170-03-03-04 | Form Automation Upsert Executor Adapter | High | Large | Done: `form.automation.upsert` upserts safe non-webhook actions through existing form action services |
| TASK-170-03-03 | Form, Page, and Listing Patch Executor Adapters | High | Large | Done: listing, page, and safe form automation patch adapters shipped |
| TASK-170-03-03-05 | Form, Page, and Listing Patch Adapters Docs, Tests, and Closure | High | Medium | Done: docs, board, and changelog synced for patch adapter wave |
| TASK-170-03 | Executor Adapters and Domain Service Reuse | High | Large | Done: executor adapters and route-level per-action permission enforcement shipped |
| TASK-170-03-04 | Executor Adapter Docs, Tests, and Closure | High | Medium | Done: route permission tests, docs, board, and changelog synced for executor adapter wave |
| TASK-170-04 | Admin Review UI for Expanded Actions | Medium | Medium | Done: review/result UI renders action labels, targets, conflicts, and dependencies |
| TASK-170-05 | Route Security, Tests, Docs, and Closure | High | Medium | Done: final route/security/docs closure completed for expanded action families |
| TASK-170 | LLM Guide Action Family Expansion | High | Large | Done: expanded typed action families shipped with contracts, adapters, UI, route permissions, docs, and tests |
| TASK-171-01 | Provider Prompt Context Packaging and Redaction | High | Medium | Done: bounded/redacted provider planning prompt package helper added |
| TASK-171-01-01 | Docs and Runtime Context Budgeting | High | Medium | Done: docs/runtime/resource budgets are deterministic and test-covered |
| TASK-171-01-02 | Secret Redaction and Audit-Safe Payloads | High | Medium | Done: provider package redaction covers nested secrets and signed URL metadata |
| TASK-171-02 | Provider Draft Execution and Fallback Control | High | Large | Done: fake-provider draft helper maps through strict adapter and falls back deterministically |
| TASK-171-03 | Schema Repair and Clarification Questions | High | Medium | Done: safe draft repair keeps typed provider questions when strict schema fails |
| TASK-171-04 | Plan Confidence, Assumptions, and UX Explanation | Medium | Medium | Done: review UI distinguishes provider draft plans from local planner plans |
| TASK-171-05 | Provider Planner Evaluation Fixtures and Route Coverage | High | Medium | Done: fake-provider fixtures cover success, unsafe draft, provider error, and unavailable fallback |
| TASK-171 | LLM Guide Provider Planner Intelligence | High | Large | Done: provider prompt package, draft helper, schema repair, review metadata, and fixtures shipped without live network dependency |
| TASK-101-09 | Assistant Action Engine (LLM Guide + Typed Actions) | High | Large | Done: docs-only vs LLM Guide split, context snapshots, planner/schema, actions, registry, idempotency, and tests are complete for the shipped scope |
| TASK-101-09-01 | Assistant Mode Split and Runtime Contracts | High | Medium | Done: canonical transport/settings/client mode is `llm-guide`; legacy `llm-rag` is normalized as input alias only |
| TASK-101-09-01-01 | Docs Assistant Mode Guardrails and Backward Compatibility | High | Small | Done: docs-only remains read-only and legacy `llm-rag` input is normalized into `llm-guide` |
| TASK-101-09-04 | Typed Action Registry, Dry-Run, and Execution Pipeline | High | Large | Done: registry dispatch, preview conflict/dependency arrays, DB-backed idempotency, and adapter audit are complete |
| TASK-101-09-04-03 | Existing Service Adapters and Installer Extraction | High | Medium | Done: site-kit convergence remained done; no additional safe helper extraction was identified beyond registry/idempotency cleanup |
| TASK-101-09-04-02 | Execution, Idempotency, Revisions, and Audit Hooks | High | Medium | Done: execute uses persistent idempotency storage with actor/plan/hash conflict checks and DB migration artifacts |
| TASK-101-09-04-01 | Action Registry, Dry-Run Diff, and Conflict Model | High | Medium | Done: formal action registry replaces central switch dispatch and preview changes expose conflicts/dependencies arrays |
| TASK-101-09-03 | LLM Guide Planner and Typed Plan Schema | High | Large | Done: strict nested schema, context heuristics, provider draft adapter, and planner regression coverage are shipped |
| TASK-101-09-03-04 | Planner Test, Docs, and Closure | Medium | Small | Done: planner schema/heuristics/provider tests, docs, changelog, and board sync are complete |
| TASK-101-09-03-03 | Provider Draft Plan Adapter and Malformed Output Recovery | High | Medium | Done: untrusted mocked provider drafts map through local strict schema or recover to typed questions |
| TASK-101-09-03-02 | Local Heuristics, Plan Repair, and Missing Context Questions | High | Medium | Done: prompt/context heuristics are split into a pure module and use resource/runtime context for refinement routing |
| TASK-101-09-03-01 | Prompt Normalization, Intent Extraction, and Strict Plan Schema | High | Medium | Done: strict nested action plan schema validates per-action input and planner output |
| TASK-101-09-02 | Admin Context Snapshot and Safe Surface Observers | High | Large | Done: route/module, resource catalog, runtime snapshot, selected resource, and advisory permission/action hints are available to LLM Guide planning |
| TASK-101-09-02-01 | Admin Runtime Context Snapshot and Permission Affordances | High | Large | Done: AssistantPanel now sends route-derived runtime snapshot and server normalization keeps it advisory-only |
| TASK-101-09-02-01-03 | Runtime Context Test, Docs, and Closure | Medium | Small | Done: runtime context validation, docs, changelog, and board sync are complete |
| TASK-101-09-02-01-02 | Server Context Permission Affordance Normalization | High | Medium | Done: advisory action/permission hints are normalized and unsafe hints are dropped server-side |
| TASK-101-09-02-01-01 | Admin UI Runtime Snapshot Hook | High | Medium | Done: AdminRouter/AdminShell feed route, selected entity, and visible action hints into LLM Guide context |
| TASK-101-09-02-02 | Resource Schema, Widget, and Surface Catalog Context | High | Large | Done: `/assistant/actions/plan` can attach bounded, redacted admin resource catalogs for LLM Guide planning |
| TASK-101-09-02-02-04 | Resource Catalog Test, Docs, and Closure | Medium | Small | Done: validation, docs, changelog, and board sync for resource catalog context |
| TASK-101-09-02-02-03 | Action Plan Context Enrichment and Route Contract | High | Medium | Done: `includeResourceCatalog` enriches the existing action planning route without accepting client-supplied catalogs |
| TASK-101-09-02-02-02 | Resource Catalog Builder and Lazy Default Deps | High | Medium | Done: injected-deps builder and lazy default deps aggregate content, screen, listing, form, and widget summaries |
| TASK-101-09-02-02-01 | Resource Catalog Types and Pure Normalizers | High | Medium | Done: pure snapshot types, redaction, clamping, and deterministic normalization are covered in Vitest |
| TASK-101-09-01-03 | Site Builder Contract Convergence and Legacy Route Retirement | High | Medium | Done: AI Site Wizard/site-kit work now uses `/assistant/actions/*`; `/assistant/site-builder/*` route/client surface is retired |
| TASK-101-09-06 | Assistant UI, API, Security, Tests, and Closure | High | Large | Done: action endpoints, review/confirm UI, security docs, and targeted test matrix are shipped for the current guide action engine |
| TASK-101-09-06-03 | Unit, Integration, UI Test Matrix, and Docs Closure | Medium | Medium | Done: planner/UI/client coverage lives in Vitest, while executor/routes/DB/public runtime coverage lives in Bun |
| TASK-101-09-06-02 | Action Routes, Security Contract, and Error Mapping | High | Medium | Done: `/assistant/actions/*` endpoints, validation, RBAC/CSRF route wiring, and action error mapping are shipped |
| TASK-101-09-06-01 | Review, Confirm UX, and Partial Success States | High | Medium | Done: action plan review and execution result components are shipped and covered by assistant panel interaction tests |
| TASK-101-09-05-03 | House Projects Catalog End-to-End Acceptance Flow | High | Medium | Done: house-projects prompt has plan/dry-run/execute plus DB-backed and public runtime acceptance coverage |
| TASK-101-09-05-02 | Generated Admin Surfaces, Listings, and Beginner-Safe Follow-Ups | High | Medium | Done: generated catalog plans now compose content types, custom screens, listings, pages, and follow-up form/filter refinements through existing Coderso surfaces |
| TASK-101-09-05-01 | Projects Catalog Blueprint and Default Content Model | High | Medium | Done: house-projects catalog content model exists as a preset in the generic catalog family blueprint engine |
| TASK-101-09-05 | Generated Catalog Blueprints and Admin Surface Composition | High | Large | Done: generic catalog blueprint engine and multiple catalog presets generate typed Coderso surfaces without assistant-only write paths |
| TASK-101-09-01-02 | LLM Guide Mode Settings and Mode Switch UX | Medium | Small | Done: assistant/settings UI now uses `LLM Guide` user-facing language while preserving `llm-rag` transport compatibility |
| TASK-101-09-07 | Generic LLM Guide Intent Families and State-Aware Planning | High | Large | Done: generic prompt families, catalog blueprint engine, multi-family presets, and state-aware house-projects refinements are now implemented and tested |
| TASK-101-09-07-04 | State-Aware Follow-Up Refinement and No-Duplicate Setups | High | Large | Done: house-projects follow-ups now add filters and inquiry forms, and refinements can reuse listing resources from existing page state to avoid duplicate setup creation |
| TASK-101-09-07-03 | Service Directory, Portfolio, and Product Family Presets | High | Large | Done: planner now returns ready plans for product, portfolio, and services-directory business prompts through the shared catalog-family builder |
| TASK-101-09-07-02 | Generic Catalog Family Blueprint Engine | High | Large | Done: shared catalog blueprint builder now powers the house-projects flow and produces generic product/portfolio presets without changing the executor contract |
| TASK-101-09-07-01 | Intent Family Classification and Prompt-to-Blueprint Routing | High | Medium | Done: planner now classifies docs/setup/refinement prompts and routes them into explicit intent families while keeping the house-projects preset backward-compatible |
| TASK-101-09-06-04 | Deep Interaction, DB Parity, and Runtime Acceptance Test Wave | High | Large | Done: the shipped house-projects slice now has interactive UI flow coverage, DB-backed parity checks, and public runtime acceptance coverage |
| TASK-169 | Assistant Widget Template Medium and Decision Guide Polish | Medium | Small | Done: medium and decision-guide widget-template follow-ups now read as Hero-specific guidance instead of flattened workflow/fallback text |
| TASK-168 | Assistant Widget Template Medium-Detail Polish | Medium | Small | Done: medium-detail widget-template guidance now explains the practical Hero-details path more concretely |
| TASK-167 | Assistant Guide-Mode Follow-Up Specificity | High | Small | Done: dedicated helper-mode sections now render without redundant fallback mixing and Hero follow-ups stay more specific |
| TASK-166 | Assistant Widgets Hero Color Guidance Recovery | High | Small | Done: canonical widget template docs now carry explicit Hero color guidance and retrieval coverage against competing Widget Library hits |
| TASK-165 | Assistant Reindex Deletes Removed DB Docs | High | Small | Done: assistant DB ingest now prunes removed official docs so stale combined articles do not survive reindex |
| TASK-164 | Assistant Coderso Split Reference Cleanup | Medium | Small | Done: aligned stale pre-split `docs/coderso/*` references in assistant tests and `_docs` with the current canonical docs |
| TASK-163 | Historical Assistant Task Reference Cleanup | Low | Small | Done: replaced dead historical task references to deleted combined screen docs with the current canonical split docs |
| TASK-162 | Obsolete Combined Assistant Screen Docs Cleanup | Medium | Small | Done: removed old combined screen docs that were no longer referenced by the coverage matrix after the route-by-route split |
| TASK-161 | Authentication and Account Recovery Admin UI Assistant Documentation Refresh | Medium | Small | Done: rewrote the auth flow doc against the live login, 2FA, reset, and reset-confirm screens |
| TASK-160 | Dashboard Admin UI Assistant Documentation Refresh | Medium | Small | Done: rewrote Dashboard against the live stat-card/recent-edits/health workflow |
| TASK-159 | Roles Matrix Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Roles Matrix out of the old users/roles doc and rewrote it against the live permissions workflow |
| TASK-158 | Users Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Users out of the old users/roles doc and rewrote it against the live list/details/invite workflow |
| TASK-157 | Integrations Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Integrations out of the old integrations doc and rewrote it against the live catalog/drawer workflow |
| TASK-156 | Storage Settings Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Storage Settings out of the old integrations doc and rewrote it against the live provider/upload workflow |
| TASK-155 | Email Settings Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Email Settings out of the old integrations doc and rewrote it against the live SMTP/test-email workflow |
| TASK-154 | Webhooks Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Webhooks out of the old integrations doc and rewrote it against the live delivery/drawer workflow |
| TASK-153 | API Keys Admin UI Assistant Documentation Refresh | Medium | Small | Done: split API Keys out of the old integrations doc and rewrote it against the live key-management workflow |
| TASK-152 | Login Alerts Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Login Alerts out of the broader Security Settings doc and rewrote it against the live alert-policy workflow |
| TASK-151 | Sessions Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Sessions out of the broader Security Settings doc and rewrote it against the live active-session workflow |
| TASK-150 | IP Allowlist Admin UI Assistant Documentation Refresh | Medium | Small | Done: split IP Allowlist out of the broader Security Settings doc and rewrote it against the live restrictions/drawer workflow |
| TASK-149 | Security Settings Admin UI Assistant Documentation Refresh | Medium | Small | Done: rewrote Security Settings against the live section-based hardening workflow and kept related subroutes for later dedicated refreshes |
| TASK-148 | Assistant Settings Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Assistant Settings out of the old combined settings doc and rewrote it against the live runtime/reindex workflow |
| TASK-147 | Site Settings Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Site Settings out of the old combined settings doc and rewrote it against the live URL/preview/routes workflow |
| TASK-134 | Popups Admin UI Assistant Documentation Refresh | Medium | Small | Done: rewrote the Popups assistant doc against the live popup list/editor workflow and synced the route coverage |
| TASK-133 | Commerce Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Commerce into catalog and product-editor assistant docs and synced the route coverage |
| TASK-146 | General Settings Admin UI Assistant Documentation Refresh | Medium | Small | Done: split General Settings out of the old combined settings doc and rewrote it against the live identity/branding workflow |
| TASK-145 | Access Logs Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Access Logs out of the old combined operations doc and rewrote it against the live filter/table/details/export workflow |
| TASK-144 | Import Export Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Import / Export out of the old combined operations doc and rewrote it against the live export/import workspace |
| TASK-143 | Backups Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Backups out of the old combined operations doc and rewrote it against the live schedule/table/dialog workflow |
| TASK-142 | Audit Logs Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Audit Logs out of the old combined operations doc and rewrote it against the live filter/table/details/export workflow |
| TASK-141 | Analytics Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Analytics out of the old combined operations doc and rewrote it against the live KPI/chart/top-content workflow |
| TASK-140 | Redirects Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Redirects out of the old SEO/Redirects assistant doc and rewrote it against the live empty/create flow and source-verified table actions |
| TASK-139 | SEO Manager Admin UI Assistant Documentation Refresh | Medium | Small | Done: split SEO Manager out of the old combined SEO/Redirects assistant doc and rewrote it against the live audit and quick-edit workflow |
| TASK-138 | Search Admin UI Assistant Documentation Refresh | Medium | Small | Done: rewrote the global Admin Search assistant doc against the live search shell, recent searches, filters, and grouped-results contract |
| TASK-137 | Admin UI Theme Assistant Documentation Refresh | Medium | Small | Done: rewrote the Admin UI Theme assistant doc against the live templates/profiles workflow and synced the task board/changelog |
| TASK-136 | Plugin Store Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Plugin Store into catalog and plugin-details assistant docs and synced the coverage matrix/task board/changelog |
| TASK-135 | Solution Kits Admin UI Assistant Documentation Refresh | Medium | Small | Done: rewrote the Solution Kits assistant doc against the live kit cards, wizard, and selected-kit details flow |
| TASK-132 | Reviews Admin UI Assistant Documentation Refresh | Medium | Small | Done: separated Reviews moderation from the old combined engagement doc and moved `/coderso/reviews` to its own canonical assistant guide |
| TASK-131 | Booking Admin UI Assistant Documentation Refresh | Medium | Small | Done: rewrote the Booking assistant doc against the tabbed resources/services/availability/reservations/slot-preview workflow |
| TASK-130 | Filters and Search Admin UI Assistant Documentation Refresh | Medium | Small | Done: split the old combined discovery assistant doc into dedicated Filters and Search preview guides |
| TASK-129 | Listings Admin UI Assistant Documentation Refresh | Medium | Small | Done: carved Listings out of the old shared doc and moved `/coderso/listings*` to its own canonical assistant guide |
| TASK-128 | Forms Admin UI Assistant Documentation Refresh | Medium | Small | Done: split the old combined Forms assistant doc into route-aligned builder and action logs guides |
| TASK-127 | Widgets Admin UI Assistant Documentation Refresh | Medium | Small | Done: split the old combined Widgets assistant doc into route-aligned library and template editor guides |
| TASK-126 | Custom Screens Admin UI Assistant Documentation Refresh | Medium | Small | Done: split the old combined Custom Screens assistant doc into route-aligned builder and records workflow docs |
| TASK-125 | Entries Admin UI Assistant Documentation Refresh | Medium | Small | Done: split the old combined Entries assistant doc into route-aligned list/create and editor/metadata docs |
| TASK-124 | Engine Admin UI Assistant Documentation Refresh | Medium | Small | Done: split the old combined Engine assistant doc into route-aligned list/create and editor/schema docs |
| TASK-123 | Media Admin UI Assistant Documentation Refresh | Medium | Small | Done: rewrote the Media assistant doc to match upload, filters, access settings, and asset-detail workflow |
| TASK-122 | Menus Admin UI Assistant Documentation Refresh | Medium | Small | Done: rewrote the Menus assistant doc to match the builder, create dialog, hierarchy workflow, and item settings |
| TASK-121 | Posts Admin UI Assistant Documentation Refresh | Medium | Small | Done: split the old combined Posts assistant doc into route-aligned list/create and editor/revisions/preview docs |
| TASK-120 | Pages Admin UI Assistant Documentation Refresh | Medium | Small | Done: split the old combined Pages assistant doc into route-aligned list/create and editor/settings/history docs |
| TASK-119-05 | Assistant Multi-Level QA, Docs, Changelog, and Closure | Medium | Small | Done: validation and docs/task board/changelog synchronization completed for the multi-level assistant rollout |
| TASK-119-04 | Assistant Progressive Follow-Up Flow and Mode Prompts | Medium | Medium | Done: depth/mode fields and follow-up chips now drive deterministic multi-turn assistant flow |
| TASK-119-03 | Assistant Corpus Enrichment for Multi-Level Answers | High | Large | Done: key high-traffic assistant docs now expose Basic/Medium/Instruction/Advanced plus helper sections |
| TASK-119-02 | Assistant Depth-Aware Retrieval and Composer Contract | High | Medium | Done: retriever/composer/service now support detail level, guide mode, and follow-up options |
| TASK-119-01 | Assistant Docs Authoring Contract for Basic/Medium/Instruction/Advanced | High | Medium | Done: template/readme/ingest contract now support the multi-level docs model with compatibility aliases |
| TASK-119 | Assistant Multi-Level Docs Contract and Progressive-Depth Answers | High | Large | Done: multi-level docs-only answer model and progressive follow-up UX shipped end-to-end |
| TASK-118-03 | Assistant Widgets and Engine Corpus Enrichment, QA, and Closure | Medium | Small | Done: canonical docs now include Hero visual settings and a clearer Engine usage path, with validation/docs/changelog synced |
| TASK-118-02 | Assistant Procedural How/Use Ranking and Section Selection | High | Small | Done: procedural questions now bias toward Step By Step and avoid low-signal `When To Use` dominance |
| TASK-118-01 | Assistant Doc Metadata Propagation and Surface Label Fix | High | Small | Done: docs-only answers now label the canonical document/module instead of the selected section |
| TASK-118 | Assistant Surface Labels, Procedural Guidance, and Corpus Specificity Follow-Up | High | Medium | Done: fixed surface labels, procedural guidance routing, and weak widgets/engine corpus coverage |
| TASK-117 | Assistant Clarifying Questions and Section-Aware Docs Answers | High | Medium | Done: docs-only assistant now asks clarifying questions when ambiguous and composes answers from the right doc sections |
| TASK-116 | Assistant Final Answer from Chunk Content, not Preview Snippet | Medium | Small | Done: final answer now uses chunk content with sentence-aware truncation instead of preview snippets |
| TASK-115-04 | QA, Docs, Changelog, and Closure | Medium | Small | Done: validation and docs/changelog sync were rerun after the ranking regression follow-up |
| TASK-115-03 | Assistant UI Answer-First Rendering and Hidden Default Sources | Medium | Small | Done: main answer is primary content and default Sources rendering is hidden |
| TASK-115-02 | Ranking and Evidence Selection Tuned for Product Support Questions | High | Medium | Done: metadata-aware ranking, cross-area penalties, and confidence calibration now keep product questions on the right docs |
| TASK-115-01 | Assistant Answer Contract and Content-First Composer Model | High | Medium | Done: assistant now composes actual answer text from article content instead of doc-location lists |
| TASK-115 | Assistant Product Answer Composer and Evidence UX Simplification | High | Large | Done: content-first answers shipped and default evidence UI was simplified |
| TASK-114-04 | QA, Docs, Changelog, and Closure | Medium | Small | Done: runtime/settings/UI validation plus docs, board, and changelog synchronization completed |
| TASK-114-03 | Admin Settings UX Cleanup Removing Legacy Assistant Docs Mode Choices | Medium | Small | Done: assistant settings now describe only the DB-seeded `docs/` model |
| TASK-114-02 | Runtime and API Enforcement for DB-Only Assistant Docs | High | Medium | Done: assistant runtime/status/reindex now operate as DB-only official docs flow |
| TASK-114-01 | Legacy Assistant Settings and Data Migration to DB-Only docs | High | Medium | Done: saved legacy `_docs/filesystem` assistant settings are normalized into the new `docs/db` model |
| TASK-114 | Assistant Legacy Docs Runtime Removal and DB-Only Enforcement | High | Medium | Done: legacy `_docs/filesystem` support removed from active official assistant runtime |
| TASK-113 | Assistant Transcript Scroll Containment | Medium | Small | Done: transcript/window overscroll containment prevents background page scrolling while wheeling over chat |
| TASK-112 | Assistant Conversation Window Overflow and Width Handling | Medium | Small | Done: message wrapping, vertical transcript scroll, composer separation, and safe width resize added |
| TASK-111 | Assistant Reindex Action Decoupled from Settings Save | Medium | Small | Done: `Run reindex` now seeds docs without implicit save-first behavior |
| TASK-110 | Assistant Settings Run Reindex Action | Medium | Small | Done: added `Run reindex` CTA in Assistant Settings with save-first and result states |
| TASK-109-06 | QA, Docs Index, Changelog, and Closure | Medium | Medium | Done: ingest/runtime validation, docs corpus structure verification, board, and changelog synchronization completed |
| TASK-109-05 | Solution Kits, Applied Examples, and Non-Kit Playbooks Corpus | High | Medium | Done: per-kit docs plus applied playbooks for lead gen, booking, commerce, editorial, and manual setup |
| TASK-109-04 | Official Documentation Corpus for Coderso Modules and Screen Workflows | High | Large | Done: canonical English docs added for Coderso modules, screens, workflows, examples, and pitfalls |
| TASK-109-03 | Official Documentation Corpus for Core Admin Screens and Settings Surfaces | High | Large | Done: canonical English docs added for core admin screens, settings surfaces, and workflows |
| TASK-109-02 | Assistant Ingest Runtime Migration from _docs/_internal to root docs and DB Seeding | High | Medium | Done: official assistant source root moved to `docs/` with DB-seeded readiness and no official filesystem fallback |
| TASK-109-01 | root docs Information Architecture, Authoring Contract, and Coverage Matrix | High | Medium | Done: root `docs/` IA, authoring template, and route coverage matrix created |
| TASK-109 | Official Assistant Documentation Corpus in root docs and DB Seeding | High | Large | Done: official English `docs/` corpus, DB-seeding contract, and screen/kit/playbook coverage shipped |
| TASK-108-03 | QA, Docs, Changelog, and Closure | Medium | Small | Done: lint/types/Vitest validation plus docs, board, and changelog synchronization completed |
| TASK-108-02 | Anchored Conversation Window Replacing Right-Side Modal | High | Small | Done: conversation now opens as an anchored floating panel instead of a full right sheet |
| TASK-108-01 | Assistant Launcher Idle and Hover Visual Contract Polish | Medium | Small | Done: launcher idle/active affordance was corrected so the primary icon stays visible without hover |
| TASK-108 | Assistant Launcher Visual Polish and Anchored Conversation Window | High | Small | Done: launcher visual contract and anchored conversation behavior were finalized after the first floating rollout |
| TASK-107-04 | QA, Docs, Changelog, and Closure | Medium | Small | Done: lint/types/Vitest/Bun validation plus docs, board, and changelog synchronization completed |
| TASK-107-06 | Avatar-Backed Assistant Launcher Surface | Medium | Small | Done: floating launcher now switches from message bubble to avatar surface via global settings |
| TASK-107-05 | Floating Draggable Assistant Launcher | High | Medium | Done: shell-level floating launcher added with drag, viewport clamp, and persisted position |
| TASK-107-03 | Assistant Unavailable and Docs-Not-Ready Minimal State Handling | Medium | Small | Done: minimal runtime copy replaced settings-like status surfaces |
| TASK-107-02 | Minimal Conversation Drawer Contract and Rendering Cleanup | High | Medium | Done: conversation window reduced to prompts, transcript, composer, and minimal status states |
| TASK-107-01 | Assistant Topbar Removal and Global Visibility Gating | High | Medium | Done: topbar button removed and launcher visibility now follows global assistant settings |
| TASK-107 | Assistant Floating Launcher, Visibility Gating, and Minimal Conversation Window | High | Medium | Done: floating launcher, global gating, avatar-backed trigger, and minimal conversation window shipped |
| TASK-106-04 | QA, Docs, Changelog, and Closure | Medium | Small | Done: lint/types/targeted UI suites plus docs, board, and changelog synchronization completed |
| TASK-106-03 | Assistant Configuration Separation and Settings Entry Points | High | Medium | Done: preferences hidden behind explicit action and canonical settings entrypoint added |
| TASK-106-02 | Assistant Drawer Loading, Empty, Disabled, and Docs-Not-Ready Rendering | High | Medium | Done: prompt/composer gating fixed and docs-not-ready got its own runtime state |
| TASK-106-01 | Assistant Drawer UX Contract and Render-State Matrix | High | Small | Done: explicit runtime/render-state matrix frozen and reflected in docs/tests |
| TASK-106 | Assistant Drawer Runtime UX and Configuration Separation | High | Medium | Done: conversation-first drawer contract shipped without post-hydration config takeover |
| TASK-054-30-05 | QA, Docs, Changelog, and Closure | Medium | Medium | Done: Bun/Vitest validation, docs source-of-truth, board, and changelog synced |
| TASK-054-30-04 | Solution Kit Module Visibility UX | Medium | Medium | Done: kit details and AI wizard now explain module scope and selected-kit sidebar impact |
| TASK-054-30-03 | Solution Kit Module Audit and Catalog Corrections | High | Medium | Done: recommended module lists were audited and corrected against actual blueprint capabilities |
| TASK-054-30-02 | Coderso Sidebar Gating from Active Kit Modules | High | Medium | Done: active solution kit now narrows the Coderso sidebar through derived feature flags |
| TASK-054-30-01 | Active Solution Kit Preference and Selection Persistence | High | Medium | Done: selected solution kit is now persisted in admin UI and shared across relevant surfaces |
| TASK-054-30 | Solution Kits Module Audit and Sidebar Gating | High | Medium | Done: active kit preference, nav gating, module audit, and visibility UX delivered |
| TASK-054-29 | Widget Template Builder Toolbar and Mobile Panel UX Fixes | Medium | Small | Done: toolbar consolidated to single full-width row, responsive on mobile, settings grid overflow fixed, Dialog replaced with Sheet for mobile panel |
| TASK-054-28 | Widget Template Builder Settings, Details, and Canvas Action Parity | Medium | Medium | Done: template metadata moved into right-side `Settings`, block options stayed in `Details`, and actions moved into sticky canvas area |
| TASK-054-27 | Custom Screen Builder Canvas Action Parity | Medium | Small | Done: primary screen-builder actions moved from shell header into the sticky canvas action bar |
| TASK-054-26 | Widget Library CTA Clarity and Template-Only Authoring | Medium | Small | Done: removed misleading `Create Widget` CTA and documented template-only authoring in admin UI |
| TASK-054-25 | Widget Library Default Tab and Count Alignment | Medium | Small | Done: `All widgets` is now default and category counts follow the same filter basis as the grid |
| TASK-054-24 | Widget Template Builder Page Builder Card Parity | Medium | Small | Done: template builder now reuses the same widget picker/card pattern as page builder |
| TASK-054-23-05 | QA, Docs, Changelog, and Closure | Medium | Medium | Done: lint, types, targeted Bun/Vitest suites, docs, changelog, and board sync |
| TASK-054-23-04 | Record Workflow Gating and Copy Clarification | High | Medium | Done: collection-only/dashboard/editor routing and workflow copy clarified |
| TASK-054-23-03 | Screen Preview and Builder Diagnostics | High | Medium | Done: builder preview now diagnoses missing content type, missing screen widgets, and collection-only setups |
| TASK-054-23-02 | Dedicated Screen Widget Pack and Surface Scoping | High | Large | Done: screen-only widgets and surface-scoped registry selectors delivered |
| TASK-054-23-01 | Screen Contract, Mode Model, and Gating | High | Medium | Done: derived custom screen capabilities now drive admin UI behavior |
| TASK-054-23 | Coderso Screens Admin UI Separation and Preview Recovery | High | Large | Done: dedicated screen widgets, preview recovery, and mode-based record workflow shipped |
| TASK-105-10 | Coverage Gap Rebaseline and Lane Backlog | High | Medium | Done: 2026-03-08 Vitest snapshot, lane split, and concrete remaining test backlog documented |
| TASK-105-11-04 | QA, Docs, Changelog, and Closure | Medium | Medium | Done: full Vitest lane green, Bun-owned smoke revalidated, and ownership docs/board/changelog synchronized |
| TASK-105-11 | Legacy Bun-Free Test Migration Cleanup | High | Large | Done: Bun-free legacy suites migrated or explicitly frozen by ownership, leaving only intentional Bun cases and deeper refactor candidates |
| TASK-105-11-03 | Refactor-First Cluster Ownership Audit | High | Medium | Done: split delivered for validation, assistant, pure posts, pure forms, pure server helpers, and pure search logic; only explicit Bun-owned or deeper mixed cases remain |
| TASK-105-11-03-05 | Server Cluster Bun Ownership Freeze | Medium | Medium | Done: explicit Bun ownership documented for the remaining server unit cluster |
| TASK-105-11-03-07 | Server Settings-Bound Helper Suites Move to Vitest | Medium | Medium | Done: moved `hostPolicy`, `publicBaseUrl`, and `previewUrls` to Vitest after lazy settings-import refactor |
| TASK-105-11-03-06 | Server Pure Helper Suites Move to Vitest | Medium | Medium | Done: moved pure server helper suites to Vitest and left boundary/server contract suites in Bun |
| TASK-105-11-03-04 | Forms Pure Contracts and Helper Suites Move to Vitest | High | Medium | Done: moved Bun-free forms contract/helper suites to Vitest and left DB/runtime-coupled cases in Bun |
| TASK-105-11-03-03 | Posts Pure Editor Model Suites Move to Vitest | High | Large | Done: moved pure posts editor/model suites to Vitest and left DB/runtime-coupled cases in Bun |
| TASK-105-11-03-02 | Assistant Pure Service Suites Move to Vitest | High | Medium | Done: moved Bun-free assistant metrics/quota/redaction/provider/planner suites into Vitest |
| TASK-105-11-03-01 | Validation and Search Pure Suites Move to Vitest | High | Medium | Done: moved validation and pure search logic suites to Vitest and left DB search history in Bun |
| TASK-105-11-02 | Custom Screens and Pure Domain Legacy Suites Move to Vitest | High | Medium | Done: moved `bindingResolver` to Vitest and removed legacy Bun `customScreens` duplicates |
| TASK-105-11-01 | UI, Admin, and SDK Duplicate Legacy Suites Move to Vitest | High | Medium | Done: removed Bun-free duplicate suites after confirming Vitest-owned replacements |
| TASK-105-12 | Mixed Module Product Refactors for Runner Eligibility | High | Large | Done: assistant/docs, forms runtime/nonce, forms automation runner, posts runtime-media seams, and guardrails are now shipped |
| TASK-105-12-05 | Guardrails, Docs, and Closure | Medium | Medium | Done: import-boundary rule added to AGENTS and testing docs |
| TASK-105-12-04 | Posts Runtime Renderer Media Lookup Seam | Medium | Medium | Done: runtime media lookup is lazy-loaded and runtime renderer test moved to Vitest |
| TASK-105-12-03 | Forms Automation Runner Dependency Split | High | Large | Done: `formAutomationRunnerCore` extracted, orchestration suite moved to Vitest, and runtime wrapper left lazy |
| TASK-105-12-02 | Forms Runtime Resolver and Nonce Boundary Seams | High | Medium | Done: runtime resolver lazy-loaded and nonce/runtime resolver tests moved to Vitest |
| TASK-105-12-01 | Assistant Provider and Docs Lazy Dependency Seams | High | Medium | Done: lazy deps added for provider/docs helpers and matching assistant docs suites moved to Vitest |
| TASK-105-07 | SDK Plugin Manifest and Custom Screens Service Wave | Medium | Medium | Done: plugin manifest, SDK client/server, and custom screen service gained direct Vitest coverage |
| TASK-105-03 | Small UI and Support Component Wave | Medium | Medium | Done: block library, redirects/page leafs, form canvas, media details panel, plugin filters, theme routes/tokens, and related page leafs covered |
| TASK-105-02 | Admin Services Zero Coverage Wave | High | Medium | Done: api keys, email, integrations, taxonomy, webhooks, and session cache now have direct Vitest tests |
| TASK-105-01 | Vitest Coverage Matrix and Invariants | High | Medium | Done: live snapshots re-baselined and used to drive zero-first execution order |
| TASK-104 | Bun Coverage Remediation and Runner Ownership Program | High | Large | Done: ownership matrix, large Vitest migration waves, curated Bun baseline, docs, and closure synced |
| TASK-104-08 | QA, Docs, Board, and Closure | Medium | Medium | Done: board, docs, runner ownership notes, and changelog closure synchronized |
| TASK-104-07 | Widget and Editor Coverage Waves | High | Large | Done: widget/editor suites migrated to Vitest ownership and verified there |
| TASK-104-06 | Bun Baseline Purity and Runtime Coverage Hardening | High | Large | Done: Bun baseline now uses curated self-filtering route/plugin/perf coverage command |
| TASK-104-05 | Refactor-First Domain and Posts Eligibility | Medium | Large | Done: refactor-first clusters marked and runtime-coupled suites returned to Bun |
| TASK-104-04 | SDK and Shared Contracts Move to Vitest | High | Medium | Done: Bun-free shared contract suites moved while plugin manifest stayed in Bun |
| TASK-104-03 | Admin UI SSR and DOM Move to Vitest | High | Large | Done: broad unit and integration UI suites moved into Vitest lanes including ui-dom |
| TASK-104-02 | Admin Clients and Utils Move to Vitest | High | Large | Done: large admin client/utils suite moved out of Bun into Vitest |
| TASK-104-01 | Coverage Audit and Runner Ownership Matrix | High | Medium | Done: hotspot and ownership matrix published from live Bun coverage data |
| TASK-102-06 | Custom Screens and Admin Nav Vitest Migration | Medium | Medium | Done: Bun-free custom screen and admin nav suites moved to tests/vitest while DB/route coverage stayed in Bun |
| TASK-054-22-07 | Custom Screens Admin Sidebar Shortcuts | High | Medium | Done: active screens can opt into left-menu shortcuts rendered after the Coderso group |
| TASK-102 | Hybrid Testing Strategy and Coverage Architecture | High | Large | Done: hybrid Bun/Vitest lanes, Bun baseline/full coverage commands, CI workflow, docs, and guardrails shipped |
| TASK-102-05 | Docs, CI Rollout, and Adoption Guardrails | Medium | Medium | Done: repo docs, tests README, CI workflow, task board, and changelog closure synchronized |
| TASK-102-04 | Test Utilities, Fixtures, and Migration Wave 1 | Medium | Large | Done: shared Vitest setup and additive Bun-free wave across admin, UI, DOM, and SDK |
| TASK-102-03 | Coverage Reports, Gates, and Command Surface | High | Medium | Done: lane-specific coverage commands, Bun baseline/full split, and testing-lanes workflow |
| TASK-102-02 | Vitest Workspace for Pure TS, Admin, and SDK | High | Large | Done: shipped Vitest config, aliasing, happy-dom support, and Bun-free suites under tests/vitest |
| TASK-102-01 | Runtime Kernel Test Boundaries and Bun Suite Ownership | High | Medium | Done: Bun ownership documented for runtime, perf, security, plugin lifecycle, and broader integration suites |
| TASK-053 | Page Editor Templates Mode | High | Large | Done: templates mode, settings usability, preview UX, retention policy, FOUC reduction, and settings autosave/history are fully closed |
| TASK-053-06 | Page Settings Autosave + History | Medium | Large | Done: autosave-on-close, history drawer, restore/discard flow, revision kind model, and page API/client wiring shipped |
| TASK-103 | Agent Guidelines Hardening and Contribution Guardrails | Medium | Small | Done: AGENTS rules hardened against repo contracts and delivered via dedicated worktree flow |
| TASK-054-22 | Coderso Custom Screens From Widgets | High | Large | Done: schema, admin routes, builder UI, field bindings, dedicated records workflow, and closure shipped |
| TASK-054-22-06 | QA, Docs, Changelog, and Closure | Medium | Medium | Done: lint, typecheck, full test suite, docs, changelog, and task board sync |
| TASK-054-22-05 | Data Entry Screens and Collection Workflow | High | Large | Done: dedicated records list/editor routes with bound field editing and classic Entries fallback |
| TASK-054-22-04 | Field Binding Engine and Preview | High | Large | Done: binding resolver, selected-widget binding UI, and bound preview canvas delivered |
| TASK-054-22-03 | Screen Builder UI and Widget Composition | High | Large | Done: custom screens list/editor UI + widget canvas + tests |
| TASK-054-22-03-02 | Custom Screens List and Editor UI | High | Large | Done: list/editor screens, builder canvas, and UI tests |
| TASK-054-22-03-01 | Custom Screens Admin UI Plumbing | High | Medium | Done: client/cache/nav/routes/prefetch wiring |
| TASK-054-22-01 | Screen Definition Contract and Schema | High | Medium | Done: custom screens schema/service foundation + docs/tests |
| TASK-054-22-02 | Admin Routes and RBAC | High | Medium | Done: custom screens admin API routes, validation, and docs |
| TASK-061-08 | QA, Docs, Changelog, and Closure | Medium | Medium | Done: full regression, docs sync, changelog, kanban closure |
| TASK-061 | Post Editor Writing Canvas and Smart Paste | High | Large | Done: writing-canvas rollout fully closed (061-01..09) |
| TASK-054-19 | Coderso QA, Performance, and Security Gates | High | Medium | Done: release gates + security gate closure |
| TASK-054-199 | Security Gate (SAST, SCA, Secrets, CVE) | High | Medium | Done: CI security gate wired with SARIF reporting |
| TASK-063 | Gutenberg Parity Post Editor Rearchitecture | High | Large | Done: details, shortcuts, focus, QA, docs, and final closure complete |
| TASK-063-09-02 | Docs Changelog and Kanban Closure | High | Medium | Done: docs/changelog/board synchronized after final regression |
| TASK-063-09-01 | Regression Test Execution Plan | High | Medium | Done: lint/types/tests executed with QA rollout report |
| TASK-063-09 | QA, Docs, Changelog, and Closure | Medium | Medium | Done: quality gates + docs/changelog closure |
| TASK-063-08-03 | ARIA Landmarks and Accessibility Labels | High | Small | Done: editor landmarks and aria labels standardized |
| TASK-063-08-02 | Focus Return and Escape Contracts | High | Small | Done: focus return on close and Escape panel close |
| TASK-063-08-01 | Shortcut Registry and Keymaps | High | Small | Done: centralized post editor shortcut registry |
| TASK-063-08 | Keyboard, A11y, and Focus Management | High | Medium | Done: keyboard shortcuts + focus + aria coverage |
| TASK-063-07-03 | Details Preferences Persistence | High | Medium | Done: preferences hook + user settings sync |
| TASK-063-07-02 | Inspector Refactor Document vs Block | High | Medium | Done: shared inspector sections + validated inputs |
| TASK-063-07-01 | Tabbed Details Sidebar Shell | High | Small | Done: details sidebar isolated in PostDetailsSidebar |
| TASK-063-07 | Details Inspector Tabs and Preferences | High | Medium | Done: Post/Block tabs + persistence contracts |
| TASK-063-16-23 | Section Formatting Regression Fixes | Medium | Small | Done: preview formatting parity, inline code caret fixes, clear formatting cleanup |
| TASK-063-16-22 | Section Empty Placeholder Preview | Medium | Small | Done: empty section previews show the writing-canvas placeholder |
| TASK-063-16-21 | Post Editor Settings Dialog Scroll | Medium | Small | Done: editor settings dialog height clamped with scrollable content |
| TASK-063-16-20 | Section Toolbar Type Heading Icon | Medium | Small | Done: generic Heading icon used in Type dropdown |
| TASK-063-16-19 | Section Toolbar Type Profiles | High | Medium | Done: Type converts section blocks and paragraph/heading toolbars are narrowed with inline align/clear |
| TASK-063-16-18 | Section Toolbar Type Control | High | Medium | Done: type dropdown added, block-type transforms wired for text blocks, list controls kept as separate group |
| TASK-063-16-17 | Section Toolbar Typography Row | High | Small | Done: typography controls moved to secondary row with info + right-aligned formatting toggle |
| TASK-063-16-16 | Section Inline Typography List Selection | High | Small | Done: list markers follow inline typography selection |
| TASK-063-16-15 | Section Inline Typography Preview Persistence | High | Small | Done: inline typography spans persist in writing-canvas preview/front |
| TASK-063-16-14 | Section Inline Typography Selection | High | Small | Done: font family/size apply to selection when highlighted |
| TASK-063-16-13 | Section Alignment Visual Styles | High | Small | Done: align left/center/right visuals for section richtext |
| TASK-063-16-12 | Section Inline Code Visual Styles | High | Small | Done: inline code visuals for admin canvas + runtime preview/front |
| TASK-063-16-11 | Section Inline Code Caret Wrap | High | Small | Done: inline code/highlight wrap word at caret when selection is collapsed |
| TASK-063-16-10 | Section List Strike Code and Clear Formatting | High | Small | Done: list/strike/code-block visuals + clear formatting reset |
| TASK-063-16-09 | Section Heading Icons and H6 Style | Medium | Small | Done: H5/H6 heading badges aligned with icon style + no H6 uppercase |
| TASK-063-16-08 | Runtime Heading and Quote Styles | High | Small | Done: runtime H1-H6 + blockquote styling for preview/public |
| TASK-063-16-07 | Section Heading Visual Styles | High | Small | Done: explicit H1-H6 styling for section canvas and preview |
| TASK-063-16-06 | Section Paragraph Quote Visual Styles | High | Small | Done: blockquote styling added for section canvas + preview surface |
| TASK-063-16-05 | Section Paragraph Quote Div Alias Normalization | High | Small | Done: div block aliases normalized to paragraph semantics for section commands |
| TASK-063-16 | Post Editor Section Paragraph Quote Node Boundary Commands | High | Large | Done: deterministic `paragraph/quote` node-boundary behavior in section with stable roundtrip persistence and QA/docs/changelog closure |
| TASK-063-16-04 | QA Docs Changelog and Closure | Medium | Medium | Done: lint/types/full regression green; board/docs/parity/changelog synchronized |
| TASK-063-16-03 | Section Paragraph Quote Roundtrip Normalizer and Runtime Parity | High | Medium | Done: section `paragraph/quote` node type preserved through html-nodes-html roundtrip contract |
| TASK-063-16-02 | Section Paragraph Quote Command Engine and Adapter Wiring | High | Large | Done: engine/adapter fallback path stabilizes paragraph/quote commands when section root has no block wrappers |
| TASK-063-16-01 | Section Paragraph Quote Node Command Contract and Target Behavior | High | Medium | Done: collapsed/range/multiline paragraph-quote behavior contract finalized |
| TASK-063-15 | Post Editor Section Writing Canvas Caret Command Parity and Grouped Toolbar | High | Large | Done: writing-canvas caret/Enter stability, command persistence parity, grouped toolbar controls, and full QA/docs/changelog closure |
| TASK-063-15-05 | QA Docs Changelog and Closure | Medium | Medium | Done: lint/types/full regression green; board/docs/parity/changelog synchronized |
| TASK-063-15-04 | Section Toolbar Grouping Heading List Code and A11y | High | Medium | Done: grouped `Headings`, `List`, `Code` controls with profile-aware rendering and integration coverage |
| TASK-063-15-03 | Section Command Persistence Paragraph Headings List Align Clear Code | High | Large | Done: persistence for heading/list/align/clear/code semantics across writing-canvas roundtrip/runtime |
| TASK-063-15-02 | Section Enter Semantics and Empty Paragraph Preservation | High | Medium | Done: intentional empty paragraph preservation for stable `Enter`/`Enter+Enter` behavior |
| TASK-063-15-01 | Section Input Pipeline and Caret Stability | High | Medium | Done: draft HTML input pipeline removed per-keystroke lossy rewrite and stabilized caret |
| TASK-063-14 | Post Editor RichText Command Reliability and Contextual Formatting Model | High | Large | Done: deterministic command engine, contextual toolbar profiles, deduplicated inspector ownership, and full QA/docs/changelog closure |
| TASK-063-14-06 | QA Docs Changelog and Closure | Medium | Medium | Done: lint/types/full regression green; board/docs/changelog synchronized |
| TASK-063-14-05 | Contextual Toolbar Profiles and Block Inspector Dedup | High | Medium | Done: profile routing + toolbar/inspector ownership split finalized and tested |
| TASK-063-14-04 | Text Alignment and List Command Engine Stabilization | High | Medium | Done: alignment/list semantics stabilized with deterministic multi-block behavior |
| TASK-063-14-03 | Inline Formatting and Multiline Highlight Stability | High | Medium | Done: multiline selection behavior stabilized without block structure regressions |
| TASK-063-14-02 | Block Level Formatting Commands H1 H6 Paragraph Quote List | High | Large | Done: block-level command contract (`H1..H6`, `paragraph`, `quote`, `list`) implemented and covered by tests |
| TASK-063-14-01 | Command Capability Matrix and Expected Behavior Contract | High | Medium | Done: command profile matrix and expected behavior contract captured for implementation/testing |
| TASK-063-13 | Post Editor Block Authoring Stability and Parity Hardening | High | Large | Done: authoring UX parity hardening delivered (caret/newline/list/image picker/toolbar inheritance/interactive preview/link output) with docs and QA |
| TASK-063-13-08 | RichText Command Output Link Rendering Fixes QA Docs Closure | High | Medium | Done: browser alias tags (`b/i/div`) normalized, link command output stabilized, targeted QA/tests/docs/changelog completed |
| TASK-063-13-07 | Canvas Preview Parity for Button Embed and Image | High | Medium | Done: runtime-like canvas previews for button/embed/image with provider/aspect handling and media resolution |
| TASK-063-13-06 | NonText Block Quick Toolbars and Block Inspector DeMock | High | Large | Done: selected-block quick toolbars wired to real attrs and normalized inspector/runtime parity attrs |
| TASK-063-13-05 | Text Toolbar Font Controls and Global Typography Inheritance | High | Large | Done: typography controls (font/scale) added to toolbar and inherited across text-capable blocks via document meta |
| TASK-063-13-04 | Image Block Click to Select Media Flow | High | Medium | Done: image placeholder now opens media picker dialog and writes mediaId/alt/caption back to block attrs |
| TASK-063-13-03 | List Block Multiline Editing and State Model | High | Medium | Done: multiline list editing moved to draft-on-focus commit-on-blur flow without line-loss on typing |
| TASK-063-13-02 | RichText Input Caret Stability and Enter Semantics | High | Large | Done: typing pipeline split from paste, focused value sync guard, and deterministic Enter paragraph semantics |
| TASK-063-13-01 | Block by Block Defect Analysis and Fix Contract | High | Medium | Done: block-by-block defect matrix translated into implemented fixes and test contracts |
| TASK-063-12 | Post Editor Reference Parity with 46 Template | High | Large | Done: final parity pass completed for `_docs/UI/admin_panel/46-post-editor/code.html`, including inspector/settings/responsive contracts and closure gates |
| TASK-063-12-08 | QA, Docs, Changelog, and Closure | Medium | Medium | Done: lint + lint:types + full unit/integration/perf/security suites green, docs/changelog/task board synchronized |
| TASK-063-12-07 | Responsive Parity, Focus Mode, and Sheets | High | Medium | Done: focus mode snapshot restore, stable desktop/mobile panel behavior, and responsive regression coverage |
| TASK-063-12-06 | Gear Settings Modal Upgrade and Preferences Contract | High | Medium | Done: upgraded settings modal, preferences `v2` migration, and dual persistence (localStorage + `posts.editor.preferences` user setting) |
| TASK-063-12-05 | Right Inspector Parity Post/Block with Progressive Disclosure | High | Medium | Done: post inspector flow parity (`Publishing -> Categories/Tags -> Featured image -> Danger zone -> Advanced`) + collapsed block advanced controls |
| TASK-063-12-04 | Canvas Geometry, Typography, and Block Surface Parity | High | Medium | Done: center canvas width/rhythm/title/placeholder parity aligned to template contract |
| TASK-063-12-03 | Left Outline Parity with Optional List Tab | High | Medium | Done: outline-first left rail parity with optional list-view deviation retained |
| TASK-063-12-02 | Header Parity and Action Hierarchy | High | Medium | Done: header composition and primary action hierarchy aligned with reference |
| TASK-063-12-01 | Reference Contract Freeze and Delta Matrix | High | Small | Done: parity matrix locked with must-match vs allowed deviations |
| TASK-063-11 | Post Editor Strict HTML Parity and Unified Article Canvas | High | Large | Done: strict shell parity, outline `+` insert, unified canvas flow, Post/Block tabs, header gear settings |
| TASK-063-11-06 | QA, Docs, Changelog, and Closure | Medium | Medium | Done: lint/types/full-suite tests + docs/changelog/kanban sync |
| TASK-063-11-05 | Header Preview Publish Gear and Editor Settings Dialog | High | Medium | Done: right-side preview/publish/gear actions + persisted editor settings modal |
| TASK-063-11-04 | Right Sidebar Post/Block Tabs and Context | High | Medium | Done: tabs renamed to Post/Block with selection-driven context switching |
| TASK-063-11-03 | Unified Borderless Canvas and Media Placeholders | High | Large | Done: single article-flow canvas without per-block cards + clickable media placeholders |
| TASK-063-11-02 | Left Outline Primary Insert Flow | High | Medium | Done: Document Outline `+` insert entrypoint wired to shared insert resolver (`outline-plus`) |
| TASK-063-11-01 | Visual Parity Shell and Tokens | High | Medium | Done: shell/header/rails parity cleanup aligned with reference template |
| TASK-063-06 | Writing Canvas Appender and Smart Paste Parity | High | Large | Done: inline canvas appender points + shared insert orchestration + Word paste hardening |
| TASK-063-06-03 | Smart Paste Hardening and TOC Directives | High | Large | Done: heading fidelity hardening + TOC link cleanup + dynamic TOC directive parity |
| TASK-063-06-02 | Unified Inserter Slash Appender Flow | High | Medium | Done: `resolvePostInsertMutation` shared across sidebar/slash/appender insert sources |
| TASK-063-06-01 | Inline Appender Insert Points | High | Medium | Done: in-canvas appender between blocks/end + inserted block focus contract |
| TASK-063-10 | Post Editor Stitch Template Migration and Focus Mode | High | Large | Done: stitch-inspired shell, floating appender plus, and persisted focus mode |
| TASK-063-10-05 | QA, Docs, Changelog, and Closure | Medium | Medium | Done: lint/types/full-suite tests + docs/changelog/kanban sync |
| TASK-063-10-04 | Focus Mode Full Width Toggle and Persistence | High | Medium | Done: header focus toggle, full-width canvas mode, and local preference restore |
| TASK-063-10-03 | Floating Appender Plus and Insert Flow | High | Medium | Done: floating `+` appender style wired to shared insert resolver |
| TASK-063-10-02 | Shell Layout Migration to Stitch Reference | High | Large | Done: three-region stitch-like shell composition (left outline, canvas, right details) |
| TASK-063-10-01 | Template Contract Mapping and Component Inventory | High | Medium | Done: reference template mapped to existing React regions/components |
| TASK-063-05 | List View, Outline, and Document Stats | High | Large | Done: document overview sidebar with tabs, outline warnings, and live stats selectors |
| TASK-063-05-03 | ListView and Outline Sidebar UI | High | Medium | Done: `PostListViewSidebar` with List/Outline tabs and block/heading navigation |
| TASK-063-05-02 | Outline Builder and Validation Rules | High | Medium | Done: heading outline model with empty/skipped/multiple-H1 validation and stable anchors |
| TASK-063-05-01 | Document Stats Selectors | High | Small | Done: deterministic words/chars/read-time/headings/paragraphs/blocks selectors |
| TASK-063-04 | Inserter Sidebar and Block Library Parity | High | Medium | Done: dedicated inserter sidebar shell, searchable/category block library, and focus-return/a11y contracts |
| TASK-063-04-03 | Inserter Focus and A11y Contracts | High | Small | Done: escape-close contract, focus return hook, and sidebar ARIA dialog semantics |
| TASK-063-04-02 | Block Library Search and Categories | High | Medium | Done: catalog search helpers, category filtering, and optional most-used section |
| TASK-063-04-01 | Inserter Sidebar Shell | High | Small | Done: `PostInserterSidebar` with close controls and layout integration |
| TASK-063-03 | Header, DocumentTools, and Save/Publish Parity | High | Large | Done: modular post editor header with document tools, revisions/details controls, and save-preview-publish cluster |
| TASK-063-03-03 | Header Integration and Regression Guards | High | Small | Done: composed `PostEditorHeader` integrated into shell with regression coverage |
| TASK-063-03-02 | Save Preview Publish Cluster | High | Medium | Done: dedicated action cluster with status/sync badges and save/preview/publish parity |
| TASK-063-03-01 | Document Tools Cluster | High | Medium | Done: Add/Undo/Redo/Document overview controls with a11y labels and shortcut hints |
| TASK-063-02 | Editor Shell Composition and Regions | High | Large | Done: centralized layout state, region components, responsive desktop/mobile sidebar behavior |
| TASK-063-02-03 | Responsive Region Behavior | High | Medium | Done: desktop sidebars + mobile sheet fallback with shared region state |
| TASK-063-02-02 | Region Components and Composition | High | Medium | Done: `PostEditorLayout` + region wrappers (`header/content/secondary/sidebar/footer`) |
| TASK-063-02-01 | Layout State Model and Hooks | High | Medium | Done: dedicated `usePostEditorLayout` reducer and panel actions for list/inserter/details |
| TASK-062 | Posts Dynamic Table of Contents (TOC) | High | Large | Done: dynamic TOC block contract + runtime heading index + Word TOC replacement + closure/docs |
| TASK-062-04 | TOC QA, Docs, Changelog, and Closure | Medium | Medium | Done: lint/types/tests + architecture/API/changelog/task board sync |
| TASK-062-03 | Replace Pasted Word TOC with Dynamic TOC | High | Large | Done: smart paste detects `#_Toc...`, strips static TOC, emits dynamic TOC directive and idempotent insertion |
| TASK-062-02 | Stable Heading Anchor IDs and Linking | High | Medium | Done: stable anchor generation/dedupe + custom anchors for heading block and writing-canvas heading nodes |
| TASK-062-01 | Dynamic TOC Generation from Post Headings | High | Medium | Done: `toc` block available in editor and mapped in runtime from live heading index |
| TASK-063-01 | Gutenberg Reference Audit and Gap Matrix | High | Medium | Done: reference audit, current-state inventory, and migration gap matrix published |
| TASK-063-01-03 | Gap Prioritization and Migration Plan | High | Medium | Done: Must/Should/Out matrix with owner subtasks and execution slices |
| TASK-063-01-02 | Nextless Current-State Inventory | High | Small | Done: posts editor component/state/data-flow baseline documented |
| TASK-063-01-01 | Gutenberg Component Inventory | High | Small | Done: core Gutenberg editor component responsibilities and UX contracts mapped |
| TASK-061-09 | Post Editor Silent Save and Preview Without Hydrate Reload | High | Medium | Done: autosave i save-before-preview korzystaja z silent sync bez hydrate resetu canvasu |
| TASK-061-07 | Runtime Renderer Parity and Backward Compatibility | High | Medium | Done: writing-canvas runtime mapper/renderer parity, legacy read-path adapter (non-destructive), and runtime warning diagnostics |
| TASK-061-06 | Editor UI Integration (Ribbon + Canvas + List View) | High | Large | Done: writing-first editor integration (default writing-canvas, ribbon quick actions, logical outline labels, and inline canvas/details context) |
| TASK-061-05 | Image Wrap Controls and Layout Semantics | High | Medium | Done: shared image wrap layout contract, inspector/rich-text controls, runtime+canvas CSS parity, and mobile fallback |
| TASK-061-04 | Clipboard Image Upload and Inline Media Insertion | High | Medium | Done: clipboard image detection, internal media upload, inline image insertion, and sanitizer/schema updates |
| TASK-061-03 | Smart Paste (Word/Docs/HTML) Parsing and Sanitization | High | Large | Done: deterministic paste normalizer, Office artifact stripping, adapter paste integration, and tests |
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
| TASK-020-11 | Security Hardening + Settings UX | High | Large | Done: auth/public/admin hardening aligned with user-friendly security settings presets |
| TASK-020-11-01 | Rate Limit Buckets + Keying | High | Medium | Done: explicit buckets and shared-IP-aware keying strategy added |
| TASK-020-11-02 | Auth Hardening + Bot Protection | High | Medium | Done: login/reset throttling and reCAPTCHA v3 protection added |
| TASK-020-11-03 | Public Endpoint Protection | High | Medium | Done: public endpoint policy, preview token protection, and abuse guardrails aligned |
| TASK-020-11-04 | Security Settings Model + API | High | Medium | Done: per-bucket security settings model, validation, and API expansion shipped |
| TASK-020-11-05 | Security Settings UI + Presets | High | Large | Done: Security settings sections, presets, and explanatory tooltips delivered |
| TASK-020-11-06 | PII Email Encryption | Medium | Large | Done: email-at-rest protection implemented with hash plus encrypted storage |
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
