# 1038 - TASK-349 SEO Manager tools remediation closure

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-349, TASK-349-01, TASK-349-02, TASK-349-03, TASK-349-04

## Key Changes

### SEO Manager

- Wired SEO Manager documents into public page rendering for published pages,
  with documented fallback precedence and public HTML cache clearing after SEO
  mutations.
- Added shared SEO scoring for save and audit paths so title/description edits
  return fresh `score`, `status`, and `issues` without wiping omitted
  canonical/robots fields.
- Added strict audit check IDs (`meta`, `links`, `robots`) through the admin
  dialog, client, route validation, and service; unknown checks now fail with a
  machine-readable validation error.
- Added robots rendering to public page and entry HTML, preserved explicit
  detail-page SEO mappings, and kept preview rendering draft-local.
- Added canonical URL and robots authoring fields in SEO Manager and guarded
  the list view against legacy/stale cached rows that omit title/path fields.
- Fixed public page lookup to resolve stored slugs with or without a leading
  slash, so SEO documents saved from admin render on the matching public URL.
- Reworked SEO Manager empty/pre-scan states, disabled the unsupported filter
  icon, made drawer `Discard` reset local edits, and removed focus-keyword
  placeholder authoring.
- Added SEO list/detail admin cache hydration plus prefetch for `/admin/seo`.

## Validation

- `set -a && source .env && set +a && bun test tests/unit/seo/seoService.test.ts tests/unit/seo/seoSchema.test.ts tests/integration/routes/seo.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/runtime/pages-runtime.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/runtime/detail-page-runtime.test.ts`
- `bun run test:vitest -- tests/vitest/admin/seoClient.test.ts tests/vitest/ui/seo-manager.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Focused Playwright CLI probe for `/admin/seo`: temporary admin/page fixture,
  audit dialog, drawer save, public page `<title>` and meta description parity,
  and console-error assertion; fixtures and temporary Playwright files were
  removed after the pass.
- Final live Tools smoke confirmed drawer canonical/robots controls and public
  runtime rendering for `<title>`, description, canonical, and robots tags on a
  real published test page.
