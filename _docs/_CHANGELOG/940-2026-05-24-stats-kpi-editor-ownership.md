# 940. Stats KPI editor ownership

- **Date:** 2026-05-24
- **Version:** Unreleased
- **Tasks:** TASK-336-12

## Key Changes

### Editor contract
- Added the Stats KPI v2 editor contract with explicit Wizard seed overlap allowances that expire with `TASK-336-16`.
- Visual is now the daily owner for KPI content, links, typography, card/icon surfaces, and section layout.
- Advanced no longer owns writable metric, style, layout, header, or variant paths; it now shows read-only runtime/style diagnostics, normalized payload, and confirmed repair actions.

### QA and documentation
- Added DOM ownership metadata for Stats KPI controls so Playwright can detect writable paths instead of reporting a false pass.
- Updated Stats KPI docs, smoke inventory, and targeted Playwright evidence for the fixed ownership contract.
