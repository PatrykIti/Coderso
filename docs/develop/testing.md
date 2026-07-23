# Testing

Coderso ships features live against a database and runtime ESM bundles, so tests are the safety net that lets us move fast without a rebuild for every change. We run a **hybrid model** with two lanes — pick the right one and your test stays fast, reliable, and in CI's good graces.

## The two lanes

There is one rule that decides everything: **choose a lane by dependency shape, not by folder name.**

| Lane | Runner | Owns |
|------|--------|------|
| **Bun** | `bun test` | Runtime kernel behavior, route/integration/runtime flows, plugin install/upgrade/rollback lifecycle, on-disk plugin activation, runtime security hardening, performance budgets |
| **Vitest** | `vitest` (project `coderso-vitest`) | Bun-free pure TS: domain services without `Bun.*`, validators/selectors/mappers, schema/DTO validation, admin/UI React components and hooks, SDK/shared contracts, domain-owned section/block logic, Admin Dashboard widget contracts, and retained `core/widgets` compatibility-renderer mapping |

### When to use Bun

Reach for the Bun lane when your test proves behavior that genuinely needs the runtime:

- Anything touching `Bun.serve` or `Bun.file` (HTTP server, runtime asset serving).
- Route / integration / runtime flows, SSR rendering.
- Plugin bundle lifecycle: install → verify → unpack → register, plus upgrade, rollback, and on-disk activation.
- Public-write protection and runtime security hardening.
- Performance budgets.

### When to use Vitest

Reach for Vitest when your logic is runtime-agnostic:

- Pure domain/services in `core/services/*` that never call `Bun.*`.
- Validators, selectors, mappers, DTO mapping, schema validation.
- Admin/UI React components and hooks (`core/admin/*`, `core/ui/*`).
- SDK and shared contracts in `packages/sdk/src/*`, pure manifest/schema helpers.
- Domain-owned section/block normalization and render mapping.
- Admin Dashboard widget contracts.
- Retained `core/widgets` compatibility-renderer normalization and render mapping
  (no runtime adapters).
- Assistant policy/schema/resolver/mapper coverage — pure metadata that must **not** import runtime services.

Vitest specs live under `tests/vitest/` and are matched by the pattern `tests/vitest/**/*.{test,spec}.{ts,tsx}` (config: `vitest.config.ts`).

### The "Bun-free" gotcha

A suite is **not** Bun-free if importing its production module immediately drags in DB, settings, or runtime coupling. Don't paper over that with brittle mocks to force it into Vitest — fix the production module instead (pure seams, or lazy default dependencies). Likewise, never leak `Bun.*` into pure or UI layers, and don't migrate runtime/plugin/install/security/perf suites into Vitest just to bump a coverage number.

happy-dom component tests must not do real navigation or network calls. The shared harness at `tests/setup/vitest.ts` blocks default anchor/form navigation, intercepts iframe HTTP(S) loads, and **fails the run** on unexpected `console.error`, `window error`, or `unhandledrejection`. A clean `bun run test:vitest` is green *and* log-clean — `AsyncTaskManager` errors or `ECONNREFUSED localhost:3000` mean a harness/isolation bug, not a flaky test.

## Commands

Every test script loads repo env first when `.env` exists, so you don't have to source `.env` by hand locally. CI may provide the same values through job environment variables without creating a `.env` file.

```bash
bun run test            # full default run: test:bun then test:vitest
bun run test:full       # same as test (confirm DATABASE_URL is reachable first)
bun run test:bun        # Bun lane: unit + integration + perf + security
bun run test:vitest     # Vitest lane (forces NODE_ENV=test)
bun run test:coverage   # Vitest coverage -> coverage/vitest/coverage-summary.json
bun run test:perf       # bun test tests/perf
bun run test:security   # bun test tests/security
```

A few details worth knowing:

- `test:bun` runs serially (`--parallel=1`) with a `--timeout=15000` per-test budget, because real DB and runtime renders exceed Bun's default 5000 ms.
- `test:vitest` sets `NODE_ENV=test` after the optional `.env` load.
- `test:coverage` is the canonical Vitest coverage report; the curated Bun-owned coverage lane is `bun run test:coverage:bun`, and `bun run test:coverage:all` runs both.
- More entry points exist for narrower work: `bun run test:unit`, `bun run test:integration`, and `bun run test:bun:lane` (curated route/plugin/perf suites that can skip env-dependent route suites when `DATABASE_URL` is absent).

## Database-backed tests

Most integration and route suites need a real PostgreSQL database.

- Set `DATABASE_URL` (see `.env.example` for the format). In CI, Drizzle migrations are applied before the test lanes run.
- Each suite **creates uniquely scoped fixtures** and cleans up only the rows it owns.
- **Never truncate or delete whole domain tables** from a shared test database. Suites must stay independent of one another.
- Suites that share mutable tables must run serially or isolate their fixtures, and should set explicit per-test and cleanup timeouts — don't rely on Bun's 5000 ms default against a shared remote DB.

When `DATABASE_URL` is missing locally, the curated Bun lane and the release gate runner mark DB-backed checks as skipped rather than failing; in CI a missing `DATABASE_URL` fails the preflight outright.

## Where does my new test go?

Walk the decision in order:

1. **Does it need `Bun.serve`, `Bun.file`, runtime bundle loading, on-disk plugin activation, or runtime asset serving?** → Bun lane.
2. **Is the production module it tests effectively pure** (no DB/settings/runtime coupling at import time)? → Vitest, under `tests/vitest/`.
3. **Is the module *not* actually pure but you wish it were?** → fix the seam in the production code first; don't mock your way around it.

As a folder map for the Bun lane:

```
tests/unit/          # focused units (may be Bun-owned / DB-backed)
tests/integration/   # routes, runtime, server, store, plugins
tests/perf/          # performance budgets
tests/security/      # public-write hardening + security baseline
```

## Release gates (brief)

Five mandatory gates back every release; any failure exits non-zero and blocks the release. The runner is `scripts/coderso-release-gates.ts`.

| Gate | Checks |
|------|--------|
| `functional` | lint + selected Bun runtime flows + selected Vitest UI/domain flows |
| `ux` | domain section/block editor UX + Admin Dashboard widget UX + retained `core/widgets` compatibility-renderer regressions |
| `performance` | p95 budgets (`tests/perf/codersoPerformanceGate.test.ts`) |
| `security` | public-write hardening + baseline controls (`tests/security/*`) |
| `reliability` | install / upgrade / rollback resiliency |

```bash
bun run gates:coderso            # all gates -> .tmp/coderso-release-gates.json
bun run gates:coderso:perf       # performance only
bun run gates:coderso:security   # security only
```

The release gate is a baseline, **not** a substitute for running the targeted `tests/perf/*`, `tests/security/*`, route, and reliability suites on the surface you actually touched. For the security side of the model — public-write nonce/captcha contracts, secret handling, RBAC, and the `scan:*` scanners — see [security.md](./security.md).

## Where to go deeper

- [`_docs/TESTING_STRATEGY.md`](../../_docs/TESTING_STRATEGY.md) — the authoritative lane-selection rules, coverage policy, and harness guardrails.
- [`tests/README.md`](../../tests/README.md) — the on-disk layout of the test suites.
- [security.md](./security.md) — the security model the `security` gate and `tests/security/*` enforce.
- [runtime-model.md](./runtime-model.md) — why the Bun lane mirrors the production runtime (no restart, runtime ESM plugins).
- [contributing.md](./contributing.md) — pre-commit hooks, CI PR gates, and the release flow tests slot into.
