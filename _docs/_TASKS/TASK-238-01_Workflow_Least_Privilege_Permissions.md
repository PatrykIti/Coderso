# TASK-238-01: Workflow Least-Privilege Permissions
# FileName: TASK-238-01_Workflow_Least_Privilege_Permissions.md

**Priority:** High
**Category:** Security + CI
**Estimated Effort:** Small
**Dependencies:** TASK-238
**Status:** Done (2026-04-29)

---

## Overview

Fix CodeQL `actions/missing-workflow-permissions` alerts for the testing and
Coderso release-gate workflows by moving PR checks into one ordered workflow
with explicit least-privilege permissions.

The consolidated workflow must prepare the CI database first, run Vitest and Bun
lanes in parallel, then run security scanning before the final Coderso release
gates. Runtime jobs must pin `BUN_VERSION=1.3.13` and
`NODE_VERSION=22.14.0` instead of relying on runner defaults. Only the security
job receives `security-events: write` for SARIF upload.

## File Inventory

| File | GitHub Alert Lines | Current Issue | Required Change |
|---|---|---|---|
| `.github/workflows/testing-lanes.yml` | 18, 58 | Jobs have no explicit `permissions`, so CodeQL flags implicit token scope. | Replace with `.github/workflows/coderso-pr-gates.yml` and inherit top-level `contents: read`. |
| `.github/workflows/coderso-release-gates.yml` | 17 | Release-gate job has no explicit `permissions`. | Replace with final `coderso-release-gates` job in the unified workflow. |
| `.github/workflows/security-gate.yml` | Existing scanner gate | Security scanning was isolated from the testing/release gate order. | Move scanner steps into the unified workflow after test lanes and before release gates. |
| `tests/unit/security/securityGateConfig.test.ts` | New coverage | Existing security workflow tests do not cover unified workflow ordering, DB preflight, and scoped permissions. | Add regression assertions for preflight, `needs` graph, scanner wiring, and permissions. |

## Sub-Tasks

- [ ] Replace separate PR check workflows with `.github/workflows/coderso-pr-gates.yml`.
- [ ] Add `database-preflight` that requires `DATABASE_URL` and runs `bun run db:migrate`.
- [ ] Run `vitest-lane` and `bun-lane` in parallel after preflight.
- [ ] Run `security-gate` after both lanes and scope `security-events: write` to that job.
- [ ] Run `coderso-release-gates` only after security scanning passes.
- [ ] Pin Bun and Node through workflow-level `BUN_VERSION` and `NODE_VERSION`.
- [ ] Add YAML/text regression coverage for the permission and job-order contract.
- [ ] Verify the workflow file still parses and keeps existing scanner/test/report steps.

## Implementation Pseudocode

Workflow shape:

```yaml
name: Coderso PR Gates

on:
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

env:
  BUN_VERSION: 1.3.13
  NODE_VERSION: 22.14.0

jobs:
  database-preflight:
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
    steps:
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ env.BUN_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - run: node --version && bun --version
      - run: bun install --frozen-lockfile
      - run: test -n "${DATABASE_URL:-}"
      - run: bun run db:migrate

  vitest-lane:
    needs: database-preflight

  bun-lane:
    needs: database-preflight

  security-gate:
    needs: [vitest-lane, bun-lane]
    permissions:
      actions: read
      contents: read
      security-events: write

  coderso-release-gates:
    needs: security-gate
```

Regression-test shape:

```ts
const workflow = readText(".github/workflows/coderso-pr-gates.yml");

expect(workflow).toContain("permissions:");
expect(workflow).toContain("contents: read");
expect(workflow).not.toContain("contents: write");
expect(workflow).not.toContain("actions: write");
expect(workflow).toContain("database-preflight:");
expect(workflow).toContain("bun run db:migrate");
expect(workflow).toContain("BUN_VERSION: 1.3.13");
expect(workflow).toContain("NODE_VERSION: 22.14.0");
expect(workflow).toContain("actions/setup-node@v4");
expect(workflow).toContain("bun-version: ${{ env.BUN_VERSION }}");
expect(workflow).toContain("security-events: write");
```

If a future step needs extra permission, the test should assert only that exact
scope and the task/changelog must explain why it is required.

## Security Contract

- Visibility: CI workflow token scope only.
- Auth model: GitHub Actions `GITHUB_TOKEN`; `DATABASE_URL` repository secret
  for CI database migration/test access.
- RBAC: reduce implicit token access to explicit minimum.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse: do not add write scopes to testing or release-gate jobs
  unless a concrete action requires them and the task documents why.
- Secret handling: `DATABASE_URL` must be consumed only from repository secrets
  and never logged. It must point to disposable CI test infrastructure.

## Testing Requirements

```bash
bun test tests/unit/security/securityGateConfig.test.ts
bun test tests/unit/security
git diff --check
```

If a new workflow test file is added, include it in the command list and keep
the test pure Bun so it can run without GitHub credentials.

## Documentation Updates Required

- `_docs/_TASKS/TASK-238_GitHub_CodeQL_Security_Findings_Remediation.md`
- `_docs/_TASKS/README.md`
- Changelog entry on TASK-238 closure.

## Acceptance Criteria

1. CodeQL alerts 20, 21, and 22 are addressed.
2. Testing and release-gate workflows declare explicit minimum permissions.
3. No new write permission is introduced.
4. Regression tests fail if the explicit permissions are removed.

## Progress Notes

- 2026-04-29: Added explicit `contents: read` workflow permissions and Bun
  regression coverage. GitHub CodeQL verification is clean as part of
  TASK-238 closure.
- 2026-04-29: Consolidated testing, security, and release-gate PR workflows into
  `.github/workflows/coderso-pr-gates.yml` with DB migration preflight,
  lane/security/release gate ordering, and scoped SARIF permissions.
- 2026-04-29: Updated PR gate runtime pins to Bun 1.3.13 and Node 22.14.0, with
  regression coverage so CI does not fall back to the runner's default Node 20
  or the old Bun 1.3.6 pin.
