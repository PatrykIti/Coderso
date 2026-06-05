# TASK-409-04-L02: Integrations Provider UX
# FileName: TASK-409-04-L02-Integrations-Provider-UX.md

**Parent Subtask:** TASK-409-04
**Priority:** High
**Category:** Settings / Integrations / Admin UX
**Estimated Effort:** Medium
**Dependencies:** TASK-409-01-L01, TASK-409-01-L02, TASK-409-03-L02
**Status:** ✅ Done
**Completed:** 2026-06-05

---

## Overview

Expose Resend in Settings -> Integrations using the existing integration card
and drawer patterns. The drawer must support updating and clearing the encrypted
API key without ever rendering the secret value.

Files to inspect/change:

- `core/admin/ui/settings/IntegrationsPage.tsx`
- `core/admin/ui/settings/IntegrationDrawer.tsx`
- `core/admin/services/integrationsClient.ts`
- `tests/vitest/ui/integrations.test.tsx`
- `tests/vitest/ui/integration-drawer-secrets.test.tsx`
- `tests/vitest/ui-integration/integrations.test.tsx`

---

## Security Contract

- **Endpoint visibility:** no new endpoints.
- **Auth model:** unchanged admin session.
- **RBAC:** unchanged; UI uses existing integration endpoints.
- **CSRF:** unchanged; integration updates keep existing client `withCsrf`.
- **Rate-limit bucket:** unchanged `admin_write` for updates.
- **Validation:** UI must submit only known Resend field `apiKey`; no `baseUrl`
  field is shown or sent.
- **Anti-abuse controls:** nonce/signature/HMAC and reCAPTCHA are not applicable.
- **Secret handling:** drawer never renders the configured secret value; secret
  updates use the existing confirmation dialog; clearing sends `{ apiKey: null }`.

---

## Sub-Tasks

None. This is an execution leaf.

---

## Implementation Pseudocode

Icon map shape:

```ts
const iconMap = {
  // existing entries...
  resend: { icon: Send, accent: "emerald" },
};
```

Drawer behavior:

```ts
if (field.type === "secret" && !secretEdits[field.key]) {
  input.placeholder = field.configured ? "Secret already configured" : undefined;
  input.disabled = true;
}

// Clearing is intentional when secret editing is enabled and value is blank.
payload[field.key] = value.trim() ? value.trim() : null;
```

Data flow:

- Integrations list includes Resend from backend.
- Card opens existing drawer.
- Updating secret requires "Update secret" then confirmation.
- Clearing a secret sends `{ config: { apiKey: null } }` and results in
  disconnected state after revalidation.

Error handling:

- Missing master key errors show existing API client error.
- Unknown field errors cannot be triggered by the UI because `baseUrl` is not
  rendered, but route tests cover backend rejection.
- Drawer dirty guard should detect secret edit/clear state.

Regression-test shape:

- Resend card appears in list/filter/search.
- Drawer shows one secret API Key field and no Base URL field.
- Existing configured key is never printed in DOM.
- Updating secret prompts confirmation.
- Clearing secret sends `apiKey: null`.
- No `re_...` value appears in rendered output.

---

## Testing Requirements

- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/integrations.test.tsx tests/vitest/ui/integration-drawer-secrets.test.tsx tests/vitest/ui-integration/integrations.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `docs/guide/screens/integrations.md`: document Resend API key setup and clear
  behavior.
- `_docs/INTEGRATIONS.md`: update UI setup notes if needed.
- `_docs/_TASKS/README.md`: update status if this leaf starts/closes.
- `_docs/_CHANGELOG/`: add changelog coverage when this leaf closes.
