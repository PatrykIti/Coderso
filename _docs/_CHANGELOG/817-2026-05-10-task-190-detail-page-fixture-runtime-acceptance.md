# 817 - TASK-190 detail-page fixture runtime acceptance

**Date:** 2026-05-10
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-05, TASK-190-05-03, TASK-190-05-03-06

## Key Changes

### Detail-page composer acceptance

- Added local deterministic detail-page fixtures for house projects, products,
  services, and portfolio case studies.
- Validated route-linked `detail-page.upsert` composition through canonical
  `site.contentRoutes.detailPageId` ownership instead of embedding route data
  inside detail-page documents.
- Added negative coverage for missing fields, secret-like field bindings,
  duplicate route mappings, provider-injected detail-page payloads, and gated
  checkout/booking metadata.

### Runtime coverage

- Added DB-backed public runtime acceptance for composed detail pages across the
  local fixture set.
- Covered published entry render, draft entry hiding, valid-token detail-page
  preview using current draft data, and legacy unlinked detail-route fallback.
- Kept the shared live/provider matrix deferred to the later `TASK-190-08`
  closure leaf.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/blueprint-detail-page-fixtures.test.ts`
- `set -a && source .env && set +a && bun test --parallel=1 tests/integration/runtime/detail-page-composer-runtime.test.tsx`
