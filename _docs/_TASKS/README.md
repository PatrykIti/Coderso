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
- **To Do:** 7 tasks
- **In Progress:** 0
- **Done:** 88 tasks

---

## To Do

| ID | Title | Priority | Effort | Notes |
|----|-------|----------|--------|-------|
| TASK-008 | Themes and Theme Profiles | Medium | Large | Theme registry + profiles |
| TASK-009 | Widget Registry and Core Widgets | High | Large | Core widgets + schema |
| TASK-026 | Dashboard Data Wiring (Functional) | Medium | Medium | Dashboard metrics API + UI |
| TASK-020 | Security Middleware and Request Pipeline | High | Medium | CSRF + rate limit |
| TASK-021 | Store Backend Core | High | Large | Public API + signing |
| TASK-022 | Store Publish Pipeline and Security Scans | High | Large | Publish validation + scans |
| TASK-023 | Store Auth and Publisher Accounts | Medium | Medium | Authors + tokens |

---

## In Progress

| ID | Title | Priority | Effort | Notes |
|----|-------|----------|--------|-------|
| _empty_ | _n/a_ | _n/a_ | _n/a_ | _n/a_ |

---

## Done

| ID | Title | Priority | Effort | Notes |
|----|-------|----------|--------|-------|
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
| TASK-001 | ORM Foundation and Auth Tables | High | Medium | Drizzle + auth tables |
| TASK-004 | Auth, RBAC, and Admin API Base (Index) | High | Large | Index for TASK-004-01..07 |
| TASK-004-03 | Password Hashing and Sessions | High | Medium | argon2 + sessions |
| TASK-004-04 | Auth Middleware | High | Medium | attachUser + requireAuth |
| TASK-004-05 | RBAC Middleware | High | Medium | requirePermission |
| TASK-006 | Menus and Navigation | Medium | Medium | Menu CRUD + admin UI |
| TASK-007 | Settings and Design Tokens | Medium | Medium | Global settings + tokens |
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
