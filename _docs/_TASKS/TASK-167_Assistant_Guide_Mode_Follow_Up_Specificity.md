# TASK-167: Assistant Guide-Mode Follow-Up Specificity
# FileName: TASK-167_Assistant_Guide_Mode_Follow_Up_Specificity.md

**Priority:** High  
**Category:** Assistant/Core + Docs/Assistant  
**Estimated Effort:** Small  
**Dependencies:** TASK-119-02, TASK-119-03, TASK-166  
**Status:** Done (2026-03-22)

---

## Overview

Correct the remaining docs-only follow-up quality issues for widget guidance,
especially when the user asks for `Troubleshooting`, `Decision guide`,
`Checklist`, or `Security`.

The current regression is that mode-specific follow-ups can still mix a generic
default block with a helper-mode block even when the canonical doc already has a
dedicated section for that mode. This makes answers feel repetitive and pushes
some Hero-specific follow-ups back toward generic template-editor guidance.

## Security Contract

- Visibility: `internal` (`POST /admin/api/assistant/chat`)
- Auth: admin session + `settings:read`
- CSRF: required for chat POST
- Rate limit bucket: existing assistant/admin read limits remain unchanged
- Validation: no payload contract change; depth/mode inputs stay strictly typed
- Anti-abuse: no new public surface, no arbitrary prompt-controlled execution

## Sub-Tasks

1. Update the canonical `Widget Template Editor` doc so `Medium`, `Advanced`,
   and `Security` stay Hero-specific enough for follow-up retrieval.
2. Adjust `docsAnswerComposer` so a dedicated guide-mode section becomes the
   primary body instead of being followed by a redundant fallback helper block.
3. Add regression coverage for guide-mode composition and widget security
   retrieval.
4. Sync architecture/assistant docs, task board, and changelog.

## Files

- `docs/coderso/widget-template-editor.md`
- `core/services/assistant/docsAnswerComposer.ts`
- `tests/vitest/assistant/docsAnswerComposer.test.ts`
- `tests/vitest/assistant/docsDbRetriever.test.ts`
- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run vitest run tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/assistant/docsAnswerComposer.test.ts`

## Documentation Updates Required

- `docs/coderso/widget-template-editor.md`
- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Completion Notes (2026-03-22)

- Enriched the canonical widget template editor doc so follow-up depth/mode
  answers keep explicit Hero block context across `Medium`, `Advanced`, and
  `Security`.
- Updated guide-mode composition so dedicated helper sections render as the
  primary answer block without redundant fallback repetition.
- Added regression coverage for widget security retrieval and guide-mode answer
  composition.
