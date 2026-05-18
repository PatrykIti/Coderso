# TASK-258-05: Style, Variants, and Advanced Diagnostics

# FileName: TASK-258-05_Style_Variants_and_Advanced_Diagnostics.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Rendering + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-258, TASK-256-02, TASK-258-02, TASK-258-04
**Status:** Done (2026-05-18)

---

## Overview

Finish Appointment Form visual/product surface gaps that are not shared
TASK-256 implementation work.

This leaf covers:

- UX-05 and BF-16: resolved nonce is editable and lacks runtime-only warning.
- UX-06: runtime error diagnostic lacks context.
- BF-01: only one variant exists.
- BF-03 and A6: submit text color is hardcoded and can fail contrast.

`UX-04` now routes through the existing shared `TASK-256-02` clearable-style
owner. This leaf may consume the landed shared control later, but it must not
implement a widget-local inheritance-state workaround.

## Files to Change

- `core/widgets/core/appointmentForm.tsx`
- `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx`
- `core/widgets/core/index.ts` only if registry metadata or variant typing needs
  to expose new variants.
- `tests/vitest/widgets/appointmentForm.test.tsx`
- `tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `tests/vitest/widgets/styleNoneTokens.test.tsx` only if shared style token
  adjacency changes.
- `_docs/_WIDGETS/APPOINTMENT_FORM.md`
- `_docs/WIDGET_PACK_MATRIX.md` only if booking pack readiness changes.

## Sub-Tasks

- [x] Add Appointment Form variants: `default`, `compact`, `inline`,
  `sidebar`, and `card-summary`.
- [x] Keep variant behavior schema-owned and backward compatible for existing
  `default` payloads.
- [x] Add `style.submitTextColor` and render it through the same clearable style
  rules as other Appointment Form surface fields.
- [x] Convert resolved nonce and runtime error controls into read-only
  diagnostics with explanatory copy.
- [x] Add runtime diagnostic copy that explains who sets nonce/error values and
  what the admin can do when a resolver warning appears.
- [x] Leave custom submission endpoint policy unchanged in this leaf. If endpoint
  editability is later judged unsafe, create a separate public-write/security
  task with migration and backward-compatibility notes.
- [x] Do not implement a `multi-step` variant in this leaf. It remains future
  Appointment Form product scope outside the current report-closure contract; if
  product later wants it, create a separate named task before implementation.

## Implementation Pseudocode

```tsx
export type AppointmentFormVariantId =
  | "default"
  | "compact"
  | "inline"
  | "sidebar"
  | "card-summary";

type AppointmentFormStyle = {
  frameBackground?: string;
  frameBorderColor?: string;
  summaryBackground?: string;
  summaryBorderColor?: string;
  submitBackground?: string;
  submitTextColor?: string;
};

function resolveAppointmentFormVariantClasses(variant: AppointmentFormVariantId) {
  switch (variant) {
    case "compact":
      return { root: "space-y-3 p-4", grid: "space-y-2" };
    case "inline":
      return { root: "border-0 bg-transparent p-0", grid: "grid gap-3 md:grid-cols-2" };
    case "sidebar":
      return { root: "grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]" };
    case "card-summary":
      return { root: "grid gap-4", summaryPlacement: "card" };
    default:
      return { root: "space-y-4" };
  }
}

function ReadonlyDiagnosticField({ label, value, description }: Props) {
  return (
    <div data-widget-control={`appointment-form.diagnostics.${label}`}>
      <p>{label}</p>
      <code>{value || "Not injected in this preview"}</code>
      <p>{description}</p>
    </div>
  );
}
```

Style status:

Shared configured-vs-default state indicators are owned by `TASK-256-02`.

Error handling:

- If an old persisted variant is unknown, render `default` and normalize back to
  `default` on edit.
- If `style.submitTextColor` is missing, keep current visual output by using the
  existing theme background text color fallback.
- If `resolved.submissionNonce` exists in old widget data, display it read-only
  but do not let the editor write it.
- If `submissionEndpoint` exists in old widget data, keep the existing behavior
  in this leaf. Endpoint ownership is a public-write/security migration concern,
  not a style or diagnostics repair.

## Security Contract

No route is added. This leaf reduces author control over runtime-only security
payloads.

- Endpoint visibility: unchanged public booking write endpoint.
- Auth model: unchanged. Admin editors require the existing admin session, public
  booking mode keeps the booking access evaluator, and internal booking mode
  still requires admin session or API key scope.
- RBAC: unchanged. This leaf does not add, remove, or expand submission endpoint
  controls.
- CSRF: unchanged for admin editing; public reservations keep the existing
  booking submission nonce/signature check when required.
- Rate-limit bucket: unchanged `public_write`.
- Reject-unknown validation: new variants and style fields must be schema-owned
  and strict.
- Anti-abuse: nonce remains server-injected read-only diagnostics; variant,
  style, and diagnostic changes must not bypass booking nonce/signature,
  reCAPTCHA, internal session/API-key policy, or the current endpoint behavior.
- Secret handling: diagnostic UI must not show secrets. Submission nonce display
  is allowed only because it is already a public hidden field in rendered form
  markup; do not show nonce secret material or provider keys.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/appointmentForm.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  shared style token or clear adjacency changes.
- `bun test tests/unit/widgets/validator.test.ts` when variant/schema validation
  changes.

## Documentation Updates Required

- `_docs/_WIDGETS/APPOINTMENT_FORM.md`
- `_docs/PLAYWRIGHT/REPORT_APPOINTMENT_FORM_WIDGET.md` fixed evidence for
  UX-05, UX-06, BF-01, BF-03, BF-16, and A6, plus explicit shared deferral for
  `UX-04`.
- `_docs/_TASKS/TASK-256-02_Clear_None_Token_and_Design_Token_Controls.md` if
  `UX-04` defers to or completes through the shared control state owner.
- `_docs/WIDGET_PACK_MATRIX.md` if variant readiness affects the booking pack.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` on completion.

## Acceptance Criteria

- Appointment Form exposes `default`, `compact`, `inline`, `sidebar`, and
  `card-summary` variants with stable render output. Conversational or
  multi-step appointment intake is explicitly out of the current TASK-258
  closure scope and must be handled by a separate named future task if it is
  ever requested.
- Submit text color is configurable and can be cleared without serializing
  empty or transparent sentinels.
- Runtime nonce and runtime error values are read-only diagnostics. Submission
  endpoint editability is unchanged by this leaf.
- Existing default payloads render backward compatibly.
- If `UX-04` is not landed in the same wave, the closure matrix points it to
  `TASK-256-02` explicitly rather than claiming a widget-local fix.
