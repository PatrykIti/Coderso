# 370. TASK-105 Coverage Gap Rebaseline and Lane Backlog

**Date:** 2026-03-08  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-10

## Key Changes

### QA / Coverage Analysis
- Re-ran the live `TASK-105` Vitest coverage baseline on `2026-03-08` and documented the current snapshot at `47.56% stmts`, `42.37% branch`, `42.21% funcs`, `50.18% lines`.
- Captured the remaining real backlog after filtering `11` infrastructure-noise files, leaving `374` coverage gaps still under `100%`.
- Quantified that only `161` of those files belong to the current open `TASK-105-04..07` waves, while `213` files sit outside the original task split and must be absorbed before any honest final-closure pass.

### Lane Ownership
- Documented the practical split between `Vitest` backlog and `Bun` suites that should remain in the Bun lane for runtime, route, performance, and security coverage.
- Mapped the current `Vitest` and `Bun` overlaps for `themes/booking/listings/forms`, `entries/pages/posts`, `widget editors`, and `sdk/custom screens`.

### Execution Plan
- Added a dedicated `TASK-105-10` analysis subtask with file-level backlog and recommended execution order.
- Updated the umbrella `TASK-105` doc so future waves use the `2026-03-08` re-baseline instead of the older `2026-03-06` snapshot.
