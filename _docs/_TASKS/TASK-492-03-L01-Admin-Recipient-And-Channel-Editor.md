# TASK-492-03-L01: Wire recipients/webhook/channel admin controls

# FileName: TASK-492-03-L01-Admin-Recipient-And-Channel-Editor.md

**Parent Subtask:** TASK-492-03
**Priority:** Medium
**Category:** Settings / Security
**Estimated Effort:** Small
**Dependencies:** TASK-492-01-L01, TASK-492-01-L02
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

## Overview

### Goal
Turn the TASK-479 reskin's disabled `data-no-op-control` placeholders on the Login
Alerts admin screen into real, persisting controls: a recipients list, a webhook
URL + secret field, email/webhook channel toggles, and a read-only "last delivery
error" status — all flowing through the existing admin settings client.

### Owning module(s) to create-or-extend
- `core/admin/ui/settings/LoginAlertsPage.tsx` — extend `LoginAlertsFormState`,
  `toFormState`, and `handleSave` (lines ~39-120) to include the new fields; enable
  the controls currently rendered as no-ops:
  `settings-login-alerts-custom-recipients` (line 332),
  `settings-login-alerts-email-channel` (line 368),
  `settings-login-alerts-webhook-channel` (line 381). Render `deliveryError`
  read-only. Remove the "recipients ... not wired yet" disclaimer (line 36) for the
  wired controls (leave the brute-force placeholder untouched — out of scope).
- `core/admin/services/settingsClient.ts` — extend the `SecuritySettingsResponse`
  and `SecuritySettingsUpdate` `loginAlerts` shapes (lines ~143, ~184) to carry
  `recipients`, `webhookUrl`, `webhookSecret` (response: `{ configured }`),
  `deliveryError`.
- (If a separate presentational card is used) `LoginAlertsCard.tsx`.

### Source-of-truth docs
- `_docs/SECURITY_SPEC.md` (admin Settings redacted browser cache; secrets must
  not reach `localStorage`/debug/cache-bus, lines 177-192)
- `_docs/CMS_API.md` (`GET`/`PATCH /settings/security`)

### Out-of-scope
- Backend contract (TASK-492-01) and delivery (TASK-492-02).
- Brute-force threshold control and the non-Login-Alerts security sub-tabs.

## Security Contract
- **Endpoint visibility:** internal admin — the page consumes `getSecuritySettings`
  / `updateSecuritySettings` (`core/admin/services/settingsClient.ts:245,272`),
  which call `/admin/api/settings/security`.
- **Auth model / RBAC:** admin session; the write requires `settings:write`
  (enforced server-side). The UI must not assume the permission; surface the
  server error if rejected.
- **CSRF:** handled by the shared admin client (CSRF header). No hand-built
  request.
- **Rate-limit bucket:** `admin_read` (load) / `admin_write` (save) — via the
  shared client.
- **Validation:** the client sends only the typed `loginAlerts` subset; the
  server reject-unknown schema (TASK-492-01-L02) is authoritative. Client-side
  email/URL formatting is UX-only, never a security boundary.
- **Secret/PII handling (critical):**
  - `webhookSecret` is **write-only** in the UI: render an input that submits a new
    value but never displays the stored secret; show only a `configured` indicator
    from the response `{ configured }` projection.
  - Per `_docs/SECURITY_SPEC.md`, the Login Alerts settings must use the redacted
    browser cache contract: do **not** persist `webhookSecret` (or raw recipients
    if policy treats them as sensitive) into `localStorage`/`cacheKeys.settingsRedacted`
    /cache-bus payloads. Follow the existing pattern where credential-bearing
    settings remain backend-only and only `configured` flags are cacheable.
  - `deliveryError` is rendered read-only (already sanitized server-side).
- **Anti-abuse:** N/A (internal admin write).

## Implementation Pseudocode

```ts
// LoginAlertsPage.tsx
type LoginAlertsFormState = {
  enabled: boolean;
  notifyOnNewDevice: boolean;
  notifyOnNewLocation: boolean;
  emailChannelEnabled: boolean;     // maps to "send email" intent
  recipients: string;               // textarea (comma/newline), parsed on save
  webhookEnabled: boolean;
  webhookUrl: string;
  webhookSecret: string;            // write-only; empty = unchanged
};

const toFormState = (s: SecuritySettingsResponse): LoginAlertsFormState => ({
  enabled: s.loginAlerts.enabled,
  notifyOnNewDevice: s.loginAlerts.notifyOnNewDevice,
  notifyOnNewLocation: s.loginAlerts.notifyOnNewLocation,
  emailChannelEnabled: s.loginAlerts.recipients.length > 0 || true, // UX default
  recipients: s.loginAlerts.recipients.join("\n"),
  webhookEnabled: Boolean(s.loginAlerts.webhookUrl),
  webhookUrl: s.loginAlerts.webhookUrl ?? "",
  webhookSecret: "", // never hydrate from server
});

async function handleSave() {
  const payload: SecuritySettingsUpdate = {
    loginAlerts: {
      enabled: form.enabled,
      notifyOnNewDevice: form.notifyOnNewDevice,
      notifyOnNewLocation: form.notifyOnNewLocation,
      recipients: parseRecipients(form.recipients), // split, trim, filter
      webhookUrl: form.webhookEnabled ? form.webhookUrl.trim() || null : null,
      ...(form.webhookSecret.trim() ? { webhookSecret: form.webhookSecret.trim() } : {}),
    },
  };
  const updated = await updateSecuritySettings(payload);
  setSettings(updated); setForm(toFormState(updated)); // webhookSecret resets to ""
}

// Render: enable the existing controls (remove disabled/no-op props), bind
// onChange -> handleFieldChange; show <ReadonlyStatus value={settings.loginAlerts.deliveryError} />
// next to the channel section; keep the existing tab/sticky-save chrome.
```

- **Data flow:** load → `getSecuritySettings` (redacted) → form; save → typed
  `updateSecuritySettings` → response (secret as `{ configured }`) → re-hydrate;
  `webhookSecret` input clears after save.
- **Error handling:** reuse existing `isApiClientError` handling (the page already
  has `error`/`success` state). Server `validation_error` /
  `security_settings_invalid` surface as the inline error.

### Regression-test shape (Vitest, ui-integration)
```tsx
// tests/vitest/ui-integration/login-alerts.test.tsx (new)
// LoginAlertsPage loads via getSecuritySettings() in a useEffect and persists on a
// Save click, so this is an INTERACTIVE flow. Use the repo's ui-integration idiom
// (see tests/vitest/ui-integration/integrations.test.tsx) — NOT `renderAdminUi`,
// which is an SSR renderToString helper that runs no effects or events; and NOT
// @testing-library (the repo has none):
//   // @vitest-environment happy-dom
//   (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
//   const settingsState = vi.hoisted(() => ({
//     getSecuritySettings: vi.fn(),
//     updateSecuritySettings: vi.fn(),
//   }));
//   vi.mock("@/services/settingsClient", () => ({ ...settingsState }));
//   // mount with createRoot + React.act(() => root.render(<AdminRouterProvider>…</>))
//   // flush the load effect: await React.act(async () => { await Promise.resolve(); });
//   // set fields via the native value descriptor + dispatchEvent("input"/"change")
//   // click <button> via findButton(host, "Save changes")?.click() inside React.act
//   // assert on host.textContent / host.querySelector and the mock call args.
test("recipients/webhook controls render enabled (no data-no-op-control)", async () => { ... });
test("save sends loginAlerts.recipients/webhookUrl in updateSecuritySettings payload", async () => {
  // ...expect(settingsState.updateSecuritySettings).toHaveBeenCalledWith(payload);
});
test("webhookSecret input is write-only; configured flag shown, raw secret never in DOM", async () => { ... });
test("deliveryError is rendered read-only when present", async () => { ... });
```

## Testing Requirements
- **Lane:** Vitest ui-integration (interactive render flow). Because the page
  hydrates via `getSecuritySettings()` in a `useEffect` and persists on a Save click,
  the save/effect cases require the repo's ui-integration idiom — `// @vitest-environment
  happy-dom`, `createRoot` + `React.act`, `vi.mock("@/services/settingsClient", …)`,
  mount + flush the load effect, then drive inputs via the native value-descriptor +
  `dispatchEvent("input"/"change")` and buttons via `findButton(host, …)?.click()`
  (see `tests/vitest/ui-integration/integrations.test.tsx`). Do **NOT** use
  `renderAdminUi` for these — it is an SSR `renderToString` helper that runs no effects
  or events — and do **NOT** add `@testing-library` (the repo has none). Add a new
  `tests/vitest/ui-integration/login-alerts.test.tsx`; purely-static label/tab-chrome
  assertions may remain in the existing static `tests/vitest/ui/login-alerts.test.tsx`
  (which uses `renderAdminUi`).
- Assert: controls enabled (no `data-no-op-control`); save payload shape via
  `expect(updateSecuritySettings).toHaveBeenCalledWith(...)`; write-only secret (raw
  secret never in rendered DOM / no cache write); `deliveryError` read-only render;
  existing toggles + tab chrome preserved (do not regress the no-op brute-force
  placeholder or the other tab placeholders).
- No DB migration artifacts.
