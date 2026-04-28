# 428. TASK-105 Import Boundary Guardrails

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-12, TASK-105-12-05

## Key Changes

### Docs / Guardrails
- Added an explicit import-boundary rule to `AGENTS.md`: Bun-free modules should not import DB/settings/runtime services at module load time.
- Added the same rule to `_docs/TESTING_STRATEGY.md` and `tests/README.md`.
- Documented the preferred pattern: pure helper seams or lazy default deps for runtime wiring.
