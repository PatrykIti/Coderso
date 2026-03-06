# Agent Guidelines

Follow these rules when working in this repo:

- Work strictly according to the stack documentation and repo docs.
- If a problem is unclear, consult documentation via MCP docs.
- Keep clean architecture and best practices; follow YAGNI, SOLID, DRY, KISS.
- Keep solutions logically consistent and simple for end users.
- Every code change must include unit tests; run all relevant checks/tests.
- Fix lint/typecheck warnings (e.g., `any`) instead of ignoring; treat as potential security risks.
- Documentation may be in Polish, but code, code comments, and coding style must be in English.

## Task Workflow (Mandatory)

- Before starting any task, review:
  - task documentation in `_docs/_TASKS/*`,
  - related source files,
  - related tests,
  - relevant docs/contracts (`_docs/ARCHITECTURE.md`, `_docs/CMS_API.md`, `_docs/TESTING_STRATEGY.md`, etc.).
- If a task is not broken down enough, create physical subtask files in `_docs/_TASKS/` first (with scope, files to change, pseudocode, tests, and docs/changelog plan) before implementation.
- For any task/subtask that touches API routes, include an explicit **Security Contract** subsection: endpoint visibility (`internal` vs `public`), auth model, rate-limit bucket, and anti-abuse controls (`nonce` + signature/HMAC for public write; optional reCAPTCHA policy; `session` or `API key scope` for internal mode when applicable).
- Implement in dependency order to avoid unnecessary refactors and rework.
- Do not silently downgrade scope to MVP if full scope was agreed.

## Implementation Rules

- Prefer internal admin endpoints (`/admin/api/*`) unless a public endpoint is explicitly required by architecture/product behavior.
- Do not add production code fallbacks only to satisfy tests. Update tests/wrappers/mocks to match real behavior.
- For DB changes, always include full migration artifacts:
  - SQL migration file,
  - `meta/*_snapshot.json`,
  - `meta/_journal.json` update.
- Preserve backward compatibility where required by task contract.
- Follow existing admin UX patterns (cache/prefetch/SPA consistency) unless task explicitly changes them.

## Testing Architecture Rules

- Follow `_docs/TESTING_STRATEGY.md`. Do not invent an ad-hoc testing split per task.
- Bun is the runtime kernel. Tests that validate runtime-kernel behavior must stay in Bun.
- Keep Bun for:
  - `Bun.serve` / `Bun.file` behavior,
  - runtime route/integration flows,
  - plugin install/upgrade/rollback and bundle lifecycle,
  - performance gates,
  - security gates,
  - any test that depends on real runtime semantics.
- Use Vitest only for Bun-free layers:
  - pure TypeScript domain/services,
  - admin/UI,
  - SDK/shared contracts,
  - widget/content logic that does not depend on runtime Bun APIs.
- Do not migrate runtime tests to Vitest only to improve coverage numbers.
- Do not leak `Bun.*` APIs into pure domain, SDK, or admin/UI layers. Keep Bun-specific logic behind narrow runtime adapters.
- Treat coverage per lane:
  - Bun coverage is for executed runtime files and runtime contract confidence,
  - Vitest coverage is for source-wide gaps in pure TS/UI lanes.

## Validation Rules

- Run at minimum:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - all relevant tests for touched areas in the correct lane (`bun test` for runtime lanes, `vitest` for Bun-free lanes when applicable).
- For DB-backed features, run DB tests when `DATABASE_URL` is available.
- Before running any tests that touch DB or settings, load repo env vars with:
  - `set -a && source .env && set +a`
- If a task touches runtime-kernel behavior, plugin lifecycle, performance gates, or security gates, Bun-based suites are mandatory.
- If a task touches pure domain/admin/UI/SDK code that is owned by the Vitest lane, run the relevant Vitest suites and coverage commands when the task requires coverage validation.
- Before `bun test:full`, verify the database behind `DATABASE_URL` is reachable; if not, pause tests and report it.
- If `bun test:full` cannot complete due to DB/network issues, rerun after recovery and update the changelog with the final test status.
- If any tests are skipped or cannot run, state it clearly in the summary.

## Task Closure Rules

- Update task/subtask status in `_docs/_TASKS/*`.
- Add a changelog entry in `_docs/_CHANGELOG/` and update `_docs/_CHANGELOG/README.md`.
- Update relevant documentation for any API/architecture/UX contract changes.
