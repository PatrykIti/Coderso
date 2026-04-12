# TASK-173-01-01: Docs-Only Cannot Mutate Regression
# FileName: TASK-173-01-01_Docs_Only_Cannot_Mutate_Regression.md

**Priority:** High  
**Category:** QA/Assistant + Security  
**Estimated Effort:** Small  
**Dependencies:** TASK-173-01  
**Status:** Done (2026-04-12)

---

## Overview

Add explicit regression coverage that `docs-only` remains read-only even when users ask for setup or mutation prompts.

## Sub-Tasks

No child task files.

## Pseudocode

```ts
const answer = await assistantChat({
  mode: "docs-only",
  message: "stworz mi katalog produktow i opublikuj strone",
});

expect(answer.effectiveMode).toBe("docs-only");
expect(answer).not.toHaveProperty("actions");
expectNoMutationRoutesCalled();
```

## Files to Change

- `tests/vitest/assistant/assistantService.test.ts` if Bun-free path exists
- `tests/unit/assistant/assistantService.test.ts` if runtime/service imports require Bun
- `tests/vitest/ui/assistant-panel-interaction.test.tsx`
- `core/services/assistant/assistantService.ts` only if regression exposes a gap

## Security Contract

- Visibility: chat route behavior; no new endpoint.
- Auth model: admin session.
- RBAC: docs-only does not request write permissions.
- CSRF: chat POST behavior unchanged.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: mutation-like text remains text, not action payload.
- Anti-abuse: no public write path.
- Idempotency: not applicable because no mutation.
- Secret handling: unchanged docs-only redaction.

## Testing Requirements

- Vitest:
  - UI does not show action review for docs-only setup prompt.
- Bun:
  - service/route regression if chat runtime remains Bun-owned.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` only if read-only wording changes.
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. Docs-only never returns executable action plans.
2. UI does not show confirm flow for docs-only answers.
3. Mutation prompts in docs-only become guidance/fallback, not writes.

## Completion Notes (2026-04-12)

- Added Bun service regression proving `docs-only` mutation prompts remain read-only and do not call the LLM provider.
- Confirmed responses do not expose an `actions` payload.
