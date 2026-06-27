# TASK-480-01: Feature-Completeness Audit & Widget Product Spec
# FileName: TASK-480-01-Feature-Completeness-Audit-And-Widget-Product-Spec.md

**Priority:** High
**Category:** Admin UI / Dashboard / Discovery
**Estimated Effort:** Medium
**Dependencies:** None (this subtask UNBLOCKS TASK-480-02..06)
**Status:** ⏳ To Do
**Parent Task:** TASK-480

---

## Overview

Before building the configurable widget dashboard, two discovery artifacts are
needed and they are the deliverable of this subtask:

1. A **read-only completeness audit** of every admin screen, classifying each as
   **Complete | Partial | Stub** and naming what is missing. This tells the team
   which `TASK-479` per-screen subtasks are **pure re-skin** (screen already
   feature-complete) vs which need a **sibling feature task** like TASK-480.
2. A **Dashboard widget product spec** — the authoritative catalog of widget
   types (each with its CMS data source + config), the layout/grid model, the
   edit-mode UX, and the **per-user vs per-site** layout decision. This spec is
   the contract that TASK-480-02 (schemas/data sources), -03 (layout/API), -04
   (renderers), and -05 (builder UI) implement against.

- **Goal:** Produce the audit table + the widget product spec so the rest of
  TASK-480 is execution-ready and the team can triage the TASK-479 backlog.
- **Owning module/service:** Documentation only —
  `_docs/_TASKS/TASK-480-01-*` outputs + the seed of
  `_docs/DASHBOARD_WIDGETS_SPEC.md`. No production code.
- **Source-of-truth docs:** `core/admin/ui/*`, `core/admin/services/*`,
  `core/services/*`, `core/server/routes/*`, `_docs/CMS_API.md`,
  `_docs/RBAC_SPEC.md`, `_docs/DATA_MODEL.md`, prototype
  `_docs/_PROTOTYPE/src/pages/DashboardPage.tsx`, the TASK-479 screen subtasks.
- **Out of scope:** No schema, route, DB, cache, or UI code. No modification of
  existing screens. The spec RECOMMENDS; implementation happens in -02..-05.

---

## Security Contract

No endpoint or permission model changes. This subtask is read-only discovery and
documentation. The widget spec (L02) **describes** the future RBAC/CSRF/cache
posture but introduces no runtime behavior; those contracts become real in
TASK-480-02/03.

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-480-01-L01 | Admin Screen Completeness Audit (read-only) | ⏳ To Do |
| TASK-480-01-L02 | Dashboard Widget Product Spec | ⏳ To Do |

---

## Testing Requirements

Documentation/discovery only — no automated test lane. Validation = review:

- Audit table (L01) covers every admin screen listed in the leaf and every entry
  carries a Complete/Partial/Stub verdict with evidence (file paths) and, for
  Partial/Stub, a concrete "what's missing" note.
- Widget spec (L02) enumerates the full catalog with data source + config per
  widget, the layout model, the edit-mode UX, and a justified per-user vs
  per-site recommendation.
- No production source files changed (`git status` shows only `_docs/` edits).

---

## Documentation Updates Required

- `_docs/DASHBOARD_WIDGETS_SPEC.md` — seed/create from L02 (the full spec doc is
  finalized in TASK-480-06, but L02 produces its first authoritative draft).
- `_docs/_TASKS/README.md` — board bucket + statistics when this subtask/leaves
  change status.
- (Optional) link the L01 audit table from the TASK-479 umbrella so per-screen
  re-skin subtasks can reference their Complete/Partial/Stub verdict.

---

## Closure Checklist

- [ ] L01 + L02 both `✅ Done`.
- [ ] Audit table complete; verdicts evidence-backed.
- [ ] Widget spec drafted into `_docs/DASHBOARD_WIDGETS_SPEC.md`.
- [ ] Board index + statistics synced.
