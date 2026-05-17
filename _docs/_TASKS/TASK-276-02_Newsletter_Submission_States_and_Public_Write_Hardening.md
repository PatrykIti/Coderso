# TASK-276-02: Newsletter Submission States and Public Write Hardening

# FileName: TASK-276-02_Newsletter_Submission_States_and_Public_Write_Hardening.md

**Priority:** High
**Category:** Widgets + Runtime State + Public Write Security + Accessibility
**Estimated Effort:** Very Large
**Dependencies:** TASK-276, TASK-276-01
**Status:** To Do

---

## Overview

Replace the current always-visible Newsletter success copy with a real runtime
state model and route any Coderso-owned submission through backend-owned
anti-abuse controls.

`REPORT_NEWSLETTER_WIDGET.md` confirms that `data-newsletter-success` is visible
before submit, has no `aria-live`, and there is no loading/error state. The same
report asks for spam protection, redirect, and analytics/tracking support. This
leaf must implement those behaviors without placing security secrets in widget
data.

## Scope Boundary

This leaf owns:

- Hidden-by-default success and error nodes with `role="status"` or
  `aria-live`.
- Button loading/disabled state and duplicate-submit protection.
- Submit-state copy normalization for loading, success, and error messages.
- Redirect-after-success configuration when the active transport supports it.
- Optional analytics event metadata using allowlisted event names and data
  attributes only, not raw scripts.
- Honeypot/nonce/CAPTCHA bridge only when the submission is Coderso-owned.
- Reuse of existing Forms public-write owners when Newsletter is bound to a
  saved Forms record or route.

This leaf does not own:

- Email/consent field semantics already owned by TASK-276-01.
- Integration URL/method editor validation owned by TASK-276-03.
- Arbitrary provider secrets, raw webhook secrets, or third-party JavaScript
  snippets in widget data.
- A generic public-write framework for all form widgets.

## Sub-Tasks

- [ ] Add `stateCopy.loadingMessage`, `stateCopy.successMessage`, and
  `stateCopy.errorMessage` or a backward-compatible equivalent that maps the
  existing `submit.successMessage`.
- [ ] Render success and error messages hidden by default, with `role="status"`
  or `aria-live="polite"`.
- [ ] Add a runtime client path for active Newsletter submissions. If the
  widget is bound to Forms, either render the exact marker contract consumed by
  `getFormRuntimeClientScript()` or generalize that script to support shared
  form-status markers plus Newsletter aliases in the same patch.
- [ ] Add submit button busy state via `aria-busy`, disabled handling, and
  duplicate-submit prevention.
- [ ] Add a bounded honeypot field and ensure it is omitted or validated by the
  backend owner when a Coderso route receives submissions.
- [ ] If Newsletter writes through Forms, hydrate the runtime with
  `resolveFormRuntimeData()` in `publicSite.tsx` and use existing
  `__nl_form_nonce`, CAPTCHA, and Forms submission routes.
- [ ] If a dedicated Newsletter route is introduced instead, add route
  registration, schema validation, nonce assertion, CAPTCHA enforcement, rate
  limiting, centralized `mapNewsletterError` or reused `mapFormsError`
  coverage, and service tests in the same leaf.
- [ ] Add safe redirect configuration and apply it only after a successful
  backend-confirmed submit.
- [ ] Add analytics event metadata as safe `data-*` values; do not execute
  arbitrary scripts from widget JSON.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/newsletter.tsx` | Add submit state copy, hidden status nodes, busy markers, optional runtime data, and anti-abuse data attributes. |
| `core/admin/ui/widgets/editors/NewsletterEditors.tsx` | Add state-copy, redirect, analytics, and anti-abuse diagnostics controls; the success-preview UI affordance is owned by TASK-276-04 after this leaf defines the state model. |
| `core/server/publicSite.tsx` | Hydrate Forms runtime data only if Newsletter binds to an existing Forms record. |
| `core/widgets/core/formRuntimeScript.ts` | Reuse only with existing `data-form-embed-*` marker names, or generalize to shared markers plus Newsletter aliases with tests in the same patch. |
| `core/services/forms/formRuntimeResolver.ts` | Reuse as-is when possible; add focused adapter coverage only if Newsletter hydration needs it. |
| `core/server/routes/formsRoutes.ts` | Change only when Newsletter reuses/extends Forms public submission behavior. |
| `core/server/routes/newsletterRoutes.ts` or equivalent future owner | Add only if a dedicated Newsletter public submit route is approved; include route registration and centralized error mapping. |
| `tests/vitest/widgets/newsletter.test.tsx` | Cover hidden status nodes, `aria-live`, busy markers, state copy, honeypot markers, and redirect metadata. |
| `tests/vitest/ui/newsletter-editor-wave.test.tsx` | Cover state-copy, redirect, analytics, and diagnostics controls; success-preview UI coverage belongs to TASK-276-04. |
| `tests/vitest/widgets/renderer.test.tsx` | Cover public renderer output through `WidgetRenderer`. |
| `tests/vitest/forms/formRuntimeResolver.test.ts` | Add coverage only if runtime resolver/adapters change. |
| `tests/integration/routes/forms.test.ts` | Run/update when Forms public submission behavior changes. |
| `tests/unit/forms/submissionService.test.ts` | Run/update when submitted data normalization changes. |
| `tests/security/codersoSecurityGate.test.ts` | Run/update for nonce/CAPTCHA/public-write behavior. |
| `_docs/_WIDGETS/NEWSLETTER.md` | Document runtime states and security boundary. |

## Implementation Pseudocode

```ts
type NewsletterStateCopy = {
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
};

type NewsletterSubmission = {
  mode?: "external-action" | "forms-runtime" | "webhook";
  formId?: string;
  successRedirectUrl?: string;
  analyticsEvent?: string;
  honeypotName?: string;
};

function normalizeNewsletterSubmission(input: unknown): Required<NewsletterSubmission> {
  return {
    mode: normalizeMode(input),
    formId: normalizeOptionalId(input?.formId),
    successRedirectUrl: normalizeSafeRelativeOrHttpsUrl(input?.successRedirectUrl),
    analyticsEvent: normalizeAnalyticsEvent(input?.analyticsEvent),
    honeypotName: normalizeNewsletterFieldName(input?.honeypotName, "company"),
  };
}
```

Runtime shape when reusing Forms:

```tsx
const canUseFormsRuntime =
  submission.mode === "forms-runtime" &&
  resolved?.formId &&
  !resolved.error;

<form
  method="post"
  action={canUseFormsRuntime ? `/forms/${resolved.formId}/submissions` : formAction}
  data-nextless-form-runtime={canUseFormsRuntime ? "1" : undefined}
  data-form-success-message={stateCopy.successMessage}
  data-newsletter-analytics-event={submission.analyticsEvent || undefined}
>
  {resolved?.submissionNonce ? (
    <input type="hidden" name="__nl_form_nonce" value={resolved.submissionNonce} />
  ) : null}
  <input tabIndex={-1} autoComplete="off" name={submission.honeypotName} hidden />
  <button type="submit" data-form-submit="1" aria-busy="false">
    {submit.label}
  </button>
  <p className="hidden" data-form-embed-success="true" data-newsletter-success="true" role="status" aria-live="polite">
    {stateCopy.successMessage}
  </p>
  <p className="hidden" data-form-embed-error="true" data-newsletter-error="true" role="status" aria-live="polite">
    {stateCopy.errorMessage}
  </p>
</form>
```

Error handling:

- Success message is hidden until runtime reports a successful submission.
- If runtime script fails, show the configured error message and clear busy
  state.
- If CAPTCHA is required and unavailable, do not submit and show a user-facing
  error.
- If a backend-owned runtime binding is missing or unpublished, render a clear
  non-submitting fallback instead of silently posting to the current page.
- If Newsletter-specific success/error markers are used, update
  `formRuntimeScript.ts` selectors and tests in the same patch so those nodes
  are not inert.
- When reusing the current Forms runtime script, status nodes must use the
  existing CSS-class visibility contract (`className="hidden"`), not the HTML
  `hidden` attribute, unless the script is changed to toggle that attribute.
- Analytics event names are allowlisted and emitted only after success; raw JS
  snippets and unbounded attributes are rejected.

## Security Contract

This leaf may add or reuse public write behavior.

- Endpoint visibility: existing public `POST /forms/:id/submissions` when
  reusing Forms, or a new public Newsletter endpoint only if this leaf includes
  route registration and security tests.
- Auth model: public writes use nonce + signature/HMAC and optional CAPTCHA;
  internal mode requires admin session or API key scope `forms.submit` or a
  future explicit Newsletter submit scope.
- RBAC: admin configuration writes use existing page/template/widget-template
  permissions and any Forms read permission needed by a picker.
- CSRF: admin writes keep CSRF; public writes use HMAC nonce.
- Rate-limit bucket: existing `public_write`.
- Reject-unknown validation: route payloads and widget schema must reject
  unknown fields. Honeypot, analytics, and redirect metadata must be bounded.
- Anti-abuse: nonce/CAPTCHA/honeypot are backend-owned; widget data cannot
  bypass enforcement or supply provider secrets.
- Secret handling: do not expose nonce secrets, CAPTCHA secrets, provider keys,
  webhook secrets, raw submissions, or private URLs in widget JSON, browser
  cache, reports, or changelog.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/newsletter-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx`
- `bun run test:vitest -- tests/vitest/forms/formRuntimeResolver.test.ts` when
  Forms hydration changes
- `bun test tests/integration/routes/forms.test.ts` when Forms public submit
  route behavior changes
- Dedicated route registration tests plus `mapNewsletterError` or reused
  `mapFormsError` coverage when a new Newsletter route family is added or a
  public submit route boundary changes.
- `bun test tests/unit/forms/submissionService.test.ts` when submitted data
  normalization changes
- `bun test tests/security/codersoSecurityGate.test.ts` when nonce/CAPTCHA or
  public-write behavior changes
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/NEWSLETTER.md`
- `_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md` rows BUG-03, A4, BF-07, BF-08,
  BF-11, BF-12, and BF-14 after validation.
- `_docs/SECURITY_SPEC.md` only if the existing public-write contract changes.

## Changelog Policy

- Covered by the TASK-276 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Success copy is not visible before submit and is announced after successful
  submission.
- Error and loading states are visible, accessible, and test-covered.
- Duplicate submit attempts are blocked while a submission is pending.
- Coderso-owned public writes use nonce/CAPTCHA/rate-limit validation and never
  rely on widget-owned secrets.
- Missing runtime binding degrades to a non-submitting, clearly diagnosed state.
