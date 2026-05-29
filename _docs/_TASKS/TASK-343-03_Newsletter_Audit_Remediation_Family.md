# TASK-343-03: Newsletter Audit Remediation Family

# FileName: TASK-343-03_Newsletter_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Newsletter + Public Write UX + Admin UI + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343
**Status:** To Do

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

- [ ] Block native form submission whenever the widget is not actually
  connected and ready for runtime submit.
- [ ] Make disconnected/public-disabled state truthful in both semantics and
  copy.
- [ ] Keep the current `forms-runtime` path intact once a valid form is bound.
- [ ] Add regression coverage for Enter-key submit and disconnected-state DOM.

## Files To Change

| File | Required change |
|---|---|
| `core/widgets/core/newsletter.tsx` | Guard disconnected-state submit behavior and align semantics with readiness. |
| `core/admin/ui/widgets/editors/NewsletterEditors.tsx` | Clarify disconnected-state copy and preserve runtime-owner messaging. |
| `tests/vitest/widgets/newsletter.test.tsx` | Cover disconnected-state form semantics and submit prevention. |
| `tests/vitest/ui/newsletter-editor-wave.test.tsx` | Cover disconnected-state guidance and runtime summary. |

## Implementation Pseudocode

```tsx
function canUseNewsletterRuntime(state: NewsletterResolvedState): boolean {
  return state.submissionMode === "forms-runtime" && state.submitReady === true;
}

function handleNewsletterSubmit(event: FormEvent<HTMLFormElement>, state: NewsletterResolvedState) {
  if (!canUseNewsletterRuntime(state)) {
    event.preventDefault();
    return;
  }
}

function resolveSubmitButtonProps(state: NewsletterResolvedState) {
  if (!canUseNewsletterRuntime(state)) {
    return { type: "button" as const, disabled: true, "aria-disabled": true };
  }
  return { type: "submit" as const, disabled: false };
}
```

## Regression Test Shape

- Enter in the email field does not change the URL or submit when disconnected.
- Disconnected state renders truthful disabled semantics and copy.
- Bound runtime state still renders a normal submit path.

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
- Connected forms-runtime behavior remains intact.

