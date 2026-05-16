# TASK-269-05: Submission Runtime Feedback and Public Write Projection

# FileName: TASK-269-05_Submission_Runtime_Feedback_and_Public_Write_Projection.md

**Priority:** High
**Category:** Widgets + Runtime Script + Forms + Public Write Security + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-269-02, TASK-269-04
**Status:** To Do

---

## Overview

Make Form Embed submission feedback visible, accessible, and aligned with the
existing Forms public-write contract.

The report shows that submit has no loading UI, success can leave the empty form
visible beside a success message, success/error messages are not live regions,
submit does not expose busy state, `successRedirectUrl` projection is unclear,
and anti-abuse is not visible from the Form Embed contract. This leaf fixes the
Form Embed runtime script and resolved-data projection while keeping backend
write policy owned by the Forms subsystem.

## Scope Boundary

This leaf owns Form Embed runtime submit UX:

- disabled/busy submit and nav buttons during submit;
- loading copy or spinner state through Form Embed-owned data attributes;
- success behavior that can hide, reset, or keep the form by explicit config;
- `role="alert"` / `aria-live` for success/error output;
- redirect handling from existing Forms runtime response and resolved data;
- Form Embed projection of existing nonce/CAPTCHA/honeypot metadata when the
  backend already owns those policies.

This leaf does not add a new public write endpoint, store CAPTCHA secrets in
widget JSON, or redesign Forms submission validation. If the existing Forms
route lacks required anti-abuse or redirect behavior, create a separate
Forms/public-write task and keep this leaf to Form Embed projection/wiring.

## Sub-Tasks

- [ ] Add Form Embed submit state data attributes for loading copy, success
  behavior, and optional anti-abuse placeholder metadata that is safe for public
  DOM.
- [ ] Update `formRuntimeScript.ts` to set `aria-busy`, disable submit/nav
  buttons during fetch, and restore state in `finally`.
- [ ] Add accessible live regions for success and error messages.
- [ ] Add explicit success behavior: hide form, reset form, or keep form based
  on a bounded Form Embed setting.
- [ ] Confirm `successRedirectUrl` is projected consistently from Forms runtime
  resolver and/or response runtime payload.
- [ ] Wire existing backend-owned nonce/CAPTCHA/honeypot metadata only if the
  Forms route already exposes safe public fields; do not serialize secrets.
- [ ] Add targeted security tests if public payload validation, nonce, CAPTCHA,
  or honeypot behavior changes.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/formEmbed.tsx` | Add submit-state schema/defaults/normalizer, live-region markup, busy attributes, success behavior config, and safe anti-abuse placeholders. |
| `core/widgets/core/formRuntimeScript.ts` | Add busy/disabled state, live-region updates, success hide/reset policy, redirect handling, and safe anti-abuse token submission where already supported. |
| `core/server/publicSite.tsx` | Update only if resolved Forms runtime data must project `successRedirectUrl` or safe anti-abuse metadata into Form Embed data. |
| `core/services/forms/formRuntimeResolver.ts` | Update only when existing Forms resolved-data projection already owns safe public metadata. |
| `tests/vitest/widgets/formEmbed.test.tsx` | Cover live regions, busy attributes, success behavior markup, redirect data, and anti-abuse placeholders. |
| `tests/vitest/widgets/formRuntimeScript.test.ts` | Create or update submit busy state, success hide/reset, error reveal, redirect, and state restoration coverage. |
| `tests/integration/routes/forms.test.ts` | Run/update when public payload, nonce, CAPTCHA, or honeypot request behavior changes. |
| `tests/unit/forms/submissionService.test.ts` | Run/update when submission validation or anti-abuse service behavior changes. |
| `tests/security/codersoSecurityGate.test.ts` | Run/update when security gate behavior changes. |
| `_docs/_WIDGETS/FORM_EMBED.md` | Document submit feedback and backend-owned anti-abuse projection. |

## Implementation Pseudocode

```ts
type FormEmbedSubmitBehavior = {
  loadingLabel?: string;
  successBehavior?: "show-message-hide-form" | "show-message-reset-form" | "show-message-keep-form";
  enableHoneypot?: boolean;
  captchaPolicy?: "inherit" | "disabled";
};

function normalizeFormEmbedSubmitBehavior(value: unknown): Required<FormEmbedSubmitBehavior> {
  return {
    loadingLabel: normalizeNonEmptyString(readString(value, "loadingLabel"), "Sending..."),
    successBehavior: readEnum(value, "successBehavior", [
      "show-message-hide-form",
      "show-message-reset-form",
      "show-message-keep-form",
    ], "show-message-hide-form"),
    enableHoneypot: readBoolean(value, "enableHoneypot", true),
    captchaPolicy: readEnum(value, "captchaPolicy", ["inherit", "disabled"], "inherit"),
  };
}
```

Runtime shape:

```js
const setSubmitting = (form, submitting) => {
  form.dataset.submitting = submitting ? "1" : "0";
  Array.from(form.querySelectorAll("button, input, textarea, select")).forEach((control) => {
    if (shouldDisableDuringSubmit(control)) control.disabled = submitting;
  });
  const submitButton = form.querySelector("[data-form-submit]");
  if (submitButton) submitButton.setAttribute("aria-busy", submitting ? "true" : "false");
};

const applySuccessBehavior = (form, message) => {
  showLiveSuccess(form, message);
  switch (form.dataset.formSuccessBehavior) {
    case "show-message-reset-form":
      form.reset();
      break;
    case "show-message-keep-form":
      break;
    default:
      form.hidden = true;
  }
};
```

Error handling:

- Network or non-OK responses reveal the error live region and restore button
  state.
- Redirect URL must come from the server runtime response first; resolved-data
  fallback is allowed only if the Forms resolver explicitly owns that field.
- Anti-abuse fields must fail closed: if CAPTCHA or honeypot metadata is not
  available from backend-owned safe metadata, do not invent client-only
  security.
- Success hide/reset behavior must clear saved progress only after a successful
  response.

## Security Contract

This leaf may affect the existing public Forms submission endpoint, but must
not add a new endpoint.

- Endpoint visibility: existing public `POST /forms/:id/submissions`; admin
  editing remains internal.
- Auth model: public writes keep existing Forms access evaluation; internal
  mode requires admin session or API key scope `forms.submit`.
- RBAC: unchanged for admin writes; Forms write permissions remain enforced by
  existing route/service code.
- CSRF: admin writes keep CSRF; public form submissions continue to use the
  Forms nonce/HMAC contract where required.
- Rate-limit bucket: existing Forms public-write bucket; no weaker
  widget-specific bucket.
- Reject-unknown validation: public request bodies must remain allowlisted by
  Forms schemas before persistence.
- Anti-abuse: nonce/CAPTCHA/honeypot are backend-owned. Widget JSON and public
  DOM may contain only safe public placeholders, never secrets.
- Secret handling: no nonce secrets, CAPTCHA secrets, provider keys, raw
  submissions, private URLs, or privileged debug payloads in widget data,
  browser cache, Playwright reports, or changelog notes.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/formEmbed.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/formRuntimeScript.test.ts`
  when `formRuntimeScript.ts` behavior changes
- `bun run test:vitest -- tests/vitest/forms/formRuntimeResolver.test.ts` when
  resolved runtime projection changes
- `bun test tests/integration/routes/forms.test.ts` when public route payload
  behavior changes
- `bun test tests/unit/forms/submissionService.test.ts` when validation/service
  behavior changes
- `bun test tests/security/codersoSecurityGate.test.ts` when nonce/CAPTCHA/
  honeypot/security behavior changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/FORM_EMBED.md` with loading, success, redirect, and
  anti-abuse projection behavior.
- Update `_docs/PLAYWRIGHT/REPORT_FORM_EMBED_WIDGET.md` rows W2, W3, W11, W15,
  A8, and A9 after validation.

## Changelog Policy

- Covered by the TASK-269 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Submit visibly enters and exits a busy state, and assistive technology can
  detect that state.
- Success and error messages are live regions and do not leave users with an
  ambiguous empty form unless explicitly configured.
- Redirect behavior is consistent with Forms runtime response/resolved data.
- Public-write anti-abuse remains backend-owned and is covered by Bun
  route/security tests when touched.
