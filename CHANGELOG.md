# Changelog

All notable changes to this project will be documented in this file.
The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [1.0.2] - 2026-04-29
### Added
- TASK-237 remediation documentation for GitHub CodeQL security findings.
- DB-backed test isolation rule in `AGENTS.md`.

### Changed
- Testing and release-gate workflows now declare least-privilege token permissions.
- Rich-text HTML handling now uses safer, narrower helper logic instead of broad sanitizer/entity regex behavior.
- Video embed rendering now validates allowed hosts through shared URL host checks.
- Booking/content DB-backed tests now use suite-owned fixtures and scoped cleanup.

### Fixed
- CodeQL findings for workflow permissions, unsafe query paths, video embed host checks, and rich-text sanitizer/entity handling.
- `releaseConfig.test.ts` type error around optional semantic-release plugin lookup.
- Security gate flakiness caused by shared DB tests deleting whole booking tables.

### Security
- Hardened CodeQL-flagged surfaces without disabling Semgrep, Trivy, Gitleaks, or CodeQL scanning.
## [1.0.1] - 2026-04-29
### Changed
- Release Docker image publishing now normalizes GHCR owner and image names to lowercase before pushing tags.

### Fixed
- Fixed GHCR publishing for mixed-case GitHub owners such as `PatrykIti`.
## [1.0.0] - 2026-04-28
### Added
- Initial semantic-release pipeline for Coderso Core with SemVer tags, changelog generation, synchronized version files, GitHub release publishing, and Docker image publishing.

### Changed
- Semantic-release now uses the bypass-approved GitHub App for release commits, tags, checkout credentials, and GitHub release API calls.

### Security
- Release automation now keeps the GitHub App private key in repository secrets and uses short-lived installation tokens for release git/API operations.
