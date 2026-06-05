# Agent Guidelines

Follow these rules when working in this repo:

- Work strictly according to the stack documentation and repo docs.
- If a problem is unclear, consult documentation via MCP docs.
- Keep clean architecture and best practices; follow YAGNI, SOLID, DRY, KISS.
- Keep solutions logically consistent and simple for end users.
- Every code change must include tests in the correct lane; run all relevant checks/tests for the touched contract.
- Fix lint/typecheck warnings (e.g., `any`) instead of ignoring; treat as potential security risks.
- Documentation may be in Polish, but code, code comments, and coding style must be in English.

## Repo Index

Start here for contributor and agent context.

Root project docs:

- `README.md` - public Coderso product overview
- `CONTRIBUTING.md` - contributor workflow and pull request expectations
- `CODE_OF_CONDUCT.md` - community standards and enforcement
- `SUPPORT.md` - support request routing and triage expectations
- `SECURITY.md` - private vulnerability reporting policy
- `LICENSE.md` - Apache-2.0 license
- `.github/ISSUE_TEMPLATE/` - public issue forms and security contact links
- `.github/PULL_REQUEST_TEMPLATE.md` - pull request summary, validation, and
  release notes template

Human-facing documentation lives in `docs/`:

- `docs/README.md` - documentation hub (routes users vs developers)
- `docs/guide/` - end-user product docs; also the AI assistant knowledge corpus
  (ingested from `docs/guide/` via `POST /assistant/reindex`)
- `docs/develop/` - developer/contributor handbook (setup, architecture, runtime
  model, content/widgets, plugins, assistant, testing, security, contributing)

Primary internal/agent docs live in `_docs/`:

- `AGENTS.md` - agent guidelines
- `_docs/ARCHITECTURE.md` - core architecture and system rules
- `_docs/CMS_SPEC.md` - CMS scope and overview
- `_docs/CMS_API.md` - admin API endpoints
- `_docs/CONTENT_TYPES_SPEC.md` - collections and content types
- `_docs/DATA_MODEL.md` - database schema overview
- `_docs/DESIGN_TOKENS.md` - design tokens and theming
- `_docs/MEDIA_SPEC.md` - media storage and uploads
- `_docs/PAGE_MODEL.md` - page builder JSON model
- `_docs/PREVIEW_SPEC.md` - draft preview flow
- `_docs/ORM_SPEC.md` - ORM choice and configuration
- `_docs/AUTH_SPEC.md` - authentication and sessions
- `_docs/RBAC_SPEC.md` - roles and permissions
- `_docs/RELEASE_PROCESS.md` - semantic-release, PR release notes, and Docker image publishing
- `_docs/THEMES_SPEC.md` - themes and theme profiles
- `_docs/SEARCH_SPEC.md` - search and indexing
- `_docs/AUDIT_SPEC.md` - audit logs
- `_docs/SECURITY_SPEC.md` - baseline security middleware
- `_docs/README.md` - docs index
- `_docs/SDK_SPEC.md` - plugin SDK contract
- `_docs/STORE_SPEC.md` - store + security pipeline
- `_docs/TESTING_STRATEGY.md` - target hybrid testing model for Bun runtime and Vitest coverage lanes
- `_docs/WIDGETS.md` - core widgets and configuration model
- `_docs/_WIDGETS/README.md` - widgets index and per-widget docs
- `_docs/_TASKS/README.md` - tasks index
- `_docs/_CHANGELOG/README.md` - changelog index

Testing docs:

- `tests/README.md` - current runner ownership and test command surface

## Task Workflow (Mandatory)

- Before starting any task, review:
  - the relevant task file in `_docs/_TASKS/`, if one exists,
  - `_docs/_TASKS/README.md` plus parent/child task state,
  - product and architecture constraints from `README.md`, `CONTRIBUTING.md`,
    `_docs/ARCHITECTURE.md`, `_docs/CMS_SPEC.md`, `_docs/CMS_API.md`,
    `_docs/TESTING_STRATEGY.md`, and the domain docs that own the touched area,
  - related source files and tests,
  - current git diff/status once code or docs changes exist.
- For non-trivial tasks, tasks that change contributor/process rules, or work
  done alongside other active agents, prefer a dedicated git branch + worktree
  so the change stays isolated from unrelated in-progress edits in the shared
  tree.
- If scope is unclear or a task is not broken down enough, split or refine the
  task before implementation. Do not silently downgrade agreed scope to a
  smaller MVP.
- Use `_docs/_TASKS/TASK-###_Short_Title.md` for board-level task files unless a dedicated migration task renames a board family.
- Use physical child files for implementation work that is too large for one task file:
  - `TASK-###-NN-Title.md` for a technical subtask under `TASK-###`,
  - `TASK-###-NN-LNN-Title.md` for an executable leaf under `TASK-###-NN`,
  - `TASK-###-NN-SNN-Title.md` for an optional deeper technical subtask under `TASK-###-NN`.
- Existing task families may keep their established numeric descendant pattern,
  such as `TASK-###-NN-NN-Title.md`. Do not rename historical task families
  outside a dedicated migration task.
- Numbering is zero-padded and stable after merge. `NN` starts at `01` inside
  each parent task, while `LNN` and `SNN` start at `L01` and `S01` inside each
  technical subtask. Do not reuse retired numbers; supersede old files and
  allocate the next number.
- Board-level task filename slugs use underscores after the task ID. Physical
  child filename slugs use hyphens, not underscores or spaces. The H1 must match
  the physical task ID, `# FileName:` must equal the actual filename, and child
  files must include a parent field such as `**Parent Task:** TASK-###` or
  `**Parent Subtask:** TASK-###-NN`.
- Template-only files such as `_docs/_TASKS/EXAMPLE_TASK.md` may use `TASK-000`
  as an illustrative ID when the file clearly says it is not a board task.
- New or substantially rewritten task files must keep the `**Status:**` field
  canonical: `⏳ To Do`, `🚧 In Progress`, `✅ Done`, `⏭️ Superseded`, or
  `❌ Cancelled`. Put dates, reasons, follow-on links, and completion notes in
  dedicated fields such as `**Started:**`, `**Completed:**`,
  `**Superseded By:**`, or `**Cancellation Reason:**`. Legacy status lines may
  be normalized when the task file is touched or by a dedicated migration task.
- Execution-ready leaf tasks must include implementation pseudocode for the
  expected code changes, including the main helper/function shape, data flow,
  error handling, and regression-test shape. The implementer should be able to
  execute from the task without rediscovering the fix strategy.
- For any task/subtask that touches API routes, include an explicit
  **Security Contract** subsection: endpoint visibility (`internal` vs
  `public`), auth model, RBAC, CSRF expectations for admin/internal writes,
  rate-limit bucket, strict reject-unknown validation, and anti-abuse controls
  (`nonce` + signature/HMAC for public write; optional reCAPTCHA policy;
  `session` or `API key scope` for internal mode when applicable).
- If the user explicitly approves Claude/subagent consultation for non-trivial
  implementation or task-contract work, run a read-only pre-implementation task
  audit before editing the implementation contract. Agent consultation is
  egress: do not send secrets, credentials, private provider keys, raw sensitive
  logs, or unredacted user data. Use read-only planning by default; for Claude
  CLI prefer
  `claude -p --permission-mode plan --effort xhigh --tools Read,Grep,Bash` or
  the highest supported effort value, and record any fallback in the
  task/changelog closeout. Do not set artificial token, time, or cost budgets
  unless the user explicitly asks for that constraint.
- Pre-implementation audit prompts must state the repo path, current HEAD and
  dirty-worktree context, task ID(s), that no files may be edited, and that
  findings must be ordered by severity with concrete file/line references. The
  audit must compare task file state, parent/child state, product and
  architecture constraints, current implementation, tests, validation lanes, and
  git diff.
- Treat Claude and subagent reports as review evidence, not authority. Verify
  every actionable finding against local files and command output before
  changing code or task state.
- If a pre-implementation audit finds real task drift, stale assumptions,
  missing validation, or contradictions, fix the task contract first, validate
  the correction, and rerun a fresh read-only audit before implementation when
  the external audit is part of the task. If a workflow includes manual commits,
  rerun on the new HEAD; otherwise rerun against the final working tree and
  record the dirty-worktree context.
- Do not begin implementation from a stale pre-audit. If any task, changelog,
  source, test, or validation-contract file changes after the pass, that pass is
  obsolete for the changed contract.
- After implementation, docs, validation, and commits are complete, run fresh
  read-only drift passes on the final committed HEAD when the task uses external
  audit and commits. If the task does not include manual commits, run the final
  pass against the validated working tree and include HEAD plus diff/status
  context in the prompt.
- Post-implementation drift passes must check the task contract, parent/child
  statuses, changelog/index entries, validation evidence, code boundaries,
  security invariants, and known drift risks discovered during the task.
- If a drift pass reports real drift, fix it, validate the fix, update
  docs/changelog evidence when needed, and repeat with a fresh pass. Continue
  until no unresolved high/medium/low drift remains or every remaining item is
  explicitly split into a non-blocking follow-up task with rationale.
- Drift passes supplement dependency-shaped validation; they do not replace
  required tests, linters, type checks, security scans, task graph audits, or
  runtime smoke tests.
- Implement in dependency order to avoid unnecessary refactors and rework.

## Implementation Rules

- Prefer internal admin endpoints (`/admin/api/*`) unless a public endpoint is explicitly required by architecture/product behavior.
- Do not add production code fallbacks only to satisfy tests. Update tests/wrappers/mocks to match real behavior.
- Own schemas, enums, defaults, and `normalize*` helpers in the domain/service contract module. Routes may re-export them, but admin/runtime code must import the owner instead of duplicating contract logic.
- For Bun-free modules, avoid import-time coupling to `db/client`, runtime/server adapters, settings services, or integration services. Keep pure logic in standalone modules or use lazy default deps so Vitest can import the module without env/runtime side effects.
- For DB changes, always include full migration artifacts:
  - SQL migration file,
  - `meta/*_snapshot.json`,
  - `meta/_journal.json` update.
- Preserve backward compatibility where required by task contract.
- Follow existing admin UX patterns (cache/prefetch/SPA consistency) unless task explicitly changes them.
- Admin navigation, route matching, aliases, and prefetch must go through the shared canonical helpers (`adminPaths`, `AdminLink`, `prefetchAdminRoute`). Do not hand-build admin hrefs, alias logic, or prefetch matching.
- For admin React/UI work under ESLint 9 and the React Hooks Compiler rules, treat `react-hooks/*` findings as implementation contract issues. Do not weaken the full `eslint-plugin-react-hooks` recommended preset to make lint pass. Avoid synchronous `setState` calls in effect bodies; prefer lazy initializers, render-time derivation, reducers, event handlers, explicit subscription callbacks, and async result boundaries. Preserve cache hydration, dirty-state protection, and background revalidation semantics while refactoring effects.
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
- A suite is not Bun-free if importing its production module immediately triggers DB/settings/runtime coupling. Refactor the production module first instead of forcing the test into Vitest with brittle mocks.
- DB-backed tests must create uniquely scoped fixtures and clean up only the rows they created or explicitly own. Do not truncate or delete whole domain tables from shared test databases; each suite must remain independent and only exercise its own contract.
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
- Before creating a manual commit, run `bun run precommit` unless the commit is
  created through the configured Git hook path and the hook runs automatically.

## Task Closure Rules

- Update task/subtask status in `_docs/_TASKS/*`.
- Do not leave open direct children under a closed parent. Convert remaining
  work into explicit follow-on tasks when needed.
- A parent may move to `✅ Done` only when all physical descendants are
  `✅ Done`, `⏭️ Superseded`, or `❌ Cancelled`.
- Keep `_docs/_TASKS/README.md` tables and statistics synchronized with task file status changes.
- Add a changelog entry in `_docs/_CHANGELOG/` and update `_docs/_CHANGELOG/README.md` for every completed task, including docs/process-only work. Follow the numbering, index, and task-ID rules from `_docs/_CHANGELOG/README.md`.
- Preserve review transcripts or concise summaries in the task/changelog
  closeout when they materially affected the implementation, especially when a
  drift finding caused an additional fix.
- Update relevant documentation for any API/architecture/UX contract changes.
- If you add or change admin cached resources, update `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md`.
- If you change plugin/runtime contracts, widget pack coverage, assistant workflow contracts, or release-gate contracts, update the corresponding source-of-truth docs (`_docs/CODERSO_PLUGIN_CONTRACT.md`, `_docs/WIDGET_PACK_MATRIX.md`, `_docs/ASSISTANT_SITE_BUILDER.md`, `_docs/CODERSO_RELEASE_GATES.md`).
