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
DB-backed smoke checks are optional inside the release-gate runner: when
`DATABASE_URL` is present they execute, and when it is absent they are reported
as skipped while pure lint, UI, performance, security, and catalog checks still
run. Do not import `core/db/client` in pure gate tests just to read defaults.

## Gate Matrix

| Gate | Goal | Execution Source |
|------|------|------------------|
| `functional` | Core module flows are runnable | lint + selected Bun runtime flows + selected Vitest UI/domain flows |
| `ux` | Beginner/composite-first paths remain stable | wizard/library/editor UX suites |
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

## Optional DB-Backed Checks

The release gate workflow passes `DATABASE_URL` from the repository secret when
available. This is useful for a maintained Render test database, but the gate
contract does not require a database to be available for every PR.

DB-backed commands currently include:

- `tests/unit/server/publicBookingApi.test.ts`
- `tests/unit/kits/installService.test.ts`
- `tests/integration/store/revocations.test.ts`

Without `DATABASE_URL`, those commands are marked as skipped in the JSON report
with `skipReason: "database_url_missing"`. When `DATABASE_URL` is configured,
the DB-backed suites own their existing connection checks and cleanup behavior.
DB-backed suites that share mutable tables must run serially or isolate fixtures
so CI does not delete data from another in-flight test on the same test
database.
Remote DB-backed suites should also set explicit per-test and cleanup hook
timeouts; do not rely on Bun's default 5000 ms timeout for shared Render test
databases.

## CI and Local Security Gate (SAST/SCA/Secrets/CVE)

Additional CI and local security gates are enforced via:
- `.github/workflows/security-gate.yml`
- `.semgrep.yml` (local SAST rules + registry packs)
- `.gitleaks.toml` (secrets scanning config)
- `.trivyignore` (time-boxed allowlist for CVEs)
- `scripts/run-security-scan.ts` (local scanner matrix runner)

CI blocks PRs on critical/high findings and uploads SARIF reports for auditability.
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
- `.github/workflows/coderso-release-gates.yml`

Runs on pull requests and manual dispatch, then uploads gate report artifact.

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
