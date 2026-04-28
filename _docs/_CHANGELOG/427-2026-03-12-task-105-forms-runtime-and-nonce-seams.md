# 427. TASK-105 Forms Runtime And Nonce Seams

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-12, TASK-105-12-02

## Key Changes

### Architecture / Testing
- Refactored `formRuntimeResolver.ts` so Bun-free access logic no longer imports `formsService` at module load time.
- Moved `formRuntimeResolver` and `submissionNonce` tests into `tests/vitest/forms/*`.

### Validation
- Targeted Vitest run passed for `submissionAccess`, `formRuntimeResolver`, and `submissionNonce`.
- `bun --cwd core lint` and `bun --cwd core lint:types` passed.
