# TASK-541-02: Admin, Menu, and Widget Rollout

# FileName: TASK-541-02-Admin-Menu-And-Widget-Rollout.md

**Parent Task:** TASK-541
**Priority:** High
**Category:** Shared Styling / Admin / Menus / Widgets
**Estimated Effort:** Large
**Dependencies:** TASK-541-01
**Status:** ⏳ To Do
**Changelog:** 1253 (pinned; create only at TASK-541 closure)

---

## Goal

Replace admin, menu, and widget color-language mirrors with the canonical owner while
preserving each boundary's existing UI/persistence role. Contextual inherited values
require explicit opt-in; no boundary clamps or silently accepts a value another
boundary rejects.

## Leaves

| Leaf | Exclusive seam | Status |
|---|---|---|
| TASK-541-02-L01 | Admin adapters and controls | ⏳ To Do |
| TASK-541-02-L02 | Menu write normalization | ⏳ To Do |
| TASK-541-02-L03 | Widget schema/render normalization | ⏳ To Do |

## Ownership and collision guards

Each rollout leaf owns only its declared source files. TASK-541-02-L02 lands before
TASK-542 and TASK-542 may not recreate a menu parser. Admin rollout is not performed
concurrently with TASK-481 if it owns the same shared control tests/source. Widget
rollout must preserve unrelated widget schemas/defaults/markup.

## Security Contract

No route contract changes. Existing internal menu/widget writes retain auth, RBAC,
CSRF, strict schemas and rate limits. UI validation remains defense-in-depth; write and
render boundaries both call the shared positive parser. No unsafe fallback, browser
cache secret, or scanner exception.

## Acceptance

- Admin-emitted authoring values are accepted with identical canonical bytes by menu
  writes and widget authoring render boundaries.
- Inherited keywords work only at explicitly opted-in widget render fields.
- Semantic regex/range mirrors are gone from the declared consumers.
- Unknown stored values are not mutated merely by mounting an admin control.

## Validation

Run every leaf's targeted tests, then build/admin-boundary checks and `git diff --check`.
