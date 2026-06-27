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
  route canonically through `AdminLink`/`adminPaths` (resolved `/admin/settings/...`
  hrefs present in the markup) and keep the dirty-navigation guard;
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

Each secret-bearing suite (api-keys / webhooks / email / storage / integrations)
MUST include at least one assertion that **no stored secret leaks**: secret inputs
are `type="password"`/masked, and no full key/credential/plaintext string appears
in the rendered DOM — guarding against the restyle silently exposing a secret. The
**assistant** suite is different: there is NO key input on that page, so it asserts
the page renders no key field and instead exposes the Integrations delegation link
(`/admin/settings/integrations`). The api-keys suite asserts the one-time reveal
shows the plaintext exactly once (on create) and never on reload.

---

## Implementation Pseudocode

New suites mirror the **existing settings test setup** (see
`tests/vitest/ui/assistant-settings.test.tsx`, `.../api-keys.test.tsx`): this repo
has **no** `@testing-library/react` / `jest-dom` / `user-event`. Use the repo idiom:
`renderAdminUi(...)` from `../../utils/adminRouterRender` returns an **SSR HTML
string** (`renderToString`) for static structure — assert with
`expect(html).toContain(...)`; for interaction, mount under `happy-dom` with
`createRoot` + `React.act` and query the DOM via `document.body.querySelectorAll`,
clicking real elements inside `React.act`. Do NOT use `screen`/`getByRole`/
`toBeInTheDocument`. Do NOT assert "no raw anchor" (`AdminLink` renders an `<a>`, so
it is unsatisfiable) — assert the resolved `/admin/settings/...` href is present
instead. Mock the relevant settings client with `vi.spyOn`/`vi.mock`.

```tsx
// Shared idiom (top of each restyle suite):
// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender"; // == tests/utils/adminRouterRender
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => root.render(node));
  return { container, cleanup: () => { React.act(() => root.unmount()); container.remove(); } };
};
afterEach(() => { document.body.innerHTML = ""; vi.restoreAllMocks(); });

// tests/vitest/ui-integration/settings-shell-restyle.test.tsx
test("reveals Security children when a security id is active", () => {
  const html = renderAdminUi(<SettingsSidebar activeId="sessions" />);
  expect(html).toContain("/admin/settings/security/ip-allowlist"); // AdminLink-rendered href
  expect(html).toContain("/admin/settings/security/login-alerts");
});
test("collapses Security children for non-security ids", () => {
  const html = renderAdminUi(<SettingsSidebar activeId="general" />);
  expect(html).not.toContain("/admin/settings/security/ip-allowlist");
});
test("blocks navigation when the form is dirty", () => {
  // mount(<AdminRouterProvider>…<SettingsSidebar/></AdminRouterProvider>) with
  // useSettingsDirtyNavigation mocked so requestNavigation() returns false; click a
  // nav <a> (querySelector) inside React.act and assert the event's preventDefault fired.
});

// tests/vitest/ui-integration/settings-general-site-restyle.test.tsx
test("renders SettingsSection groups and saves edited values", () => {
  const onSave = vi.fn();
  const { container } = mount(<GeneralSettingsPage values={seed} onSave={onSave} />);
  // edit an <input> (set value + dispatch input event in React.act) → click Save → onSave called
});
test("Site homepage/posts selects populate from the real caches", () => {
  // vi.spyOn(pagesClient,"getCachedPages") / contentTypesClient.getCachedContentTypes;
  // assert the rendered options reflect the cache values, not mock literals.
});

// tests/vitest/ui-integration/settings-assistant-restyle.test.tsx
test("offers latest-Claude model suggestions and accepts a custom value", () => {
  const html = renderAdminUi(<AssistantSettingsPage values={seed} onSave={vi.fn()} />);
  expect(html).toContain("claude-opus-4-8"); // datalist <option> present; field stays free-form
});
test("renders no assistant key input and delegates to Integrations", () => {
  const html = renderAdminUi(<AssistantSettingsPage values={{ ...seed, assistantLlmProvider: "openrouter" }} onSave={vi.fn()} />);
  expect(html).toContain("/admin/settings/integrations"); // delegation link; no key field, no secret
});
test("blocks Save on LLM-Guide validation and opens the reindex confirm", () => { /* happy-dom mount */ });

// tests/vitest/ui-integration/settings-security-restyle.test.tsx
test("renders Authentication/Login-protection sections + 3 quick-link hrefs", () => {
  const html = renderAdminUi(<SecuritySettingsPage />);
  expect(html).toContain("/admin/settings/security/ip-allowlist");
  expect(html).toContain("/admin/settings/security/sessions");
  expect(html).toContain("/admin/settings/security/login-alerts");
});
test("IP allowlist: warning banner + add(addEntry) + remove(removeEntry)", () => { /* mock useIpAllowlist; happy-dom mount */ });
test("Sessions: current device has no Revoke; non-current revokes via confirm", () => { /* spyOn sessionsClient.listSessions; mount */ });
test("Login alerts: toggles bind and Save calls updateSecuritySettings", () => { /* spyOn settingsClient; mount */ });

// tests/vitest/ui-integration/settings-keys-webhooks-restyle.test.tsx
test("API keys: masked prefix chip per key, no full secret in DOM", () => { /* spyOn apiKeysClient.listApiKeys; mount; assert prefix present, no sk_live_… */ });
test("API keys: create surfaces one-time secret once via ApiKeySecretDialog", () => { /* mount; click Create; assert plaintext shown once, absent on reload */ });
test("Webhooks: endpoint card per webhook with StatusBadge + event badges", () => { /* spyOn webhooksClient.listWebhooks; mount */ });
test("Webhooks: enable Switch calls updateWebhook; delete is confirmed", () => { /* mount; toggle Switch; confirm delete */ });

// tests/vitest/ui-integration/settings-email-storage-integrations-restyle.test.tsx
test("Email: provider selector (smtp/resend); SMTP password masked; Send test calls sendTestEmail", () => { /* spyOn emailClient; mount */ });
test("Storage: 3 provider cards (local/s3/azure); selecting updates the form; secret masked", () => { /* spyOn settingsClient.getStorageSettings; mount */ });
test("Integrations: card per real integration; search filters; toggle calls updateIntegration; no credential in DOM", () => { /* spyOn integrationsClient.listIntegrations; mount */ });
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
