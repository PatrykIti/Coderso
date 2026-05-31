# 891. TASK-319 newsletter responsive variant decision

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-319, TASK-319-01, TASK-319-02, TASK-319-03

## Key Changes

### Newsletter responsive variant decision

- Audited the shipped Newsletter variant behavior and closed BF-15 as
  current-state sufficient.
- `inline` and `minimal` already stack on mobile and only switch to a row from
  `sm`, so the cited desktop-inline/mobile-stacked ask does not require a new
  schema field.
- Newsletter keeps the scalar `variant` contract; no breakpoint-owned
  `mobileVariant` override was added.

### Evidence and closure

- Added regression coverage that proves the current mobile stacking contract and
  rejects unknown responsive override data.
- Updated the Newsletter report, widget docs, task board, and task files to
  point at the explicit TASK-319 decision instead of an open responsive
  follow-up.
- Closed `TASK-319-02` as not applicable after the audit confirmed no bounded
  mobile override implementation was needed.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/newsletter-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `git diff --check`
- `bun run precommit`
- `bun run scan:security:strict` (current local environment is missing
  `semgrep`, `trivy`, and `gitleaks`; `bun audit` still completed successfully)
