# TASK-219-03-02: Docs, Changelog, and Board Closure
# FileName: TASK-219-03-02_Docs_Changelog_and_Board_Closure.md

**Priority:** Medium
**Category:** Docs + Security + QA
**Estimated Effort:** Small
**Dependencies:** TASK-219-03-01
**Status:** To Do

---

## Overview

Close the dependency CVE remediation family after strict scanner validation passes. This leaf owns documentation synchronization only; it must not hide incomplete scanner findings.

## Sub-Tasks

- [ ] Mark completed `TASK-219*` files as Done with date.
- [ ] Move rows from To Do to Done in `_docs/_TASKS/README.md` and update statistics.
- [ ] Add a numbered changelog entry for `TASK-219`.
- [ ] Update `_docs/_CHANGELOG/README.md`.
- [ ] Update `_docs/SECURITY_SPEC.md` if scanner policy, exceptions, or SBOM process changed.

## Files to Change

- `_docs/_TASKS/TASK-219*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/{N}-2026-04-27-task-219-dependency-cve-remediation.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/SECURITY_SPEC.md` if required.

## Security Contract

- Visibility: documentation and release audit trail.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse:
  - do not claim scanner closure unless `TASK-219-03-01` evidence exists,
  - record any skipped check explicitly,
  - do not omit temporary exception metadata.
- Secret handling: changelog must summarize scans without pasting secrets or sensitive env values.

## Changelog Draft

```md
# N. TASK-219 dependency CVE remediation

**Date:** 2026-04-27
**Version:** 0.1.0
**Tasks:** TASK-219, TASK-219-01, TASK-219-01-01, TASK-219-01-02, TASK-219-02, TASK-219-02-01, TASK-219-02-02, TASK-219-03, TASK-219-03-01, TASK-219-03-02

## Key Changes

### Security Dependencies
- Upgraded fixed test/build tooling versions for happy-dom and Vite.
- Refreshed transitive Rollup, Picomatch, Flatted, and Minimatch lockfile rows.
- Kept TASK-217 scanner coverage unchanged.

### Validation
- Ran:
  - bun audit --audit-level high
  - bun run scan:security:strict
  - bun run test:vitest
  - bun --cwd core lint
  - bun --cwd core lint:types
  - bun run lint:repo:types
  - bun --cwd core x vite build --config vite.config.ts
  - bun --cwd core build:site
```

## Testing Requirements

- `git diff --check`
- Verify `_docs/_TASKS/README.md` statistics and rows.
- Verify `_docs/_CHANGELOG/README.md` numbering.

## Documentation Updates Required

- This leaf owns the documentation updates.

## Acceptance Criteria

1. All `TASK-219*` files have correct final status.
2. Board statistics match row counts.
3. Changelog entry names the exact scanner/test evidence.
4. No scanner findings are hidden by docs wording.
