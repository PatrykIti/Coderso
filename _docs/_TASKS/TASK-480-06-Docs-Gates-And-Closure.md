# TASK-480-06: Docs, Gates & Closure
# FileName: TASK-480-06-Docs-Gates-And-Closure.md

**Parent Task:** TASK-480
**Priority:** Medium
**Category:** Admin UI / Dashboard Widgets / Docs / Release Gates
**Estimated Effort:** Medium
**Dependencies:** TASK-480-01 (feature audit + widget product spec), TASK-480-02 (domain/schema + data-source service contract), TASK-480-03 (layout persistence + internal admin API routes + cached client), TASK-480-04 (widget renderer components), TASK-480-05 (admin UI widget grid + edit-mode builder)
**Status:** ⏳ To Do

---

## Overview

Close out the Dashboard Widgets feature (TASK-480) by writing its source-of-truth
documentation, synchronizing every contract doc the feature touched, running and
(where needed) extending the release gates, and walking the closure checklist for
the umbrella task and all its children.

This subtask owns **no product code**. It is the documentation + validation +
board-hygiene wrapper that makes TASK-480 mergeable and auditable. The two leaves
split cleanly: **L01** owns the docs (finalizing `DASHBOARD_WIDGETS_SPEC.md` —
seeded by 480-01-L02 and extended by 02/03/04/05 — plus updates to `CMS_API.md`,
`ADMIN_CACHE*.md`, `DATA_MODEL.md`, and the `AGENTS.md` repo index); **L02** owns
the gates, changelog, board/statistics sync, and the closure checklist.

> **Admin dashboard widgets vs. core widgets.** Throughout TASK-480 (and the docs
> this subtask writes) the word "widget" means an **admin dashboard panel** bound
> to a CMS data source (counters/charts/recent-activity/storage/site-health/quick
> actions/custom query) rendered inside the admin Dashboard shell. These are
> **distinct** from `core/widgets/*` (the page/content widgets rendered on the
> public site and configured in the Widget Library / page builder). The new spec
> doc must state this distinction up front so the two systems are never conflated
> in search, RBAC, or cache discussions.

- **Goal:** Every contract doc that TASK-480 changed is updated and discoverable,
  the release gates pass (and cover the new dashboard load/persistence paths), and
  the board + changelog reflect a truthful closure with recorded validation
  evidence.
- **Owning module/service:** `_docs/*` (specs/contract docs), `_docs/_TASKS/*`
  (board), `_docs/_CHANGELOG/*` (changelog), `scripts/coderso-release-gates.ts`
  (gate runner, read-only unless a gate is extended in L02).
- **Source-of-truth docs:**
  - Implemented contract from siblings: TASK-480-01..05.
  - Format rules: `AGENTS.md`, `_docs/_TASKS/EXAMPLE_TASK.md`,
    `_docs/_CHANGELOG/README.md`, `_docs/_CHANGELOG/EXAMPLE_CHANGELOG.md`.
  - Gate contract: `_docs/CODERSO_RELEASE_GATES.md`.
  - Testing lanes: `_docs/TESTING_STRATEGY.md`.
- **Out of scope:** No schema/route/UI/DB changes (those are owned by 480-01..05).
  This subtask only **documents and validates** what they shipped. If a doc edit
  reveals a real contract bug, raise it back to the owning leaf — do not patch
  product code here.

---

## Security Contract

No endpoint or permission model changes. This subtask is docs + gates + closure
only; it introduces no routes, schemas, or persistence. Its job is to **describe
accurately** (in `DASHBOARD_WIDGETS_SPEC.md` + `CMS_API.md`) the security contract
the API/UI leaves already implemented:

- **Endpoint visibility:** internal admin (`/admin/api/*`) — documented, not changed.
- **Auth model:** session — documented.
- **RBAC:** widget **data** reads gate on `content:read`; dashboard **layout**
  writes gate on `dashboard:write` (the dedicated layout-persistence permission
  added by TASK-480-03) — documented, not changed.
- **CSRF:** required for all admin layout writes — documented.
- **Rate-limit buckets:** `admin_read` for admin GET reads and `admin_write` for
  layout writes/body POSTs — documented.
- **Validation:** schema-owner reject-unknown behavior described, pointing at the
  `core/services/dashboard/*` schema owner from TASK-480-02.
- **Secret handling:** the spec must restate that no secrets/credentials reach the
  client, browser cache, or logs (security/site-health widgets surface boolean
  status flags only, never raw settings values).

The docs MUST match the code; if a documented control and the shipped control
disagree, the code (owned by 480-01..05) is source of truth and the discrepancy is
a closure blocker.

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-480-06-L01 | Dashboard Widgets Spec & API Docs | ⏳ To Do |
| TASK-480-06-L02 | Release Gates & Closure | ⏳ To Do |

---

## Testing Requirements

This subtask is documentation- and process-led; its "tests" are the full-program
validation run executed in L02 before closure. The exact commands live in
**TASK-480-06-L02**, but at minimum the closure run must include:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- The TASK-480 Bun route + security suites (added by 480-03).
- The TASK-480 Vitest domain + admin UI suites (added by 480-02/04/05).
- `bun run gates:coderso` as the baseline release-gate sweep (functional / ux /
  performance / security / reliability).
- Load `.env` with `set -a && source .env && set +a` before any DB-backed suite.
- State clearly in the closeout if any command was skipped or could not run.

---

## Documentation Updates Required

- **Finalize** `_docs/DASHBOARD_WIDGETS_SPEC.md` (seeded by 480-01-L02, extended
  by 02/03/04/05; consolidated to final by L01).
- **Update** `_docs/CMS_API.md` — new dashboard widget/layout routes (L01).
- **Update** `_docs/ADMIN_CACHE.md` + `_docs/ADMIN_CACHE_MAP.md` — new cached
  dashboard-layout (and widget-data, if cached) resource (L01).
- **Update** `_docs/DATA_MODEL.md` — new dashboard-layout persistence table (L01,
  only if TASK-480-03 added a table).
- **Update** `AGENTS.md` repo doc index to list the new spec (L01).
- **Update** `_docs/_TASKS/README.md` board buckets + Statistics, and add the
  `_docs/_CHANGELOG/` entry (L02).
