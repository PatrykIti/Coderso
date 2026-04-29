# Changelog

All notable changes to this project will be documented in this file.
The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

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
