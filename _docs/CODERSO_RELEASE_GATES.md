# Coderso Release Gates

## Purpose

Coderso modules are considered stable only when all mandatory gates pass.

Release contract:
- `functional`
- `ux`
- `performance`
- `security`
- `reliability`

Execution model:
- Runner: `scripts/coderso-release-gates.ts`
- Default command: `bun run gates:coderso`
- Optional report output: `.tmp/coderso-release-gates.json`

If any gate fails, release is blocked (`non-zero exit code`).

## Runner Ownership Note

Target testing architecture is tracked by `TASK-102` and documented in `_docs/TESTING_STRATEGY.md`.

Gate ownership follows product architecture:
- Bun remains authoritative for runtime-kernel, performance, security, and install/rollback reliability flows.
- Vitest is the target runner for pure TS/admin/UI coverage lanes that do not depend on Bun runtime primitives.

Release gates must not weaken runtime guarantees just to normalize tooling.
The local release-gate runner can still mark DB-backed checks as skipped when
`DATABASE_URL` is absent, but repository PR gates require the secret. CI prepares
the configured test database with Drizzle migrations before any test lane starts.
Do not import `core/db/client` in pure gate tests just to read defaults.

## Gate Matrix

| Gate | Goal | Execution Source |
|------|------|------------------|
| `functional` | Core module flows are runnable | lint + selected Bun runtime flows + selected Vitest UI/domain flows |
| `ux` | Domain section/block editors and Admin Dashboard widgets remain stable; retained `core/widgets` renderers keep compatibility | section/block editor UX + Dashboard widget UX + compatibility-renderer regression suites |
| `performance` | p95 budgets for critical interactions | `tests/perf/codersoPerformanceGate.test.ts` |
| `security` | Public-write hardening and baseline controls | `tests/security/*` + security unit suites |
| `reliability` | Install/upgrade/rollback path resiliency | kits/store reliability suites |

## Performance Budgets

Default budgets (override via env):
- listing/filter cached p95: `CODERSO_PERF_LISTING_P95_CACHED_MS=300`
- listing/filter cold p95: `CODERSO_PERF_LISTING_P95_COLD_MS=900`
- admin route transition helper p95: `CODERSO_PERF_ADMIN_NAV_P95_MS=150`

These values are enforced by `tests/perf/codersoPerformanceGate.test.ts`.

## Security Baseline Gate

`tests/security/codersoSecurityGate.test.ts` validates baseline guarantees:
- public forms/booking mode requires captcha path,
- internal mode requires session or API key scope,
- nonce contract is enforced (required + tamper rejection),
- default rate-limit and bot-protection settings are hardened.

Additional security suites are executed in gate runner:
- `tests/unit/security/rateLimit.test.ts`
- `tests/vitest/forms/submissionNonce.test.ts`
- `tests/unit/server/publicBookingApi.test.ts` when `DATABASE_URL` is available

## DB-Backed Checks

The `Coderso PR Gates` workflow passes `DATABASE_URL` from the repository secret
and runs `bun run db:migrate` in `database-preflight` before the test lanes.
This lets maintainers point CI at a fresh test database by changing one
repository secret; migrations prepare the schema before DB-backed suites run.
Runtime jobs in that workflow pin `BUN_VERSION=1.3.14` and tooling
`NODE_VERSION=26.5.0`, verify both versions in logs, and avoid relying on the
GitHub runner's default Node runtime. Bun remains authoritative for product
runtime and Bun-owned gates.

DB-backed commands currently include:

- `tests/unit/server/publicBookingApi.test.ts`
- `tests/unit/kits/installService.test.ts`
- `tests/integration/store/revocations.test.ts`

Without `DATABASE_URL`, local runner commands mark those checks as skipped in the
JSON report with `skipReason: "database_url_missing"`. In CI, missing
`DATABASE_URL` fails the preflight before downstream jobs start. When
`DATABASE_URL` is configured, the DB-backed suites own their existing connection
checks and cleanup behavior.
DB-backed suites that share mutable tables must run serially or isolate fixtures
so CI does not delete data from another in-flight test on the same test
database.
Remote DB-backed suites should also set explicit per-test and cleanup hook
timeouts; do not rely on Bun's default 5000 ms timeout for shared Render test
databases.

## CI and Local Security Gate (SAST/SCA/Secrets/CVE)

Additional CI and local security gates are enforced via:
- `.github/workflows/coderso-pr-gates.yml`
- `.semgrep.yml` (local SAST rules + registry packs)
- `.gitleaks.toml` (secrets scanning config)
- `.trivyignore` (time-boxed allowlist for CVEs)
- `scripts/run-security-scan.ts` (local scanner matrix runner)

CI blocks PRs on critical/high findings and uploads SARIF reports for auditability.
Gitleaks Action v2 is wired through environment variables (`GITHUB_TOKEN`,
`GITLEAKS_CONFIG`, `GITLEAKS_ENABLE_COMMENTS`, and
`GITLEAKS_ENABLE_UPLOAD_ARTIFACT`) because the action does not accept
`with.config`, `with.report-format`, or `with.report-path` inputs.
Trivy in CI intentionally separates SARIF collection from blocking behavior:
the SARIF step runs with `exit-code: "0"` and `limit-severities-for-sarif:
true`, then a final table-output Trivy step runs with `exit-code: "1"` for
HIGH/CRITICAL findings. This keeps Code Scanning uploadable and still gives
reviewers readable failing output in the workflow log.
Local `bun run scan:security` runs advisory SAST, dependency, misconfiguration,
filesystem secret, Git-history secret, and worktree secret scans without stopping
after the first finding. Local `bun run scan:security:strict` uses the same
matrix as a release-style fail-fast gate.

## CI Integration

Workflow:
- `.github/workflows/coderso-pr-gates.yml`

Runs on pull requests and manual dispatch:

1. `database-preflight` verifies `DATABASE_URL` and applies migrations.
2. `vitest-lane` and `bun-lane` run in parallel.
3. `security-gate` runs Semgrep, Trivy, Gitleaks, and SARIF uploads.
4. `coderso-release-gates` runs last and uploads the release-gate report.

## Usage

Run all gates:

```bash
bun run gates:coderso
```

List available gates:

```bash
bun scripts/coderso-release-gates.ts --list
```

Run a single gate:

```bash
bun scripts/coderso-release-gates.ts --gate security
bun scripts/coderso-release-gates.ts --gate performance
```

Run local scanners:

```bash
bun run scan:security
bun run scan:security:strict
```

Generate report to custom path:

```bash
bun scripts/coderso-release-gates.ts --report .tmp/custom-gates-report.json
```
