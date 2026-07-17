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
| TASK-9999-01-L01 | `screenMediaIdentity.ts:4` solely defines `isScreenMediaAssetUuid` and `customScreenSchemas.ts` explicitly re-exports it; `screenEntryPresentationOverrideContract.ts:192,229` reaches it through `normalizeCanonicalMediaUuid`, while `screenEntryPresentationOverrides.ts:421` calls it directly for actor identity. Before the pending split lands, workflow self-test verifies the equivalent pre-split definition only as transitional evidence. | The predicate already accepts/rejects the intended UUID shape and preserves the value; only domain naming/coupling is wrong. There is no payload, persistence, auth, RBAC, or runtime behavior change. |
| TASK-9999-01-L02 | Final intake evidence: `ScreenBlockInspectorTabs.tsx:24,25,38,42,53,59,63`, source SHA-256 `03cbeb962f40a87085d11403c15f9b69b482302322c5fc85ad224df9a52e16d4`, and normalized AST SHA-256 `15897646098bfeb9f653b940c0782e3b3f999a811b9cbc3d9bf46a01cae5df9a`; the workflow proves `ScreenTabLabelDraft.baseLabel` is absent from the facade and remains exactly one type member plus four writes with no read. | The unread property cannot affect rendered UI, keyboard/blur behavior, saved data, or accessibility. Removing it is state-shape cleanup only. |

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
