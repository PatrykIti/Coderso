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
  - relevant docs/contracts (`_docs/ARCHITECTURE.md`, `_docs/CMS_API.md`, etc.).
- If a task is not broken down enough, create physical subtask files in `_docs/_TASKS/` first (with scope, files to change, pseudocode, tests, and docs/changelog plan) before implementation.
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

## Validation Rules

- Run at minimum:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - all relevant unit/integration tests for touched areas.
- For DB-backed features, run DB tests when `DATABASE_URL` is available.
- If any tests are skipped or cannot run, state it clearly in the summary.

## Task Closure Rules

- Update task/subtask status in `_docs/_TASKS/*`.
- Add a changelog entry in `_docs/_CHANGELOG/` and update `_docs/_CHANGELOG/README.md`.
- Update relevant documentation for any API/architecture/UX contract changes.
