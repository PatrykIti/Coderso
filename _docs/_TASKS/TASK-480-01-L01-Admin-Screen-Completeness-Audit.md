# TASK-480-01-L01: Admin Screen Completeness Audit (read-only)
# FileName: TASK-480-01-L01-Admin-Screen-Completeness-Audit.md

**Priority:** High
**Category:** Admin UI / Discovery / Read-only audit
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do
**Parent Subtask:** TASK-480-01

---

## Overview

Produce a single **completeness audit table** covering every admin screen. For
each screen, classify it **Complete | Partial | Stub** and, for anything not
Complete, name **what is missing**. The purpose is to let the team decide, per
TASK-479 per-screen subtask, whether that subtask is a **pure visual re-skin**
(screen is feature-complete, just restyle) or needs a **sibling feature task**
(like TASK-480 is the sibling of TASK-479-07 for the Dashboard).

This is a **read-only** investigation: read code, write findings. No source file
under `core/` is modified.

- **Goal:** A trustworthy, evidence-backed Complete/Partial/Stub matrix of admin
  screens, with "what's missing" for Partial/Stub, usable as a triage input for
  the whole TASK-479 program.
- **Owning module/service:** Documentation only — output lands in this leaf's
  closeout and (linked) under `_docs/_TASKS/`. No production code.
- **Source-of-truth docs:** `core/admin/ui/*` (screen components),
  `core/admin/services/*` (data clients), `core/server/routes/*` (backing
  routes), `core/services/*` (domain services), `_docs/CMS_API.md`,
  `_docs/RBAC_SPEC.md`, the TASK-479 screen subtasks (`TASK-479-07..29`).
- **Out of scope:** No code changes, no new routes, no fixing of the gaps found
  (each gap becomes a follow-up/sibling task, not work in this leaf). Plugin
  store catalog content and third-party plugin screens are noted but not deeply
  audited.

---

## Security Contract

No endpoint or permission model changes. Read-only audit. **Do not** paste
secrets, tokens, encrypted values, or PII into the audit output; reference files
by path only.

---

## Implementation Pseudocode

This leaf's "implementation" is the **audit METHOD** plus the **output TABLE
shape**. The method must be reproducible (another agent re-running it gets the
same verdicts).

### Method (per screen)

```text
For each admin screen S in the screen list below:
  1. Locate the UI:        ls core/admin/ui/<area>/        (screen + child components)
  2. Locate the data:      grep the screen for `*Client` imports from
                           core/admin/services/<area>Client.ts  (read + write fns)
  3. Locate the route(s):  grep core/server/routes/<area>Routes.ts for the paths
                           the client calls; confirm registration in
                           core/server/routes/index.ts
  4. Locate the domain:    core/services/<area>/* (schemas, normalize*, service fns)
  5. Classify:
       Complete = full CRUD (or full read surface for read-only screens) wired
                  end-to-end: UI <-> client <-> route <-> service <-> DB, with
                  schema validation + cache + tests present.
       Partial  = screen renders real data but a material capability is missing
                  (e.g. read-only with no edit, no create, no delete, hard-coded
                  config, missing filters, no cache, stubbed sub-tab).
       Stub     = placeholder/scaffold: mock/hard-coded data, "coming soon",
                  no backing route/service, or route returns static payload.
  6. Evidence: record the exact file path(s) that justify the verdict.
  7. Missing:  for Partial/Stub, one concrete sentence: what capability is absent
               and where it would live.
  8. Re-skin vs feature: derive the triage flag —
       "re-skin only"  if Complete (TASK-479 subtask is pure restyle), or
       "needs feature task" if Partial/Stub (restyle + a sibling feature task).
```

Helper greps (illustrative — adapt per area; note `core/admin/ui/dashboard/`
reads fine, but some large editor files such as `PageEditor.tsx` read as binary
to `rg`/`grep` and need `grep -an` or `Read`):

```bash
# screens present
ls -1 core/admin/ui/
# data clients present
ls -1 core/admin/services/ | grep -i Client
# routes present + their mount
ls -1 core/server/routes/
grep -n "register.*Routes" core/server/routes/index.ts
# detect stubs / mock data / TODO surfaces
grep -rinE "coming soon|placeholder|mock|TODO|FIXME|not implemented" core/admin/ui/<area>/
```

### Output table shape

```md
| Screen | Area (ui / service / route) | Verdict | What's missing (Partial/Stub) | Evidence (paths) | TASK-479 subtask | Triage |
|--------|-----------------------------|---------|-------------------------------|------------------|------------------|--------|
| Dashboard | dashboard / dashboard / dashboardRoutes | Partial | Fixed payload; no configurable widgets/panels, no per-user layout, no add/remove/resize | core/services/dashboard/dashboardService.ts; core/admin/ui/dashboard/DashboardPage.tsx | TASK-479-07 | needs feature task (= TASK-480) |
| Pages | pages / pagesClient / pageRoutes | … | … | … | TASK-479-08 | … |
```

### Screens to audit (do not skip any)

Dashboard, Pages, Posts, Menus, Media, Engine (Content Types), Entries, Custom
Screens, Forms, Listings/Filters/Search, Booking, Reviews, Commerce, Popups,
Solution Kits, Widgets (admin widget library), Page Templates, Store (plugins),
Themes (admin UI theme), Tools (Search/SEO/Analytics/Backups/Import-Export/
Redirects), Admin (Users/Roles/Audit/Access logs), Settings (General/Site/
Assistant/Security/API keys/Webhooks/Email/Storage/Integrations), Auth
(Login/2FA/Reset/Set password).

Map each row's "Area" using the directory listing under `core/admin/ui/`
(analytics, assistant, audit, auth, authoring, backups, booking, commerce,
content-types, custom-screens, dashboard, entries, forms, import-export, kits,
listings, media, menus, navigation, pages, plugins, popups, posts, redirects,
reviews, roles, search, security, seo, settings, setup, site, store, theme,
themes, tools, users, widgets) and the matching `*Client.ts` in
`core/admin/services/` + `*Routes.ts` in `core/server/routes/`.

**Data flow:** read UI → trace client → trace route → trace service → classify →
record evidence + missing + triage. No mutation anywhere.

**Error handling:** if a screen cannot be located, mark it `Stub (not found)`
and record the search performed — never guess a verdict.

**Regression-test shape:** n/a (read-only). Self-check: the table has one row per
screen in the list, every row has a verdict + evidence, and every Partial/Stub
row has a "what's missing" + triage flag.

---

## Testing Requirements

No automated lane (read-only audit). Validation checklist:

- `git status` shows only `_docs/` changes (no `core/` edits).
- Every screen in the list above appears exactly once in the table.
- Each verdict cites at least one real path that exists (`ls`/`Read` confirms).
- Each Partial/Stub row has a concrete "what's missing" + a Triage flag
  (`re-skin only` | `needs feature task`).
- The Dashboard row is `Partial` and triaged `needs feature task (= TASK-480)`,
  consistent with the umbrella.

---

## Documentation Updates Required

- Deliver the audit table in this leaf's closeout (and optionally a linked
  `_docs/_TASKS/` reference doc).
- `_docs/_TASKS/README.md` — status/statistics on completion.
- Cross-link the table from the TASK-479 umbrella so each per-screen subtask can
  cite its Complete/Partial/Stub verdict and re-skin-vs-feature triage.

---

## Closure Checklist

- [ ] Status `✅ Done`.
- [ ] Table complete (one row per listed screen) with evidence + missing + triage.
- [ ] No `core/` files modified.
- [ ] Linked/handed to TASK-479 triage + TASK-480-01-L02.
