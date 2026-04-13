# TASK-174-07: Security Gates, Docs, and Closure
# FileName: TASK-174-07_Security_Gates_Docs_and_Closure.md

**Priority:** High  
**Category:** Security + QA + Docs  
**Estimated Effort:** Medium  
**Dependencies:** TASK-174-01, TASK-174-02, TASK-174-03, TASK-174-04, TASK-174-05, TASK-174-06  
**Status:** To Do

---

## Overview

Close the `LLM Guide` resource operations wave with security/performance gates, route coverage, assistant corpus updates, source-of-truth docs, task board, and changelog.

## Sub-Tasks

No child task files.

## Architecture

Closure must prove:
- edit/delete operations cannot target resources outside trusted active context or server-side resource catalogs,
- provenance-based undo still cannot target resources outside persisted assistant undo manifests,
- destructive operations cannot delete user/customer data accidentally,
- active surface/canvas/template context does not leak raw snapshots or secrets,
- mutations are idempotent and audited,
- route and UI contracts describe partial success, conflicts, and blocked states honestly.

## Pseudocode

```ts
await runAssistantResourceOperationSecuritySuites();
await runAssistantResourceOperationPerfSuites();
await updateDocsAndBoard();
await writeChangelog();
```

## Files to Change

- `tests/security/*assistant*`
- `tests/perf/*assistant*` if resource operation planning introduces measurable route cost
- `tests/integration/routes/assistant.test.ts`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- relevant `docs/` assistant corpus pages
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new changelog file for `TASK-174` closure

## Security Contract

- Visibility: internal assistant resource operation endpoints only.
- Auth model: existing admin session.
- RBAC: closure tests must verify read/write/delete permission requirements for plan/dry-run/execute.
- CSRF: closure tests must verify missing/invalid CSRF rejection on execute routes.
- Rate-limit bucket: `assistant`; route tests must verify assistant rate-limit mapping remains correct.
- Reject-unknown validation:
  - reject unknown resource operation payload fields,
  - reject client-supplied resource maps,
  - reject delete/edit requests for resources outside trusted context/catalog resolution.
- Anti-abuse:
  - no public write endpoint,
  - no nonce/HMAC/reCAPTCHA path,
  - no autonomous edit/delete/cleanup without review/confirm.
- Idempotency: DB-backed tests must cover resource operation replay and actor/plan/hash conflict.
- Secret handling:
  - tests must assert no raw snapshots/secrets/form submissions in API/UI/audit payloads,
  - scanner config changes, if any, must record owner, reason, expiry, and ticket.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Bun:
  - `tests/integration/routes/assistant.test.ts`
  - relevant `tests/security/*`
  - relevant `tests/perf/*` when cleanup planning cost is introduced
  - DB-backed assistant resource operation suites with `set -a && source .env && set +a`
- Vitest:
  - assistant resource operation UI tests,
  - pure cleanup helper tests.
- Run local Semgrep/Trivy/Gitleaks commands from `_docs/SECURITY_SPEC.md` if auth/secret/scanner contracts change, or document CI-only validation if not feasible.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- relevant `docs/` assistant corpus pages
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and new changelog entry.

## Acceptance Criteria

1. Security and route tests prove edit/delete operations remain scoped to trusted active context/catalog targets.
2. Docs describe resource operations as reviewed, typed, permission-checked, and conflict-aware.
3. Board and changelog are synchronized for all `TASK-174` leaves.
4. Any skipped security validation is documented with the reason and remaining CI coverage.
