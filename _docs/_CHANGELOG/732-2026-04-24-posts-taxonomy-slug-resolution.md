# 732. Posts taxonomy slug resolution

Date: 2026-04-24
Version: unreleased
Tasks: TASK-204-02, TASK-204-02-01

## Key Changes

### CMS Posts / Taxonomy

- Fixed the Posts inspector category load path for the dedicated Posts content
  type contract. `taxonomyService` now resolves content type slugs such as
  `post` through `content_types` before querying UUID-backed taxonomy rows.
- Preserved bounded taxonomy route errors and added explicit
  `taxonomy_not_found` route mapping for missing write targets.
- Stabilized taxonomy DB-backed tests by using unique content type names on the
  shared `.env` database.

## Validation

- `set -a && source .env && set +a && bun -e '...getTaxonomyOverview("post")...'`
  - pass; returned an empty taxonomy overview instead of throwing.
- `set -a && source .env && set +a && bun test tests/unit/content/taxonomyService.test.ts tests/integration/routes/taxonomy.test.ts`
  - pass (`6 pass`).
