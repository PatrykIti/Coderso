# TASK-233: Root README Marketing and Agents Index
# FileName: TASK-233_Root_Readme_Marketing_and_Agents_Index.md

**Priority:** Medium
**Category:** Documentation + Branding
**Estimated Effort:** Small
**Dependencies:** TASK-226
**Status:** Done (2026-04-28)

---

## Overview

Move the repository documentation index out of the public-facing root
`README.md` and into `AGENTS.md`, then turn the root `README.md` into an
English marketing overview for Coderso. Add root-level project governance docs
so support, security, licensing, conduct, and contribution expectations are
available before the project is shared more broadly.

The README should communicate the final naming direction:

- Coderso is the product name.
- Coderso is pronounced `ko-der-so`.
- Coderso can mean `Code + Resources` and `Code + Orchestrator`.
- The product is simple on the surface and powerful underneath.
- UI language should stay beginner-friendly while advanced platform power
  remains available when needed.

## Sub-Tasks

- [x] Move the root README index into `AGENTS.md`.
- [x] Replace the root README with an English marketing-oriented product
  overview.
- [x] Keep module naming guidance clear: Coderso is the product, modules should
  not repeat the brand prefix by default.
- [x] Add root support, security, license, code of conduct, and contributing
  documents.
- [x] Document GitHub Private Vulnerability Reporting and
  `security@paktryiti.pl` as private security contact paths.
- [x] Set the Apache-2.0 copyright owner to
  `Coderso - PatrykITI Patryk Ciechański`.
- [x] Add GitHub issue templates for bug reports, feature requests, support
  requests, and documentation issues.
- [x] Add issue template configuration that disables blank public issues and
  routes security reports to private contact paths.
- [x] Expand the pull request template while preserving the release notes block.
- [x] Document the repository documentation model: `_docs/` for local
  technical/AI-agent-assisted work and `docs/` for official public docs.
- [x] Link public project resources from the root README.
- [x] Declare the root package license as Apache-2.0.
- [x] Update task board and changelog.

## Files Changed

- `README.md`
- `AGENTS.md`
- `SUPPORT.md`
- `SECURITY.md`
- `LICENSE.md`
- `CODE_OF_CONDUCT.md`
- `CONTRIBUTING.md`
- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/ISSUE_TEMPLATE/support_request.yml`
- `.github/ISSUE_TEMPLATE/documentation.yml`
- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `package.json`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/764-2026-04-28-task-233-root-readme-marketing-and-agents-index.md`
- `_docs/_CHANGELOG/README.md`

## Security Contract

- Visibility: documentation-only change.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse: public security and support docs instruct reporters to avoid
  public vulnerability disclosure, use GitHub Private Vulnerability Reporting or
  `security@paktryiti.pl`, and redact secrets, tokens, private keys, customer
  data, and production database URLs. GitHub issue forms require reporters to
  confirm public issues are not security vulnerabilities.

## Testing Requirements

- Markdown/documentation review.
- Package metadata review.
- GitHub template review.
- GitHub issue template YAML parser review.
- Trailing whitespace scan for new untracked Markdown/YAML files.
- `git diff --check`

## Documentation Updates Required

- `README.md`
- `AGENTS.md`
- `SUPPORT.md`
- `SECURITY.md`
- `LICENSE.md`
- `CODE_OF_CONDUCT.md`
- `CONTRIBUTING.md`
- `.github/ISSUE_TEMPLATE/*`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

1. `README.md` is no longer the internal repository index.
2. `AGENTS.md` contains the repository documentation index for contributors and
   agents.
3. `README.md` presents Coderso as a public-facing modular web platform.
4. All new public-facing README copy is in English.
5. Root project governance docs exist for support, security, licensing, code of
   conduct, and contributing.
6. The root package metadata declares the Apache-2.0 license.
7. Security reporting points to GitHub Private Vulnerability Reporting and
   `security@paktryiti.pl`.
8. The Apache-2.0 license file names
   `Coderso - PatrykITI Patryk Ciechański` as copyright owner.
9. Public issue templates exist for bugs, feature requests, support requests,
   and documentation issues.
10. Blank issues are disabled and security reports are routed outside public
    issues.
11. The pull request template includes security, testing, documentation, and
    release notes expectations.
12. `CONTRIBUTING.md` explains that `_docs/` is the local technical and
    AI-agent-assisted documentation workspace, while `docs/` is the official
    public documentation surface.
