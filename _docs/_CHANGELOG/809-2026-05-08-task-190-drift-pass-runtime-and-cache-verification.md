# 809 - TASK-190 drift pass runtime and cache verification

**Date:** 2026-05-08
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-05-02, TASK-190-05-03-04, TASK-190-05-03-07, TASK-190-07

## Key Changes

### Drift-pass closure

- Corrected `_docs/CMS_API.md` so the detail-page admin API permissions now
  explicitly include `content:publish` alongside `content:read` and
  `content:write`.
- Added DB-backed owner-seam regression coverage proving that form, listing
  query, and listing template update/delete flows invalidate linked detail-route
  public cache through the shared site-cache helper.
- Added Bun runtime preview coverage for `type=content` preview with explicit
  `detailPageId` fail-closed behavior when the requested detail page is draft or
  belongs to another content type.
- Added execute-path coverage for assistant `detail-page.upsert` stale
  `expectedExistingId` conflicts.
- Increased DB-backed `detail-page-preview-cache` and assistant DB-test timeouts
  so the Bun runtime lane stays green against the real external database used in
  validation.

### Validation

- `set -a && source .env && set +a && bun run lint` - passed.
- `set -a && source .env && set +a && bun run test:vitest` - passed.
- `set -a && source .env && set +a && bun run test:bun` - passed.
- `set -a && source .env && set +a && bun run scan:security:strict` - passed.
