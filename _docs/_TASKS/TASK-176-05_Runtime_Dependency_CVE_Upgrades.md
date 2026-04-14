# TASK-176-05: Runtime Dependency CVE Upgrades
# FileName: TASK-176-05_Runtime_Dependency_CVE_Upgrades.md

**Priority:** High
**Category:** Security + Dependencies
**Estimated Effort:** Medium
**Dependencies:** TASK-176
**Status:** To Do

---

## Overview

Remediate Trivy runtime dependency findings in `bun.lock` after aligning Trivy scan scope with non-runtime path exclusions.

Current runtime findings from 2026-04-14:
- `drizzle-orm` 0.45.1 -> fixed 0.45.2 or 1.0.0-beta.20 (`CVE-2026-39356`)
- `fast-xml-parser` 5.2.5 -> fixed 5.3.5/5.3.4/5.3.6/5.5.6 depending on finding
- `nodemailer` 6.10.1 -> fixed 7.0.11 (`CVE-2025-14874`)

## Sub-Tasks

No child task files.

## Files to Change

- `package.json` / workspace package manifests as needed
- `bun.lock`
- targeted tests for affected integrations:
  - DB/Drizzle usage,
  - XML parsing/import paths if applicable,
  - email/Nodemailer integration paths

## Security Contract

- Visibility: dependency/runtime hardening.
- Auth model: no change.
- RBAC: no change.
- CSRF: no change.
- Rate-limit bucket: no change.
- Reject-unknown validation: upgraded parser/ORM paths must not loosen validation.
- Anti-abuse:
  - do not suppress runtime CVEs globally,
  - prefer minimal compatible upgrades,
  - record any unavoidable exception with owner, reason, expiry, and ticket.
- Idempotency: database and email flows must preserve existing behavior.
- Secret handling:
  - email/provider secrets remain encrypted/redacted,
  - no real credentials in tests or logs.

## Testing Requirements

- `bun install` or equivalent lockfile update.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted affected tests:
  - DB/domain tests around Drizzle usage,
  - email settings/service tests,
  - XML/parser-related tests if the package is used directly.
- `bun run scan:trivy` must show no HIGH/CRITICAL runtime dependency findings, or only documented time-boxed exceptions.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` if any exception is required.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion.

## Acceptance Criteria

1. Runtime CVEs in `bun.lock` are remediated or explicitly tracked as time-boxed exceptions.
2. Dependency upgrades do not break DB, email, parser, or integration behavior.
3. `bun run scan:trivy` becomes actionable for runtime dependency findings.
