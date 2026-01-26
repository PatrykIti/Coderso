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
- **To Do:** 20 tasks
- **In Progress:** 0
- **Done:** 17 tasks

---

## To Do

| ID | Title | Priority | Effort | Notes |
|----|-------|----------|--------|-------|
| TASK-002 | Pages, Revisions, and Preview | High | Medium | Pages + revisions + preview |
| TASK-003 | Content Types Engine | High | Large | Dynamic content schemas |
| TASK-004 | Auth, RBAC, and Admin API Base | High | Large | Sessions + RBAC + REST base |
| TASK-005 | Media Storage and Uploads | Medium | Medium | Local + S3/Azure |
| TASK-008 | Themes and Theme Profiles | Medium | Large | Theme registry + profiles |
| TASK-009 | Widget Registry and Core Widgets | High | Large | Core widgets + schema |
| TASK-010 | Page Builder UI | High | Large | Wizard/Visual/Advanced |
| TASK-011 | Content Types Admin UI | High | Large | Schema builder + entries |
| TASK-012 | Media Library Admin UI | Medium | Medium | Uploads + metadata UI |
| TASK-013 | Search and Indexing | Medium | Medium | Admin search + DB indexes |
| TASK-014 | Audit Logs | Medium | Medium | Audit events + UI |
| TASK-015 | Plugin Runtime Loader and Registry | High | Large | Runtime load + safe mode |
| TASK-016 | SDK Package and Plugin API | High | Large | @core/sdk package |
| TASK-017 | Store Client and Update Policy | High | Large | Signatures + updates |
| TASK-018 | Plugin Store Admin UI | Medium | Medium | Store browse + install |
| TASK-019 | Users and Roles Admin UI | Medium | Medium | Users + roles UI |
| TASK-020 | Security Middleware and Request Pipeline | High | Medium | CSRF + rate limit |
| TASK-021 | Store Backend Core | High | Large | Public API + signing |
| TASK-022 | Store Publish Pipeline and Security Scans | High | Large | Publish validation + scans |
| TASK-023 | Store Auth and Publisher Accounts | Medium | Medium | Authors + tokens |

---

## In Progress

*No tasks currently in progress*

---

## Done

| ID | Title | Priority | Effort | Notes |
|----|-------|----------|--------|-------|
| TASK-001 | ORM Foundation and Auth Tables | High | Medium | Drizzle + auth tables |
| TASK-006 | Menus and Navigation | Medium | Medium | Menu CRUD + admin UI |
| TASK-007 | Settings and Design Tokens | Medium | Medium | Global settings + tokens |
| TASK-024 | Shadcn UI and Tailwind v4 Setup | High | Medium | Admin UI base |
| TASK-006-09 | Login UI | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-10 | Two Factor UI | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-11 | Reset Password UI | Medium | Small | HTML -> shadcn conversion |
| TASK-006-12 | Set Password UI | Medium | Small | HTML -> shadcn conversion |
| TASK-006-01 | Dashboard UI | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-02 | Menu Editor UI | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-03 | Media Library UI | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-04 | Schema Builder UI | High | Large | HTML -> shadcn conversion |
| TASK-006-05 | Plugin Store UI | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-06 | Page List UI | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-07 | Page Editor UI | High | Large | HTML -> shadcn conversion |
| TASK-006-08 | Design Tokens UI | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-13 | Users and Roles UI | Medium | Medium | HTML -> shadcn conversion |
