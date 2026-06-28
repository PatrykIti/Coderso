# TASK-479-28: Settings Screens Migration
# FileName: TASK-479-28-Settings-Screens.md

**Priority:** Medium
**Category:** Admin UI / Settings / Visual Refresh
**Estimated Effort:** Large
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ⏳ To Do
**Parent Task:** TASK-479

---

## Overview

Port the finished visual-redesign prototype for the **Settings** surfaces into
the real admin under `core/admin/ui/settings/**`, `core/admin/ui/site/**`, and
the shared `core/admin/ui/layouts/SettingsShell.tsx`. This covers the settings
shell + sub-nav and every settings page: **General**, **Site**, **Assistant**,
**Security** (+ IP allowlist, Sessions, Login alerts), **API keys**,
**Webhooks**, **Email**, **Storage**, and **Integrations**. The work is a
**visual restyle only** — every screen keeps its real data, settings clients,
validation, save/dirty-state contract, cache wiring, RBAC gating, secret
handling, and canonical routing. We swap the presentation layer (shell chrome,
two-column settings sections, fields, cards, tables, save bar) to the prototype's
**soft & friendly, Notion-like** design language: warm neutral canvas, white
`rounded-2xl` cards, soft shadows, generous spacing, a **violet** accent, and a
light default with a dark toggle.

- **Goal:** Make the Settings screens match the approved prototype look while
  preserving all settings persistence, validation, dirty-state protection, the
  cache contract, RBAC gating, **backend-only secret handling**, and canonical
  routing.
- **Owning module/service:** `core/admin/ui/layouts/SettingsShell.tsx`,
  `core/admin/ui/settings/**` (`SettingsSidebar.tsx`, `GeneralSettingsPage.tsx`,
  `AssistantSettingsPage.tsx`, `SecuritySettingsPage.tsx`, `IpAllowlistPage.tsx`,
  `SessionsPage.tsx`, `LoginAlertsPage.tsx`, `ApiKeysPage.tsx`,
  `WebhooksPage.tsx`, `EmailSettingsPage.tsx`, `StorageSettingsPage.tsx`,
  `IntegrationsPage.tsx`, plus their presentational children: `BrandingCard`,
  `LogoUploadCard`, `AssistantSettingsCard`, `SessionsTable`,
  `IpAllowlistTable`/`IpAllowlistDrawer`, `LoginAlertsCard`, `ApiKeysTable`/
  `ApiKeyDialog`/`ApiKeySecretDialog`, `WebhooksTable`/`WebhookDrawer`,
  `SmtpCard`/`EmailLogsDrawer`, `StorageProviderCard`, `IntegrationCard`/
  `IntegrationDrawer`/`IntegrationRequestDialog`) and
  `core/admin/ui/site/SiteSettingsPage.tsx`, backed by the settings clients
  (`settingsClient`, `siteSettingsClient`, `assistantClient`, `sessionsClient`,
  `apiKeysClient`, `webhooksClient`, `emailClient`, `integrationsClient`; storage
  settings live in `settingsClient` — there is no separate `storageSettingsClient`)
  and the shared dirty-state + auto-save hooks
  (`SettingsDirtyNavigation`, `useSettingsAutoSave`).
- **Source-of-truth docs:** `_docs/SECURITY_SPEC.md` (secret handling — keys
  stay backend-only), `_docs/DESIGN_TOKENS.md`, `_docs/TESTING_STRATEGY.md`, and
  the prototype under `_docs/_PROTOTYPE/src/pages/settings/*` +
  `_docs/_PROTOTYPE/src/components/shell/SettingsLayout.tsx`, with shared
  primitives in `_docs/_PROTOTYPE/src/components/{ui,patterns,shell}` and tokens
  in `_docs/_PROTOTYPE/src/styles/theme.css`.
- **Out of scope:** No change to any settings endpoint, settings/validation
  schema, cache key/TTL, the dirty-state/auto-save engine, RBAC gating, or
  secret-handling boundary. No workspace switcher, plans, "Coderso Pro", or trial
  chrome — this is a self-hosted WordPress competitor; the shell shows site
  identity only (owned by TASK-479-06). The prototype's mock numbers (usage
  meters, "620K / 1M tokens", "6.2 GB of 50 GB", conversion stats) are MOCK and
  MUST NOT be fabricated — render only real, derivable values.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

**Secret handling is the hard constraint of this subtask.** Per
`_docs/SECURITY_SPEC.md`, secrets (the assistant LLM-provider key — stored as an Integrations secret, not
entered on the Assistant page — SMTP password, storage secret/access keys,
integration credentials, API-key plaintext, webhook signing secret) stay
**backend-only**. Leaves MUST NOT:
- surface a stored secret into client state, the cache, logs, or a debug payload;
- change the write-only / masked-input contract for any secret field (the real
  pages already send secrets opaquely and never read them back);
- change the API-key one-time-reveal flow (`ApiKeySecretDialog`) so the plaintext
  is shown once on create/rotate and never re-fetched.
The restyle changes JSX/className only; it preserves every settings client call,
the dirty-state guard, and the masked/write-only input shape.

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-28-L01 | Settings Shell & Sub-Nav Restyle | ⏳ To Do |
| TASK-479-28-L02 | General & Site Settings Restyle | ⏳ To Do |
| TASK-479-28-L03 | Assistant Settings Restyle | ⏳ To Do |
| TASK-479-28-L04 | Security Settings (+ IP Allowlist, Sessions, Login Alerts) Restyle | ⏳ To Do |
| TASK-479-28-L05 | API Keys & Webhooks Restyle | ⏳ To Do |
| TASK-479-28-L06 | Email, Storage & Integrations Restyle | ⏳ To Do |
| TASK-479-28-L07 | Settings Tests | ⏳ To Do |

---

## Migration constraints (apply to every leaf)

- **Preserve real data/logic.** Keep every settings-client call, the
  `useRegisterSettingsDirty` dirty-state registration, `useSettingsAutoSave` /
  `useAutoSaveEffect`, the `formState`/`savedForm` snapshot + `isDirty`
  derivation, validation helpers (`resolveAssistantValidationError`,
  `securitySettingsUtils`, site-settings validation), cache hydrate
  (`getCachedSiteSettings`/`getSiteSettingsCached`, `getCachedContentTypes`,
  `getCachedPages`, `listSessions`, `listApiKeys`, `listWebhooks`,
  `getEmailSettings`/`listEmailLogs`, `getStorageSettings`, `listIntegrations`),
  and the create/revoke/rotate/test/delete flows unchanged. The restyle touches
  JSX/className only.
- **Secret safety.** Keep all secret fields write-only/masked and backend-only.
  Do not add any code path that reads a stored secret back into the client. Keep
  the one-time API-key reveal (`ApiKeySecretDialog`) and the webhook/storage/SMTP
  masked inputs exactly as wired.
- **Canonical routing.** Never hand-build `<a href>`. Route settings sub-nav,
  quick-link cards, and prefetch through the shared helpers — `AdminLink`
  (`core/admin/ui/shared/AdminLink.tsx`), the `adminPaths` helpers
  (`resolveAdminBasePath`, `resolveAdminRoutePath`, `resolveAdminHref`,
  `isAdminHrefActive` in `core/admin/utils/adminPaths.ts`),
  `useAdminRouter().navigate`, and `prefetchAdminRoute`. When porting a prototype
  `<Link to="/settings/...">`, replace it with `AdminLink` against the **existing**
  `/admin/settings/...` targets in `settingsSidebarItems`. The settings sub-nav
  MUST keep the dirty-navigation guard (`requestNavigation`) that intercepts
  clicks when the form is dirty.
- **Cache contract.** Preserve cache hydrate + background revalidation,
  `cacheKeys`/TTL, `cachedClient`, and `cacheBus`/`subscribeCacheEvents`
  invalidation. NO mount-force refetch loops; NO dirty-state overwrites (a fresh
  cache push must not clobber an edited-but-unsaved form).
- **react-hooks (ESLint 9).** No synchronous `setState` inside effects; use lazy
  initializers / render-time derivation / reducers. The existing pages already
  derive `form`/`savedForm` at render time from a `source`-keyed snapshot — keep
  that shape; do not add effects the restyle does not require.
- **Schema-first.** Any payload shape stays owned by the existing
  client/schema modules; the restyle adds no new payloads.
- **Design tokens.** Consume the violet/soft tokens from
  `core/admin/styles/globals.css` (landed by TASK-479-05) via existing semantic
  classes (`bg-card`, `text-muted-foreground`, `border`, `bg-primary`,
  `bg-primary-soft`, `bg-warning-soft`, `rounded-2xl`, `shadow-soft`, etc.) and
  the restyled shell/primitives from TASK-479-06 — do not hardcode hex values.

---

## Testing Requirements

Lane = **Vitest** (Bun-free admin/UI) per `_docs/TESTING_STRATEGY.md`. Run:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/settings-shell.test.tsx tests/vitest/ui/settings-sidebar.test.tsx tests/vitest/ui/general-settings.test.tsx tests/vitest/ui/site-settings.test.tsx tests/vitest/ui/site-settings-validation.test.ts tests/vitest/ui/assistant-settings.test.tsx tests/vitest/ui/security-settings.test.tsx tests/vitest/ui-integration/security-settings.test.tsx tests/vitest/ui/security-sessions.test.tsx tests/vitest/ui/ip-allowlist.test.tsx tests/vitest/ui/api-keys.test.tsx tests/vitest/ui/webhooks.test.tsx tests/vitest/ui-integration/webhooks.test.tsx tests/vitest/ui/email-settings.test.tsx tests/vitest/ui-integration/emailSettings.test.tsx tests/vitest/ui/storage-settings.test.tsx tests/vitest/ui/integrations.test.tsx tests/vitest/ui-integration/integrations.test.tsx tests/vitest/ui-integration/settings.test.tsx`

New per-screen restyle suites land under `tests/vitest/ui-integration/`
(see TASK-479-28-L07). Existing settings suites under `tests/vitest/ui/` and
`tests/vitest/ui-integration/` MUST stay green; update their literal class/markup
assertions where the restyle intentionally changes them, but do NOT delete
behavioral assertions (save/dirty-state, validation, create/revoke/test, secret
masking). Domain/client suites under `tests/vitest/admin/` (`settingsClient`,
`siteSettingsClient`, `sessionsClient`, `webhooksClient`, `emailClient`,
`integrationsClient`, `userSettingsClient`, `sessionCache`, `storageCache`) and
`tests/vitest/validation/securitySettingsSchema.test.ts` stay **untouched**. Do
NOT move runtime tests into Vitest for coverage.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board buckets + statistics on every status
  change for this subtask and its leaves.
- Add a `_docs/_CHANGELOG/` entry on closure, linking `TASK-479` and the closing
  leaf id(s).
- If any restyle alters a documented Settings UX affordance, reconcile the
  relevant contract doc (`_docs/SECURITY_SPEC.md` for secret-handling UX only —
  no boundary change expected). No API/cache/secret contract change is intended,
  so no contract-doc edits beyond UX notes.
