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

## Gate Matrix

| Gate | Goal | Execution Source |
|------|------|------------------|
| `functional` | Core module flows are runnable | lint + selected UI flow tests |
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
- `tests/unit/forms/submissionNonce.test.ts`
- `tests/unit/server/publicBookingApi.test.ts`

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

Generate report to custom path:

```bash
bun scripts/coderso-release-gates.ts --report .tmp/custom-gates-report.json
```
