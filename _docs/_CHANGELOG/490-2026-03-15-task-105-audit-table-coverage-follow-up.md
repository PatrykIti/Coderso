# 490. TASK-105 Audit Table Coverage Follow-Up

**Date:** 2026-03-15  
**Version:** Unreleased  
**Tasks:** TASK-105

## Key Changes

### QA / Audit
- Added direct `AuditTable` coverage for user and system rows, selected-row styling, action-menu rendering, and callback routing from both row clicks and “View details”.

### Validation
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/ui/audit-list.test.tsx`
  - `tests/vitest/ui/audit-table-wave.test.tsx`
- Full `bun run test:coverage` passed with:
  - `461` files / `1713` tests
  - `% Stmts`: `69.27`
  - `% Branch`: `60.20`
  - `% Funcs`: `73.11`
  - `% Lines`: `72.46`
