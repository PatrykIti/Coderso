# TASK-309-02: Footer Address and Contact Utility Surface

# FileName: TASK-309-02_Footer_Address_and_Contact_Utility_Surface.md

**Priority:** Low
**Category:** Widgets + Footer + Runtime Render + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-309, TASK-268
**Status:** To Do

---

## Overview

Define whether Footer should own lightweight address/contact presentation or
keep that information fully composed through existing widgets and slots.

This leaf covers only read-only contact/address presentation, safe href output,
and editor truthfulness. It must not create a second contact form surface.

## Scope Boundary

This leaf owns:

- bounded Footer-owned address/contact presentation fields if approved;
- safe mailto/tel/link rendering and editor validation for those fields;
- docs/report updates for the chosen read-only utility surface.

This leaf does not own:

- contact form submission;
- provider-backed contact integrations;
- newsletter or back-to-top behavior.

## Sub-Tasks

- [ ] Decide whether address/contact information is Footer-owned or composed.
- [ ] If Footer-owned, keep the field model bounded to read-only presentation.
- [ ] Add focused safe-href tests and editor guidance.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/footer.tsx` | Add only the approved read-only address/contact output. |
| `core/admin/ui/widgets/editors/FooterEditors.tsx` | Add the approved address/contact controls and validation copy. |
| `tests/vitest/widgets/footer.test.tsx` | Cover safe mailto/tel/runtime output for approved fields. |
| `tests/vitest/ui/footer-editor-wave.test.tsx` | Cover editor truthfulness and validation copy. |
| `_docs/_WIDGETS/FOOTER.md` | Document the approved address/contact contract. |
| `_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md` | Update deferred/fixed address/contact evidence. |

## Implementation Pseudocode

```tsx
type FooterContactInfo = {
  address?: string;
  phone?: string;
  email?: string;
};

function renderFooterContactInfo(info: FooterContactInfo) {
  return {
    address: info.address?.trim() || null,
    phoneHref: info.phone ? `tel:${normalizePhone(info.phone)}` : null,
    emailHref: info.email ? `mailto:${info.email}` : null,
  };
}
```

Error handling:

- Unsafe or malformed `mailto:` / `tel:` values must not render as active
  links.
- Empty read-only fields must not leave dead wrappers in runtime output.
- If the decision is composition-only, Footer editor copy must say that
  clearly instead of exposing dead fields.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: any new Footer fields must be schema-owned and
  allowlisted.
- Anti-abuse: no hidden form behavior, scripts, or secret-bearing config.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/footer.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/footer-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/FOOTER.md`
- `_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

- Footer address/contact behavior is either shipped as a bounded read-only
  utility surface or explicitly rejected in favor of composition.
- Runtime output keeps safe href semantics and no dead wrappers.
- Editor, runtime, report, and docs agree on the final contract.
