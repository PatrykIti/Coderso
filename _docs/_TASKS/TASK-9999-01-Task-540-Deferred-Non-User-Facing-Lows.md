# TASK-9999-01: TASK-540 Deferred Non-User-Facing Lows

# FileName: TASK-9999-01-Task-540-Deferred-Non-User-Facing-Lows.md

**Parent Task:** TASK-9999
**Source Task:** TASK-540
**Priority:** Low
**Category:** Custom Screens / Behavior-Neutral Maintenance
**Estimated Effort:** Small
**Dependencies:** TASK-540 closure
**Status:** ⏳ To Do
**Last Re-triaged:** 2026-07-18

---

## Overview

This child retains one independently verified TASK-540 LOW finding that remains
behavior-neutral today: actor UUID validation is coupled to a media-named predicate.
The original second finding about `ScreenTabLabelDraft.baseLabel` was re-triaged on
2026-07-18 and superseded after active TASK-540-02-L01 made that state behavior-owning.

This child does not relax TASK-540 closure. Before TASK-540 closes, its closure record
must link the still-accepted L01 with the same safe-deferral rationale and record L02's
supersession without treating it as deferred. This child is the destination record, not
a substitute for the required source-task backlink.

## Accepted Findings

| Leaf | Evidence | Why deferral is currently safe |
|---|---|---|
| TASK-9999-01-L01 | `screenMediaIdentity.ts:4` solely defines `isScreenMediaAssetUuid` and `customScreenSchemas.ts` explicitly re-exports it; `screenEntryPresentationOverrideContract.ts:192,229` reaches it through `normalizeCanonicalMediaUuid`, while `screenEntryPresentationOverrides.ts:421` calls it directly for actor identity. Before the pending split lands, workflow self-test verifies the equivalent pre-split definition only as transitional evidence. | The predicate already accepts/rejects the intended UUID shape and preserves the value; only domain naming/coupling is wrong. There is no payload, persistence, auth, RBAC, or runtime behavior change. |

## Re-triaged Findings

| Leaf | Current evidence | Outcome |
|---|---|---|
| TASK-9999-01-L02 | `ScreenBlockInspectorTabs.tsx:48` reads `draft.baseLabel`; its stable input key at `:145` preserves focus across a commit. `custom-screen-binding-panel.test.tsx:614-696` proves stale-draft invalidation and `:754-782` proves focus remains on the same input after Enter. | `⏭️ Superseded` by active TASK-540-02-L01. Removing the state would regress visible keyboard/focus and stale-draft behavior, so the old cleanup is no longer TASK-9999-eligible. Changelog 1258 records the terminal decision. |

## Explicit Non-Deferrals

The following historical TASK-540 findings were never eligible for TASK-9999 and
remained blocking until they were fixed or otherwise resolved inside the source task:

- invalid tab-label blur behavior is user-visible UX;
- a destructive Tabs stored-read fallback can change persisted/read data semantics;
- an empty `tablist` is an accessibility issue;
- missing Button rejection/route evidence affects validation and test integrity;
- direct-normalizer parity affects validation and persistence confidence; and
- the promised test matrix plus environment and cache documentation affect validation,
  reliability, or documentation integrity.

No new TASK-540 LOW may be added here merely because it is inexpensive or inconvenient.
It must independently satisfy the permanent eligibility contract.

## Security Contract

No endpoint, auth, RBAC, CSRF, rate-limit, validation response, storage, or secret-handling
behavior changes. If the remaining L01 grows beyond behavior-neutral internal cleanup,
stop and promote it to an active task with a complete security and validation contract.
L02 is already terminal and cannot be revived under this backlog contract.

## Sub-Tasks

| ID | Title | Status |
|---|---|---|
| TASK-9999-01-L01 | Decouple actor and media UUID domain naming without behavior change | ⏳ To Do |
| TASK-9999-01-L02 | Historical unread-state cleanup; superseded by active focus-preserving repair | ⏭️ Superseded |

## Implementation Order

Implement and validate only L01. L02 has no executable work and its historical removal
contract must not be implemented.

## Testing Requirements

- L01: core lint/typecheck, root typecheck, and the exact Bun-free schema/override Vitest
  suites named in the leaf.
- Run `git diff --check` after each leaf.
- L01 touches only Bun-free domain/service code, so its dependency-shaped static and
  Vitest gate requires no runtime smoke.
- L02 requires no implementation gate or standalone smoke because it is superseded;
  TASK-540-02-L01 owns the current UI behavior and its mandatory family smoke.

## Documentation Updates Required

- At TASK-540 closure, link L01 with its exact safe-deferral rationale and retain L02's
  supersession backlink; never count L02 as an accepted deferred finding again.
- Changelog 1258 already covers L02's terminal supersession. At L01 implementation
  closure, create its changelog before marking L01 terminal, then mark this child
  terminal because both descendants will be terminal and perform normal
  task-board/Statistics synchronization before updating the TASK-9999 parent table.
- Never mark TASK-9999 itself Done.
