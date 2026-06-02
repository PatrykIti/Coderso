# TASK-359: Admin Settings Report Remediation Family
# FileName: TASK-359_Admin_Settings_Report_Remediation_Family.md

**Priority:** High
**Category:** Admin UI + Settings + Cache + Security UX + RBAC + QA + Docs
**Estimated Effort:** Very Large
**Dependencies:** TASK-360-01 shared permission snapshot contract, TASK-360-02 shared confirm pattern, TASK-360-04 no-op gate, changelog 1034 and `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md` audit evidence
**Status:** In Progress (2026-06-02)

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
| QA `Max sessions per user = 30` remains | TASK-359-05 owns restoring the default/target value or recording an explicit QA override; TASK-360-07 only verifies final evidence. |

## Refinement Checklist

21. **Per-section action matrix:** before implementation, create a table for
    each Settings subpage listing read endpoints, write endpoints, external
    side effects, destructive actions, cache policy, and required permission.
22. **Secret denylist tests:** cache and debug payload tests must scan nested
    keys for `password`, `secret`, `token`, `accessKey`, `apiKey`,
    `connectionString`, and provider-specific credential names.
23. **Auto-save semantics:** global auto-save must not silently save high-risk
    security changes. Classify which fields can auto-save and which require
    manual confirm.
24. **Current-session/current-IP safety:** session/IP/admin path/base URL
    changes must protect the current operator from accidental lockout or require
    typed confirmation.
25. **Settings request budget:** add a performance/request budget assertion for
    Settings transitions after `AdminLink` and cache changes land.
26. **QA override cleanup:** `TASK-359-05` must either restore `Max sessions per
    user` to the product default or document the exact intentional QA override
    with date and owner; `TASK-360-07` verifies this evidence during closure.
27. **External action sandboxing:** email send, webhook test, storage test, and
    assistant reindex must have environment-aware copy/confirm so local QA does
    not accidentally affect production services.
28. **Auth bootstrap 429 resilience:** Settings navigation fixes must include
    an explicit regression proving quick section switching does not turn
    `auth/me` rate limits into a false logout/login redirect.

## Sub-Tasks

Physical execution leaves:

- `TASK-359-01_Settings_RBAC_Guard_and_Bootstrap_Discipline.md`
- `TASK-359-02_Settings_SPA_Navigation_Dirty_Guard_and_Mobile_Navigation.md`
- `TASK-359-03_Redacted_Settings_Cache_Contract.md`
- `TASK-359-04_General_and_Site_Placeholder_Truthfulness.md`
- `TASK-359-05_Security_Sessions_API_Keys_Webhooks_IP_Allowlist_Confirms.md`
- `TASK-359-06_Email_Storage_Integrations_Assistant_Action_Truthfulness.md`
- `TASK-359-07_Login_Alerts_and_Sessions_Placeholder_Cleanup.md`

## Implementation Order

1. Consume `TASK-360-01` shared permission snapshot and block Settings shell
   leaks before adding cache/navigation changes.
2. Done in `TASK-359-02`: replace Settings navigation with `AdminLink`, then
   add dirty-state and mobile navigation behavior.
3. Done in `TASK-359-03`: implement the redacted settings cache contract before
   any section-specific caching.
4. Fix General/Site placeholders and high-risk confirm flows.
5. Fix Email/Storage/Integrations/Assistant external action truthfulness.
6. Fix Login Alerts/Sessions placeholders.
7. Update cache/security docs and rerun full Settings Playwright evidence.

### TASK-359-01: Settings RBAC Guard and Bootstrap Discipline

**Status:** Done (2026-06-01)

Implementation shape:

- Use the permission snapshot from `TASK-360-01` to gate `/admin/settings/**`.
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

Completion notes:

- Settings route/nav are now fail-closed for users without `settings:read`.
- Global settings bootstrap does not call `getSettings()` without
  `settings:read`.
- Users/Roles breadcrumbs now use `Admin` instead of `Settings`, closing the
  real Playwright drift where a `roles:read` user still saw a link to
  `/admin/settings`.
- Audit/Access breadcrumbs now use `Admin` instead of `Security`, closing the
  matching drift where an `audit:read` user still saw a link to
  `/admin/settings/security`.
- Restricted Playwright evidence passed with zero Settings API requests and
  direct `/admin/settings` rendering shared `Access denied`.

### TASK-359-02: Settings SPA Navigation, Dirty Guard, and Mobile Navigation

**Status:** Done (2026-06-02)

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

Completion notes:

- Settings section links are SPA transitions through `AdminLink`; Playwright
  confirmed `authMeRequests: 0`, `documentLoadEvents: 0`, no auth 429, and no
  login redirect during the section-click phase.
- Settings dirty guard is registered through the shared admin router blocker,
  so sidebar links, direct Settings `AdminLink`, Back/Forward, and refresh/close
  cannot silently lose drafts.
- Mobile Settings navigation is visible below `lg` and includes General,
  Assistant, Site, Security, Sessions, Login Alerts, IP Allowlist, API Keys,
  Webhooks, Email, Storage, and Integrations.
- Redacted settings cache was later closed in `TASK-359-03`; this leaf
  intentionally did not add settings endpoint prefetch/cache wrappers.

### TASK-359-03: Redacted Settings Cache Contract

**Status:** Done (2026-06-02)

Implementation decision:

- Implement a redacted safe-settings cache for non-secret UX values
  (`site.name`, `site.locale`, `site.cacheTtlSeconds`, redacted configured
  flags).
- Do not cache secrets or credential material in localStorage:
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
    botProtectionConfigured: boolean;
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
      botProtectionConfigured: Boolean(payload["security.botProtection.secretKey.configured"]),
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

Completion notes:

- Added `settings:redacted` as the only browser-cache Settings owner. It stores
  a schema-versioned, non-secret allowlist and rejects unsafe nested key names.
- Added cached wrappers for global Settings and Site Settings, plus mutation
  priming/invalidation and `cacheBus` `update`/`invalidate` events.
- `AdminApp` and `SiteSettingsPage` hydrate from redacted cache before network
  reads. Site also reuses fresh `pages:list` and `contentTypes:list` caches
  instead of forcing those selectors to reload on every mount.
- `/settings` and `/settings/site` prefetch now use cache warmup only
  (`{ force: false }`); Site prefetch warms Settings, pages, and content types.
- Dirty Site drafts ignore background cache updates, while clean forms apply
  storage-first cache-bus refreshes.
- Cache docs, security docs, Playwright reports, task board, and changelog 1049
  were synchronized.

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
- Homepage/default route and 404 page changes must show a review step because
  they change public routing behavior.
- Security headers changes must be included in high-risk save classification
  because they can break embeds, previews, and public integrations.
- `View homepage` and preview actions must report failures.

Pseudocode:

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
    baseUrlChanged: before.publicBaseUrl !== after.publicBaseUrl || before.adminBaseUrl !== after.adminBaseUrl,
    homepageChanged: before.homepageId !== after.homepageId,
    notFoundChanged: before.notFoundPageId !== after.notFoundPageId,
  };
}
```

Data flow:

1. General media buttons open the existing media/file picker.
2. Selected media ids update local dirty form state.
3. Save sends normalized branding payload through settings service.
4. Site save computes routing risk and opens confirm before PATCH when risk is
   non-empty.
5. Success updates redacted settings cache and visible preview state.

Error handling:

- Invalid media type/size shows field-level error.
- Failed upload/select leaves previous logo/favicon intact.
- High-risk site save cancel leaves draft dirty.
- Save conflict/403 refreshes settings and permission snapshot without
  overwriting unsaved draft.

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
- Webhook delete. Webhook external test connection and other webhook side-effect
  tests are owned by `TASK-359-06`.
- IP allowlist remove and any save that could lock out the current IP.
- High-risk security saves:
  - CORS/CSRF changes,
  - rate-limit changes,
  - security headers/CSP/HSTS/referrer/permissions policy changes,
  - session TTL/single-session changes,
  - homepage/default route/404 routing changes,
  - admin path/base URL changes,
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

IP Allowlist and drawers:

- IP Allowlist add drawer must have a semantic `SheetTitle` as well as
  `SheetDescription`; visual headings alone are not sufficient.
- Webhook, Email, Integrations, and IP Allowlist drawers must all pass a
  warning-free Radix title/description regression.

Assistant:

- `Run reindex` needs confirm or dry-run with document/chunk counts.
- Reindex result should be auditable and not run accidentally.

Pseudocode:

```ts
type ExternalSettingsAction =
  | { kind: "email_test"; recipient: string }
  | { kind: "email_logs_export"; format: "csv" | "json" }
  | { kind: "storage_test"; driver: "local" | "s3" | "azure" }
  | { kind: "webhook_test"; webhookId: string }
  | { kind: "assistant_reindex"; dryRun: boolean };

async function executeExternalSettingsAction(action: ExternalSettingsAction) {
  const confirmed = await confirmExternalAction(action);
  if (!confirmed) return { status: "cancelled" as const };
  return settingsExternalActionsClient.execute(action);
}
```

Data flow:

1. UI builds an action descriptor with redacted labels only.
2. Confirm dialog shows environment, target, and side effect.
3. Client calls the matching `/admin/api/settings/*` or assistant endpoint.
4. Server validates permission, CSRF, payload, and redacts response.
5. UI shows success/error toast and audit event id when available.

Error handling:

- Missing provider config blocks test with actionable field errors.
- External timeout returns non-destructive `*_test_timeout` copy.
- Secret validation failures never echo submitted secret values.
- Assistant reindex failure leaves existing index untouched or reports partial
  status if the backend supports it.

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

Pseudocode:

```ts
type LoginAlertsPayload = {
  enabled: boolean;
  notifyOnNewDevice: boolean;
  notifyOnNewLocation: boolean;
  bruteForceThreshold?: number;
  recipients?: string[];
  channels?: Array<"email" | "webhook">;
};

function buildLoginAlertsPayload(form: LoginAlertsFormState): LoginAlertsPayload {
  return strictNormalizeLoginAlerts({
    enabled: form.enabled,
    notifyOnNewDevice: form.notifyOnNewDevice,
    notifyOnNewLocation: form.notifyOnNewLocation,
    bruteForceThreshold: form.bruteForceThreshold,
    recipients: parseEmailList(form.recipients),
    channels: form.channels,
  });
}
```

Data flow:

1. Topbar and sticky actions call the same save/discard handlers.
2. Unsupported controls render disabled and do not enter dirty-state snapshots.
3. Supported controls normalize into one `loginAlerts` payload.
4. Save updates security settings and refreshes local form from server response.

Error handling:

- Invalid recipient emails block save with field errors.
- Unsupported channel/webhook configuration remains disabled.
- API 403 refreshes permission snapshot and keeps draft visible.
- Discard restores last server response.

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
  - Security/session/API key/webhook/IP allowlist changes must use the current
    v1 `settings:write` contract unless the implementation deliberately
    introduces narrower high-risk permissions. Any new permission must update
    default roles/seeds, route tests, `_docs/RBAC_SPEC.md`, and
    `_docs/CMS_API.md` in the same task.
- CSRF: required for all writes, tests, reindex, revokes, deletes, exports, and
  external side-effect actions.
- Rate-limit bucket: `admin_read`, `admin_write`, `assistant`, and `auth`
  depending on route family:
  - `admin_read` for settings reads,
  - `admin_write` for settings writes, sessions/IP allowlist/API keys, email,
    webhook, and storage tests,
  - `assistant` for assistant reindex/action endpoints that already use the
    assistant route family,
  - `auth` only for public auth/reset endpoints.
  A new security-sensitive or external-action bucket must first be added to
  `_docs/SECURITY_SPEC.md`, runtime bucket selection, route tests, and gates.
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

Per-subtask API contract matrix:

| Subtask | Endpoint family | Visibility/auth/RBAC | CSRF/rate-limit | Validation/anti-abuse |
|---|---|---|---|---|
| 359-01 | `GET /admin/api/settings`, `GET /admin/api/settings/*` | internal admin session + `settings:read` | read-only, `admin_read` | strict no-body/no-unknown query, no public write |
| 359-03 | cached settings reads/mutations | internal admin session + settings permission matching source route | writes require CSRF, `admin_write` | redacted cache only, secret denylist tests |
| 359-04 | branding/site settings PATCH and media selection | internal admin session + `settings:write`; media picker keeps existing media RBAC | CSRF, `admin_write` | strict settings/media schema, high-risk site confirm |
| 359-05 | security/sessions/API keys/webhooks/IP allowlist | internal admin session + current `settings:write` or fully migrated narrower permission | CSRF, `admin_write` | strict schemas, typed confirm, lockout guards |
| 359-06 | email/storage/integrations/assistant external actions | internal admin session + current settings permission or fully migrated narrower permission | CSRF, `admin_write` for settings tests and `assistant` for assistant reindex/action endpoints | strict schemas, no secret echo, environment confirm |
| 359-07 | login alerts/sessions placeholder cleanup | internal admin session + security/settings write as applicable | CSRF for writes, `admin_write` | strict login-alerts schema, no public write |

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
- Request budget/resilience:
  - quick Settings section switching does not produce false logout on
    `auth/me` 429,
  - redundant `auth/me` requests are reduced after SPA/cache changes.
- Security scanner commands from `_docs/SECURITY_SPEC.md` if secret handling,
  auth, public write, or scanner config changes are touched.
- Route registration tests and centralized `mapSettingsError` /
  `mapSecuritySettingsError` / action-specific map-error coverage for every
  new/changed route family.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md`
- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/SETTINGS.md`
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
- Settings cache documentation names every cached field class and every
  intentionally uncached secret-bearing field class.
