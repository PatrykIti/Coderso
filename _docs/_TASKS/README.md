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
- Optional sections: Architecture, Implementation Order, New Files to Create.
- Detail level: match `EXAMPLE_TASK.md` (explicit files/paths, example code or payloads, testing checklist with unit tests, and planned docs/changelog).

## Status rules
- Use: To Do, In Progress, Done.
- Include dates for In Progress/Done in the task file.
- Update **Statistics** and the appropriate table on every status change.

## Changelog link
- Every completed task must have a matching entry in `_docs/_CHANGELOG/` and list the task ID there.

## Statistics
- **To Do:** 32 tasks
- **In Progress:** 1 task
- **Done:** 241 tasks

---

## To Do

| ID | Title | Priority | Effort | Notes |
|----|-------|----------|--------|-------|
| TASK-021 | Store Backend Core | High | Large | Public API + signing |
| TASK-022 | Store Publish Pipeline and Security Scans | High | Large | Publish validation + scans |
| TASK-023 | Store Auth and Publisher Accounts | Medium | Medium | Authors + tokens |
| TASK-048 | Content Types & Content UX Expansion | Medium | Large | Index for TASK-048-01..09 |
| TASK-048-01 | Field Types & Schema Meta | Medium | Medium | Preserve field types |
| TASK-048-02 | Relation Field UX & Data Model | Medium | Medium | Relation dropdown + picker |
| TASK-048-03 | Media Field UX & Storage Integration | Medium | Medium | Media picker |
| TASK-048-04 | Taxonomy System & Terms | Medium | Large | Categories + tags |
| TASK-049 | Widget Library — Core + Templates + Favorites | High | Large | Index for TASK-049-01..06 |
| TASK-049-01 | Widget Templates DB Schema | High | Medium | widget_templates table |
| TASK-049-02 | Widget Templates Service | High | Medium | CRUD + validation |
| TASK-049-03 | Widget Catalog + API Routes | High | Medium | /widgets + templates CRUD |
| TASK-049-04 | Widget Favorites (User Settings) | Medium | Small | widgets.favorites key |
| TASK-049-05 | Widget Library UI Wiring | High | Large | API wiring + insert |
| TASK-049-06 | Widget Template Editor UI | Medium | Medium | builder reuse |
| TASK-050 | Widget Templates Preview + Revisions | Medium | Medium | Index for TASK-050-01..14 |
| TASK-050-04 | Widget Slot System (Core) | High | Large | Slot model + insert UI |
| TASK-050-05 | Hero Widget Expansion + Slots | High | Medium | Wizard/visual/advanced |
| TASK-050-12-03 | Pricing Plans Widget | High | Large | Plan cards + features + highlight |
| TASK-050-12-04 | FAQ Accordion Widget | Medium | Medium | Q/A accordion + layout variants |
| TASK-050-12-05 | CTA Banner Widget | Medium | Medium | Conversion strip with CTA actions |
| TASK-050-13 | Trust and Content Widgets Pack | Medium | Large | Index for TASK-050-13-01..05 |
| TASK-050-13-01 | Logo Cloud Widget | Medium | Medium | Partner/client logos with links |
| TASK-050-13-02 | Gallery Mosaic Widget | Medium | Large | Image/video mosaic layouts |
| TASK-050-13-03 | Stats KPI Widget | Medium | Medium | KPI values + labels |
| TASK-050-13-04 | Team Widget | Medium | Medium | Team members + social links |
| TASK-050-13-05 | Rich Text Section Widget | Medium | Medium | Long-form rich text block |
| TASK-050-14 | Dynamic Content Widgets Pack | High | Large | Index for TASK-050-14-01..02 |
| TASK-050-14-01 | Content List Widget | High | Large | Content-type sourced listing widget |
| TASK-050-14-02 | Entry Teaser Widget | High | Medium | Featured/latest/manual entry teaser |
| TASK-099 | Dashboard Data Wiring (Functional) | Medium | Medium | Dashboard metrics API + UI |
| TASK-099-01 | Dashboard Service | Medium | Medium | Aggregate metrics |
| TASK-099-02 | Dashboard API | Medium | Medium | GET /dashboard |
| TASK-099-03 | Dashboard UI Wiring | Medium | Medium | Wire UI to API |
| TASK-100 | Runtime Base URL + Auth TTL + Setup Wizard | Medium | Medium | LAST: first-run wizard + baseUrl |
| TASK-101 | Doc Navigator Assistant + Optional LLM Connector | High | Large | Index for TASK-101-01..07 |
| TASK-101-01 | Assistant Settings and Data Model | High | Medium | Global/user settings + validation |
| TASK-101-02 | Documentation Index and Retrieval Engine | High | Large | Parser + chunking + BM25/FTS |
| TASK-101-03 | Assistant API (Doc Navigator Runtime) | High | Medium | status/reindex/chat docs-only |
| TASK-101-04 | LLM Provider Abstraction and OpenRouter Adapter | Medium | Medium | llm-rag provider layer + fallback |
| TASK-101-05 | Admin UI Assistant Chat and Modes | High | Large | Chat panel + mode switch + sources |
| TASK-101-06 | Assistant Avatar Rendering and Preferences | Medium | Medium | Optional GLB avatar + fallback |
| TASK-101-07 | Assistant Security, Quotas, Observability and Hardening | High | Medium | Rate limits, audit, redaction |

---

## In Progress

| ID | Title | Priority | Effort | Notes |
|----|-------|----------|--------|-------|
| TASK-050-12 | Conversion Widgets Pack | High | Large | 050-12-01 complete; next: 050-12-02 |

---

## Done

| ID | Title | Priority | Effort | Notes |
|----|-------|----------|--------|-------|
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
