# 194-2026-02-09 - TASK-100-02 public base URL resolver and consumers

Date: 2026-02-09
Version: Unreleased
Tasks: TASK-100-02, TASK-100

## Summary
- Unified preview URL generation behind a single public base URL resolver with deterministic fallback order.

## Key Changes
- Core/Server: Refactored `core/server/utils/baseUrl.ts` into a canonical resolver with source precedence:
  - `site.publicBaseUrl` (settings)
  - `PUBLIC_BASE_URL` (env)
  - request-derived host/proto (`x-forwarded-host` / `x-forwarded-proto` / `host`)
  - relative fallback
- Core/Server: Added reusable helpers `resolvePublicBaseUrlFromSources` and `buildAbsolutePublicUrl`.
- Core/Server: Updated preview URL utilities with `createPublicUrlContextFromHeaders` and pure `buildPreviewUrl`.
- Core/Routes: Wired request header context into page/content/widget-template preview endpoints for runtime URL parity.
- Tests: Added `tests/unit/server/publicBaseUrl.test.ts` and expanded `tests/unit/server/previewUrls.test.ts`.
- Docs: Updated `_docs/CMS_API.md` and `_docs/PREVIEW_SPEC.md` with preview URL resolution policy.
