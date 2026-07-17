# TASK-9999-01: TASK-540 Deferred Non-User-Facing Lows

# FileName: TASK-9999-01-Task-540-Deferred-Non-User-Facing-Lows.md

**Parent Task:** TASK-9999
**Source Task:** TASK-540
**Priority:** Low
**Category:** Custom Screens / Behavior-Neutral Maintenance
**Estimated Effort:** Small
**Dependencies:** TASK-540 closure
**Status:** ⏳ To Do

---

## Overview

This child records exactly two independently verified TASK-540 LOW findings that are
behavior-neutral today: actor UUID validation is coupled to a media-named predicate,
and `ScreenTabLabelDraft.baseLabel` is written but never read. Each has its own leaf,
grounded source evidence, implementation shape, and regression lane.

This child does not relax TASK-540 closure. Before TASK-540 closes, its closure record
must link both leaves and state the same safe-deferral rationale. This child is the
destination record, not a substitute for that required source-task backlink.

## Accepted Findings

| Leaf | Evidence | Why deferral is currently safe |
|---|---|---|
| TASK-9999-01-L01 | `screenMediaIdentity.ts:4` solely defines `isScreenMediaAssetUuid` and `customScreenSchemas.ts` explicitly re-exports it; `screenEntryPresentationOverrideContract.ts:194,231` reaches it through `normalizeCanonicalMediaUuid`, while `screenEntryPresentationOverrides.ts:421` calls it directly for actor identity. Before the pending split lands, workflow self-test verifies the equivalent pre-split definition only as transitional evidence. | The predicate already accepts/rejects the intended UUID shape and preserves the value; only domain naming/coupling is wrong. There is no payload, persistence, auth, RBAC, or runtime behavior change. |
| TASK-9999-01-L02 | Conditional intake evidence: before TASK-540-02-L01's split, `ScreenBlockInspector.tsx:524,525,538,542,553,559,563` at SHA-256 `eb49d21a99cd5fbf8dedfd502c727ba890dd455552a8259b9e9b45eb4b11d4df`; after the split, the same `ScreenTabLabelDraft.baseLabel` assignments must be anchored by exact final lines and SHA-256 in `ScreenBlockInspectorTabs.tsx`, with the symbol absent from the facade. Exactly one layout is valid, and execution requires the post-split evidence. | The unread property cannot affect rendered UI, keyboard/blur behavior, saved data, or accessibility. Removing it is state-shape cleanup only. |

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
behavior changes. If either leaf grows beyond behavior-neutral internal cleanup, stop and
promote it to an active task with a complete security and validation contract.

## Sub-Tasks

| ID | Title | Status |
|---|---|---|
| TASK-9999-01-L01 | Decouple actor and media UUID domain naming without behavior change | ⏳ To Do |
| TASK-9999-01-L02 | Remove unread `ScreenTabLabelDraft.baseLabel` state without behavior change | ⏳ To Do |

## Implementation Order

Implement L01, validate it, then implement L02. They are source-disjoint except for the
shared Custom Screens validation context, so each leaf keeps its own gate and evidence.

## Testing Requirements

- L01: core lint/typecheck, root typecheck, and the exact Bun-free schema/override Vitest
  suites named in the leaf.
- L02: core lint/typecheck, root typecheck, the extracted
  `ScreenBlockInspectorTabs.tsx` owner, and the existing Custom Screen binding-panel
  Vitest behavior suite without weakening its invalid-input, Escape, Unicode, or
  parent-rerender assertions.
- Run `git diff --check` after each leaf.
- L01 touches only Bun-free domain/service code, so its dependency-shaped static and
  Vitest gate requires no runtime smoke.
- L02 touches Admin editor code and therefore requires a task-scoped `playwright-cli`
  runtime smoke with at least five distinct real behavior-preservation flows. Restart the
  dev server through the repository helper first; verify Admin light and dark mode;
  assert visible values, focus/keyboard behavior, and relevant DOM/accessibility state;
  require zero console/page errors; save task-prefixed screenshots under
  `_docs/_workflows/_smoke/`; and clean up the named browser session, fixtures, helper,
  processes, and ports. The smoke may batch with later UI/editor TASK-9999 leaves only
  when its evidence maps every scenario to its owning leaf unambiguously.
- TASK-9999 eligibility means L02 is expected to preserve behavior; it does not waive the
  runtime validation obligation. An intentional visible change promotes the work out of
  TASK-9999, while an accidental regression fails the implementation and must be fixed.

## Documentation Updates Required

- At intake, TASK-540 must link L01 and L02 with the exact rationale above.
- At implementation closure, first create one changelog entry listing every leaf that
  will close. Only then mark the covered leaves terminal, mark this child terminal after
  both leaves, and perform normal task-board/Statistics synchronization before updating
  the TASK-9999 parent table.
- Never mark TASK-9999 itself Done.
