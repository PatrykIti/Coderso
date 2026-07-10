# TASK-540-02: Button Binding and Tabs Authoring

# FileName: TASK-540-02-Button-Binding-And-Tabs-Authoring.md

**Parent Task:** TASK-540
**Priority:** High
**Category:** Custom Screens / Admin Authoring
**Estimated Effort:** Small
**Dependencies:** TASK-540-01
**Status:** ⏳ To Do
**Changelog:** 1252 (pinned; closure only)

---

## Scope

Make the already-modeled Button `href` binding reachable from the visible
Inspector and make Tabs authoring target a concrete active slot. Reuse existing
binding callbacks and insertion contracts; do not modify the palette, factory,
document model, or runtime renderer.

## Leaf

| ID | Title | Exclusive source ownership | Status |
|---|---|---|---|
| TASK-540-02-L01 | Expose link binding and complete tab-slot editing | `core/admin/ui/custom-screens/ScreenBlockInspector.tsx` | ⏳ To Do |

## Acceptance

- The Inspector can create an eligible Button `href` binding and, only when that exact
  binding exists, emits `{ field: "" }` from the named clear affordance. This subtask
  does not persist the sentinel or claim the completed clear flow; the static sanitized
  fallback remains unchanged.
- The Action selector offers only Link.
- Tabs add/rename/remove uses deterministic collision-free IDs and keeps slots in
  lockstep. The inspector imports the shared minimum/maximum constants, cannot remove
  the final tab, and cannot create a draft rejected by the write schema. Authors can
  choose which tab slot receives the next insertion.
- No `ScreenBlockLibrary.tsx` or `screenDocumentOps.ts` edit is needed: their
  existing contracts already support Button and `href` binding input.

TASK-540-04-L04 exclusively consumes the clear sentinel, removes exactly that binding,
marks the draft dirty, and owns persistence. TASK-540-06-L01 owns aggregate
bind→clear→rebind/save/reopen proof. This handoff does not add a backward dependency;
TASK-540-02 still lands before TASK-540-04.

## Security Contract

Admin UI only. Persistence still rides existing internal Custom Screen writes
with `content:write`, CSRF, admin rate limiting, and TASK-540-01 server-side strict
validation. Client controls are not a security boundary and never bypass the
normalizer.
