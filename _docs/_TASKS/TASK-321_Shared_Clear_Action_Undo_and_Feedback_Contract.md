# TASK-321: Shared Clear Action Undo and Feedback Contract

# FileName: TASK-321_Shared_Clear_Action_Undo_and_Feedback_Contract.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Shared Editor Patterns
**Estimated Effort:** Large
**Dependencies:** TASK-256-02, TASK-310, TASK-277
**Status:** Done (2026-05-21)

---

## Overview

Define and implement one shared contract for recoverable `Clear` actions in
widget editors.

Current clearable inputs remove the owning value immediately, but they do not
emit shared feedback or offer an undo path. This task must fix the shared helper
used across many widget editors instead of patching individual widgets like
`posts-feed` locally.

## Source Findings

- `ClearableFieldHeader` triggers `onClear` immediately and provides no shared
  feedback channel:
  `core/admin/ui/widgets/editors/ClearableFields.tsx:143-167`.
- `ClearableInputField` is used widely across widget editors, including
  Posts Feed:
  `core/admin/ui/widgets/editors/PostsFeedEditors.tsx:552-565`.
- The Posts Feed report still flags clear-without-undo as a shared gap:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:214-216`.

## Sub-Tasks

- None. This is an execution task.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/ClearableFields.tsx` | Add a shared recoverable clear interaction contract that can emit bounded feedback and optional undo without changing per-widget ownership. |
| `tests/vitest/ui/clearable-fields.test.tsx` | Cover clear feedback, undo, disabled-empty behavior, and non-destructive fallback semantics. |
| `tests/vitest/ui/posts-feed-editor-wave.test.tsx` | Update only if shared clear feedback changes visible Posts Feed editor behavior. |
| `_docs/WIDGETS.md` | Update only if the global editor clear contract changes at the product/spec level. |
| `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md` | Mark `UX-08` fixed by TASK-321 once implemented. |

## Implementation Pseudocode

```tsx
type ClearActionFeedback = {
  label: string;
  restore: () => void;
};

function useRecoverableClear() {
  return ({ label, clear, restore }: { label: string; clear: () => void; restore: () => void }) => {
    clear();
    toast.info(`${label} cleared.`, {
      action: {
        label: "Undo",
        onClick: restore,
      },
    });
  };
}
```

## Data Flow

1. Shared clearable field helpers remain the single owner of clear affordances
   used across widget editors.
2. When a caller opts into recoverable clear, the helper snapshots the prior
   value, performs the clear, and emits bounded shared feedback.
3. Undo routes through the same shared helper and restores the exact prior value
   to the calling editor state instead of synthesizing a default.
4. Widget-local editors may wrap the shared contract with copy or layout, but
   they must not fork the clear/undo semantics.

Error handling:

- Clearing an already-empty field must remain a no-op.
- Undo must restore the exact prior value, not a default or normalized fallback.
- If a widget opts out of undo for a specific destructive surface, that decision
  must be explicit and documented in the calling editor instead of silently
  bypassing the shared contract.

Regression-test shape:

```tsx
test("shared clear feedback offers undo that restores the exact prior value", async () => {
  const field = renderRecoverableClearField({ initialValue: "Hero title" });
  await field.clear();
  await field.undo();
  expect(field.value()).toBe("Hero title");
});

test("clearing an already empty field stays a no-op", async () => {
  const field = renderRecoverableClearField({ initialValue: "" });
  await field.clear();
  expect(field.toastCalls()).toHaveLength(0);
});
```

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged because this task only changes local
  editor interaction semantics.
- Anti-abuse: no secrets, tokens, or server mutations in clear feedback.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run lint`
- `bun run test:vitest`
- `bun run test:bun` when any shared editor shell contract needs Bun coverage
- `bun run test:vitest -- tests/vitest/ui/clearable-fields.test.tsx`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/WIDGETS.md` only if the global editor clear contract changes
- `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md`
- `_docs/_TASKS/TASK-321_Shared_Clear_Action_Undo_and_Feedback_Contract.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/887-2026-05-21-task-321-shared-clear-undo-feedback-contract.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

- Shared clearable inputs can emit recoverable feedback through one reusable
  contract.
- Undo restores the exact prior field value.
- Existing empty-state and disabled-clear behavior remains intact.
- Widget-specific editors no longer need to invent one-off clear undo behavior.

## Validation Notes (2026-05-21)

- `bun run test:vitest -- tests/vitest/ui/clearable-fields.test.tsx` - passed
  (`6` tests)
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx` - passed
  (`8` tests)
- `bun --cwd core lint` - passed
- `bun --cwd core lint:types` - passed
- `bun run lint` - passed
- `bun run gates:coderso` - passed
- `bun run scan:security:strict` - attempted but failed outside TASK-321 scope
  because the local Semgrep trust store had no CA anchors and `bun audit` could
  not reach the advisory endpoint; Trivy and Gitleaks sub-scanners were clean
  in the same run
- `bun run precommit` - passed
- 2026-05-21 audit rerun: `bun run test:vitest -- tests/vitest/ui/clearable-fields.test.tsx tests/vitest/ui/posts-feed-editor-wave.test.tsx` passed after restoring shared feedback for bare `ClearableFieldHeader` surfaces and adding explicit Posts Feed undo proof

## Completion Notes

- 2026-05-21: `ClearableInputField` now emits shared toast feedback with an
  `Undo` action that restores the exact prior value through the common clear
  helper path.
- 2026-05-21 audit follow-up: bare `ClearableFieldHeader` clears now emit the
  same shared feedback channel instead of failing silently, and common
  value/onChange wrappers restore the prior value through the shared helper when
  they can do so exactly.
