<!--
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  PLIK TYMCZASOWY — opis PR dla gałęzi feature/corrections → main          │
  │  Możesz go skasować po utworzeniu PR (rm PR-DESCRIPTION.md).              │
  └─────────────────────────────────────────────────────────────────────────┘

  JAK TO GRA Z WASZYMI WORKFLOWAMI (GitHub):

  • release.yml → semantic-release (preset "angular") odpala się po merge do main.
    Analizuje TYPY commitów. W gałęzi jest 78× feat, 118× fix, 0 breaking →
    bump MINOR. Następna wersja liczona z ostatniego taga (1.1.1) ⇒ ~1.2.0.
    Dlatego tytuł PR jest w formie `feat: …` — przy squash-merge to on trafia
    do analizatora i też daje minor. Spójne w obie strony (merge / squash).

  • scripts/semantic-release-pr-notes.cjs buduje CHANGELOG.md, PARSUJĄC sekcję
    [Release Notes] z TREŚCI tego PR. Działa format `- [Added] konkretny tekst`.
    Puste `- [Added]` (jak w szablonie) i "none/n/a/tbd" są ignorowane — dlatego
    poniżej każda pozycja ma realny tekst. Sekcja jest OSTATNIA, więc nic jej nie
    ucina (parser kończy na następnym nagłówku `## `).

  • coderso-pr-gates.yml NIE waliduje tytułu/treści — odpala migracje DB, lint,
    typecheck, Vitest+Bun, Semgrep/Trivy/Gitleaks, release-gates. Treść PR jest
    pod nie obojętna; liczy się tylko zielony build.

  • Struktura sekcji (Summary/Changes/Security/Testing/Documentation/[Release
    Notes]) i checkboxy są 1:1 z .github/PULL_REQUEST_TEMPLATE.md.

  ┌─────────────────────────────────────────────────────────────────────────┐
  │  TYTUŁ PR (wklej w pole "Title"):                                         │
  │                                                                           │
  │  feat: widget editor-contract truthfulness, detail-page subsystem, and    │
  │  docs split                                                               │
  │                                                                           │
  │  (jednolinijkowo, gdyby pole nie łamało:)                                 │
  │  feat: widget editor-contract truthfulness, detail-page subsystem, and docs split
  └─────────────────────────────────────────────────────────────────────────┘

  ▼▼▼ KOPIUJ WSZYSTKO PONIŻEJ TEJ LINII DO POLA "DESCRIPTION" PR ▼▼▼
-->

## Summary

This branch lands three large, interlocking workstreams plus their supporting tests, docs, and dependency hardening:

1. **Widget editor-contract truthfulness program** — a versioned **editor contract v2** validator plus DOM-level control-ownership metadata, driving all **38 page-builder widgets** to *truthfully* match their declared editor surface and reach parity with the `hero` baseline (task families TASK-336 / TASK-339 / TASK-342 / TASK-343). Real defects were closed along the way (hero single-CTA persistence, overlay composition) and raw URL/link/color/media inputs were replaced with safe, path-aware shared controls.
2. **Detail-page subsystem & collection workspace (TASK-190)** — a full per-entry *detail template* subsystem (document/revision/runtime/binding/schema services, internal admin CRUD+lifecycle API, public rendering on content routes), a canonical **collection-workspace read model**, and a large assistant **blueprint-composition layer** (23 modules).
3. **Documentation restructure** — `docs/` is split by audience: end-user content moves under `docs/guide/` (the assistant knowledge corpus) and a new `docs/develop/` developer handbook (12 pages) is added, with a `docs/README.md` routing hub. The assistant ingest root moves from `docs/` → `docs/guide/`.

Why: to make the page-builder editors honest about what they own (a prerequisite for reliable automated audits), to ship the detail-page/collection composition foundation, and to give users and contributors clearly separated documentation. The change also signs booking/form submission nonces, sanitizes widget hrefs, and closes strict dependency advisories.

## Changes
- **Widgets / editor contract**: `core/widgets/editorContract.ts` validator (v2) wired into `registry.ts`; `editorContract` declared on all 38 widgets; DOM ownership metadata in `WidgetEditorControls.tsx`; shared safe controls (`SharedColorControl`, `LinkDestinationField`, `TokenOrPixelField`, `ClearableFields`, `ReadonlyWidgetSummaryRow`); `WidgetRenderContext` threaded through `widgetRenderer.tsx`.
- **Core / detail-page (TASK-190)**: detail-page document/revision/runtime/binding/schema services, `detailPageRoutes.ts` admin API, public rendering in `renderPublicPage.tsx`/`publicSite.tsx`, `collectionWorkspaceService`, assistant `blueprints/*` (23 modules), `cmsTargetResolver` detail-page/collection/admin-screen surfaces.
- **Booking / forms**: HMAC-signed scoped booking-slot nonces (`bookingSlotsToken`), preview date-range policy, typed `number/hidden/time/rating` form-field contracts with file-upload rejection.
- **Docs**: new `docs/develop/` (12 pages) + `docs/README.md` hub; `docs/{coderso,screens,playbooks,...}` → `docs/guide/`; assistant ingest root moved to `docs/guide/`; README / AGENTS / `_docs/ARCHITECTURE.md` updated; `_docs` task/playwright/changelog evidence added.
- **Tests**: 363 files under `tests/` (70 new) — `editorContract.test.ts`, runtime-script SSR tests (form/listing/navigation/gallery/booking), `widgetSafeHref`, booking/commerce schema validation, editor DOM-ownership tests; `vitest.config.ts` coverage globs extended.
- **Infra / security**: `fast-uri` / `fast-xml-builder` root overrides + refreshed `bun.lock`; hardened Bun/Vitest test scripts (`.env`, single-thread, `NODE_ENV=test`); `scripts/playwright-widget-contract-smoke.ts`; `.gitignore` for local Playwright audit artifacts.

## Security
- [ ] No security-sensitive behavior changed
- [x] Auth/RBAC/CSRF/rate-limit/validation impact reviewed
- [x] Secret handling and browser exposure reviewed
- [x] Public write or vulnerability-handling impact reviewed

## Testing
- [x] Unit tests
- [x] Integration tests
- [x] Manual validation
- [ ] Documentation-only review
- [x] Release gates or CI lanes

## Documentation
- [x] Task docs updated
- [x] Changelog updated
- [x] Source-of-truth docs updated

[Release Notes]
- [Added] Detail-page (per-entry detail template) subsystem: document, revision, runtime, binding, and schema services with an internal admin API (CRUD, autosave, preview, publish/unpublish, revision restore) and public rendering on content routes (TASK-190)
- [Added] Collection-workspace read model that canonically resolves a content type's content routes, detail page, list page, listing query/template, and admin screen (TASK-190)
- [Added] Assistant blueprint-composition layer: capability registry/schema, page-section library, schema/facet/card mergers, conflict resolver, existing-resource matcher, and admin-surface composer (TASK-190)
- [Added] Widget editor contract v2 validator enforcing stable section ids, single-owner writable paths, known section roles, and read-only advanced diagnostics across all 38 page-builder widgets
- [Added] DOM ownership metadata on widget editor controls (data-widget-control-path, data-widget-control-ownership, data-widget-editor-section-role) for automated contract verification
- [Added] Path-aware shared editor controls: SharedColorControl, LinkDestinationField, TokenOrPixelField, ClearableFields, and ReadonlyWidgetSummaryRow
- [Added] Bun-owned Playwright widget-contract smoke harness classifying admin-mode, public-CSS, fixture-gap, metadata-gap, and environment failures across the 38-widget inventory
- [Added] docs/develop/ developer handbook (12 pages) and a docs/README.md hub routing users (docs/guide), developers (docs/develop), and internal reference (_docs)
- [Added] Configurable booking-nonce TTL (FORM_SUBMIT_NONCE_TTL_MINUTES) and typed form field contracts for number, hidden, time, and rating fields
- [Added] Widget preview routes for entry teaser, product compare, product gallery, and product table
- [Changed] Brought navigation, contact, cta-banner, testimonials, pricing-plans, faq-accordion, gallery-mosaic, team, rich-text-section, entry-teaser, product-gallery, product-compare, and timeline editors to hero parity with truthful section ids/titles/roles
- [Changed] Made advanced-mode widget diagnostics read-only and converted the widget wizard into a one-time setup step
- [Changed] Threaded a WidgetRenderContext (public / editor-preview / admin-preview modes, nested row-flow surface) through the widget renderer
- [Changed] Relocated all end-user product docs under docs/guide/ and moved the assistant knowledge-corpus source root from docs/ to docs/guide/ (POST /assistant/reindex now ingests docs/guide)
- [Changed] Replaced raw widget color value inputs with swatch-first shared color controls
- [Changed] site.contentRoutes settings now carry a validated detailPageId and invalidate the content-route cache on transition
- [Changed] Hardened Bun/Vitest test scripts to source .env, run single-threaded with a 15s timeout under NODE_ENV=test, and extended coverage globs to assistant blueprint/provider/action-planner modules
- [Fixed] Hero single-CTA selection now persists through save/reload instead of silently restoring the secondary CTA
- [Fixed] Hero overlay color is preserved when only overlay strength changes, and background-image overlays use a valid layered composition instead of invalid background-image: rgba(),url()
- [Fixed] Closed missing control-path ownership metadata on pricing-plans, faq-accordion, cta-banner, and contact Visual controls
- [Fixed] Widget device-visibility filtering no longer hides blocks when no preview device is set
- [Fixed] Forms reject file-upload fields and invalid number/time/rating field definitions at validation time
- [Fixed] Legacy content-list pagination residuals corrected and navigation runtime menu mapping hardened with safe-href normalization (TASK-262, TASK-275)
- [Fixed] Stale references to docs/ as the assistant source-of-truth corrected to docs/guide/ across ARCHITECTURE and ingest documentation
- [Removed] Shared BlockSettings live-preview row from the daily Visual and Advanced editor tabs
- [Removed] Raw advanced widget payload, media-url, and link-text inputs in favor of structured safe controls
- [Removed] Legacy single docs root for assistant doc ingestion (replaced by docs/guide)
- [Security] Booking/form submission nonces are HMAC-SHA256 signed, scope- and claim-bound, and verified with timingSafeEqual to prevent forgery and timing attacks
- [Security] Widget link/href inputs are normalized through normalizeWidgetSafeHref, blocking javascript:, data:, vbscript:, and protocol-relative URLs and adding rel=noopener noreferrer on external targets
- [Security] Editor contract path validation rejects unsafe dot-path segments (__proto__, prototype, constructor) to prevent prototype-pollution-style writable paths
- [Security] Detail-page ids and preview-token contexts validated against a strict UUID format, and public detail-page title tokens are allowlist-checked before binding
- [Security] Closed strict security dependency advisories by pinning fast-uri (^3.1.2) and fast-xml-builder (^1.1.7) transitive overrides and refreshing the lockfile (TASK-190)
