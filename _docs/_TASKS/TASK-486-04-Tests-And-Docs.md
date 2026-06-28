# TASK-486-04: Tests (Bun Route + Vitest Engine/Render) & Docs
# FileName: TASK-486-04-Tests-And-Docs.md

**Parent Task:** TASK-486
**Priority:** High
**Category:** Engagement / Popups / Public Site
**Estimated Effort:** Medium
**Dependencies:** TASK-486-01, TASK-486-02, TASK-486-03
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Lock the public delivery path with lane-correct tests and update the
source-of-truth docs. Most behaviour is already unit-tested inside L01–L03 of
the earlier subtasks; this subtask adds the **end-to-end Bun route/security
coverage** for the public endpoint + served runtime, a consolidated **Vitest**
suite for the engine + render integration, and the doc edits that publish the
new public contract.

---

## Sub-Tasks

| ID | Title | Lane | Status |
| --- | --- | --- | --- |
| TASK-486-04-L01 | Public `/api/popups` route + security Bun tests | Bun | ⏳ To Do |
| TASK-486-04-L02 | Engine + render Vitest suite | Vitest | ⏳ To Do |
| TASK-486-04-L03 | Docs updates (CMS_API / SECURITY_SPEC / ARCHITECTURE) | Docs | ⏳ To Do |

---

## Dependencies

- All of TASK-486-01/02/03 implemented.
- Existing test precedents: `tests/integration/routes/popupsRoutes.test.ts`
  (admin), `tests/integration/routes/bookingRoutes.test.ts` (public read),
  `tests/integration/routes/forms.test.ts` (public write/anti-abuse),
  `tests/vitest/ui/popups-page.test.tsx`.

---

## Testing Requirements

- **L01** → Bun (`tests/integration/routes/*`, `tests/security/*`).
- **L02** → Vitest (`tests/vitest/popups/*`, `tests/vitest/ui-integration/*`).
- **L03** → docs only; verify links and that the "internal-only" note is
  corrected. No code/test changes.
