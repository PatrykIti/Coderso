# TASK-294: Footer Market Utility Expansion

# FileName: TASK-294_Footer_Market_Utility_Expansion.md

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

## Sub-Tasks

- [ ] Decide whether newsletter belongs in Footer as slot composition,
  Footer-owned config, or not at all.
- [ ] If newsletter is supported, route submission through the existing
  newsletter/form security contract or a named future public-write task; do not
  add inline secret-bearing config to Footer data.
- [ ] Decide whether address/contact information should be Footer-owned fields
  or composed from existing widgets/slots.
- [ ] Define back-to-top behavior only if the scroll/runtime contract is
  explicit, reduced-motion safe, and does not invent a shell-global side effect.
- [ ] Add focused tests/docs/report updates for whichever utilities are approved.

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
