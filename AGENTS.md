# Agent Guidelines

Follow these rules when working in this repo:

- Work strictly according to the stack documentation and repo docs.
- If a problem is unclear, consult documentation via MCP docs.
- Keep clean architecture and best practices; follow YAGNI, SOLID, DRY, KISS.
- Keep solutions logically consistent and simple for end users.
- Every code change must include tests in the correct lane; run all relevant checks/tests for the touched contract.
- Fix lint/typecheck warnings (e.g., `any`) instead of ignoring; treat as potential security risks.
- Documentation may be in Polish, but code, code comments, and coding style must be in English.

## File Size and Modularity

- A human-authored production module or test file must contain at most 1,000
  physical lines after a task closes. Count the complete file, including blank
  lines and comments, because they still contribute to review and verification
  cost.
- Do not create, merge, or close work that leaves a touched production module or
  test file above this limit. If a legacy file already exceeds 1,000 lines,
  split it by cohesive responsibility as part of the same substantive change
  before adding further behavior; keep imports and public contracts stable where
  backward compatibility requires it.
- Extract domain logic, fixtures, builders, and focused suites into clearly named
  files instead of moving arbitrary line ranges or creating generic dumping-ground
  helpers. Every extracted test file must remain independently runnable in its
  owning test lane.
- Generated artifacts, lockfiles, vendored code, database snapshots, and generated
  migration metadata are exempt. A file is not exempt merely because splitting it
  is inconvenient.
- Before task closure, run a line-count check over every added or modified
  production module and test file. Treat any result above 1,000 as a failed gate,
  not as a non-blocking LOW or a `TASK-9999` candidate.
- Measure that touched-file scope from the verified pre-task or pre-family baseline
  through the final working tree, including files committed during intermediate
  checkpoints. Staging or committing work must never reset or narrow the gate.

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
  model, content sections/blocks, Dashboard widgets, plugins, assistant,
  testing, security, contributing)

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
- `_docs/WIDGETS.md` - historical `core/widgets/*` runtime/read-compatibility
  model; not a new authoring surface
- `_docs/_WIDGETS/README.md` - historical renderer compatibility index
- `_docs/DASHBOARD_WIDGETS_SPEC.md` - the only configurable product-widget
  surface: admin-only registry, RBAC, cache family, preferences, and render host
- `_docs/_TASKS/README.md` - tasks index
- `_docs/_CHANGELOG/README.md` - changelog index
- `_docs/_workflows/` - multi-agent workflow scripts (`task-###-author-audit.mjs`,
  `task-###-implement.mjs`, `task-###-fix.mjs`) plus smoke evidence in
  `_docs/_workflows/_smoke/`

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
  tree. Alternatively, two streams may run in-place in the shared tree when
  their file ownership is disjoint and each carries the collision guards from
  the Multi-Agent Workflow Process section.
- If scope is unclear or a task is not broken down enough, split or refine the
  task before implementation. Do not silently downgrade agreed scope to a
  smaller MVP.
- Use `_docs/_TASKS/TASK-###_Short_Title.md` for board-level task files unless a dedicated migration task renames a board family.
- `TASK-9999` is the sole reserved four-digit sentinel exception to the
  `TASK-###` naming rule. It is the permanent deferred-LOW family described
  below; do not allocate any other four-digit task ID.
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
- Evidence-backed LOW findings may be deferred only through the permanent
  `TASK-9999` backlog and only when the evidence proves both of these conditions:
  zero current user-visible UI, UX, or accessibility effect; and zero data,
  security, privacy, auth, RBAC, API, persistence, migration, performance,
  reliability, or test-integrity impact. HIGH and MEDIUM findings are never
  eligible. The source task must link a concrete execution-ready `TASK-9999`
  leaf and record the exact evidence plus the reason deferral is safe; a vague
  umbrella note is not a deferral. Search the existing backlog first and link a
  duplicate finding to its existing leaf instead of creating another one.
  Re-triage deferred leaves at the source task's closure, at the quarterly
  `TASK-9999` review, and whenever new evidence changes impact or severity;
  promote any no-longer-eligible item back into active work immediately.
  `TASK-9999` intentionally remains `🚧 In Progress` as the final board item so
  new source-family children can be appended without ever closing the parent.
  Completed TASK-9999 leaves and children still follow normal closure rules,
  including terminal descendant order, changelog coverage, task-board updates,
  and Statistics synchronization; only the sentinel parent remains open.
- Drift passes supplement dependency-shaped validation; they do not replace
  required tests, linters, type checks, security scans, task graph audits, or
  runtime smoke tests.
- Implement in dependency order to avoid unnecessary refactors and rework.

## Multi-Agent Workflow Process

When the owner has granted a standing mandate for agent-driven delivery (the
default on this repo since the `feature/visual` program), substantive tasks run
as orchestrated multi-agent workflows rather than solo edits. This section
extends the consultation rules above: under the standing mandate fresh-context
agents also AUTHOR task contracts and IMPLEMENT code, while the orchestrator
authors the workflow script, dispatches the agents, and stays the FINAL
REVIEWER — every agent finding or claim is still verified against local files
and command output before acting on it.

- Workflow scripts live in `_docs/_workflows/` (`task-###-author-audit.mjs`,
  `task-###-implement.mjs`, `task-###-fix.mjs`); smoke evidence goes to
  `_docs/_workflows/_smoke/`.
- Canonical pipeline: read-only RESEARCH → AUTHOR (parent + subtasks) →
  DRIFT-AUDIT loop → sequential IMPLEMENT with per-subtask gates → POST-AUDIT
  lenses → runtime SMOKE → closure. Parallel streams may defer the full
  mandatory gate set to one combined run (see Validation Rules).

Research and authoring:

- Fresh-context agents ground every anchor (file, symbol, line number) against
  the real source before authoring. Seed hints passed into a workflow are hints
  to VERIFY, never trusted facts; agents must correct wrong seeds explicitly.
- Agents author the board parent + child subtasks per the Task Workflow rules.
  The parent author owns the `_docs/_TASKS/README.md` row/statistics edits;
  child authors touch only their own file.

Drift-audit loop (contract QA before implementation):

- Run at least 5 SEQUENTIAL audit rounds. Each round = parallel per-file drift
  audits + ONE cross-subtask RECONCILE audit + fixers for the HIGH/MEDIUM
  findings (per-file fixers plus one cross-file fixer).
- A round is clean only when there are 0 HIGH/MEDIUM findings AND every audit
  agent returned a result — a missing audit result is a false-clean, not a
  pass.
- The reconcile audit checks only cross-file contradictions: single-writer
  file ownership, identical shared type shapes / enum values / clamp ranges /
  CSS selector strings, helper names consumers use = the names the owning
  subtask defines, per-device representation, test-file names promised vs
  delivered, land order, and the pinned changelog number.
- Authoring loops can OSCILLATE on cross-file contradictions because each
  per-file fixer sees only its file. If the loop hits its round cap without
  converging, address the residual findings surgically with fresh agents, then
  run ONE final fresh read-only reconcile. Implementation may start only from a
  PASS (0 HIGH/MEDIUM).

Implementation pipeline:

- Implement subtasks STRICTLY SEQUENTIALLY in the declared land order. Each
  source file has exactly ONE writer subtask (single-writer ownership). An
  implementer reads the current on-disk state of shared files before editing so
  it builds on, not clobbers, prior work.
- Gate each subtask before the next lands: `bun --cwd core lint:types` +
  `bun --cwd core lint` + the targeted Vitest globs + the targeted Bun test
  paths for the touched contract, with a fix loop of at most 3 rounds. Prefer
  fixing the SOURCE when it diverged from the contract; re-baseline a test only
  for an intended contract change and never weaken a behavior assertion.
- The closure subtask owns tests + docs only (changelog entry, board rows, task
  statuses) and must not re-open source contracts.
- After closure, run a POST-AUDIT of ~5 independent lenses (scope fidelity,
  model/fail-closed correctness, byte-identity/present-only, cross-stream
  safety, test integrity). Findings must be evidence-backed (`file:line`). Fix
  HIGH/MEDIUM once, then re-run the targeted gate.

### Runtime smoke (mandatory for UI/editor work)

- Every implementation stream ends with a runtime smoke of AT LEAST 5 DISTINCT
  real-flow scenarios for the touched area (owner mandate).
  Acceptance-checklist-only smokes are insufficient — cover deep nesting,
  override/reset cycles, every-control-visible-effect, cross-device, and
  publish→front parity where applicable.
- Assert VISIBLE EFFECT — computed styles, geometry/bounding boxes, DOM state
  (`aria-*`, data attributes) — never mere control presence, and never only the
  presence of a CSS/transition string (a rule can be emitted yet visually
  inert).
- Use `playwright-cli` with a task-scoped named session (for example
  `-s=wf508smoke`); save screenshots to `_docs/_workflows/_smoke/` for human
  review.
- Restart the dev server before the smoke (the Bun server does not hot-reload)
  and verify the admin and front respond before testing.
- Feature flows must produce 0 console errors; verify dark mode alongside light
  for admin surfaces.

### Parallel streams and collision guards

- Two task streams may run in-place in the shared tree ONLY when their file
  ownership is disjoint and each carries explicit collision guards: a
  forbidden-paths list naming the other stream's files, and a changelog number
  PINNED per stream up front so closure agents cannot collide.
- Closure agents read `_docs/_TASKS/README.md` and `_docs/_CHANGELOG/README.md`
  FRESH immediately before editing and touch ONLY their own task's rows and
  statistics deltas.
- Only the closure subtask edits `_docs/_TASKS/*` and `_docs/_CHANGELOG/*`;
  implementation agents never touch them.
- Never revert, checkout, or "clean up" uncommitted edits you did not author —
  the owner and other agents work concurrently in the shared tree.
- The owner creates git commits; agents do not commit unless explicitly asked.
  Report the per-task commit scope (file set + changelog number) at closure.

### Operational discipline

- Some large TS/TSX files in this repo are misdetected as binary by `rg` and
  silently return no matches (for example `PageEditor.tsx`,
  `MenuDesignEditor.tsx`, `menuDocumentV2.ts`, `menuDocumentCss.ts`). Use
  `Read`/`grep -an` for those files and never trust an empty `rg` result on
  them.
- Structured outputs: gate, audit, and smoke agents return schema-validated
  results (`{pass, summary, errors[]}`, `{severity, area, finding, evidence,
  recommendation}`, `{pass, serverUp, scenarios[], consoleErrors,
  screenshots[], failures[]}`) so the orchestrator can branch deterministically.

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
- Every new schema key added to a validated document contract must CONSCIOUSLY join its reject-unknown allowlist AND ship a round-trip persistence test — a forgotten allowlist entry fail-closed-degrades every stored document carrying that key on read.
- New optional styling/config fields are present-only by default: no seeded resolution default in the `*_DEFAULTS` emission maps, zero emitted bytes when unauthored, and no-override/legacy documents must stay byte-identical (guard with tests that pin the byte-identity, e.g. `buildSiteShellCss(null)` and no-override document render).
- Favor deterministic contracts: stable ids/slugs/anchors, clamped limits, explicit defaults, explicit schema versions where needed, and non-destructive legacy adapters instead of destructive rewrites when old data must still render.
- Route modules stay orchestration-only: validate payloads, enforce permissions, do minimal coercion, delegate business rules to services, and map known domain errors through centralized `map*Error` helpers.
- Keep domain/service errors machine-readable (`*_invalid`, `*_not_found`, `*_conflict`, etc.) and map them to `ApiError` at the route boundary through centralized `map*Error` helpers.
- When extending admin resources, follow the shared cache contract end-to-end: add cache keys/TTLs, cached client wrappers, invalidation plus `cacheBus` broadcasts, cache-hydrate plus background revalidation UI behavior, and never introduce mount-force refetch loops or dirty-state overwrites.
- Do not place secrets, provider keys, or privileged settings in browser cache/localStorage/debug payloads; preserve backend-only handling, encryption, and redaction rules from `_docs/SECURITY_SPEC.md`.
- Public write endpoints must use the shared access evaluators plus nonce/captcha hardening patterns that already exist in forms/booking; do not invent weaker one-off anti-abuse flows.

## Database Query, Persistence, and Server Cache Rules

### Query and read-model design

- PostgreSQL is the authoritative source of truth. Design every query from a
  named caller/read model, its bounded result shape, stable ordering, expected
  cardinality, freshness requirement, and small-site plus large-site budget;
  never optimize from table shape alone or add an index without a matching
  production query contract.
- Select only the columns the caller consumes. List endpoints must not load
  large `jsonb`, document bodies, encrypted fields, credentials, or revision
  payloads merely to render summaries; detail payloads belong to bounded
  point reads.
- Every user- or data-sized list is bounded at the database boundary. Prefer
  keyset/cursor pagination with a deterministic unique tiebreaker (normally
  `ORDER BY <business sort>, id`) over growing `OFFSET`; validate cursor shape,
  direction, and maximum page size. An unbounded read is allowed only for an
  explicitly documented maintenance/export stream that processes fixed-size
  batches and applies backpressure.
- Avoid N+1 reads and writes. Resolve related records with joins, bounded
  `IN`/`ANY` batches, aggregates, or explicit loaders, and enforce query-count
  regression tests on hot paths. Bulk mutations use set-based SQL or bounded
  batches rather than awaiting one statement per row.
- Search SQL and its index expression must be byte-for-byte compatible at the
  planner boundary. Own one normalized stored/generated search vector (or one
  canonical expression) per search contract; use GIN for full-text search and
  keep leading-wildcard `ILIKE`/trigram fallback explicitly selected, bounded,
  and measured. Do not search wide rows through `jsonb::text` or concatenate
  expressions that cannot use the declared index.
- Promote frequently filtered, joined, constrained, or sorted JSON properties
  to typed columns. Keep `jsonb` for authored documents and sparse payloads,
  with strict schema/normalizer ownership; it is not a substitute for a
  relational key or an excuse for full-row scans.
- Before landing a query or index change, capture sanitized `EXPLAIN (ANALYZE,
  BUFFERS)` evidence against representative small and large fixtures. Test the
  result contract, stable pagination (no gaps/duplicates), query count, and the
  relevant latency/row-scan budget. Never include secrets or raw customer data
  in plans, fixtures, snapshots, logs, or task evidence.

### Tables, constraints, indexes, and lifecycle

- Let the database enforce invariants: use primary/foreign/unique/check
  constraints and map their named errors at the service boundary. A preflight
  existence or uniqueness read is UX assistance, not concurrency control.
- Design indexes from verified predicates and ordering. Put equality filters
  before range/sort columns and finish non-unique traversal indexes with the
  stable cursor tiebreaker; consider partial or covering indexes only with
  measured evidence. Index hot foreign-key delete/join paths, but account for
  write amplification and remove truly redundant indexes only after usage and
  query-shape evidence.
- Revision/version allocation must be concurrency-safe. Do not rely on an
  unlocked `max(version) + 1`; use a sequence/counter, row/advisory lock, or a
  unique constraint plus bounded retry, and test concurrent writers.
- Append-heavy logs, audit events, analytics, revisions, jobs, and outbox rows
  require an explicit retention/archive policy and bounded, resumable pruning.
  Define evidence-based partition thresholds and a runbook before partitioning;
  do not add partitions to small installations without a measured benefit.
- Every schema change ships the SQL migration, snapshot, and journal artifacts.
  Re-read the live migration journal immediately before allocating a number.
  The schema representation consumed by the migration generator, SQL, snapshot,
  and journal must land atomically under one writer; never land DDL first and
  defer the matching Drizzle/schema export to a later task.
  Document expected locks, table rewrites, backfill batches, rollback/forward
  recovery, and deploy ordering. `CREATE INDEX CONCURRENTLY` must not be placed
  inside a transactional migration; if needed, give it an explicit separately
  validated operations phase.
- Keep human-authored schema modules cohesive and below the repository line
  limit. If a legacy schema/service module already exceeds 1,000 lines, split
  it by domain ownership before extending it; generated migration metadata
  remains exempt.

### Transactions and database clients

- A mutation that spans related rows is one explicit transaction. Reads and
  writes inside it must use the provided transaction handle, not the global DB
  client. External I/O, cache publication, webhooks, and other irreversible
  effects happen only after commit or through a transactional outbox.
- Concurrent updates use an explicit strategy: atomic SQL, row/advisory locks,
  or optimistic version/`updated_at` checks with a machine-readable conflict.
  Never silently apply last-writer-wins where it can lose authored data.
- Return only needed `RETURNING` columns. Map expected constraint/deadlock/
  timeout conflicts centrally; do not expose driver messages, SQL, bind values,
  credentials, or internal identifiers to clients or logs.
- Validate pool size and timeouts instead of blindly parsing environment
  values. Budget total connections across replicas, workers, migrations, and
  operational headroom; configure bounded connect/query/idle lifetimes,
  graceful shutdown, cancellation, and PgBouncer compatibility where used.
  An application pool maximum is a per-process value, not the cluster budget.
- Runtime infrastructure shares one composable, awaited lifecycle contract.
  Database, schedulers, workers, cache and transports register with that owner;
  do not install competing signal handlers. Stop accepting work first, stop
  schedulers/claims, drain bounded workers, close cache/transports, then close
  the database, with idempotent start/close tests.
- Database observability uses sanitized statement fingerprints and bounded
  metrics for latency, rows, errors, waits, pool saturation, cache interaction,
  and query counts. Operational use of `pg_stat_statements`, I/O timing, slow
  plans, vacuum/analyze health, and index usage must be documented and reset or
  compared across a known interval before conclusions are drawn.

### Server cache architecture and correctness

- Cache is an optional optimization, never the authoritative store. Server
  consumers use one async, typed cache contract owned by a standalone module;
  domain code must not import `Map`, Redis, or provider clients directly. Cache
  values use versioned strict envelopes/codecs and corrupt, unknown-version,
  oversized, or expired data is evicted best-effort and treated as a miss.
- The default single-replica backend is a process-local LRU bounded by both
  entry count and serialized bytes, with per-entry/key/tag caps, monotonic TTL,
  bounded expiry work, TTL jitter, and per-key single-flight. It must not be
  presented as coherent for multiple replicas.
- Redis is optional infrastructure selected through validated environment
  configuration; TTL and domain freshness policies remain code/settings-owned.
  Redis mode is the shared value store for multi-replica deployments and must
  not silently fall back to a persistent per-process value cache on outage.
  On cache timeout/unavailability, use the authoritative DB/render path with a
  bounded circuit breaker. Missing Redis configuration for explicitly selected
  Redis mode fails fast; readiness policy must be explicit.
- State the distributed consistency model honestly. A design that promises
  zero-query cache hits and successful authoritative writes during a cache
  partition cannot also claim linearizable invalidation. For safe public data,
  define and test the bounded-eventual invalidation-lag target, hard TTL stale
  ceiling, degraded-readiness/bypass behavior, and read-after-write bypass.
  Auth, RBAC, secrets, private content and security decisions must instead stay
  fail-closed/DB-authoritative and cannot inherit that relaxed consistency.
- Cache keys are canonical, bounded, deployment/tenant namespaced, schema-
  versioned, family-tagged, and digest variable user input. Never embed raw
  secrets, tokens, cookies, PII, unrestricted URLs, or delimiter-parsed values
  in a key. Do not use Redis `KEYS` or an unbounded `SCAN` for invalidation.
- Each cached read declares its TTL, maximum serialized size, eligibility,
  negative-cache policy, dependency tags/generation, and stale-data policy.
  Do not cache secrets/decrypted settings, sessions, auth/RBAC decisions,
  private/password content, preview/draft bodies, or nonce-bearing forms. These
  are absolute server-cache exclusions and no task contract may relax them.
  Other explicitly non-security user-specific responses may be cached only when
  a stricter task contract proves identity partitioning, bounded lifetime, and
  complete invalidation. Security/auth data never uses stale-while-revalidate.
- A transition from public access to private, password-protected, unpublished,
  or otherwise restricted access must not depend on bounded-eventual cache
  invalidation. Either prove a synchronous fail-closed distributed fence, or
  perform a narrow authoritative visibility/version check before reading a
  cached public value. A zero-query hit target never overrides this rule.
- Every mutation declares all affected cache families and returns a deduplicated
  invalidation plan. Execute it only after the authoritative transaction
  commits; rollback and no-op emit nothing. Multi-replica invalidation must be
  durable (normally a transactional outbox plus idempotent worker); Pub/Sub may
  reduce propagation latency but is never the sole correctness mechanism.
- A cache read/write/delete/publication failure must not turn a committed
  authoritative mutation into an apparent API failure that clients retry.
  Preserve the committed result, record redacted bounded telemetry, and retry
  durable invalidation. When coherence cannot be proven, bypass cached values.
- Distributed stampede protection uses bounded leases/waits, unique ownership
  tokens, compare-and-delete release, generation recheck before fill, and a DB
  fallback; it never blocks requests indefinitely. Cache only explicitly safe
  successful results, with short bounded negative caching where declared.
- Browser Admin caches and the server cache are separate contracts. Browser
  values must be scoped to deployment plus authenticated user and auth/
  permission epoch, cleared on identity transition, and keep storage/quota/
  broadcast failures best-effort. Server invalidation does not replace Admin
  `cacheBus` dirty-state and background-revalidation behavior.
- Cache tests cover adapter parity, hit/miss/expiry/eviction byte bounds,
  single-flight, malformed envelopes, mutation commit/rollback, old/new slug
  and delete invalidation, identity isolation, multi-client/multi-replica
  invalidation, Redis outage/reconnect, and zero-secret guarantees. Hot public
  cache-hit tests must assert the intended database-query count, including
  zero-query hits where the read-model contract promises them.

## Product Contract Rules

- Configurable product widgets belong only to the Admin Dashboard. Dashboard
  widget changes must follow `_docs/DASHBOARD_WIDGETS_SPEC.md` and ship the
  Dashboard-owned schema/defaults/normalizer, render host integration, RBAC,
  cache/preferences behavior, editor controls, and tests.
- Pages, Page Templates, Forms, Menus, Posts, Custom Screens, and other domain
  editors own their sections and blocks. Extend that domain's strict schema,
  normalizer, editor controls, renderer, and tests; do not add a generic widget
  type, preset, module-pack entry, Widget Template surface, or
  Wizard/Visual/Advanced editor.
- `core/widgets/*`, `core/widgets/modulePackMatrix.ts`, `_docs/WIDGETS.md`,
  `_docs/WIDGET_PACK_MATRIX.md`, and `_docs/_WIDGETS/*` are retained
  runtime/read-compatibility seams. Change them only when an existing contract
  requires maintenance, preserve non-destructive legacy reads, and do not widen
  them into a selectable non-dashboard product surface.
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
  - editor section/block, Dashboard-widget, or retained compatibility-renderer
    logic that does not depend on runtime Bun APIs.
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
- Parallel workflow streams may DEFER the full mandatory gate set to ONE combined run after all streams land: full `bun run test` (Bun + Vitest), `bun run precommit:check`, `bun run gates:coderso`, and the security scan (`bun run scan:security`, or `scan:security:strict` when the strict gate is required). Each stream must still pass its targeted per-subtask gates and its runtime smoke before closure.
- Before declaring a test failure real, re-run the NAMED failing file once in isolation — known under-load flakes exist (spurious Vitest timeouts; avoid contention when measuring the performance gate). Record confirmed flakes and fix the root cause instead of tolerating them (for example, a test asserting a clean global precondition must reset the state it asserts).
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
- If you change plugin/runtime contracts, Dashboard widget contracts, retained
  compatibility coverage, assistant workflow contracts, or release-gate
  contracts, update the corresponding source-of-truth docs
  (`_docs/CODERSO_PLUGIN_CONTRACT.md`, `_docs/DASHBOARD_WIDGETS_SPEC.md`,
  `_docs/WIDGET_PACK_MATRIX.md` when legacy compatibility is actually touched,
  `_docs/ASSISTANT_SITE_BUILDER.md`, `_docs/CODERSO_RELEASE_GATES.md`).
