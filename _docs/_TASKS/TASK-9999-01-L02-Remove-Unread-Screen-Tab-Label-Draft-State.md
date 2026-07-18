# TASK-9999-01-L02: Remove Unread Screen Tab Label Draft State

# FileName: TASK-9999-01-L02-Remove-Unread-Screen-Tab-Label-Draft-State.md

**Parent Task:** TASK-9999
**Parent Subtask:** TASK-9999-01
**Source Task:** TASK-540
**Priority:** Low
**Category:** Custom Screens / Admin State Cleanup
**Estimated Effort:** Small
**Dependencies:** TASK-540 closure, TASK-9999-01-L01
**Status:** ⏭️ Superseded
**Superseded By:** TASK-540-02-L01
**Re-triaged:** 2026-07-18
**Changelog:** 1258
**Supersession Reason:** The active TASK-540-02-L01 repair now reads `baseLabel` to invalidate stale drafts while preserving focus on the commit-stable Tab-label input. Removing it would regress visible keyboard/focus and stale-draft behavior, so the original behavior-neutral premise is false and no TASK-9999-eligible implementation remains.

---

## Overview

This leaf is terminal and must not be implemented. TASK-540-02-L01 keeps the Tab-label
input keyed by stable block and Tab identity so an Enter commit preserves keyboard
focus, then reads `draft.baseLabel` to detect when a later committed label invalidates
the local draft. The resulting visible UX and accessibility responsibility makes the
old value-only cleanup unsafe and ineligible for TASK-9999.

Re-triage evidence is `ScreenBlockInspectorTabs.tsx:25-28,39-49,51,62,68,72,145`:
the state has one `baseLabel` member, the current behavior reads it at line 48, and the
input uses the commit-stable key at line 145. The stateful regression at
`custom-screen-binding-panel.test.tsx:614-696` proves same-Tab and block-identity stale
draft invalidation; the keyboard regression at `:754-782` proves Enter retains focus on
the same input while updating its accessible label. The source SHA-256 at re-triage was
`35e87c59e5f3590e5d8919826f03047469ea3c93666b22108f1c4016fac3e953`.

## Historical Superseded Contract — DO NOT IMPLEMENT

The sections below preserve the previously execution-ready proposal as audit provenance
only. They describe removing an allegedly unread property. New evidence disproved that
premise, so none of the ownership, pseudocode, checklist, or smoke instructions below
authorize source or test changes.

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

- [x] Re-triage the finding against current behavior and focus evidence.
- [x] Supersede the unsafe removal through active TASK-540-02-L01.
- [x] Record standalone changelog and task-board closure evidence.

## Historical Implementation Pseudocode — DO NOT IMPLEMENT

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

## Historical Testing Requirements — DO NOT IMPLEMENT

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

- Changelog 1258 records why this leaf is superseded without claiming implementation.
- TASK-9999-01 remains `⏳ To Do` because L01 remains open; TASK-9999 remains
  `🚧 In Progress` permanently.
