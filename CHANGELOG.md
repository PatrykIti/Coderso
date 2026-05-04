# Changelog

All notable changes to this project will be documented in this file.
The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [1.1.1] - 2026-05-04
### Changed
- Changed local pre-commit hook setup to an explicit contributor step with `git config core.hooksPath .githooks` instead of an install-time lifecycle hook.

### Fixed
- Fixed Docker image release builds so the next semantic-release run can publish a fresh image again after the previous `feat(custom-screens)` / `1.1.0` release stopped in `bun install` before the image stage completed.

### Removed
- Removed the root install-time `prepare` hook setup that made `bun install` depend on `git` and a real Git worktree.
## [1.1.0] - 2026-05-04
### Added
- Local pre-commit hook for staged formatting, linting, and type checks.
- Contributor and agent documentation for the pre-commit workflow.
- Added TASK-239 and TASK-240 umbrella planning docs for member portal and
- Added changelog entries 770 through 773.
- Added the Custom Screens V3 workspace with persisted `definition` contracts, table-canvas `List View`, screen-owned `Editor View`, preview dialogs, and record-backed preview/binding flows.
- Added mode-specific screen-widget editors and expanded widget-owned binding metadata for `screen-*` surfaces.

### Changed
- Repository setup now configures `core.hooksPath` through `bun run prepare`.
- Renumbered the GitHub CodeQL remediation task family from TASK-237 to
- Updated the task board and architecture docs for TASK-220, TASK-238, and
- Removed Markdown files from the staged Prettier formatter used by
- Changed widget editors and runtime to support `none` visual off tokens and `Clear` surface controls without `transparent` or empty-string sentinels.
- Changed Menus editor interactions and Media Library defaults so drag/drop, bulk selection, and upload actions stay aligned with the current admin UI.

### Fixed
- Fixed Markdown table/indentation damage in currently touched task docs and
- Fixed published Pages preview so unsaved editor changes sync before preview while public visitors still see `publishedData` until `Publish`.
- Fixed stale Custom Screen definition reads, matching assistant custom-screen noop handling, and V3 rerun updates so repeat executions no longer fail on persisted editor definitions.
- Fixed Menus detail hydration, drag-handle hit target, and drop-intent stability, and reset Integrations drawer/request dialog state between sessions.

### Removed
- Removed `.md` and `.mdx` from automatic staged Prettier formatting.
- Removed the active Custom Screens classic-editor/create-drawer fallback from the screen-owned record workflow.
- Removed the Media Library header `Select` toggle because multi-select is now always available.

### Security
- Documented clean CodeQL and secret-scanning verification for TASK-238.
## [1.0.3] - 2026-04-29
### Changed
- No categorized release notes were provided.
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
