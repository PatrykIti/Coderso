# TASK-309-01: Footer Newsletter Composition and Submission Contract

# FileName: TASK-309-01_Footer_Newsletter_Composition_and_Submission_Contract.md

**Priority:** Medium
**Category:** Widgets + Footer + Public Write Security
**Estimated Effort:** Large
**Dependencies:** TASK-309, TASK-268
**Status:** To Do

---

## Overview

Define the exact Footer newsletter contract without smuggling a second
newsletter system into Footer JSON.

This leaf must decide and implement one truthful path:

- explicit Footer composition around the existing Newsletter / Forms runtime
  contract, or
- an explicit reject decision with user-facing docs/report evidence.

It must not introduce inline provider secrets, duplicate public-write routes, or
an unbounded embed surface.

## Scope Boundary

This leaf owns:

- whether newsletter inside Footer is slot-composed, Footer-owned, or rejected;
- any schema/editor/runtime work needed for the approved Footer-only container
  behavior;
- docs/report updates for the final decision.

This leaf does not own:

- a new submission endpoint;
- provider configuration beyond the existing Newsletter / Forms contracts;
- generic Footer address/contact or back-to-top behavior.

## Sub-Tasks

- [ ] Decide whether Footer newsletter is composition-first, Footer-owned, or
  rejected.
- [ ] If supported, keep submission behavior on the existing hardened
  Newsletter / Forms route contract.
- [ ] Add focused editor/runtime/docs coverage for the chosen policy.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/footer.tsx` | Add only the approved newsletter slot/container behavior. |
| `core/admin/ui/widgets/editors/FooterEditors.tsx` | Add only the approved newsletter controls or guidance copy. |
| `tests/vitest/widgets/footer.test.tsx` | Cover the approved runtime behavior or explicit non-support path. |
| `tests/vitest/ui/footer-editor-wave.test.tsx` | Cover editor guidance and any approved config surface. |
| `_docs/_WIDGETS/FOOTER.md` | Document the final newsletter decision and explicit non-goals. |
| `_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md` | Update newsletter deferred/fixed evidence. |

## Implementation Pseudocode

```tsx
type FooterNewsletterMode = "none" | "slot-composition";

function resolveFooterNewsletterMode(data: FooterData): FooterNewsletterMode {
  return data.newsletter?.enabled ? "slot-composition" : "none";
}

function renderFooterNewsletter(mode: FooterNewsletterMode, slots: Record<string, WidgetBlock[]>) {
  if (mode !== "slot-composition") return null;
  return renderSlotBlocks(slots.newsletter ?? []);
}
```

Error handling:

- If newsletter is rejected, docs and report must say that explicitly.
- If newsletter is supported, Footer may compose existing hardened widgets but
  must not own secrets, provider config, or a second submission route.
- Missing newsletter slot content must fail softly with editor guidance, not a
  broken empty runtime wrapper.

## Security Contract

This leaf may affect public-write composition, but it must not create a new
public endpoint.

- Endpoint visibility: reuse existing Newsletter / Forms public submission
  routes only.
- Auth/RBAC/CSRF/rate limit: unchanged from the reused backend-owned contract.
- Reject-unknown validation: any new Footer config must be schema-owned and
  allowlisted.
- Anti-abuse: no secrets, CAPTCHA keys, or provider credentials in Footer JSON
  or browser-visible diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/footer.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/footer-editor-wave.test.tsx`
- relevant Newsletter / Forms route/security suites only if the reused backend
  contract changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/FOOTER.md`
- `_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

- Footer newsletter is either supported through an explicit composition
  contract or explicitly rejected with a documented reason.
- No Footer newsletter path introduces duplicate public-write behavior or
  browser-visible secrets.
- Editor, runtime, tests, and docs agree on the final policy.
