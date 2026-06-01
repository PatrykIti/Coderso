# TASK-359: Admin Settings Report Remediation Family
# FileName: TASK-359_Admin_Settings_Report_Remediation_Family.md

**Priority:** High
**Category:** Admin UI + Settings + Cache + Security UX + RBAC + QA + Docs
**Estimated Effort:** Very Large
**Dependencies:** TASK-355 current-user permission propagation, TASK-356 RBAC guard pattern, TASK-1034 audit evidence
**Status:** To Do

---

## Overview

Turn `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md` into an
execution-ready remediation family for all `/admin/settings/**` surfaces.

The report proves several Settings writes are real and reversible through UI:
General `Site name`, Site `Cache TTL`, Security `Password reset TTL`, and
Security `session.maxPerUser`. It also proves a large set of UX and architecture
gaps: Settings navigation bypasses the SPA router, values are not cached like
other admin resources, restricted users see a forbidden shell, high-risk actions
lack confirms, mobile navigation is missing, and several active-looking controls
are placeholders.

## Source Evidence

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `core/admin/app/AdminApp.tsx`
- `core/admin/ui/settings/**`
- `core/admin/ui/site/SiteSettingsPage.tsx`
- `core/admin/ui/layouts/SettingsShell.tsx`
- `core/admin/services/settingsClient.ts`
- `core/admin/services/siteSettingsClient.ts`
- `core/admin/services/emailClient.ts`
- `core/admin/services/apiKeysClient.ts`
- `core/admin/services/webhooksClient.ts`
- `core/admin/services/integrationsClient.ts`
- `core/admin/services/sessionsClient.ts`
- `core/admin/services/ipAllowlistClient.ts`

## Remediation Scope

| Finding | Required outcome |
|---|---|
| Settings route lacks `settings:read` guard | Sidebar and route shell hide/deny Settings before rendering default content. |
| Global `getSettings()` runs without permission | Current-user permission snapshot gates settings bootstrap; 403 is not normal UX. |
| Settings sidebar uses raw `<a>` | Use `AdminLink`, canonical helpers, prefetch, and SPA navigation. |
| Settings values lack cache/hydration contract | Add a redacted/non-secret cache strategy or explicitly document no-cache per sensitive surface; remove accidental force refetches. |
| Dirty state can be lost | Add route/browser navigation guard or draft preservation. |
| Mobile Settings navigation missing | Provide mobile section navigation. |
| General logo/favicon/timezone placeholders | Implement or disable/read-only. |
| Site Performance placeholder | Implement or hide/disable. |
| High-risk settings actions lack confirms | Add confirms for clear secret, sessions revoke, API key rotate/revoke, webhook delete/test, IP removal, high-risk security save. |
| Login Alerts placeholders | Persist or mark brute-force slider, recipients, channels, and sticky actions as unavailable. |
| Sessions link-buttons no-op | Implement or remove/disable. |
| Drawers lack accessible descriptions | Add `SheetTitle`/`SheetDescription` coverage. |
| Storage `Test Connection` no-op | Implement backend test endpoint or disable. |
| Email `Export Logs` no-op | Implement export or disable. |
| Assistant reindex side effect | Add confirm/dry-run with document/chunk counts. |
| QA `Max sessions per user = 30` remains | Restore default/target value or track explicit QA override. |

## Sub-Tasks

### TASK-359-01: Settings RBAC Guard and Bootstrap Discipline

**Status:** To Do

Implementation shape:

- Use the permission snapshot from TASK-355 to gate `/admin/settings/**`.
- Hide Settings sidebar item for users without `settings:read`.
- Do not call global `getSettings()` after login when the current user lacks
  `settings:read`.
- `AdminApp` should render a shared `AccessDenied` state rather than the
  Settings default shell with inline `Forbidden`.

Pseudocode:

```ts
function shouldLoadGlobalSettings(can: (permission: string) => boolean) {
  return can("settings:read");
}

function resolveSettingsRouteAccess(can: (permission: string) => boolean) {
  return {
    canReadSettings: can("settings:read"),
    canWriteSettings: can("settings:write"),
    canManageSecurity: can("security:write") || can("settings:write"),
  };
}
```

Regression tests:

- Restricted user without `settings:read` sees no Settings nav link.
- Direct URL `/admin/settings` returns access denied UI without default content.
- No `GET /admin/api/settings` fires for users without `settings:read`.
- Backend 403 remains covered.

### TASK-359-02: Settings SPA Navigation, Dirty Guard, and Mobile Navigation

**Status:** To Do

Implementation shape:

- Replace raw `<a>` in `SettingsSidebar` with `AdminLink`.
- Use `adminPaths`, `resolveAdminHref`, and `prefetchAdminRoute` only through
  shared helpers; do not hand-roll route matching.
- Add dirty-state detection to settings forms:
  - General,
  - Assistant,
  - Site,
  - Security,
  - Email,
  - Storage,
  - Login Alerts,
  - Integrations/Webhooks/API keys drawers where applicable.
- Navigation away from dirty settings requires confirm, draft preservation, or
  successful auto-save.
- Add mobile navigation for Settings sections because `SettingsShell` hides the
  sidebar below `lg`.

Pseudocode:

```tsx
function SettingsNavLink({ href, children, isDirty }: SettingsNavLinkProps) {
  const { confirmNavigation } = useDirtyNavigationGuard({ isDirty });
  return (
    <AdminLink
      href={href}
      prefetch
      onClick={(event) => {
        if (!confirmNavigation()) event.preventDefault();
      }}
    >
      {children}
    </AdminLink>
  );
}
```

Regression tests:

- Clicking between Settings sections does not trigger a full document reload.
- Request counts do not include redundant auth bootstrap on every section
  transition.
- Dirty form navigation cancel preserves draft.
- Mobile viewport can navigate to every Settings section.

### TASK-359-03: Redacted Settings Cache Contract

**Status:** To Do

Decision required:

- Some Settings values are safe to cache for UX (`site.name`, `site.locale`,
  `site.cacheTtlSeconds`, redacted configured flags).
- Secrets and credential material must not be stored in localStorage:
  SMTP password, S3/Azure keys, bot-protection secret, integration secrets,
  webhook secrets, API key secrets.

Implementation shape:

- Define cache keys only for redacted safe settings payloads.
- Add cached wrappers:
  - `getSettingsCached`
  - `getSiteSettingsCached`
  - maybe `getSecuritySettingsCached` only if redacted and safe.
- Mutations update/invalidate cache and broadcast `cacheBus` events.
- `SiteSettingsPage` must stop using
  `listPagesCached({ force: true })` / `listContentTypesCached({ force: true })`
  on every mount when fresh cache exists.
- Update `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md`.

Pseudocode:

```ts
type RedactedSettingsCache = {
  siteName: string;
  siteLocale: string;
  siteCacheTtlSeconds: number;
  assistantEnabled: boolean;
  securityConfigured: {
    botProtectionHasSiteKey: boolean;
    botProtectionHasSecret: boolean;
  };
};

function toRedactedSettingsCache(payload: SettingsResponse): RedactedSettingsCache {
  return {
    siteName: String(payload["site.name"] ?? "Coderso"),
    siteLocale: String(payload["site.locale"] ?? "en"),
    siteCacheTtlSeconds: Number(payload["site.cacheTtlSeconds"] ?? 30),
    assistantEnabled: Boolean(payload["assistant.enabled"]),
    securityConfigured: {
      botProtectionHasSiteKey: Boolean(payload["security.botProtection.siteKey"]),
      botProtectionHasSecret: Boolean(payload["security.botProtection.secretConfigured"]),
    },
  };
}
```

Regression tests:

- Cache payload never contains keys matching `password`, `secret`, `token`,
  `accessKey`, `connectionString`, `apiKey`.
- Cache hydrates safe settings immediately and revalidates in background.
- Mutations invalidate/update cache and broadcast.
- Cross-tab cache events refresh non-dirty pages without overwriting dirty
  forms.

### TASK-359-04: General and Site Placeholder Truthfulness

**Status:** To Do

General:

- Logo upload must open a real file/media picker, upload/select an asset, save
  the logo setting, and show preview; or be disabled.
- Favicon upload/remove same requirement.
- Timezone must either persist through settings schema or render disabled with
  copy explaining it is not available.

Site:

- `Performance` section must either be removed/disabled or backed by real
  schema fields and runtime behavior.
- High-risk changes to admin path/base URLs must show confirm and rollback
  guidance.
- `View homepage` and preview actions must report failures.

Regression tests:

- Upload buttons open a file chooser/media picker or are not active.
- Timezone save round-trips if enabled.
- Performance controls are not active placeholders.
- Admin path/base URL save requires confirm.

### TASK-359-05: Security, Sessions, API Keys, Webhooks, IP Allowlist Confirms

**Status:** To Do

Add confirm flows for:

- Bot protection `Clear stored secret`.
- Sessions `Revoke` and `Revoke All Other Sessions`.
- API key rotate and revoke.
- Webhook delete and external test connection.
- IP allowlist remove and any save that could lock out the current IP.
- High-risk security saves:
  - CORS/CSRF changes,
  - rate-limit changes,
  - session TTL/single-session changes,
  - admin/public write protection changes.

Pseudocode:

```ts
type HighRiskSettingsChange = {
  kind: "api_key_revoke" | "webhook_delete" | "ip_allowlist_remove" | "security_policy";
  targetLabel: string;
  consequence: string;
  requiresTypedConfirmation?: boolean;
};

function classifySecuritySettingsDiff(before: SecuritySettingsResponse, after: SecurityFormState) {
  const risks: HighRiskSettingsChange[] = [];
  if (before.session.singleSession !== after.sessionSingleSession) {
    risks.push({ kind: "security_policy", targetLabel: "Single session mode", consequence: "Existing sessions may be revoked." });
  }
  return risks;
}
```

Regression tests:

- Cancel path never calls mutation.
- Confirm path calls mutation once.
- IP allowlist current-IP lockout is detected or explicitly acknowledged.
- API key rotate/revoke shows one-time secret handling correctly.

### TASK-359-06: Email, Storage, Integrations, Assistant Action Truthfulness

**Status:** To Do

Email:

- `Export Logs` must export logs or be disabled.
- `Send Test Email` should show recipient preview and environment-aware confirm
  before sending external mail.

Storage:

- `Test Connection` must call a backend endpoint for local/S3/Azure config or
  be disabled.
- Results must show success/error and never expose secrets.

Integrations:

- Secret save flows need confirm/audit and redaction tests.
- Drawers must have `SheetDescription`.

Assistant:

- `Run reindex` needs confirm or dry-run with document/chunk counts.
- Reindex result should be auditable and not run accidentally.

Regression tests:

- Storage test no longer no-op.
- Email export no longer no-op.
- External send/test/reindex actions require explicit confirm.
- Drawer accessibility warnings are gone.

### TASK-359-07: Login Alerts and Sessions Placeholder Cleanup

**Status:** To Do

Login Alerts:

- Topbar and sticky save/discard must use the same handlers or the sticky bar
  must be removed.
- Brute-force slider, recipients, custom email list, and channels must persist
  through schema/API or render as disabled/read-only.
- Tabs that do not lead anywhere should be removed or routed.

Sessions:

- `Change Password` and `Security Settings` buttons must navigate or be
  removed/disabled.
- Session revoke actions covered by TASK-359-05.

Regression tests:

- Sticky save/discard works or is absent.
- Brute-force/recipients/channels are not active no-ops.
- Sessions link-buttons work or are not rendered as active.

## Security Contract

Route family: admin settings, security settings, storage/email/integrations,
sessions, API keys, webhooks, IP allowlist, assistant reindex.

- Endpoint visibility: internal admin only (`/admin/api/settings*`,
  `/admin/api/sessions*`, `/admin/api/ip-allowlist*`, `/admin/api/assistant*`
  where applicable).
- Auth model: authenticated admin session.
- RBAC:
  - `settings:read` for settings read routes.
  - `settings:write` for general/site/assistant settings writes.
  - Security/session/API key/webhook/IP allowlist changes should require the
    existing most-specific high-risk permission if available; if not, define it
    before implementation rather than widening `settings:write` silently.
- CSRF: required for all writes, tests, reindex, revokes, deletes, exports, and
  external side-effect actions.
- Rate-limit bucket:
  - admin read for settings reads,
  - admin write/security-sensitive for settings writes,
  - auth/security-sensitive for sessions/IP allowlist/API keys,
  - external action bucket for email/webhook/storage tests/reindex if present.
- Reject unknown validation: strict schema-first payloads for all changed routes.
- Anti-abuse: no public write endpoint; no nonce/HMAC/captcha required for
  internal admin session writes.
- Secret handling:
  - no secrets in localStorage/cache/debug payloads,
  - redacted configured flags only,
  - one-time API key secrets displayed once and never cached,
  - SMTP/storage/integration secrets never echoed.
- Audit: high-risk settings saves, external tests, reindex, API key changes,
  webhook deletes/tests, session revokes, IP allowlist changes, and secret
  clears must emit audit events with redacted payloads.
- Lockout prevention: admin path/base URL/IP allowlist/session changes must
  include confirm and, where feasible, server-side current-session/current-IP
  protection.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI suites for Settings navigation, dirty guard, mobile nav, placeholder
  controls, confirm dialogs, cache hydration.
- Bun route/service tests for settings/security/storage/email/API key/webhook/IP
  allowlist changes touched by implementation.
- Cache tests:
  - redaction,
  - TTL,
  - invalidation,
  - cacheBus update,
  - dirty-state protection.
- Playwright:
  - all Settings sections navigate through SPA without full reload,
  - restricted user cannot render Settings shell,
  - reversible saves still pass,
  - no active no-op controls remain,
  - high-risk actions require confirm.
- Security scanner commands from `_docs/SECURITY_SPEC.md` if secret handling,
  auth, public write, or scanner config changes are touched.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md`
- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/AUTH_SPEC.md`
- `_docs/RBAC_SPEC.md`
- `_docs/SECURITY_SPEC.md` if secret/lockout contract changes.
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/1049-2026-06-01-task-359-admin-settings-remediation-family.md`

## Acceptance Criteria

- Settings has route/menu permission gating and no default forbidden shell leak.
- Settings navigation uses SPA helpers and mobile navigation covers every
  section.
- Cache behavior is either implemented for redacted safe settings or explicitly
  documented as intentionally no-cache per sensitive surface; no secrets are
  cached.
- Dirty forms are protected from accidental route changes.
- Every active-looking Settings control works or is disabled/read-only.
- High-risk actions require confirmation and audit.
- Report findings are updated with test evidence.

