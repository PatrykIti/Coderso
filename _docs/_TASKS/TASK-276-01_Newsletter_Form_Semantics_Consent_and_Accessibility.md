# TASK-276-01: Newsletter Form Semantics, Consent, and Accessibility

# FileName: TASK-276-01_Newsletter_Form_Semantics_Consent_and_Accessibility.md

**Priority:** High
**Category:** Widgets + Forms + Runtime Render + Accessibility + Public Write Security
**Estimated Effort:** Large
**Dependencies:** TASK-276
**Status:** To Do

---

## Overview

Make the Newsletter form HTML complete enough to submit meaningful data and to
be accessible in admin preview and public runtime.

`REPORT_NEWSLETTER_WIDGET.md` confirms that the email input has no `name`, no
stable accessible label/ID, and no `autocomplete="email"`, while the consent
checkbox is rendered outside the `<form>` so `required` does not block submit
and consent is not included in the submitted payload.

## Scope Boundary

This leaf owns:

- Email field `name`, stable input ID, explicit label or accessible label,
  `autocomplete="email"`, and configurable safe `emailFieldName`.
- Consent checkbox containment inside the `<form>`, a stable consent field
  name, required behavior, and form-submitted consent value.
- Safe no-target rendering when `integration.actionUrl`/`webhookId` are absent
  so the form does not silently post to the current page.
- Existing `webhookId` hidden input compatibility until TASK-276-02/03 decide
  the final active transport contract.
- Renderer and editor tests proving admin/public output match.

This leaf does not own:

- Loading/success/error runtime state orchestration beyond keeping the form
  semantic and non-destructive.
- Creating a new public endpoint or generic form runtime framework.
- Broad style, layout, custom fields, double opt-in, analytics, or provider
  integration expansion.
- Generic instance-ID helper work for unrelated widgets.

## Sub-Tasks

- [ ] Extend `NewsletterData` with bounded form field metadata, at minimum
  `form.emailFieldName`, `form.emailLabel`, and `form.consentFieldName`.
- [ ] Keep defaults backward-compatible: `email`, visible label fallback, and
  `consent` for consent field name.
- [ ] Update `newsletterSchema` with `additionalProperties: false` for the new
  nested form metadata.
- [ ] Normalize field names through a helper that accepts safe form key syntax
  and falls back to defaults for empty/unsafe values.
- [ ] Render a deterministic email `id` and `<label htmlFor>` or an explicit
  `aria-label` when visual label is hidden.
- [ ] Render `name={emailFieldName}` and `autocomplete="email"` on the email
  input.
- [ ] Move the consent label and checkbox inside the `<form>`, preserving the
  current visual placement below input/button when possible.
- [ ] Render `name={consentFieldName}` and a submitted value such as `"on"` for
  consent.
- [ ] When no active integration target exists, render a non-submitting button
  or prevent the native current-page POST with clear data attributes and editor
  diagnostics.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/newsletter.tsx` | Extend schema/defaults/normalizer; render email/consent labels, names, autocomplete, and safe no-target behavior. |
| `core/admin/ui/widgets/editors/NewsletterEditors.tsx` | Add form field metadata controls and consent-required help text without adding provider secrets. |
| `tests/vitest/widgets/newsletter.test.tsx` | Cover email `name`, ID/label, autocomplete, consent inside form, consent `required`, and no-target behavior. |
| `tests/vitest/widgets/renderer.test.tsx` | Cover renderer integration markers and submitted field names when rendered through `WidgetRenderer`. |
| `tests/vitest/ui/newsletter-editor-wave.test.tsx` | Cover field metadata controls and consent-required explanatory copy. |
| `tests/unit/widgets/validator.test.ts` | Update when schema/defaults are extended. |
| `_docs/_WIDGETS/NEWSLETTER.md` | Document final field-name/label/consent semantics. |

## Implementation Pseudocode

```ts
type NewsletterFormData = {
  emailFieldName?: string;
  emailLabel?: string;
  showEmailLabel?: boolean;
  consentFieldName?: string;
};

function normalizeNewsletterFieldName(value: unknown, fallback: string) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!/^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/.test(text)) return fallback;
  return text;
}

function normalizeNewsletterFormData(input: NewsletterData["form"]): Required<NewsletterFormData> {
  return {
    emailFieldName: normalizeNewsletterFieldName(input?.emailFieldName, "email"),
    emailLabel: normalizeNonEmptyText(input?.emailLabel, "Email address"),
    showEmailLabel: input?.showEmailLabel ?? false,
    consentFieldName: normalizeNewsletterFieldName(input?.consentFieldName, "consent"),
  };
}
```

Renderer shape:

```tsx
const form = normalizeNewsletterFormData(normalized.form);
const emailId = `newsletter-${safeFieldId(form.emailFieldName)}-${resolvedVariant}`;
const canSubmit = Boolean(formAction || (integrationMode === "webhook" && webhookId));

<form method={canSubmit ? "post" : undefined} action={formAction}>
  <label htmlFor={emailId} className={form.showEmailLabel ? undefined : "sr-only"}>
    {form.emailLabel}
  </label>
  <input
    id={emailId}
    type="email"
    name={form.emailFieldName}
    autoComplete="email"
    required
    aria-label={form.showEmailLabel ? undefined : form.emailLabel}
  />
  {showConsent ? (
    <label>
      <input
        type="checkbox"
        name={form.consentFieldName}
        value="on"
        required={Boolean(consent.required)}
      />
      {consent.label}
    </label>
  ) : null}
  <button type={canSubmit ? "submit" : "button"}>{submit.label}</button>
</form>
```

Error handling:

- Unsafe field names normalize to safe defaults and never render raw invalid
  names.
- Missing labels normalize to "Email address" so the input remains accessible.
- Missing active integration target must not submit a native POST to the current
  URL. Render a non-submitting button and a data marker such as
  `data-newsletter-submit-ready="false"`.
- Legacy payloads without `form` metadata must render the current visible copy
  with improved semantics.

## Security Contract

This leaf does not add a new API route, but it affects public form payloads.

- Endpoint visibility: unchanged public page rendering; no new public endpoint.
- Auth model: unchanged. Active submissions use the existing external action URL
  or future Newsletter transport leaf.
- RBAC: admin editing uses existing page/template/widget permissions.
- CSRF: admin writes keep existing CSRF; no Coderso public write route is added
  here.
- Rate-limit bucket: unchanged because no Coderso endpoint is added.
- Reject-unknown validation: `newsletterSchema` must keep
  `additionalProperties: false`; field metadata rejects unknown keys.
- Anti-abuse: no CAPTCHA/nonce bypass is introduced. This leaf prepares
  submitted field names only.
- Secret handling: do not add provider secrets, private URLs, raw submissions,
  nonce values, or CAPTCHA settings to widget data.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/newsletter-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/NEWSLETTER.md`
- `_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md` rows BUG-01, BUG-02, BF-01,
  A1, A2, A3, and A6 after validation.
- `_docs/_TASKS/README.md` on status changes.

## Changelog Policy

- Covered by the TASK-276 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Email input has a submitted `name`, stable accessible label/ID, and
  `autocomplete="email"`.
- Consent checkbox is inside the form, submitted with a safe name/value, and
  browser `required` validation works when enabled.
- Missing integration target no longer posts an empty payload to the current
  page.
- Legacy Newsletter blocks render with safer semantics without requiring a data
  migration.
- Tests fail if email/consent semantics regress.
