# 1127 - TASK-407 targeted validation lanes

Date: 2026-06-06
Version: unreleased
Tasks: TASK-407-07-L01, TASK-407-07

## Key Changes

### Validation
- Ran the pre-live TASK-407 validation lane after the reviewed LLM Guide intake
  convergence work.
- Covered targeted assistant/admin/UI Vitest suites, targeted assistant
  runtime/route Bun suites, diff hygiene, core lint/typecheck, full Coderso
  release gates, precommit, and local strict security scanners.
- Included the existing `assistant-rate-limit.test.ts` suite in the targeted
  route validation run so the changed assistant route family keeps explicit
  `assistant` bucket coverage.

### Docs and Tasks
- Closed TASK-407-07-L01 and synchronized TASK-407/TASK-407-07 task state,
  board statistics, changelog numbering, and assistant site-builder validation
  evidence.
- Recorded Claude and subagent read-only pre-audit GO evidence before running
  validation lanes.

## Validation

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts ...`
  (34 assistant/admin/UI files, 354 tests)
- `set -a && [ -f .env ] && source .env && set +a; NODE_ENV=test bun test ...`
  (5 assistant runtime/route files, 104 tests)
- `set -a && [ -f .env ] && source .env && set +a; bun run gates:coderso`
  (functional, UX, performance, security, and reliability gates passed with no
  DB-gated skips)
- `bun run precommit`
- `bun run scan:security:strict`
  (Semgrep SAST, Bun audit, Trivy CVE/config/secret, Gitleaks history, and
  Gitleaks worktree scans passed; optional container image scan skipped because
  `SECURITY_SCAN_IMAGE` was not provided)
