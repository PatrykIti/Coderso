# TASK-309-03: Footer Back-to-Top Runtime Policy

# FileName: TASK-309-03_Footer_Back_to_Top_Runtime_Policy.md

**Priority:** Low
**Category:** Widgets + Footer + Accessibility + Runtime
**Estimated Effort:** Medium
**Dependencies:** TASK-309, TASK-268
**Status:** Done (2026-05-19)

---

## Overview

Define whether Footer should expose a built-in back-to-top action and, if so,
what the bounded runtime contract is.

This leaf covers only a Footer-scoped action with explicit reduced-motion-safe
behavior. It must not introduce a generic site-shell scroll manager.

## Scope Boundary

This leaf owns:

- the product decision for whether Footer ships a back-to-top action at all;
- bounded runtime behavior for the approved action;
- docs/report/test updates for the chosen policy.

This leaf does not own:

- global sticky shell behavior;
- unrelated scroll restoration contracts;
- newsletter or address/contact utilities.

## Sub-Tasks

- [x] Decide whether Footer ships a built-in back-to-top action or rejects it.
- [x] If approved, keep the runtime behavior reduced-motion safe and
  Footer-scoped.
- [x] Add focused runtime/editor/docs evidence for the final policy.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/footer.tsx` | Add only the approved back-to-top runtime output. |
| `core/admin/ui/widgets/editors/FooterEditors.tsx` | Add only the approved action controls or guidance copy. |
| `tests/vitest/widgets/footer.test.tsx` | Cover runtime markup and reduced-motion-safe behavior markers. |
| `tests/vitest/ui/footer-editor-wave.test.tsx` | Cover editor truthfulness for the approved policy. |
| `_docs/_WIDGETS/FOOTER.md` | Document the final back-to-top policy. |
| `_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md` | Update deferred/fixed back-to-top evidence. |

## Implementation Pseudocode

```tsx
type FooterBackToTop = {
  enabled?: boolean;
  label?: string;
};

function renderBackToTop(config: FooterBackToTop) {
  if (!config.enabled) return null;
  return (
    <a href="#top" data-footer-back-to-top="1">
      {config.label?.trim() || "Back to top"}
    </a>
  );
}
```

Error handling:

- If the action is rejected, docs and report must state that explicitly.
- If the action is approved, it must not depend on hidden JavaScript-only
  scrolling that ignores reduced-motion preferences.
- Empty labels must fall back deterministically.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: any new Footer action config must be schema-owned.
- Anti-abuse: no raw script injection or privileged shell-side effect.

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

- Footer back-to-top behavior is either shipped through a bounded,
  reduced-motion-safe contract or explicitly rejected with a documented reason.
- Runtime output and editor truthfulness match the chosen policy.
- No global shell behavior is introduced under the Footer umbrella.
