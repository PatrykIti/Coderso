# Changelog

All notable changes to this project will be documented in this file.
The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [1.6.1] - 2026-06-15
### Added
- Reusable browser-safe Page authoring modules under `core/admin/ui/pages/editor/` (canvas, floating toolbar, layers, command/template picker, host contract) and pure state/mutation helpers under `core/services/pages/`, enabling future non-Page-v2 CMS surfaces to mount the authoring shell. Planning docs for TASK-467 (admin bundle hardening) and TASK-468 (custom screens canvas rewrite).

### Changed
- `PageEditor.tsx` reduced to a slim host orchestrator (~1563 fewer lines) over the new modules with full UI/UX parity; route-level Page/Page Template validation now uses a lightweight Page v2 envelope schema, with full recursive validation owned by the domain normalizers (empty-template create-validation RSS ~810 MB → ~76 MB).

### Fixed
- Full-width Pages v2 section variants now fill the entire horizontal band for hero/CTA backgrounds instead of leaving white gutter strips, identically in public runtime and admin preview.

### Removed
- Recursive `pageDocumentV2JsonSchema` `$defs` spread from route-level AJV validators (pageCreate/Update/Autosave/Publish and pageTemplateCreate/Update).

### Security
- Centralized Page authoring sanitizers (`pageAuthoringSanitizers.ts`) now gate all author-controlled link/media/CSS sinks at persistence and render time, failing closed on `javascript:`/`data:`/protocol-relative/CSS-breakout payloads; `mailto:`/`tel:` preserved on link sinks only; reusable authoring modules constrained to browser-safe imports (no admin clients/DB/server/SDK/secrets).
## [1.6.0] - 2026-06-14
### Added
- Page Editor V2 authoring/runtime model with sections, atomic blocks, dedicated inspector controls, inline canvas editing, responsive public CSS, and preview support.
- Page Templates as a Page-native admin/runtime surface.
- Public site shell support with menu-based header/footer configuration and menu appearance/design authoring.
- Form and collection authoring in Pages, form submissions admin view, and visitor listing filters/search/sort/pagination.

### Changed
- Page Templates are now discovered from the Pages header instead of Advanced navigation.
- Advanced Widgets is hidden from default navigation while direct compatibility remains.
- Assistant/page-builder actions now target the Page V2 authoring/runtime contract.

### Fixed
- Page Editor stale-cache data-loss path, preview loopback probe behavior, responsive front delivery, Page V2 publish/reload parity, and Bun/Vitest regression coverage for the completed waves.

### Removed
- Obsolete widget-template admin/template routes, clients, and cache surfaces replaced by the Page Templates contract.

### Security
- Strengthened schema-first validation, fail-closed preview/template behavior, canonical listing query/cache handling, and documented security review coverage for new admin/public runtime paths.
## [1.5.0] - 2026-06-08
### Added
- Six MUI-aligned timeline presets as block variants (vertical-right, vertical-left, alternating, alternating-opposite, cards, compact) with an interactive preset gallery in the Wizard.
- Timeline axis position (left/right/alternate/alternate-reverse), per-step opposite content rendered as a semantic `<time>`, filled/outlined dot variants, and semantic dot tones (primary/secondary/success/error/warning/info/grey) mapped to theme tokens, with per-step overrides.
- Full lucide icon picker for timeline dots: 16 quick picks plus a searchable dialog over the entire lucide library, rendered SSR as `<svg>`, for a global dot icon and per-step markers.
- LLM Guide can add fields (text, richtext, number, boolean, select, media) to an existing content type from a natural-language prompt and a pasted field list (`content-type.field.add`), preserving the rest of the schema.
- Generic markdown-brief catalog setup (industry-neutral content type + admin screen + listing + public page + detail route).
- Model-capacity-aware assistant prompt budgeting (large pastes accepted up to the model token budget; HTTP 413 when too large); long prompts/messages scroll inside the assistant panel.
- `WidgetRenderContext.stickySurfaceOwner` hint so the renderer can signal that the outer surface owns sticky positioning.

### Changed
- Timeline editor reorganized into stacked, preset-gated `FieldGroup` sections (single-column for the narrow panel); render collapsed to shared vertical/horizontal/cards layout primitives used by canvas, admin preview, and public front; editor contract v2; renamed `data-timeline-*` diagnostic attributes; token-ownership docs updated (`timeline.spacing.*` / `timeline.typography.*`).
- Navigation collapse-on-scroll is now direction-aware and idempotent (24px threshold / 16px jitter); rebind/initialization preserves collapsed state; normal rendered Navigation delegates sticky (and the preview-banner offset) to the outer widget surface.
- Assistant prompt/message transport limits raised from 2,000 chars to a high cap bounded by the model token budget; provider-facing planning context strips full content-type schemas and sanitizes secret-like field names; beginner-style questions classified as documentation answers; generic catalog blueprint made field-agnostic.

### Fixed
- Timeline Visual editor options that were silently ignored in the page-builder canvas now always reflect (editor visibility, normalize, and render share one capability table).
- Navigation no longer re-expands on duplicate/no-delta scroll; admin preview and public runtime collapse behavior kept aligned; ambiguous double sticky ownership eliminated.
- `sanitizeAssistantMessage` collapses a single tab to a space while preserving newlines; generic field-add against a resolved content type no longer returns a generic unsupported response; removed industry-specific wording from generic execution messages.

### Removed
- Timeline `data.mode` driver, legacy variant set (milestones), and `layout`/`style`/`guides` field groups; the hardcoded `emerald` status color.
- **Clean break:** v1 timeline payloads are not migrated — existing author-created timeline blocks must be re-added (no code seeds timeline blocks, so the impact is author-created pages only).

### Security
- Reduced data sent to external LLM providers: full content-type schemas are stripped from provider context (kept server-side for dry-run/execute), and secret-like/empty field names are sanitized from provider-facing catalog schemas.
- `content-type.field.add` is additive-only and admin-authenticated, with strict reject-unknown validation, ≤120-field bound, two-layer secret-like field-name rejection, trusted-catalog-only target resolution, and server-side schema merge that preserves unrelated fields.
- Reviewer caveat: prompt-poisoning *marker* stripping is no longer applied to the provider **input** prompt (`providerPlanningContext.ts`); provider-injection defense now relies on the operation-draft-only output contract and output-side redaction. Token/secret redaction still applies.
## [1.4.0] - 2026-06-07
### Added
- Guided Basic/Advanced assistant site-builder intake with reviewed acceptance, full-service multi-page site generation, curated licensed media profiles, content-engine/custom-screen decisions, scoped follow-up refinement, and a product-readiness umbrella for remaining generic CMS assistant work.

### Changed
- Solution Kits now open the reviewed LLM Guide intake; Assistant Settings defaults to routine controls; Navigation runtime and the page editor canvas workspace behave consistently across admin and public surfaces.

### Fixed
- Media upload preserves native `File` metadata and normalizes MIME; full-service generation idempotency, public shell links, Navigation sticky/collapse behavior, and page-editor workspace clipping/scrolling are fixed.

### Removed
- Legacy AI Site Wizard manual siteKit plan/apply/rollback surface.

### Security
- Direct browser/admin `context.siteKit` is rejected, provider output remains operation-draft-only, prompt-poisoning and browser-state redaction are hardened, curated media keeps source/license trust boundaries, and unsupported media/booking/checkout/refinement paths fail closed.
## [1.3.0] - 2026-06-05
### Added
- Resend can now be configured as an email provider through Integrations and selected from Email Settings.

### Changed
- Aligned Coderso agent task workflow, task-board format, and task template rules.
- Email delivery, delivery logs, and form email automation now resolve the active email provider instead of assuming SMTP.

### Fixed
- Replaced the foreign task example with a Coderso-specific template and corrected changelog next-number guidance.
- Email secret redaction now covers Resend-shaped API keys in audit, export, UI copy, delivery failure, and automation error paths.

### Security
- Resend credentials are encrypted, backend-only, redacted, and sent only to the fixed Resend API endpoint.
## [1.2.3] - 2026-06-04
### Fixed
- reCAPTCHA v3 now preloads on admin login/reset and public Forms/Appointment Form runtimes when backend settings project an enabled site key, so the Google client and badge can appear before submit.

### Security
- reCAPTCHA bot-protection keys remain backend-owned through Admin Settings -> Security; secret keys stay server-only and environment variables are ignored for bot-protection runtime configuration.
## [1.2.2] - 2026-06-04
### Changed
- Protected admin workspace routes now load lazily after auth, RBAC, and setup gates, with stale lazy-chunk recovery and an admin bundle budget guard in PR gates.
- The production Docker image now runs Drizzle migrations before starting the core HTTP server, with a Postgres advisory lock and an explicit

### Fixed
- Post feed runtime excerpt logic no longer pulls server-bound post runtime mapping into the admin bundle.

### Security
- Startup migration failure logs redact direct `DATABASE_URL` values and do not expose database connection strings to browser-side surfaces.
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
