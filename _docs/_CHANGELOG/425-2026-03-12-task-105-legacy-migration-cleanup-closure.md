# 425. TASK-105 Legacy Migration Cleanup Closure

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-11, TASK-105-11-04

## Key Changes

### QA / Runner Ownership
- Closed the legacy Bun-free migration cleanup track after moving the remaining mechanically Bun-free suites into Vitest and freezing the intentional Bun-owned boundary cases.
- The repo now has an explicit runner split for:
  - Bun-owned runtime, DB-backed, perf, security, and boundary/server cases
  - Vitest-owned admin/UI, SDK, custom screens, validation, assistant helpers, pure posts/forms helpers, server helpers, and pure search logic

### Validation
- Full `bun run test:vitest` passed with `425` files and `1449` tests.
- Bun-owned smoke validation passed for the remaining explicit unit Bun cases exercised in this closure pass.
- `bun --cwd core lint` and `bun --cwd core lint:types` passed.

### Remaining Focus
- What remains after this closure is not runner cleanup. It is ordinary product work or deeper refactors in still-mixed modules.
