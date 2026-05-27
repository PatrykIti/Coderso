# TASK-339-09: Team Contract Truthfulness

# FileName: TASK-339-09_Team_Contract_Truthfulness.md

**Priority:** High
**Category:** Widgets + Admin UI + UX Contract + Playwright
**Estimated Effort:** Large
**Dependencies:** TASK-339-01
**Status:** To Do
**Owners:** Codex implementation/tests/docs; Claude Playwright UI review

---

## Overview

Make `team` contract metadata match the richer editor that already ships.

## Source Findings

- `core/.tmp/widget_contract_diff.jsonl` shows `team` renders `Visual=4`,
  `Advanced=4` while the contract still declares `Visual=2`, `Advanced=1`.
- The current UI already separates member structure, header CTA, member order,
  and style; the contract is the stale piece.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/TeamEditors.tsx` | Add truthful section ids/roles that match the live UI. |
| `core/widgets/core/team.tsx` | Replace the stale contract with the true rendered section inventory. |
| `tests/vitest/ui/team-editor-wave.test.tsx` | Cover the truthful ids/titles/roles and keep the richer editor green. |
| `tests/vitest/widgets/team.test.tsx` | Keep widget-local editor/runtime behavior green. |
| `tests/vitest/ui/widget-template-editor.test.tsx` | Update section-title expectations. |
| `_docs/_WIDGETS/TEAM.md` | Document the truthful daily IA. |

## Implementation Pseudocode

```tsx
variant and member structure
header copy and cta
members content and order
section and card style

advanced:
layout summary
surface summary
content summary
support actions
```

Data flow:

- Preserve the current richer UI.
- Align the contract and stable DOM metadata to that UI.

Error handling:

- Keep `Advanced` read-only.
- Do not collapse the UI back to `Team content / Section and card style`.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged widget schema.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/team-editor-wave.test.tsx tests/vitest/widgets/team.test.tsx tests/vitest/ui/widget-template-editor.test.tsx`
- Claude headless Playwright review for `team` against the `hero` baseline

## Documentation Updates Required

- Update this task file with accepted/rejected Claude findings.
- Update `_docs/_TASKS/README.md` on status changes.
- Update `_docs/_WIDGETS/TEAM.md`.
- Add a changelog entry and update `_docs/_CHANGELOG/README.md` when the leaf moves to Done.

## Acceptance Criteria

- Team keeps the richer current UI.
- Rendered section ids/titles/roles and `editorContract` match exactly.
