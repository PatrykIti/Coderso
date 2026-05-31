# TASK-343-03: Newsletter Audit Remediation Family

# FileName: TASK-343-03_Newsletter_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Newsletter + Public Write UX + Admin UI + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343
**Status:** Done (2026-05-30)

---

## Overview

Close the confirmed Newsletter disconnect-state drift where the public form can
still submit natively with Enter and leak the email into the query string even
though the widget is visually presented as not connected.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_NEWSLETTER_WIDGET.md:220-239`
- `core/admin/ui/widgets/editors/NewsletterEditors.tsx:1195-1693`
- `core/widgets/core/newsletter.tsx` (submission shell, disconnected-state form
  rendering, and submit readiness output)

## Sub-Tasks

- [x] Block native form submission whenever the widget is not actually
  connected and ready for runtime submit.
- [x] Make disconnected/public-disabled state truthful in both semantics and
  copy.
- [x] Keep the current `forms-runtime` path intact once a valid form is bound.
- [x] Add regression coverage for Enter-key submit and disconnected-state DOM.

## Files To Change

| File | Required change |
|---|---|
| `core/widgets/core/newsletter.tsx` | Guard disconnected-state submit behavior and align semantics with readiness. |
| `core/admin/ui/widgets/editors/NewsletterEditors.tsx` | Clarify disconnected-state copy and preserve runtime-owner messaging. |
| `tests/vitest/widgets/newsletter.test.tsx` | Cover disconnected-state form semantics and submit prevention. |
| `tests/vitest/ui/newsletter-editor-wave.test.tsx` | Cover disconnected-state guidance and runtime summary. |

## Implementation Pseudocode

```tsx
function canSubmitNewsletter(state: NewsletterResolvedState): boolean {
  return (
    (state.submissionMode === "forms-runtime" && state.canUseFormsRuntime) ||
    (state.submissionMode === "action-url" && state.canUseNativeAction)
  );
}

function handleNewsletterSubmit(event: FormEvent<HTMLFormElement>, state: NewsletterResolvedState) {
  if (!canSubmitNewsletter(state)) {
    event.preventDefault();
    return;
  }
}

function resolveSubmitButtonProps(state: NewsletterResolvedState) {
  if (!canSubmitNewsletter(state)) {
    return { type: "button" as const, disabled: true, "aria-disabled": true };
  }
  return { type: "submit" as const, disabled: false };
}
```

Keep the existing distinction between connection readiness and submit readiness:
valid `forms-runtime` and valid native `action-url` submit paths remain
supported, while disconnected states always get an explicit submit guard.

## Regression Test Shape

- Enter in the email field does not change the URL or submit when disconnected.
- Disconnected state renders truthful disabled semantics and copy.
- Bound forms-runtime and native action-url states still render normal submit
  paths.

## Security Contract

No new API route. Public write security posture must not weaken.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: preserve the existing bounded forms-runtime contract; do not
  invent a weaker disconnected submit fallback.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/newsletter-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_NEWSLETTER_WIDGET.md`.
- Update `_docs/_WIDGETS/NEWSLETTER.md` if disconnected-state semantics change.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Disconnected Newsletter forms no longer submit natively with Enter.
- The widget no longer leaks email values into the public query string when it
  is not connected.
- Connected forms-runtime and native action-url behavior remains intact.

## Completion Notes (2026-05-30)

- Disconnected and non-interactive Newsletter states now render a non-submitting
  `div role="form"` shell with disabled semantics instead of an actual `<form>`,
  so browser implicit Enter submission cannot leak email values into the current
  URL.
- This shell-level guard intentionally replaces the pseudocode `onSubmit`
  fallback: when a render cannot submit interactively, there is no native form
  for the browser to submit.
- Interactive states still render a native `<form>` for valid external
  `action-url` submissions and the existing Forms runtime path.
- Editor preview for a bound Forms runtime contract can still report
  `data-newsletter-submit-ready="true"` while rendering the blocked shell with
  `data-newsletter-submit-interactive="false"` until public runtime injects
  nonce and bot-protection data.
- Visual copy now states that disconnected public render stays disabled until a
  destination is selected, and the Connection status summary names the disabled
  visitor-submit state.
- Regression coverage asserts the disconnected shell has no native `<form>`,
  safe native `action-url` still submits, valid Forms runtime still renders the
  shared runtime form, and editor guidance is visible.

## Validation Executed (2026-05-30)

- `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/newsletter-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-03
  drift review: no blockers)
