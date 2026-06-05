# TASK-409-04-L01: Email Settings Provider UX
# FileName: TASK-409-04-L01-Email-Settings-Provider-UX.md

**Parent Subtask:** TASK-409-04
**Priority:** High
**Category:** Settings / Email / Admin UX
**Estimated Effort:** Large
**Dependencies:** TASK-409-03-L01, TASK-409-03-L02
**Status:** ✅ Done
**Completed:** 2026-06-05

---

## Overview

Replace the SMTP-only Email Settings UX with a provider-aware interface. Admins
can choose Manual SMTP or Resend. Resend mode hides manual SMTP fields and shows
the Resend integration configured state plus a configure action.

Files to inspect/change:

- `core/admin/ui/settings/EmailSettingsPage.tsx`
- `core/admin/ui/settings/SmtpCard.tsx`
- `core/admin/ui/settings/EmailLogsDrawer.tsx`
- `core/admin/services/emailClient.ts`
- `tests/vitest/ui/email-settings.test.tsx`
- `tests/vitest/ui-integration/emailSettings.test.tsx`

---

## Security Contract

- **Endpoint visibility:** no new endpoints.
- **Auth model:** unchanged admin session.
- **RBAC:** unchanged; UI uses existing Email Settings endpoints.
- **CSRF:** unchanged; saves/test sends keep existing client `withCsrf`.
- **Rate-limit bucket:** unchanged; test send remains `admin_write`.
- **Validation:** UI payloads align with backend DTOs and do not include Resend
  `apiKey`, `baseUrl`, or unknown fields.
- **Anti-abuse controls:** no public write surface is added.
- **Secret handling:** Resend API keys and SMTP passwords must not appear in DOM
  text, browser cache/localStorage, dirty signatures, autosave payloads,
  confirmation copy, delivery log rows, or debug output.

---

## Sub-Tasks

None. This is an execution leaf.

---

## Implementation Pseudocode

Draft shape:

```ts
type EmailSettingsDraft = {
  provider: "smtp" | "resend";
  smtpHost: string;
  smtpPort: string;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  updatePassword: boolean;
  fromName: string;
  fromEmail: string;
};
```

Save payload shape:

```ts
const payload =
  draft.provider === "smtp"
    ? {
        provider: "smtp",
        smtp: buildSmtpPayload(draft),
        from: buildFromPayload(draft),
      }
    : {
        provider: "resend",
        from: buildFromPayload(draft),
      };
```

UI flow:

- Provider selector uses existing settings patterns (`Select` or segmented
  control) and stable values `smtp`/`resend`.
- SMTP selected: render `SmtpCard` and current status items.
- Resend selected: hide `SmtpCard`; render a provider panel with configured
  state from `settings.resend.status` and a configure action to Settings ->
  Integrations.
- Use canonical admin navigation helpers for configure links; do not hand-build
  alias logic.
- Delivery logs show provider labels so SMTP and Resend sends are
  distinguishable.

Error handling:

- Port/password validation applies only in SMTP mode.
- Active Resend without configured key shows "Needs setup" and test send maps
  `email_not_configured` to user-visible error.
- Background refresh/autosave must not overwrite dirty drafts.

Regression-test shape:

- Initial SMTP settings render manual fields.
- Selecting Resend hides SMTP host/port/user/password inputs.
- Saving Resend sends `{ provider: "resend", from }` and does not clear SMTP.
- Dirty navigation detects provider/from changes.
- Test send confirmation remains required.
- DOM text does not contain `re_`, `apiKey`, SMTP password, or bearer headers.
- Delivery log rows include provider labels.

---

## Testing Requirements

- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/email-settings.test.tsx tests/vitest/ui-integration/emailSettings.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `docs/guide/screens/email-settings.md`: document provider selector and Resend
  setup state.
- `_docs/CMS_API.md`: update UI-facing examples if needed.
- `_docs/_TASKS/README.md`: update status if this leaf starts/closes.
- `_docs/_CHANGELOG/`: add changelog coverage when this leaf closes.
