# 922 - TASK-287 stats kpi widget followups

- Date: 2026-05-22
- Version: Unreleased
- Tasks: TASK-287, TASK-287-01, TASK-287-02, TASK-287-03, TASK-287-04, TASK-287-05, TASK-287-06

## Key Changes

### Stats KPI runtime and schema
- Expanded the Stats KPI contract with schema-owned value sizing, description color, prefix/suffix, per-metric accent, static trend metadata, safe per-metric links, and bounded section/icon surface controls while keeping legacy payloads compatible.
- Kept the remaining split-highlight secondary-grid imbalance out of the closure and routed it to shared `TASK-331`; animated counters remain intentionally rejected by the research matrix until a dedicated accessibility/performance task says otherwise.

### Editor workflow
- Expanded the Wizard to include variant cards, header authoring, label/description/icon fields for the visible metric count, header clear, and icon/spacing guidance.
- Reorganized Visual into clearer metric, text/value, card/icon, and layout sections, and added drag-friendly reorder, confirmed removal, and safe link/trend/accent editing.

### Evidence and validation
- Synchronized the Stats KPI Playwright report, widget docs, task board, and changelog with the final fixed/shared/deferred matrix for TASK-287.
- Validated with focused Stats KPI Vitest/Bun suites, `core` lint/type checks, and precommit; `bun run scan:security:strict` still reflects the current local absence of `semgrep`, `trivy`, and `gitleaks` binaries rather than a TASK-287 code regression.
