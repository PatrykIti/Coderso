# 426. TASK-105 Assistant Provider And Docs Seams

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-12, TASK-105-12-01

## Key Changes

### Architecture / Testing
- Refactored assistant provider/docs modules so Bun-free helper logic no longer imports settings or integration services at module load time.
- Moved the unlocked assistant docs/provider suites from `tests/unit/assistant/*` into `tests/vitest/assistant/*`.

### Guardrails
- Updated contributor/testing docs to explicitly prohibit import-time DB/settings/runtime coupling in Bun-free modules.
- Documented the preferred pattern: pure helper seams or lazy default deps for runtime wiring.

### Validation
- Targeted Vitest run passed for the moved assistant provider/docs suites.
- `bun --cwd core lint` and `bun --cwd core lint:types` passed.
