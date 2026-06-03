# Changelog

All notable changes to this project will be documented in this file.
The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [1.2.1] - 2026-06-03
### Added
- Added public Forms widget submissions through the shared signed nonce/HMAC, bot-protection, strict validation, error mapping, and public-write rate-limit contract.
- Added deterministic widget smoke/regression coverage and assistant policy coverage for Settings Security subroutes.

### Changed
- Admin Tools and Admin UI audit surfaces now share cache, notification, loading-state, table, permission, confirmation, export, drawer, and server-backed query/pagination contracts.
- Widget admin editors now expose more truthful Visual/Wizard/Advanced ownership, dormant-state copy, slot/destination metadata, disabled states, and diagnostics.

### Fixed
- Fixed Admin Tools regressions in Search, SEO Manager, Analytics, Backups, Import/Export, Redirects, public SEO metadata verification, and cache revisit behavior.
- Fixed Users, Roles Matrix, Audit Logs, Access Logs, and Settings audit findings for no-op controls, missing confirmations, placeholder behavior, export/pagination drift, secret-safe cache handling, and accessibility gaps.
- Fixed remaining 31-05 widget audit drifts across public runtimes, unsafe URL/CSS handling, editor truthfulness, booking/form runtime boundaries, and smoke coverage.

### Security
- Hardened admin RBAC, destructive actions, session revocation, export redaction, Settings cache redaction, public Forms submissions, and booking widget write paths with stricter validation, redaction, nonce, bot-protection, rate-limit, and server-side availability checks.
## [1.2.0] - 2026-05-31
### Added
- Detail-page (per-entry detail template) subsystem: document, revision, runtime, binding, and schema services with an internal admin API (CRUD, autosave, preview, publish/unpublish, revision restore) and public rendering on content routes (TASK-190)
- Collection-workspace read model that canonically resolves a content type's content routes, detail page, list page, listing query/template, and admin screen (TASK-190)
- Assistant blueprint-composition layer: capability registry/schema, page-section library, schema/facet/card mergers, conflict resolver, existing-resource matcher, and admin-surface composer (TASK-190)
- Widget editor contract v2 validator enforcing stable section ids, single-owner writable paths, known section roles, and read-only advanced diagnostics across all 38 page-builder widgets
- DOM ownership metadata on widget editor controls (data-widget-control-path, data-widget-control-ownership, data-widget-editor-section-role) for automated contract verification
- Path-aware shared editor controls: SharedColorControl, LinkDestinationField, TokenOrPixelField, ClearableFields, and ReadonlyWidgetSummaryRow
- Bun-owned Playwright widget-contract smoke harness classifying admin-mode, public-CSS, fixture-gap, metadata-gap, and environment failures across the 38-widget inventory
- docs/develop/ developer handbook (12 pages) and a docs/README.md hub routing users (docs/guide), developers (docs/develop), and internal reference (_docs)
- Configurable booking-nonce TTL (FORM_SUBMIT_NONCE_TTL_MINUTES) and typed form field contracts for number, hidden, time, and rating fields
- Widget preview routes for entry teaser, product compare, product gallery, and product table

### Changed
- Brought navigation, contact, cta-banner, testimonials, pricing-plans, faq-accordion, gallery-mosaic, team, rich-text-section, entry-teaser, product-gallery, product-compare, and timeline editors to hero parity with truthful section ids/titles/roles
- Made advanced-mode widget diagnostics read-only and converted the widget wizard into a one-time setup step
- Threaded a WidgetRenderContext (public / editor-preview / admin-preview modes, nested row-flow surface) through the widget renderer
- Relocated all end-user product docs under docs/guide/ and moved the assistant knowledge-corpus source root from docs/ to docs/guide/ (POST /assistant/reindex now ingests docs/guide)
- Replaced raw widget color value inputs with swatch-first shared color controls
- site.contentRoutes settings now carry a validated detailPageId and invalidate the content-route cache on transition
- Hardened Bun/Vitest test scripts to source .env, run single-threaded with a 15s timeout under NODE_ENV=test, and extended coverage globs to assistant blueprint/provider/action-planner modules

### Fixed
- Hero single-CTA selection now persists through save/reload instead of silently restoring the secondary CTA
- Hero overlay color is preserved when only overlay strength changes, and background-image overlays use a valid layered composition instead of invalid background-image: rgba(),url()
- Closed missing control-path ownership metadata on pricing-plans, faq-accordion, cta-banner, and contact Visual controls
- Widget device-visibility filtering no longer hides blocks when no preview device is set
- Forms reject file-upload fields and invalid number/time/rating field definitions at validation time
- Legacy content-list pagination residuals corrected and navigation runtime menu mapping hardened with safe-href normalization (TASK-262, TASK-275)
- Stale references to docs/ as the assistant source-of-truth corrected to docs/guide/ across ARCHITECTURE and ingest documentation

### Removed
- Shared BlockSettings live-preview row from the daily Visual and Advanced editor tabs
- Raw advanced widget payload, media-url, and link-text inputs in favor of structured safe controls
- Legacy single docs root for assistant doc ingestion (replaced by docs/guide)

### Security
- Booking/form submission nonces are HMAC-SHA256 signed, scope- and claim-bound, and verified with timingSafeEqual to prevent forgery and timing attacks
- Widget link/href inputs are normalized through normalizeWidgetSafeHref, blocking javascript:, data:, vbscript:, and protocol-relative URLs and adding rel=noopener noreferrer on external targets
- Editor contract path validation rejects unsafe dot-path segments (__proto__, prototype, constructor) to prevent prototype-pollution-style writable paths
- Detail-page ids and preview-token contexts validated against a strict UUID format, and public detail-page title tokens are allowlist-checked before binding
- Closed strict security dependency advisories by pinning fast-uri (^3.1.2) and fast-xml-builder (^1.1.7) transitive overrides and refreshing the lockfile (TASK-190)
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
