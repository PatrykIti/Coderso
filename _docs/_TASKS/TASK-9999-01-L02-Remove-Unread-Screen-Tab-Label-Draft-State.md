# TASK-9999-01-L02: Remove Unread Screen Tab Label Draft State

# FileName: TASK-9999-01-L02-Remove-Unread-Screen-Tab-Label-Draft-State.md

**Parent Task:** TASK-9999
**Parent Subtask:** TASK-9999-01
**Source Task:** TASK-540
**Priority:** Low
**Category:** Custom Screens / Admin State Cleanup
**Estimated Effort:** Small
**Dependencies:** TASK-540 closure, TASK-9999-01-L01
**Status:** ⏳ To Do

---

## Overview

`ScreenTabLabelDraft.baseLabel` is written in every draft-state update but never read.
TASK-540-02-L01 is first extracting that exact state into
`ScreenBlockInspectorTabs.tsx`; it deliberately preserves the unread member. This leaf
later replaces the two-field object with the value-only state shape while preserving
the final TASK-540 tab-label contract exactly, including Unicode bounds, commit,
Escape, invalid input, external rerender, focus, and accessibility behavior.

The source-task backlink uses a conditional evidence transition. Before the split, the
symbol is at `ScreenBlockInspector.tsx:524,525,538,542,553,559,563` with SHA-256
`eb49d21a99cd5fbf8dedfd502c727ba890dd455552a8259b9e9b45eb4b11d4df`. After the
split, TASK-540 closure must record the exact final line anchors and SHA-256 for the
same type/assignments in `ScreenBlockInspectorTabs.tsx` and prove them absent from the
facade. Both layouts must retain normalized AST contract SHA-256
`15897646098bfeb9f653b940c0782e3b3f999a811b9cbc3d9bf46a01cae5df9a`, proving one
`baseLabel` type member, exactly four writes, the sole `draft.value` read, and no
`baseLabel` or whole-draft read. Exactly one layout may validate at a time; this leaf
may be implemented only from the final post-split evidence.

## Exclusive Ownership

- `core/admin/ui/custom-screens/ScreenBlockInspectorTabs.tsx`, only
  `ScreenTabLabelDraft` / `TabLabelInput` local state
- `tests/vitest/ui/custom-screen-binding-panel.test.tsx`, behavior-regression coverage
  only if an additive assertion is needed; never weaken or rebaseline existing cases

The stable `ScreenBlockInspector.tsx` facade and the model/controls/section sibling
modules are read-only. Do not change Tabs schemas, stored-read repair, slots, runtime tablist rendering, blur
policy, labels/copy, ARIA, keys, event propagation, or any Button behavior. In particular,
the separately tracked invalid-blur finding is not part of this deferred cleanup.

## Security Contract

No endpoint or permission model changes. No payload, persistence, cache, auth, RBAC,
CSRF, rate-limit, validation, logging, or secret-handling behavior changes. A diff beyond
the local state shape and its behavior-preserving test evidence invalidates this leaf's
TASK-9999 eligibility.

## Sub-Tasks

- [ ] Remove the unread `baseLabel` member and object-state allocations.
- [ ] Preserve the keyed remount and every final TASK-540 commit/restore condition.
- [ ] Run the existing full tab-label behavior regression in the correct Vitest lane.
- [ ] Run static checks and diff validation.

## Implementation Pseudocode

```tsx
function TabLabelInput({ tab, index, onCommit }: TabLabelInputProps) {
  const [draftValue, setDraftValue] = useState(() => tab.label);
  const restoreCommitted = () => setDraftValue(tab.label);

  const commitDraft = (raw: string) => {
    const label = raw.trim();
    // Final TASK-540 behavior: invalid blur/Enter restores the committed label.
    if (!label || screenLabelLength(label) > SCREEN_TAB_LABEL_MAX) {
      restoreCommitted();
      return;
    }
    if (label === tab.label) {
      restoreCommitted();
      return;
    }
    setDraftValue(label);
    onCommit(label);
  };

  return (
    <Input
      value={draftValue}
      onChange={(event) => setDraftValue(event.target.value)}
      onBlur={(event) => commitDraft(event.currentTarget.value)}
      onKeyDown={/* existing Enter/Escape/propagation logic, unchanged */}
      /* existing data attribute, accessible name, and placeholder unchanged */
    />
  );
}
```

**Data flow:** keystroke -> value-only local state -> unchanged validation/trim on
Enter or blur -> existing `onCommit` -> parent block patch. Escape restores the current
committed `tab.label`; the existing keyed remount continues to invalidate stale drafts.

**Error handling:** empty or over-limit blur/Enter restores the latest committed label
without calling `onCommit`; Escape does the same. Parent rerenders must keep the final
TASK-540 stale-draft invalidation behavior. Do not reinterpret any other error path.

**Regression-test shape:** keep the existing Unicode-boundary and stale-draft test
intact. It must still prove valid blur/Enter commit, empty and over-120-code-point
blur/Enter restoring the latest committed value without a patch, Escape restore,
same-tab remote label refresh, block-identity change, and no unintended patch. Extend
only visible behavior coverage that TASK-540 has not already pinned; never assert the
removed implementation detail instead of behavior.

## Testing Requirements

- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `tsc -p tsconfig.json --noEmit`
- `bunx vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-binding-panel.test.tsx`
- Restart the development server through the repository helper and verify the Admin host
  responds before browser validation; do not rely on hot reload.
- Run `playwright-cli` with the task-scoped named session `wf9999-01-l02-smoke` and cover
  at least these five distinct real behavior-preservation flows:
  1. a valid trimmed label commits on blur and remains visible after the parent update;
  2. empty and over-limit labels restore the latest committed value without a patch;
  3. Enter commits a valid label while Escape restores it without a patch;
  4. a same-tab external label refresh invalidates a stale local draft; and
  5. a block-identity change invalidates the old draft without mutating either block.
- Exercise the Admin surface in both light and dark mode. Assert visible input values,
  focus/keyboard behavior, emitted patch state where observable, and the relevant
  accessible DOM state rather than control presence alone. Require zero console errors,
  page errors, or unhandled rejections.
- Save distinct task-prefixed screenshots under `_docs/_workflows/_smoke/` for human
  review, then clean up the named Playwright session, scoped fixtures, server helper,
  owned processes, and ports. This smoke may be batched with other UI/editor TASK-9999
  leaves only when the receipt maps each scenario and screenshot back to this leaf.
- `git diff --check`

The smoke validates unchanged behavior; it does not turn this cleanup into a user-visible
feature. Any intentional UI/UX/accessibility change makes the work ineligible for
TASK-9999 and requires promotion, while any accidental visible difference is a failed
implementation that must be repaired before closure.

## Documentation Updates Required

- Record validation results and completion metadata in this leaf.
- Add this physical ID to the TASK-9999-01 closure changelog.
- Mark TASK-9999-01 terminal only after both leaves are terminal; leave TASK-9999 In
  Progress.
