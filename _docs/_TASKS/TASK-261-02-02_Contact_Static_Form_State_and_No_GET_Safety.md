# TASK-261-02-02: Contact Static Form State and No-GET Safety

# FileName: TASK-261-02-02_Contact_Static_Form_State_and_No_GET_Safety.md

**Priority:** High
**Category:** Widgets + Runtime Render + Admin UI + UX Safety
**Estimated Effort:** Medium
**Dependencies:** TASK-261-02-01
**Status:** To Do

---

## Overview

Prevent presentational Contact forms from silently submitting a blank GET to the
current page.

`REPORT_CONTACT_WIDGET.md` row C4 confirms that clicking the current Contact
submit button reloads the page with an empty query string. This leaf makes the
static mode honest and safe before any optional Forms runtime bridge is added.

## Scope Boundary

This leaf owns:

- `form.submission.mode` defaulting to `"static"` or equivalent normalized
  static state.
- Static-mode output that cannot native-submit to the current URL using only
  SSR-safe HTML.
- User-facing copy for presentational/static forms.
- Editor copy that makes static vs submit-capable behavior explicit.
- Renderer tests proving no `method="get"` or current-page native action path.

This leaf does not own:

- Real Forms runtime submission.
- Nonce/CAPTCHA/public route behavior.
- New endpoint URLs in Contact JSON.
- A custom client script for Contact.

## Sub-Tasks

- [ ] Add normalized Contact submission mode with static as the legacy/default
  behavior.
- [ ] Render static Contact with a non-form wrapper such as
  `<div role="group">`, or otherwise guarantee that neither button click nor
  Enter key can trigger native GET in static SSR output.
- [ ] Add inline/static status copy such as "Contact details only" or a
  configured presentational note where appropriate.
- [ ] Add editor guidance so users know the form is presentational until a
  Forms runtime binding is selected by TASK-261-02-03.
- [ ] Test static renderer output and minimal-variant interactions.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/contact.tsx` | Add static submission state and render no-GET-safe static controls. |
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | Add static-mode copy and prevent misleading send behavior. |
| `tests/vitest/widgets/contact.test.tsx` | Cover static mode, no GET method/action, button type, and status copy. |
| `tests/vitest/ui/contact-editor-wave.test.tsx` | Cover editor copy for static mode and minimal variant. |
| `tests/unit/widgets/validator.test.ts` | Update when submission schema fields are added. |
| `_docs/_WIDGETS/CONTACT.md` | Document static/presentational behavior. |

## Implementation Pseudocode

```ts
type ContactSubmissionMode = "static" | "forms-runtime";

type ContactSubmissionSettings = {
  mode?: ContactSubmissionMode;
  staticMessage?: string;
};

function normalizeContactSubmission(value: unknown): Required<ContactSubmissionSettings> {
  return {
    mode: readMode(value) === "forms-runtime" ? "forms-runtime" : "static",
    staticMessage: normalizeString(readString(value, "staticMessage"), ""),
  };
}
```

Renderer shape:

```tsx
const isStatic = normalized.form?.submission?.mode !== "forms-runtime";

{isStatic ? (
  <div role="group" aria-labelledby={formTitleId} data-contact-form-mode="static">
    {/* fields from TASK-261-02-01 rendered read/write-looking only if product keeps them visible */}
    <button type="button" data-form-submit="1" aria-busy="false">{submitLabel}</button>
    <p role="status">{staticMessage || "This contact form is not connected yet."}</p>
  </div>
) : (
  <form aria-labelledby={formTitleId}>{/* TASK-261-02-03 owns submit markup */}</form>
)}
```

Error handling:

- Static mode must not emit `method="get"` or an action pointing at the current
  page.
- Static mode must not rely on a React `onSubmit` handler because public output
  is static SSR.
- Static mode must not claim that a message was sent.
- Switching to `minimal` must not destroy form metadata; it only hides the form
  at render time.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: Contact schema must reject unknown submission mode
  fields.
- Anti-abuse: static mode does not write publicly and must not expose arbitrary
  endpoint URLs.
- Secret handling: no nonce, CAPTCHA, provider, or raw submission data exists in
  static mode.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/contact-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` when schema changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/CONTACT.md` with static Contact form behavior.
- Update `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md` row C4 after validation.

## Changelog Policy

- Covered by the TASK-261 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Static Contact no longer submits a GET to the current page.
- Static Contact clearly communicates that the form is presentational or not
  connected.
- Static no-GET safety is HTML-only and does not depend on client-side React.
- No endpoint URL, nonce, CAPTCHA, or provider config is added to static widget
  data.
