# TASK-309: Footer Market Utility Expansion

# FileName: TASK-309_Footer_Market_Utility_Expansion.md

**Priority:** Low
**Category:** Widgets + Footer + Product Expansion
**Estimated Effort:** Very Large
**Dependencies:** TASK-268
**Status:** To Do

---

## Overview

Evaluate and implement the market-style Footer utility backlog that TASK-268
explicitly deferred: newsletter area, address/contact presentation, and
back-to-top behavior.

TASK-268 fixes the current Footer contract and intentionally stops short of
expanding the widget into a larger marketing shell. The Playwright report still
mentions footer newsletter, address/contact blocks, and back-to-top patterns as
possible future product surface. This task is the future owner for those rows so
the TASK-268 closure can reference a real task id instead of generic backlog
prose.

## Scope Boundary

This task owns:

- Product decisions for newsletter composition, address/contact presentation,
  and back-to-top behavior in Footer.
- Footer schema/editor/runtime updates only for approved utility areas.
- Composition with existing newsletter/contact widgets where possible instead of
  inventing weaker duplicate flows.
- Documentation, report, and validation updates once any utility surface lands.

This task does not own:

- A new public write endpoint without its own approved route/security task.
- Replacing existing Newsletter or Contact widget contracts.
- Generic site-shell scroll behavior outside the approved Footer scope.

This umbrella is not implementation-ready by itself. Execute it through the
physical child tasks below so newsletter, address/contact, and back-to-top
scope can land independently without re-opening the whole Footer surface at
once.

## Sub-Tasks

- [ ] TASK-309-01: Footer Newsletter Composition and Submission Contract
- [ ] TASK-309-02: Footer Address and Contact Utility Surface
- [ ] TASK-309-03: Footer Back-to-Top Runtime Policy

## Implementation Order

1. Land `TASK-309-01` first because newsletter is the highest-risk utility from
   a public-write and composition standpoint.
2. Land `TASK-309-02` next because address/contact fields are read-only and can
   extend the settled Footer layout contract safely.
3. Land `TASK-309-03` last because back-to-top behavior depends on the final
   lower-strip/footer action layout and reduced-motion policy.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/footer.tsx` | Add only approved utility runtime behavior or slot wiring. |
| `core/admin/ui/widgets/editors/FooterEditors.tsx` | Add approved utility controls with clear ownership. |
| `tests/vitest/widgets/footer.test.tsx` | Cover utility runtime behavior that lands. |
| `tests/vitest/ui/footer-editor-wave.test.tsx` | Cover approved utility controls and safety copy. |
| `_docs/_WIDGETS/FOOTER.md` | Document approved utility surfaces and explicit non-goals. |
| `_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md` | Update deferred rows when this task lands. |

## Security Contract

No API routes are added by default.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged unless a future
  child task explicitly adds an approved route.
- Reject-unknown validation: any new utility config must be schema-owned and
  reject unknown keys.
- Anti-abuse: newsletter or contact actions must reuse existing hardened
  widget/route contracts; no secrets or provider keys in Footer JSON.
- Secret handling: provider keys, CAPTCHA secrets, API scopes, and private URLs
  remain backend-owned and must not move into browser-visible Footer config.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/footer.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/footer-editor-wave.test.tsx`
- Route/security suites only if a future approved route task changes that
  contract
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/FOOTER.md`
- `_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when completed

## Acceptance Criteria

- Every approved Footer utility is implemented through an explicit product and
  security contract.
- Newsletter/contact/back-to-top behavior is either shipped truthfully or
  explicitly rejected with a documented reason.
- No Footer utility ships by smuggling new public-write behavior or secrets into
  widget data.
