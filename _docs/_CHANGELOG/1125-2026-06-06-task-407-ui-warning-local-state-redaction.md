# 1125 - TASK-407 UI warning local-state redaction

Date: 2026-06-06
Version: unreleased
Tasks: TASK-407-06-L05

## Key Changes

### Assistant Site Builder
- Added prompt-poisoning-aware UI redaction for site-builder intake warning and
  final-review text so hostile instructions, signed URLs, cookies, and token-like
  payloads do not appear in rendered DOM or snapshots.
- Preserved current-step dirty drafts during background revalidation while
  keeping submitted-answer acknowledgements server-authoritative.

### Assistant Cache
- Hardened the floating assistant conversation localStorage cache with a
  serialized-size cap, unknown-key rejection, stale discard, and recursive
  sanitization for transcript, active plan, preview, and execution payloads.
- Kept active site-builder intake answers out of browser persistence; restored
  plans without in-memory answers still require restart before saving more steps.

### Task and Docs
- Corrected the L05 implementation contract after Claude/subagent audit so the
  work targets the floating intake stepper and conversation cache, while legacy
  `AiSiteWizard` convergence remains in TASK-407-06-L06.
- Updated `docs/develop/assistant.md` and `_docs/ASSISTANT_SITE_BUILDER.md`
  with the local-state, cache, and screenshot-safe redaction contracts.

## Validation

- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/assistant-site-builder-intake-redaction.test.tsx tests/vitest/ui/assistant-conversation-state.test.ts tests/vitest/ui/assistant-site-builder-intake-browser-state.test.ts tests/vitest/ui/assistant-site-builder-intake-state.test.ts tests/vitest/ui/assistant-site-builder-intake-*.test.tsx tests/vitest/assistant/assistantSiteBuilderIntakeRedaction.test.ts`
  (8 files, 34 tests)
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `bun run precommit`
- Claude and subagent read-only audits found L05 contract drift before
  implementation; the corrected contract passed a fresh read-only re-audit
  before code changes began.
