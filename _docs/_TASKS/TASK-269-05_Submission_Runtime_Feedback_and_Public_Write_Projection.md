# TASK-269-05: Submission Runtime Feedback and Public Write Projection

# FileName: TASK-269-05_Submission_Runtime_Feedback_and_Public_Write_Projection.md

**Priority:** High
**Category:** Widgets + Runtime Script + Forms + Public Write Security + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-269-02, TASK-269-04
**Status:** Done (2026-05-18)

---

## Overview

Make Form Embed submission feedback visible, accessible, and aligned with the
existing Forms public-write contract.

The report shows that submit has no loading UI, success can leave the empty form
visible beside a success message, success/error messages are not live regions,
submit does not expose busy state, `successRedirectUrl` projection is unclear,
and anti-abuse is not visible from the Form Embed contract. This leaf fixes the
Form Embed runtime script and resolved-data projection while keeping backend
write policy owned by the Forms subsystem. The current submit route already maps
`successRedirectUrl` into `runtime.redirectUrl`, so W15 is verification-first
scope here and only needs code changes if that owner proof fails in live tests.
W11 is not a widget-owned CAPTCHA feature toggle, but it is not purely future
scope either: public Forms submissions already require `captchaToken` in the
live backend contract, so this leaf must bridge the existing safe bot-protection
site key / token flow into Form Embed runtime without exposing secrets or
creating a weaker parallel policy.

## Scope Boundary

This leaf owns Form Embed runtime submit UX:

- disabled/busy submit and nav buttons during submit;
- loading copy or spinner state through Form Embed-owned data attributes;
- success behavior that can hide, reset, or keep the form by explicit config;
- `role="alert"` / `aria-live` for success/error output;
- redirect handling from existing Forms runtime response and resolved data;
- Form Embed projection of the existing safe Forms nonce field plus the safe
  bot-protection site key/token bridge required by the current public Forms
  submission contract. CAPTCHA and honeypot policy remain backend-owned; this
  leaf only consumes the existing safe public metadata and runtime helper path.

This leaf does not add a new public write endpoint, store CAPTCHA secrets in
widget JSON, or redesign Forms submission validation. If the existing Forms
route lacks required anti-abuse or redirect behavior, create a separate
Forms/public-write task and keep this leaf to Form Embed projection/wiring.

## Sub-Tasks

- [ ] Add Form Embed submit state data attributes for loading copy and success
  behavior.
- [ ] Update `formRuntimeScript.ts` to set `aria-busy`, disable submit/nav
  buttons during fetch, and restore state in `finally`.
- [ ] Add accessible live regions for success and error messages.
- [ ] Add explicit success behavior: hide form, reset form, or keep form based
  on a bounded Form Embed setting.
- [ ] Confirm `successRedirectUrl` is projected consistently from Forms runtime
  resolver and/or response runtime payload.
- [ ] Project the existing backend-owned submission nonce field safely and add
  the existing public-write captcha bridge through safe site-key/token
  projection; do not add widget-owned security switches and do not serialize
  secrets.
- [ ] If honeypot or other missing backend policy remains after that bridge is
  verified, create or link a future Forms/public-write task outside TASK-269
  before marking that residual scope deferred.
- [ ] Add targeted security tests if public payload validation, nonce, CAPTCHA,
  or honeypot behavior changes.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/formEmbed.tsx` | Add submit-state schema/defaults/normalizer, live-region markup, busy attributes, success behavior config, and existing safe anti-abuse projection markers. |
| `core/widgets/core/formRuntimeScript.ts` | Add busy/disabled state, live-region updates, success hide/reset policy, redirect handling, current nonce submission preservation, and captcha-token bridging through the existing safe runtime contract. |
| `core/server/publicSite.tsx` | Update only if Form Embed resolved data must project safe bot-protection site-key metadata, `successRedirectUrl`, or current nonce metadata into public runtime data. |
| `core/services/forms/formRuntimeResolver.ts` | Update only when existing Forms resolved-data projection changes for nonce, redirect, or safe bot-protection metadata. |
| `tests/vitest/widgets/formEmbed.test.tsx` | Cover live regions, busy attributes, success behavior markup, redirect data, and current nonce projection. |
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
};

function normalizeFormEmbedSubmitBehavior(value: unknown): Required<FormEmbedSubmitBehavior> {
  return {
    loadingLabel: normalizeNonEmptyString(readString(value, "loadingLabel"), "Sending..."),
    successBehavior: readEnum(value, "successBehavior", [
      "show-message-hide-form",
      "show-message-reset-form",
      "show-message-keep-form",
    ], "show-message-hide-form"),
  };
}

type SafeFormsAntiAbuseProjection = {
  nonceFieldName?: "__nl_form_nonce";
};

function projectSafeFormsAntiAbuse(
  resolved: FormEmbedResolvedData
): SafeFormsAntiAbuseProjection {
  return {
    nonceFieldName: resolved.submissionNonce ? "__nl_form_nonce" : undefined,
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

Runtime test harness shape:

```ts
import { getFormRuntimeClientScript } from "../../../core/widgets/core/formRuntimeScript";

function installFormRuntimeScript() {
  delete (window as { __nextlessFormRuntimeClient?: boolean }).__nextlessFormRuntimeClient;
  const script = document.createElement("script");
  script.textContent = getFormRuntimeClientScript();
  document.body.append(script);
}

test("form runtime disables submit and announces success", async () => {
  document.body.innerHTML = renderFixtureForm();
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ runtime: { successMessage: "Done" } })));
  installFormRuntimeScript();
  form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
  await waitFor(() => expect(successNode.classList.contains("hidden")).toBe(false));
  expect(submitButton.getAttribute("aria-busy")).toBe("false");
});
```

Error handling:

- Network or non-OK responses reveal the error live region and restore button
  state.
- Redirect URL must come from the server runtime response first; resolved-data
  fallback is allowed only if the Forms resolver explicitly owns that field.
- Anti-abuse fields must fail closed: TASK-269 only preserves/projects the
  current backend-owned nonce. Do not invent client-only CAPTCHA or honeypot
  security; route missing backend policy to a future Forms/public-write task.
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
- `bun run test:vitest -- tests/vitest/content/detailPageBindingResolver.test.ts`
  when `publicSite.tsx` / resolved-data consumer behavior changes
- `bun test tests/integration/runtime/detail-page-runtime-lite.test.ts` when
  public runtime hydration changes
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
  current anti-abuse projection behavior.
- Update `_docs/PLAYWRIGHT/REPORT_FORM_EMBED_WIDGET.md` rows W2, W3, W15, A8,
  and A9 after validation. Mark W11 fixed only for the existing backend-owned
  captcha/nonce bridge; route any remaining missing honeypot or broader backend
  policy to a future Forms/public-write task.

## Changelog Policy

- Covered by the TASK-269 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Submit visibly enters and exits a busy state, and assistive technology can
  detect that state.
- Success and error messages are live regions and do not leave users with an
  ambiguous empty form unless explicitly configured.
- Redirect behavior is consistent with Forms runtime response/resolved data.
- Public Form Embed submits satisfy the existing captcha + nonce contract
  without exposing secret bot-protection configuration in widget JSON or DOM.
- Public-write anti-abuse remains backend-owned and is covered by Bun
  route/security tests when touched. TASK-269 does not add widget-owned
  CAPTCHA/honeypot policy switches.
