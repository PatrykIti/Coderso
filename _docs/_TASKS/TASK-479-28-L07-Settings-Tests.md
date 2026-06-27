# TASK-479-28-L07: Settings Tests
# FileName: TASK-479-28-L07-Settings-Tests.md

**Priority:** Medium
**Category:** Admin UI / Settings / Testing
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-28

---

## Overview

Add the per-screen Vitest render suites that lock in the Settings restyle
(L01–L06) and keep every existing settings suite green. These are
**render/behavior** tests in the Bun-free admin/UI Vitest lane — they assert the
new soft/violet chrome is present AND that all preserved data/logic/secret-handling
wiring still works. No runtime tests move into Vitest for coverage.

- **Goal:** Prove the restyle is presentation-only: the settings shell + sub-nav
  route canonically (no raw `<a href>`) and keep the dirty-navigation guard;
  every page keeps its save/dirty-state, validation, create/revoke/test/connect
  flows; secrets stay masked/backend-only (no plaintext key/credential in the DOM);
  and no cache/dirty-state regression is introduced.
- **Owning module/service:** new `tests/vitest/ui-integration/settings-*-restyle.test.tsx`
  plus the existing settings suites under `tests/vitest/ui/` and
  `tests/vitest/ui-integration/`.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md`, `_docs/SECURITY_SPEC.md`;
  prototype + target references as in L01–L06.
- **Out of scope:** No new server/runtime test lane; no change to the settings
  client/domain suites' assertions beyond what the restyle intentionally changes.
  Domain/client suites under `tests/vitest/admin/` and
  `tests/vitest/validation/securitySettingsSchema.test.ts` stay untouched.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

Each secret-bearing suite (assistant / api-keys / webhooks / email / storage /
integrations) MUST include at least one assertion that **no stored secret leaks**:
secret inputs are `type="password"`/masked, and no full key/credential/plaintext
string appears in the rendered DOM — guarding against the restyle silently
exposing a secret. The api-keys suite asserts the one-time reveal shows the
plaintext exactly once (on create) and never on reload.

---

## Implementation Pseudocode

New suites mirror the existing settings test setup: render under the admin router
provider with the relevant settings client mocked; assert on roles/text, not
implementation detail.

```tsx
// tests/vitest/ui-integration/settings-shell-restyle.test.tsx
describe("Settings shell + sub-nav restyle", () => {
  it("reveals Security children when a security id is active", () => {
    renderWithAdminRouter(<SettingsSidebar activeId="sessions" />);
    expect(screen.getByRole("link", { name: /IP allowlist/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Login alerts/i })).toBeInTheDocument();
  });
  it("collapses Security children for non-security ids", () => { /* activeId="general" → children absent */ });
  it("routes every item through AdminLink (resolved /admin/settings/... href, no raw anchor)", () => { /* … */ });
  it("blocks navigation when the form is dirty", async () => {
    // mock useSettingsDirtyNavigation → requestNavigation returns false ⇒ preventDefault called
  });
});

// tests/vitest/ui-integration/settings-general-site-restyle.test.tsx
describe("General + Site restyle", () => {
  it("renders SettingsSection groups and saves edited values", async () => {
    renderWithAdminRouter(<GeneralSettingsPage values={seed} onSave={onSave} />);
    // edit a field → Save enabled → onSave called with edited values
  });
  it("Site homepage/posts selects populate from the real caches (not mock literals)", () => { /* mocked getCachedPages/getCachedContentTypes */ });
});

// tests/vitest/ui-integration/settings-assistant-restyle.test.tsx
describe("Assistant restyle", () => {
  it("offers latest-Claude model suggestions and accepts a custom value", () => {
    // datalist options claude-opus-4-8 / claude-sonnet-4-6 / claude-haiku-4-5 present;
    // typing a custom id keeps the free-form binding
  });
  it("keeps the API key masked and never renders a fetched secret", () => { /* type=password, no plaintext in DOM */ });
  it("blocks Save on LLM-Guide validation and opens the reindex confirm", async () => { /* … */ });
});

// tests/vitest/ui-integration/settings-security-restyle.test.tsx
describe("Security cluster restyle", () => {
  it("renders Authentication/Login-protection sections + 3 quick-link cards (AdminLink)", () => { /* … */ });
  it("IP allowlist: warning banner + add(addEntry) + remove(removeEntry)", async () => { /* mocked useIpAllowlist */ });
  it("Sessions: current device has no Revoke; non-current revokes via confirm", async () => { /* mocked listSessions */ });
  it("Login alerts: toggles bind and Save calls updateSecuritySettings", async () => { /* … */ });
});

// tests/vitest/ui-integration/settings-keys-webhooks-restyle.test.tsx
describe("API keys + Webhooks restyle", () => {
  it("API keys: masked prefix chip per key, no full secret in DOM", () => { /* … */ });
  it("API keys: create surfaces one-time secret once via ApiKeySecretDialog", async () => { /* … */ });
  it("Webhooks: endpoint card per webhook with StatusBadge + event badges", () => { /* … */ });
  it("Webhooks: enable Switch calls updateWebhook; delete is confirmed", async () => { /* … */ });
});

// tests/vitest/ui-integration/settings-email-storage-integrations-restyle.test.tsx
describe("Email + Storage + Integrations restyle", () => {
  it("Email: SMTP password masked; Send test calls sendTestEmail", async () => { /* … */ });
  it("Storage: 3 provider cards (local/s3/azure); selecting updates the form; secret masked", async () => { /* … */ });
  it("Integrations: card per real integration; search filters; toggle calls updateIntegration; no credential in DOM", async () => { /* … */ });
});
```

**Existing suites to keep green (update only intentional class/markup
assertions):** `tests/vitest/ui/settings-shell.test.tsx`,
`tests/vitest/ui/settings-sidebar.test.tsx`,
`tests/vitest/ui/general-settings.test.tsx`,
`tests/vitest/ui/site-settings.test.tsx`,
`tests/vitest/ui/site-settings-validation.test.ts`,
`tests/vitest/ui/assistant-settings.test.tsx`,
`tests/vitest/ui/security-settings.test.tsx`,
`tests/vitest/ui-integration/security-settings.test.tsx`,
`tests/vitest/ui/security-sessions.test.tsx`,
`tests/vitest/ui/ip-allowlist.test.tsx`,
`tests/vitest/ui/api-keys.test.tsx`,
`tests/vitest/ui/webhooks.test.tsx`,
`tests/vitest/ui-integration/webhooks.test.tsx`,
`tests/vitest/ui/email-settings.test.tsx`,
`tests/vitest/ui-integration/emailSettings.test.tsx`,
`tests/vitest/ui/storage-settings.test.tsx`,
`tests/vitest/ui/integrations.test.tsx`,
`tests/vitest/ui-integration/integrations.test.tsx`,
`tests/vitest/ui/integration-drawer-secrets.test.tsx`,
`tests/vitest/ui-integration/settings.test.tsx`,
`tests/vitest/ui/settingsInput.test.tsx`. The client/domain suites under
`tests/vitest/admin/` (`settingsClient`, `siteSettingsClient`, `sessionsClient`,
`webhooksClient`, `emailClient`, `integrationsClient`, `userSettingsClient`,
`sessionCache`, `storageCache`) and
`tests/vitest/validation/securitySettingsSchema.test.ts` MUST stay **untouched**.

**Data flow / error handling:** tests mock the relevant settings client + cache
helpers and render under the admin router provider so `AdminLink`/`navigate`
resolve. Behavioral assertions (save/dirty, validation, create/revoke/rotate,
test-email, provider select, connect/toggle, session revoke guard, allowlist
add/remove, one-time secret reveal, secret masking) are preserved; only literal
chrome assertions are updated where the restyle intentionally changes them.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- New restyle suites:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/settings-shell-restyle.test.tsx tests/vitest/ui-integration/settings-general-site-restyle.test.tsx tests/vitest/ui-integration/settings-assistant-restyle.test.tsx tests/vitest/ui-integration/settings-security-restyle.test.tsx tests/vitest/ui-integration/settings-keys-webhooks-restyle.test.tsx tests/vitest/ui-integration/settings-email-storage-integrations-restyle.test.tsx`
- Full settings regression:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/settings-shell.test.tsx tests/vitest/ui/settings-sidebar.test.tsx tests/vitest/ui/general-settings.test.tsx tests/vitest/ui/site-settings.test.tsx tests/vitest/ui/assistant-settings.test.tsx tests/vitest/ui/security-settings.test.tsx tests/vitest/ui-integration/security-settings.test.tsx tests/vitest/ui/security-sessions.test.tsx tests/vitest/ui/ip-allowlist.test.tsx tests/vitest/ui/api-keys.test.tsx tests/vitest/ui/webhooks.test.tsx tests/vitest/ui-integration/webhooks.test.tsx tests/vitest/ui/email-settings.test.tsx tests/vitest/ui-integration/emailSettings.test.tsx tests/vitest/ui/storage-settings.test.tsx tests/vitest/ui/integrations.test.tsx tests/vitest/ui-integration/integrations.test.tsx tests/vitest/ui/integration-drawer-secrets.test.tsx tests/vitest/ui-integration/settings.test.tsx`

State in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure, linking `TASK-479` + `TASK-479-28-L07`.
- `_docs/TESTING_STRATEGY.md` — list the new settings restyle suites under the
  admin/UI Vitest lane if the strategy doc enumerates per-screen suites.
