# 1102 - TASK-407 site-builder intake normalization

Date: 2026-06-05
Version: Unreleased
Tasks: TASK-407, TASK-407-02, TASK-407-02-L02

## Key Changes

### Assistant intake validation

- Added service-owned intake errors, per-step answer normalizers, and derived
  fact assembly for Basic and Advanced site-builder sessions.
- Reject unknown answer keys, duplicate answers, invalid versions, unknown
  option ids, and Advanced-only steps submitted in Basic mode.
- Validate content-engine choices through the shared backend-owned option
  registry path.
- Keep the contract generic by deriving facts from site/topic/vertical/page-role
  inputs rather than a single hardcoded industry profile.

### Safety and review flow

- Treat user text as bounded content data; prompt-injection-like text is
  preserved only as sanitized copy context.
- Redact secret-like values and provider tokens from normalized answers and
  derived facts.
- Ignore client-supplied `facts` as a trusted source and derive
  `readyForReview` / `readyForExecution` from normalized answers.
- Require explicit `confirmed: true` before `readyForExecution`; a submitted
  `reviewState: "confirmed"` alone does not unlock execution.
- Preserve redaction state for short bounded fields whose output would otherwise
  clip the redaction marker.

### QA

- Added Vitest coverage for Basic and Advanced fact derivation, unknown-key and
  unknown-option rejection, duplicate answer rejection, forged facts, text
  bounds, short-field secret redaction, invalid mode rejection, explicit review
  confirmation, and hostile prompt handling.
- Validation passed:
  - `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/assistantSiteBuilderIntakeRegistry.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeNormalizer.test.ts` (13 tests)
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `git diff --check`
  - `bun run precommit`
