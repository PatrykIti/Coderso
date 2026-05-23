# TASK-336-10: Form Embed Mode Ownership

# FileName: TASK-336-10_Form_Embed_Mode_Ownership.md

**Priority:** High
**Category:** Widgets + Forms + Admin UI + Security
**Estimated Effort:** Large
**Dependencies:** TASK-336-01, TASK-336-02, TASK-336-03
**Status:** To Do

---

## Overview

Separate Form Embed setup, presentation, and runtime/security diagnostics while
preserving the existing public form security contract.

Form Embed is a P1 widget because form selection, copy, visual surface, and
runtime diagnostics are easy to duplicate between Visual and Advanced. It also
touches public write behavior indirectly, so the editor cleanup must not weaken
nonce, CSRF, captcha, rate-limit, or validation rules.

## Ownership Decision

- `Wizard` owns form selection and first-time embed setup.
- `Visual` owns public embed copy, labels/help text where widget-owned, width,
  surface, spacing, and presentation around the form.
- `Advanced` owns read-only resolved form id, endpoint/security summary,
  submission mode diagnostics, and runtime compatibility notes.

Evidence caveat: the re-audit finding is source-backed, not a completed
38-widget browser traversal. TASK-336-03 admin smoke must confirm this widget
before the task can move to Done.

## Sub-Tasks

- [ ] Audit current Form Embed editor paths and public form dependencies.
- [ ] Add or update `form-embed` `editorContract` metadata.
- [ ] Move form selection/setup into Wizard.
- [ ] Move public-facing wrapper copy/surface into Visual.
- [ ] Convert Advanced form/source/style duplicates into read-only diagnostics.
- [ ] Preserve all existing public write protections.
- [ ] Add Vitest UI tests for mode ownership.
- [ ] Publish a public test fixture page for `form-embed` or explicitly defer
  it with a follow-up task before TASK-336-17 closure.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/formEmbed.tsx` | Add/update `editorContract`; preserve render contract and security assumptions. |
| `core/admin/ui/widgets/editors/FormEmbedEditors.tsx` | Split mode ownership and use shared metadata. |
| `tests/vitest/widgets/formEmbed.test.tsx` | Cover schema/runtime/security-adjacent behavior if touched. |
| `tests/vitest/ui/form-embed-editor-wave.test.tsx` | Cover mode ownership and read-only Advanced diagnostics. |
| `_docs/_WIDGETS/FORM_EMBED.md` | Document final editor ownership and security notes. |
| `_docs/SECURITY_SPEC.md` | Update only if the form security contract changes, which should be avoided here. |

## Implementation Pseudocode

```tsx
function FormEmbedAdvancedEditor({ value }: WidgetEditorProps<FormEmbedData>) {
  const securitySummary = resolveFormEmbedSecuritySummary(value);
  return (
    <WidgetEditorModeRoot mode="advanced" widgetType="form-embed">
      <WidgetEditorSection mode="advanced" sectionId="form-security" role="diagnostics" title="Submission security">
        <ReadonlyWidgetSummaryRow label="Form id" value={securitySummary.formId} />
        <ReadonlyWidgetSummaryRow label="Nonce" value={securitySummary.noncePolicy} />
        <ReadonlyWidgetSummaryRow label="Submission protection" value="Rate limited" />
      </WidgetEditorSection>
    </WidgetEditorModeRoot>
  );
}
```

Data flow:

- Wizard chooses the form.
- Visual edits only the widget-owned wrapper/presentation.
- Advanced displays resolved form/security diagnostics as read-only.
- Public submissions continue through the existing form route/security pipeline.

Error handling:

- Missing form id should show setup guidance.
- Deleted/unavailable forms should show an admin-only warning and safe public
  fallback already supported by the widget.
- Advanced diagnostics must not expose private fields, tokens, secrets, or raw
  nonce values.

## Security Contract

No API routes are added, and public form write behavior must not change.

- Endpoint visibility: unchanged existing public/internal form endpoints only.
- Auth/RBAC: admin editor remains session/RBAC protected.
- CSRF: unchanged for admin writes.
- Public write anti-abuse: preserve existing nonce/captcha/rate-limit/HMAC
  policy used by forms.
- Reject-unknown validation: preserve strict form submission and widget schema
  validation.
- Secret handling: no secrets, provider keys, nonce values, or hidden form
  internals in Advanced diagnostics, screenshots, local storage, or reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/form-embed-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/formEmbed.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts`
- Relevant existing form security/runtime suites if any route/security code is
  touched.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Playwright CLI smoke for `form-embed` admin modes and public fixture if
  available.

Regression-test shape:

- Wizard owns form selection.
- Visual owns wrapper presentation.
- Advanced shows read-only security/runtime diagnostics.
- No public write security behavior changes.

## Documentation Updates Required

- Update Form Embed widget docs.
- Append a dated TASK-336-10 status note to the Playwright re-audit report or
  leave source evidence stable and link the final superseding report from
  TASK-336-17.
- Update security docs only if the task unexpectedly changes security behavior.
- Add changelog/index updates when this leaf is marked Done, unless the family
  has an explicitly approved single closure changelog policy.
- Keep `_docs/_TASKS/README.md` synchronized when status changes.

## Acceptance Criteria

- Form Embed mode ownership is clear and test-backed.
- Advanced does not duplicate form selection or visual wrapper controls.
- Existing public form security contract remains intact.
