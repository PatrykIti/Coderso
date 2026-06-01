# TASK-359-04: General and Site Placeholder Truthfulness
# FileName: TASK-359-04_General_and_Site_Placeholder_Truthfulness.md

**Priority:** High
**Category:** Admin UI + Settings + Site + UX Truthfulness
**Estimated Effort:** Large
**Dependencies:** TASK-359-01, TASK-359-03, TASK-360-02, TASK-360-04
**Status:** To Do

---

## Overview

Make General and Site Settings controls truthful: logo/favicon/timezone and
Site Performance must either persist through real contracts or render disabled,
and high-risk routing/security-header changes must require review.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md`
- `core/admin/ui/settings/**`
- `core/admin/ui/site/SiteSettingsPage.tsx`
- `core/admin/services/settingsClient.ts`
- `core/admin/services/siteSettingsClient.ts`
- Existing media picker/upload services

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| General settings UI/service | Implement or disable logo, favicon, and timezone controls. |
| `core/admin/ui/site/SiteSettingsPage.tsx` | Implement or disable Performance controls and add review for routing/security-header risk. |
| Settings/site schemas | Own strict branding/site payload normalizers and reject unknown fields. |
| Media picker/upload integration | Use existing safe media contract for logo/favicon if implemented. |
| Tests | Cover media picker, timezone round-trip or disabled state, performance truthfulness, and high-risk confirms. |

## Implementation Pseudocode

```ts
type BrandingSavePayload = {
  siteName: string;
  siteLocale: string;
  timezone?: string;
  logoMediaId?: string | null;
  faviconMediaId?: string | null;
};

function buildBrandingSavePayload(form: GeneralSettingsForm): BrandingSavePayload {
  return strictNormalizeBrandingPayload({
    siteName: form.siteName.trim(),
    siteLocale: form.siteLocale,
    timezone: form.timezone || undefined,
    logoMediaId: form.logoMediaId ?? null,
    faviconMediaId: form.faviconMediaId ?? null,
  });
}

function classifySiteRoutingRisk(before: SiteSettingsResponse, after: SiteSettingsForm) {
  return {
    adminPathChanged: before.adminPath !== after.adminPath,
    baseUrlChanged: before.publicBaseUrl !== after.publicBaseUrl ||
      before.adminBaseUrl !== after.adminBaseUrl,
    homepageChanged: before.homepageId !== after.homepageId,
    notFoundChanged: before.notFoundPageId !== after.notFoundPageId,
  };
}
```

Data flow:

- General media buttons open existing file/media picker or render disabled with
  truthful copy.
- Selected media IDs update dirty local form state.
- Save sends normalized branding payload through settings service.
- Site save computes routing/security risk and opens confirm before PATCH when
  risk is non-empty.
- Success updates redacted settings cache and visible preview state.

Error handling:

- Invalid media type/size shows field-level error.
- Failed upload/select leaves previous logo/favicon intact.
- High-risk site save cancel leaves draft dirty.
- Save conflict/403 refreshes settings and permission snapshot without
  overwriting unsaved draft.
- Preview/View homepage failures report an error instead of silent no-op.

## Security Contract

- Endpoint visibility: internal admin settings/site/media endpoints.
- Auth model: authenticated admin session.
- RBAC: `settings:write` for branding/site writes; existing media RBAC for
  selecting/uploading media.
- CSRF: required for writes/uploads.
- Rate-limit bucket: `admin_write` for settings writes; media picker keeps the
  existing media route bucket.
- Reject unknown validation: strict branding/site schemas and media type/size
  validation.
- Anti-abuse: internal session routes; no nonce, HMAC, or captcha.
- Lockout protection: admin path/base URL changes require confirm and rollback
  guidance.
- Secret handling: no secrets in branding/site cache payloads.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI: logo/favicon buttons open picker or are disabled/read-only.
- Route/service tests for branding/site schema if implemented.
- Vitest/Bun tests: timezone round-trips or disabled state cannot submit.
- Vitest UI: Performance controls are not active placeholders.
- Vitest UI/Playwright: admin path/base URL, homepage/default route, 404 page,
  and security-header changes require review/confirm.
- No-op audit gate from `TASK-360-04` does not flag General/Site controls.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md`
- `_docs/CMS_API.md` for any changed settings payload
- `docs/guide/screens/settings.md`
- `_docs/ADMIN_CACHE.md` / `_docs/ADMIN_CACHE_MAP.md` if cache payload changes
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- General/Site controls either perform real work or are truthfully unavailable.
- Routing/base URL/security-header changes require explicit review.
- Saves update redacted cache without overwriting dirty drafts.
