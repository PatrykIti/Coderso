# TASK-335: Shared Avatar Contextual Alt and Media Accessibility Residual

# FileName: TASK-335_Shared_Avatar_Contextual_Alt_and_Media_Accessibility_Residual.md

**Priority:** High
**Category:** Widgets + Accessibility + Media
**Estimated Effort:** Medium
**Dependencies:** TASK-256-06-03, TASK-290
**Status:** To Do

---

## Overview

Reopen the shared avatar accessibility/media residual because Testimonials still
renders avatar images with non-contextual alt text even though the shared media
follow-up family was previously marked complete.

The current runtime keeps `loading="lazy"`, but the contextual avatar alt
contract from the original report is not actually closed.

## Drift Evidence

- `core/widgets/core/testimonials.tsx` - avatar images still render with
  `alt={author}`.
- `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md` - BF-05 and A4/A5 remain
  shared residuals after the `TASK-290` transfer onto `feature/corrections`.
- `tests/vitest/widgets/testimonials.test.tsx` now proves lazy-loading remains
  present, but contextual alt semantics are still unresolved.

## Scope Boundary

In scope:

- Decide the shared contextual alt contract for avatar images in Testimonials
  and any equivalent widget avatar surfaces covered by the same accessibility
  owner.
- Add focused test coverage for the final alt/lazy-loading contract.
- Correct report evidence that currently overclaims the residual as fixed.

Out of scope:

- Testimonials-only avatar authoring UX already owned by `TASK-290-03`.
- New media-picker capabilities.
- Generic image delivery or CDN work.

## Sub-Tasks

- [ ] Define the shared contextual alt rule for avatar images.
- [ ] Update the Testimonials runtime to follow the shared rule once approved.
- [ ] Add focused runtime coverage for the alt and lazy-loading contract.
- [ ] Refresh any report rows that currently claim contextual alt behavior is
  already fixed.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/testimonials.tsx` | Apply the shared contextual avatar alt rule. |
| `tests/vitest/widgets/testimonials.test.tsx` | Add assertions for the final lazy-loading and alt contract. |
| `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md` | Move BF-05 and A4/A5 to the truthful shared owner until implementation lands. |

## Implementation Pseudocode

```tsx
function resolveAvatarAlt(author: string, role?: string, sourceLabel?: string) {
  return [author, role, sourceLabel].filter(Boolean).join(", ");
}

<img alt={resolveAvatarAlt(item.author, item.role, item.sourceLabel)} loading="lazy" />
```

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged.
- Secret handling: unchanged.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/testimonials.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md` BF-05 and A4/A5
  ownership/evidence.

## Acceptance Criteria

- Avatar images follow one shared contextual alt rule instead of raw author-only
  fallback.
- Focused runtime tests prove both lazy-loading and contextual alt semantics.
- Shared closure docs no longer overclaim BF-05 and A4/A5 before the owner
  lands.
