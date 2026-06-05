# TASK-404-02-L03: Form Automation Provider Resolution
# FileName: TASK-404-02-L03-Form-Automation-Provider-Resolution.md

**Parent Subtask:** TASK-404-02
**Priority:** High
**Category:** Forms / Email Automation
**Estimated Effort:** Medium
**Dependencies:** TASK-404-02-L02
**Status:** ✅ Done
**Completed:** 2026-06-05

---

## Overview

Align Form Action email automation with the active Email Settings provider so
forms do not keep a hidden SMTP-only path after Resend is selected.

Files to inspect/change:

- `core/services/forms/formAutomationRunnerCore.ts`
- `core/services/forms/formAutomationRunner.ts`
- `tests/vitest/forms/formAutomationRunnerCore.test.ts`

---

## Security Contract

- **Endpoint visibility:** no new endpoint. Existing public/internal form
  submission endpoints and anti-abuse behavior are unchanged.
- **Auth model:** unchanged for form submission flows.
- **RBAC:** unchanged.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged for public/internal form submissions.
- **Validation:** rendered email action inputs keep existing form action schema
  validation.
- **Anti-abuse controls:** public form nonce/HMAC/reCAPTCHA contracts remain
  unchanged because this leaf only changes backend email delivery after a valid
  form action run.
- **Secret handling:** action run request/response payloads must not include
  SMTP passwords, Resend API keys, authorization headers, or decrypted runtime
  config.

---

## Sub-Tasks

None. This is an execution leaf.

---

## Implementation Pseudocode

Provider-agnostic dependency shape:

```ts
export type AutomationEmailSender = (message: AutomationEmailMessage) => Promise<{
  messageId: string | null;
  response?: string | null;
}>;

export type FormAutomationRunnerCoreDeps = {
  // replace SMTP-specific getEmailSettings/createEmailTransport in pure core
  sendEmail: AutomationEmailSender;
  // existing deps...
};
```

Runtime wrapper shape:

```ts
const runtimeDeps: FormAutomationRunnerCoreDeps = {
  // existing deps...
  sendEmail: async (message) => {
    const { sendSystemEmail } = await import("../email/emailSettingsService");
    return sendSystemEmail({
      to: message.to,
      subject: message.subject,
      text: message.text ?? "",
      html: message.html,
      fromOverride: message.from, // only if supported by the service contract
    });
  },
};
```

Data flow:

- Pure form automation renders `to`, `subject`, `text`, `html`, `fromName`, and
  `fromEmail` as it does today.
- Pure core calls injected `sendEmail()` with a provider-agnostic message.
- Runtime wrapper resolves the active provider through the email service.
- Action run request/response payloads keep safe values: `to`, `subject`,
  `messageId`, `response`.

Error handling:

- Missing configured active provider propagates as `email_not_configured` action
  failure.
- Send failures propagate as existing action failure behavior with sanitized
  error code/message.
- Pure core must stay Bun/DB-free; do not import `db`, settings services, or
  runtime adapters in `formAutomationRunnerCore.ts`.

Regression-test shape:

- Form email action calls injected `sendEmail()` instead of SMTP
  `createEmailTransport()`.
- Resend-active scenario does not require SMTP host/user/password in pure tests.
- Existing rendered subject/body/from behavior is preserved.
- Action run payloads do not contain `apiKey`, `password`, `Authorization`, or
  bearer tokens.

---

## Testing Requirements

- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/forms/formAutomationRunnerCore.test.ts`
- Existing form action Bun tests if runtime wrapper behavior is covered there:
  `set -a && source .env && set +a && bun test tests/unit/forms/formActionsService.test.ts tests/integration/routes/forms.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/CMS_API.md`: update form-action email behavior only if API docs mention
  SMTP-specific delivery.
- `_docs/SECURITY_SPEC.md`: no new public-write security behavior; document only
  if action-log secret redaction wording changes.
- `_docs/_TASKS/README.md`: update status if this leaf starts/closes.
- `_docs/_CHANGELOG/`: add changelog coverage when this leaf closes.
