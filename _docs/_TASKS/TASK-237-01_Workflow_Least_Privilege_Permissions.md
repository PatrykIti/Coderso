# TASK-237-01: Workflow Least-Privilege Permissions
# FileName: TASK-237-01_Workflow_Least_Privilege_Permissions.md

**Priority:** High
**Category:** Security + CI
**Estimated Effort:** Small
**Dependencies:** TASK-237
**Status:** In Progress (2026-04-29)

---

## Overview

Fix CodeQL `actions/missing-workflow-permissions` alerts for the testing and
Coderso release-gate workflows by adding explicit least-privilege permissions.

The affected workflows run tests and upload artifacts only. They should not
receive implicit broad token permissions.

## File Inventory

| File | GitHub Alert Lines | Current Issue | Required Change |
|------|--------------------|---------------|-----------------|
| `.github/workflows/testing-lanes.yml` | 18, 58 | Jobs have no explicit `permissions`, so CodeQL flags implicit token scope. | Add top-level or per-job `permissions: contents: read`; add only extra scopes that a concrete step requires. |
| `.github/workflows/coderso-release-gates.yml` | 17 | Release-gate job has no explicit `permissions`. | Add top-level or job-level `permissions: contents: read`; artifact upload should not require write scopes. |
| `tests/unit/security/securityGateConfig.test.ts` or new `tests/unit/security/workflowPermissions.test.ts` | New coverage | Existing security workflow tests do not cover these two workflow permission contracts. | Add regression assertions that both workflows define explicit read-only permissions. |

## Sub-Tasks

- [ ] Add explicit read-only permissions to `.github/workflows/testing-lanes.yml`.
- [ ] Add explicit read-only permissions to `.github/workflows/coderso-release-gates.yml`.
- [ ] Add YAML/text regression coverage for the permission contract.
- [ ] Verify the workflow files still parse and keep existing triggers/steps.

## Implementation Pseudocode

Workflow shape:

```yaml
name: Testing Lanes

on:
  pull_request:
  push:

permissions:
  contents: read

jobs:
  vitest-lane:
    # existing runner, checkout, setup, install, test, and artifact steps
  bun-lane:
    # existing runner, checkout, setup, install, test, coverage, and artifact steps
```

```yaml
name: Coderso Release Gates

on:
  pull_request:
  push:

permissions:
  contents: read

jobs:
  coderso-release-gates:
    # existing checkout, Bun setup, install, gate run, and report artifact upload
```

Regression-test shape:

```ts
const workflow = readText(".github/workflows/testing-lanes.yml");

expect(workflow).toContain("permissions:");
expect(workflow).toContain("contents: read");
expect(workflow).not.toContain("contents: write");
expect(workflow).not.toContain("actions: write");

const releaseGates = readText(".github/workflows/coderso-release-gates.yml");

expect(releaseGates).toContain("permissions:");
expect(releaseGates).toContain("contents: read");
expect(releaseGates).not.toContain("security-events: write");
```

If a future step needs extra permission, the test should assert only that exact
scope and the task/changelog must explain why it is required.

## Security Contract

- Visibility: CI workflow token scope only.
- Auth model: GitHub Actions `GITHUB_TOKEN`; no new secrets.
- RBAC: reduce implicit token access to explicit minimum.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse: do not add write scopes to testing or release-gate workflows
  unless a concrete action requires them and the task documents why.
- Secret handling: no new workflow secrets and no new secret logging.

## Testing Requirements

```bash
bun test tests/unit/security/securityGateConfig.test.ts
bun test tests/unit/security
git diff --check
```

If a new workflow test file is added, include it in the command list and keep
the test pure Bun so it can run without GitHub credentials.

## Documentation Updates Required

- `_docs/_TASKS/TASK-237_GitHub_CodeQL_Security_Findings_Remediation.md`
- `_docs/_TASKS/README.md`
- Changelog entry on TASK-237 closure.

## Acceptance Criteria

1. CodeQL alerts 20, 21, and 22 are addressed.
2. Testing and release-gate workflows declare explicit minimum permissions.
3. No new write permission is introduced.
4. Regression tests fail if the explicit permissions are removed.

## Progress Notes

- 2026-04-29: Added explicit `contents: read` workflow permissions and Bun
  regression coverage. Awaiting GitHub CodeQL PR verification before closure.
