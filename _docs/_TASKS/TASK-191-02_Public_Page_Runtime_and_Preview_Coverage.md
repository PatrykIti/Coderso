# TASK-191-02: Public Page Runtime and Preview Coverage
# FileName: TASK-191-02_Public_Page_Runtime_and_Preview_Coverage.md

**Priority:** High
**Category:** QA + CMS/Pages + Runtime
**Estimated Effort:** Medium
**Dependencies:** TASK-191
**Status:** To Do

---

## Overview

Add Bun-owned runtime tests proving that public page rendering and runtime
preview use the correct data source and safety rules.

The pure renderer has Vitest coverage for layout, visibility, template markers,
and widget resolved payloads. The missing piece is the server runtime path in
`core/server/publicSite.tsx`:

- public requests must render only `publishedData`,
- draft/unpublished pages must 404,
- preview requests must render `currentData` through a valid preview token,
- invalid/expired preview tokens must fail deterministically,
- content-route matching and page route fallback must not regress.

## Sub-Tasks

- Add a runtime test harness for disposable page records and settings needed by
  `handlePublicRequest`.
- Cover public published page rendering:
  - published page with `publishedData` returns `200 text/html`,
  - rendered content comes from `publishedData`, not stale `currentData`.
- Cover draft/unpublished safety:
  - draft page slug returns `404`,
  - published status without `publishedData` returns `404`.
- Cover runtime preview:
  - valid `/preview?type=page&token=...` renders `currentData`,
  - invalid target type or missing token returns `404`,
  - expired token returns `410 Preview expired`,
  - preview disabled returns `404`.
- Cover routing interactions:
  - content route match takes precedence when configured,
  - normal page route still resolves by slug when no content route matches,
  - query params bypass site cache when applicable.

## Security Contract

- Visibility: public read-only runtime.
- Auth model: no session required for published pages; `/preview` requires a
  valid preview token and matching `targetType`.
- RBAC: not applicable on public read routes; admin creation of preview tokens
  remains covered by `TASK-191-01`.
- CSRF: not applicable; no public write route is introduced.
- Rate-limit bucket: `public_read` through `handlePublicRequest`.
- Reject-unknown validation:
  - public search validation remains separate,
  - preview query params must reject missing/unknown target type by returning
    `404`.
- Anti-abuse:
  - preview tokens are hashed in storage and TTL-bound,
  - no nonce/signature/HMAC or reCAPTCHA required because this is public read
    only.
- Secret handling:
  - preview tokens in tests must be synthetic and must not be logged beyond
    local assertions.

## Testing Requirements

- Add Bun tests near one of:
  - `tests/integration/runtime/pages-runtime.test.tsx`
  - `tests/integration/server/public-pages.test.ts`
- Run:
  - `set -a && source .env && set +a && bun test tests/integration/runtime/pages-runtime.test.tsx`
    or the final chosen file.
  - `set -a && source .env && set +a && bun test tests/unit/pages/previewService.test.ts`
  - `set -a && source .env && set +a && bun test tests/unit/pages/pageService.test.ts`

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md` only if runtime preview behavior differs from the
  current documented contract.
- `_docs/ARCHITECTURE.md` only if the runtime pipeline contract changes.
- `_docs/_TASKS/README.md` when status changes.
- `_docs/_CHANGELOG/*` on completion.
