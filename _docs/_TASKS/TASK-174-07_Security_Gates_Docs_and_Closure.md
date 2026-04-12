# TASK-174-07: Security Gates, Docs, and Closure
# FileName: TASK-174-07_Security_Gates_Docs_and_Closure.md

**Priority:** High  
**Category:** Security + QA + Docs  
**Estimated Effort:** Medium  
**Dependencies:** TASK-174-01, TASK-174-02, TASK-174-03, TASK-174-04, TASK-174-05, TASK-174-06  
**Status:** To Do

---

## Overview

Close the created-resource cleanup wave with security/performance gates, route coverage, assistant corpus updates, source-of-truth docs, task board, and changelog.

## Sub-Tasks

No child task files.

## Architecture

Closure must prove:
- cleanup cannot target resources outside persisted assistant undo manifest,
- cleanup cannot delete user/customer data accidentally,
- cleanup cannot leak raw snapshots or secrets,
- cleanup is idempotent and audited,
- route and UI contracts describe partial cleanup and blocked states honestly.

## Pseudocode

```ts
await runAssistantCleanupSecuritySuites();
await runAssistantCleanupPerfSuites();
await updateDocsAndBoard();
await writeChangelog();
```

## Files to Change

- `tests/security/*assistant*`
- `tests/perf/*assistant*` if cleanup planning introduces measurable route cost
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

- Visibility: internal assistant cleanup endpoints only.
- Auth model: existing admin session.
- RBAC: closure tests must verify read/write/delete permission requirements for cleanup dry-run and execute.
- CSRF: closure tests must verify missing/invalid CSRF rejection on cleanup execute route.
- Rate-limit bucket: `assistant`; route tests must verify assistant rate-limit mapping remains correct.
- Reject-unknown validation:
  - reject unknown cleanup payload fields,
  - reject client-supplied resource maps,
  - reject cleanup requests for resources outside the selected execution.
- Anti-abuse:
  - no public write endpoint,
  - no nonce/HMAC/reCAPTCHA path,
  - no autonomous cleanup without review/confirm.
- Idempotency: DB-backed tests must cover cleanup replay and actor/plan/hash conflict.
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
  - DB-backed assistant cleanup suites with `set -a && source .env && set +a`
- Vitest:
  - assistant cleanup UI tests,
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

1. Security and route tests prove cleanup remains scoped to assistant-created resources.
2. Docs describe cleanup as reviewed, manifest-scoped, and conflict-aware.
3. Board and changelog are synchronized for all `TASK-174` leaves.
4. Any skipped security validation is documented with the reason and remaining CI coverage.
