# TASK-252-07-09: Newsletter Fields Consent Copy and States

# FileName: TASK-252-07-09_Newsletter_Fields_Consent_Copy_and_States.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime + Security
**Estimated Effort:** Large
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-07
**Status:** To Do

---

## Overview

Expand newsletter field visibility, consent copy, submit copy, and
success/error/loading copy while keeping provider references and audience
secrets backend-owned.

This is an execution leaf under `TASK-252-07`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/newsletter/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/newsletter/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/newsletter/MATRIX.md` to bind the final option set to research decisions.
- Keep editor clarity separate from runtime ownership: source/display choices may be editable, but data resolution stays in existing service/runtime owners.
- Use shared TASK-252 editor controls and metadata without moving runtime-kernel behavior into Vitest-only code.
- Preserve cache, permission, public-write, and provider-secret boundaries for this widget family.

## Research Decisions

- Keep: only rows marked `Keep` in `_docs/_WIDGETS/tmp/newsletter/MATRIX.md`; for this leaf, start from the current owner fields `title`, `description`, `placeholder`, `consent`, `submit`, and `style`, then add only the schema fields that the matrix explicitly keeps.
- Preserve existing `integration` payloads only as backend-owned references;
  this leaf does not add provider-reference editor controls, provider config,
  or audience-secret fields.
- Adapt: rows marked `Adapt` are conditional scope, not required scope.
  Additional fields and provider references require a backend-owned integration;
  implement only when schema/defaults/normalizer/render/editor/tests move
  together.
- Reject: arbitrary operators, client-owned provider/index config, raw scripts, and privileged settings in widget data.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `newsletter`.
- `Visual`: `Fields`, `Consent`, `Copy states`, `Layout`.
- `Advanced`: `Public-write diagnostics`, `Backend integration boundary`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/newsletter.tsx`
- `core/admin/ui/widgets/editors/NewsletterEditors.tsx`
- Bun-owned route/security suites when public endpoint behavior changes.
- `tests/unit/widgets/validator.test.ts` when schema validation changes.
- `tests/vitest/widgets/newsletter.test.tsx`
- `tests/vitest/ui/newsletter-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/NEWSLETTER.md`
- `_docs/_WIDGETS/tmp/newsletter/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-07-09_Newsletter_Fields_Consent_Copy_and_States.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
type NewsletterStateCopy = {
  loadingMessage: string;
  successMessage: string;
  errorMessage: string;
};

function normalizeNewsletterData(data: NewsletterData): NewsletterData {
  return {
    title: normalizeNewsletterTitle(data.title),
    description: normalizeNewsletterDescription(data.description),
    placeholder: normalizeNewsletterPlaceholder(data.placeholder),
    consent: normalizeNewsletterConsent(data.consent),
    submit: normalizeNewsletterSubmit(data.submit),
    stateCopy: normalizeNewsletterStateCopy({
      ...data.stateCopy,
      successMessage: data.submit?.successMessage,
    }),
    integration: preserveExistingNewsletterIntegration(data.integration),
    style: normalizeNewsletterStyle(data.style),
  };
}

function NewsletterVisualEditor(props: WidgetEditorProps<NewsletterData>) {
  const value = props.value;
  return (
    <WidgetEditorSection id="newsletter.newsletter" title="Copy and consent">
      <WidgetControlRow id="newsletter.placeholder" label="Email placeholder" data-widget-control="newsletter.placeholder">
        <Input value={value.placeholder ?? ""} onChange={handleControlChange} />
      </WidgetControlRow>
      <WidgetControlRow id="newsletter.stateCopy.errorMessage" label="Error message" data-widget-control="newsletter.stateCopy.errorMessage">
        <Input value={value.stateCopy?.errorMessage ?? ""} onChange={handleControlChange} />
      </WidgetControlRow>
      <WidgetControlRow id="newsletter.stateCopy.loadingMessage" label="Loading message" data-widget-control="newsletter.stateCopy.loadingMessage">
        <Input value={value.stateCopy?.loadingMessage ?? ""} onChange={handleControlChange} />
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/newsletter/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/newsletter.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Add explicit schema/default/render/editor ownership for loading, success, and
  provider-error copy; keep provider secrets/config backend-only and map known
  runtime errors to `stateCopy.errorMessage`.
- Refactor `core/admin/ui/widgets/editors/NewsletterEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Do not expose provider-reference or integration-config editor controls in
  this leaf; provider/audience ownership remains backend-only.
- Remove existing integration mode/action URL/webhook editor controls from
  `NewsletterEditors.tsx` or convert them to non-editable diagnostics; legacy
  `integration` payloads may render safely but must not become new provider
  configuration UI.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `newsletter` output is public page/runtime output.
- Auth model:
  - no new endpoint is introduced by this leaf;
  - edits persist through existing authenticated admin page/template save flows.
- RBAC:
  - unchanged page/template/widget-template write permissions.
- CSRF:
  - unchanged admin write CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - changed `newsletter` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/newsletter.tsx`.
- Anti-abuse:
  - current `newsletter` action-url mode posts to an external form target and
    must not be documented as a Coderso nonce/HMAC-protected endpoint
  - if this leaf adds a Coderso-owned newsletter submission endpoint, the route
    must use nonce + signature/HMAC via
    `core/services/forms/submissionNonce.ts`, optional reCAPTCHA policy,
    existing public rate-limit buckets, strict reject-unknown validation, and
    `tests/security/codersoSecurityGate.test.ts`
  - audience/provider secrets must not be persisted in widget data/browser cache

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema validation, slot normalization, or widget validation changes.
- `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/newsletter-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/NEWSLETTER.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-07-09_Newsletter_Fields_Consent_Copy_and_States.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `newsletter` editor exposes research-backed source/display/state controls with stable metadata.
- Runtime/data source ownership remains in the existing backend or widget owner seam.
- Public-write/provider-secret boundaries are explicitly preserved in tests/docs when touched.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
