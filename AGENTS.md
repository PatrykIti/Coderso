# Agent Guidelines

Follow these rules when working in this repo:

- Work strictly according to the stack documentation and repo docs.
- If a problem is unclear, consult documentation via MCP docs.
- Keep clean architecture and best practices; follow YAGNI, SOLID, DRY, KISS.
- Keep solutions logically consistent and simple for end users.
- Every code change must include tests in the correct lane; run all relevant checks/tests for the touched contract.
- Fix lint/typecheck warnings (e.g., `any`) instead of ignoring; treat as potential security risks.
- Documentation may be in Polish, but code, code comments, and coding style must be in English.

## Task Workflow (Mandatory)

- Before starting any task, review:
  - task documentation in `_docs/_TASKS/*`,
  - related source files,
  - related tests,
  - relevant docs/contracts (`_docs/ARCHITECTURE.md`, `_docs/CMS_API.md`, `_docs/TESTING_STRATEGY.md`, etc.).
- For non-trivial tasks, tasks that change contributor/process rules, or work done alongside other active agents, prefer a dedicated git branch + worktree so the change stays isolated from unrelated in-progress edits in the shared tree.
- If a task is not broken down enough, create physical task/subtask files in `_docs/_TASKS/` first using the exact repo format from `_docs/_TASKS/README.md` (filename, header lines, required fields, required sections, dated statuses, tests, and docs/changelog plan).
- For any task/subtask that touches API routes, include an explicit **Security Contract** subsection: endpoint visibility (`internal` vs `public`), auth model, RBAC, CSRF expectations for admin/internal writes, rate-limit bucket, strict reject-unknown validation, and anti-abuse controls (`nonce` + signature/HMAC for public write; optional reCAPTCHA policy; `session` or `API key scope` for internal mode when applicable).
- Implement in dependency order to avoid unnecessary refactors and rework.
- Do not silently downgrade scope to MVP if full scope was agreed.

## Implementation Rules

- Prefer internal admin endpoints (`/admin/api/*`) unless a public endpoint is explicitly required by architecture/product behavior.
- Do not add production code fallbacks only to satisfy tests. Update tests/wrappers/mocks to match real behavior.
- Own schemas, enums, defaults, and `normalize*` helpers in the domain/service contract module. Routes may re-export them, but admin/runtime code must import the owner instead of duplicating contract logic.
- For DB changes, always include full migration artifacts:
  - SQL migration file,
  - `meta/*_snapshot.json`,
  - `meta/_journal.json` update.
- Preserve backward compatibility where required by task contract.
- Follow existing admin UX patterns (cache/prefetch/SPA consistency) unless task explicitly changes them.
- Admin navigation, route matching, aliases, and prefetch must go through the shared canonical helpers (`adminPaths`, `AdminLink`, `prefetchAdminRoute`). Do not hand-build admin hrefs, alias logic, or prefetch matching.
- Model external/admin/plugin/runtime payloads schema-first: define or extend the validation schema, reject unknown fields, and normalize through explicit `normalize*` helpers before persistence, rendering, or caching.
- Favor deterministic contracts: stable ids/slugs/anchors, clamped limits, explicit defaults, explicit schema versions where needed, and non-destructive legacy adapters instead of destructive rewrites when old data must still render.
- Route modules stay orchestration-only: validate payloads, enforce permissions, do minimal coercion, delegate business rules to services, and map known domain errors through centralized `map*Error` helpers.
- Keep domain/service errors machine-readable (`*_invalid`, `*_not_found`, `*_conflict`, etc.) and map them to `ApiError` at the route boundary through centralized `map*Error` helpers.
- When extending admin resources, follow the shared cache contract end-to-end: add cache keys/TTLs, cached client wrappers, invalidation plus `cacheBus` broadcasts, cache-hydrate plus background revalidation UI behavior, and never introduce mount-force refetch loops or dirty-state overwrites.
- Do not place secrets, provider keys, or privileged settings in browser cache/localStorage/debug payloads; preserve backend-only handling, encryption, and redaction rules from `_docs/SECURITY_SPEC.md`.
- Public write endpoints must use the shared access evaluators plus nonce/captcha hardening patterns that already exist in forms/booking; do not invent weaker one-off anti-abuse flows.

## Product Contract Rules

- Widgets, presets, and templates are product surfaces, not loose primitives. New module-facing work should stay composite-first and beginner-friendly by default; widget changes should ship `schema`, `defaults`, `normalize*`, render contract, `wizard/visual/advanced` editors, and tests.
- If a widget or module change affects pack completeness/readiness, update the pack contract in code and docs (`core/widgets/modulePackMatrix.ts`, `_docs/WIDGET_PACK_MATRIX.md`, relevant `_docs/_WIDGETS/*` files).
- Plugin/runtime extensions must obey manifest normalization and safe route contracts: declared contributions, safe relative routes, explicit permissions for write methods, and internal admin scoping unless architecture explicitly requires otherwise.
- Assistant and automation flows must stay typed and explainable: prefer `plan -> actions -> execute -> validate`, support dry-run/review before mutation where the contract expects it, and keep actions auditable and idempotent.

## Testing Architecture Rules

- Follow `_docs/TESTING_STRATEGY.md`. Do not invent an ad-hoc testing split per task.
- Treat runner ownership as a target architecture, but validate against the command surface that actually exists in the repo today.
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
- Introduce new lane changes additively first and keep the existing command surface green while migrating ownership.
- Prefer `tests/vitest/*` for Bun-free suites by default. Use `tests/vitest/ui-integration/*` for Bun-free integration render flows.
- Do not migrate runtime tests to Vitest only to improve coverage numbers.
- Do not leak `Bun.*` APIs into pure domain, SDK, or admin/UI layers. Keep Bun-specific logic behind narrow runtime adapters.
- Vitest lane is shipped for Bun-free suites. Continue to validate against the actual command surface in the checked-out branch before claiming lane ownership.
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
- Choose tests by dependency shape, not by folder name alone. `tests/unit/*` may still be Bun-owned or DB-backed, and `tests/integration/*` may still require targeted non-runtime assertions.
- If a task touches runtime-kernel behavior, plugin lifecycle, performance gates, or security gates, Bun-based suites are mandatory.
- If a task touches pure domain/admin/UI/SDK code that is owned by the Vitest lane, run the relevant Vitest suites and coverage commands when that lane exists for the touched surface; otherwise run the currently shipped Bun suites and note the temporary gap against the target architecture.
- When bootstrapping a new lane, always run targeted comparison smoke tests for the equivalent existing Bun-owned suites before claiming migration safety.
- If broad legacy suites fail for unrelated pre-existing reasons, record that separately and do not attribute the failures to the new lane bootstrap without isolating them first.
- If a task touches `store/**`, run `bun --cwd store lint` and report the result. If a task touches `packages/sdk/**`, run `tsc -p packages/sdk/tsconfig.json --noEmit` and `bun test tests/unit/sdk`.
- For every new or changed route family, add or update route registration tests and `map*Error` coverage in addition to service/domain tests.
- If a change touches release-gated behavior (`functional`, `ux`, `performance`, `security`, `reliability`), run or update the relevant gate suites and keep `scripts/coderso-release-gates.ts`, workflow files, and docs in sync when the contract changes.
- For Coderso work, `bun run gates:coderso` is a baseline gate, not a substitute for all targeted suites. Run the exact `tests/perf/*`, `tests/security/*`, route, and reliability suites for the touched surface when the task changes those contracts.
- Before `bun test:full`, verify the database behind `DATABASE_URL` is reachable; if not, pause tests and report it.
- For auth, public-write, secret-handling, dependency, or scanner-config changes, run the local Semgrep/Trivy/Gitleaks commands from `_docs/SECURITY_SPEC.md` when feasible or state clearly that validation remains CI-only. Any change to scanner allowlists/configs must record owner, reason, expiry, and ticket in task/changelog notes.
- If `bun test:full` cannot complete due to DB/network issues, rerun after recovery and update the changelog with the final test status.
- If any tests are skipped or cannot run, state it clearly in the summary.

## Task Closure Rules

- Update task/subtask status in `_docs/_TASKS/*`.
- Keep `_docs/_TASKS/README.md` tables and statistics synchronized with task file status changes.
- Add a changelog entry in `_docs/_CHANGELOG/` and update `_docs/_CHANGELOG/README.md` for every completed task, including docs/process-only work. Follow the numbering, index, and task-ID rules from `_docs/_CHANGELOG/README.md`.
- Update relevant documentation for any API/architecture/UX contract changes.
- If you add or change admin cached resources, update `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md`.
- If you change plugin/runtime contracts, widget pack coverage, assistant workflow contracts, or release-gate contracts, update the corresponding source-of-truth docs (`_docs/CODERSO_PLUGIN_CONTRACT.md`, `_docs/WIDGET_PACK_MATRIX.md`, `_docs/ASSISTANT_SITE_BUILDER.md`, `_docs/CODERSO_RELEASE_GATES.md`).
