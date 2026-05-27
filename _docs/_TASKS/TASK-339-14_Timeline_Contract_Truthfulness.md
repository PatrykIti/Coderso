# TASK-339-14: Timeline Contract Truthfulness

# FileName: TASK-339-14_Timeline_Contract_Truthfulness.md

**Priority:** High
**Category:** Widgets + Admin UI + UX Contract + Playwright
**Estimated Effort:** Large
**Dependencies:** TASK-339-01
**Status:** To Do
**Owners:** Codex implementation/tests/docs; Claude Playwright UI review

---

## Overview

Make `timeline` contract metadata match the richer editor that already ships,
including the missing Wizard section metadata.

## Source Findings

- `core/.tmp/widget_contract_diff.jsonl` shows Wizard currently renders no
  section metadata while the contract still declares a Wizard section.
- The rendered UI already exposes `Visual=6`, `Advanced=3`, while the contract
  still declares `Visual=2`, `Advanced=1`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/TimelineEditors.tsx` | Add truthful Wizard / Visual / Advanced section ids and roles that match the live UI. |
| `core/widgets/core/timeline.tsx` | Replace the stale contract with the true rendered section inventory. |
| `tests/vitest/ui/timeline-editor-wave.test.tsx` | Cover the truthful ids/titles/roles and keep the richer editor green. |
| `tests/vitest/widgets/timeline.test.tsx` | Keep widget-local editor/runtime behavior green. |
| `tests/vitest/ui/widget-template-editor.test.tsx` | Update section-title expectations. |
| `_docs/_WIDGETS/TIMELINE.md` | Document the truthful daily IA. |

## Implementation Pseudocode

```tsx
wizard:
  starter steps

visual:
  variant and timeline structure
  steps content and order
  guides and axis line
  markers and accents
  colors and background
  typography and spacing

advanced:
  runtime summary
  layout diagnostics
  data normalization
```

Data flow:

- Preserve the current richer UI.
- Add the missing Wizard metadata and align the contract to the rendered UI.

Error handling:

- Keep Advanced read-only.
- Do not collapse the UI back to `Timeline steps / Presentation`.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged widget schema.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx tests/vitest/widgets/timeline.test.tsx tests/vitest/ui/widget-template-editor.test.tsx`
- Claude headless Playwright review for `timeline` against the `hero` baseline
- Claude review for this leaf must use Playwright-visible UI only and must not
  read repo code, task files, or source diffs.

## Documentation Updates Required

- Update this task file with accepted/rejected Claude findings.
- Update `_docs/_TASKS/README.md` on status changes.
- Update `_docs/_WIDGETS/TIMELINE.md`.
- Add a changelog entry and update `_docs/_CHANGELOG/README.md` when the leaf moves to Done.

## Acceptance Criteria

- Timeline Wizard emits real section metadata again.
- Timeline keeps the richer current UI.
- Rendered section ids/titles/roles and `editorContract` match exactly across all three modes.
