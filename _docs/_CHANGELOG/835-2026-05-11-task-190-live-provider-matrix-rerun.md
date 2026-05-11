# 835 - TASK-190 live provider matrix rerun

Date: 2026-05-11
Version: Unreleased
Tasks: TASK-190, TASK-190-08, TASK-190-08-04

## Key Changes

### Assistant/QA
- Closed the approval-gated TASK-190 live provider rerun after explicit user
  approval for sending test prompts and fixture data to the configured
  OpenAI/OpenRouter providers.
- Fixed the live CMS matrix harness so every context that supplies a fixture
  `resourceCatalog` also sets `includeResourceCatalog: true`, matching the
  current server-side trust contract used by deterministic assistant tests.
- Synchronized TASK-190 closure notes and the task board so the live rerun is
  recorded as complete instead of pending.

### Validation
- Initial `bun run test:assistant:live` failed in the OpenAI CMS slice because
  fixture catalogs were intentionally ignored without the trust flag.
- Passed `bun run test:assistant:live:cms:openai` after the harness fix (`15`
  tests, `263` assertions).
- Passed full `bun run test:assistant:live` outside the sandbox:
  - route OpenAI: `1` test, `33` assertions,
  - route OpenRouter: `1` test, `43` assertions,
  - CMS OpenAI: `15` tests, `263` assertions,
  - CMS OpenRouter: `15` tests, `263` assertions.
- Passed `bun run lint`.
- Passed `bun run test:bun` outside the sandbox (`763` tests, `2956`
  assertions).
- Passed `bun run test:vitest` (`582` files, `2611` tests).
- Passed `bun run scan:security:strict` clean across Semgrep, `bun audit`,
  Trivy vulnerability/config/secret scans, and Gitleaks history/worktree scans.
  Container image scanning remained skipped because `SECURITY_SCAN_IMAGE` was
  not set.
