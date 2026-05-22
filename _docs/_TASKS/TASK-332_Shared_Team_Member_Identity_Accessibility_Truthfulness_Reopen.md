# TASK-332: Shared Team Member Identity Accessibility Truthfulness Reopen

# FileName: TASK-332_Shared_Team_Member_Identity_Accessibility_Truthfulness_Reopen.md

**Priority:** Medium
**Category:** Widgets + Team + Accessibility + Runtime Render + QA
**Estimated Effort:** Medium
**Dependencies:** TASK-256-06-04, TASK-289, TASK-289-06
**Status:** To Do

---

## Overview

Reopen the remaining shared Team member-identity accessibility drift that was
found during the TASK-289 closure audit.

The current Team runtime now owns the shared section label, heading baseline,
safe-link output, spotlight truthfulness, and lazy avatar loading baseline, but
it still does not close the specific member-card semantics that the historical
report grouped under `BUG-07`, `A3`, `A6`, `A8`, and the related `BF-12`
wording preference.

This task is intentionally shared follow-up scope, not a new Team-local product
leaf. It owns the truthful decision and implementation for member-card
accessible naming, initials fallback semantics, and richer avatar alt-context
behavior without reopening unrelated TASK-289 product controls.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_TEAM_WIDGET.md` - historical `BUG-07`, `A3`, `A6`,
  `A8`, and `BF-12` findings.
- `_docs/_TASKS/TASK-289_Team_Widget_Playwright_Product_Followups.md` -
  current TASK-289 exclusion matrix and closure routing.
- `core/widgets/core/team.tsx` - current `Avatar` and `MemberCard` runtime
  behavior.
- `tests/vitest/widgets/team.test.tsx` - current Team runtime regression
  coverage.

## Sub-Tasks

- [ ] Decide the bounded Team member-card accessible-name contract: article
  label, labelled-by flow, or an equivalent deterministic semantic.
- [ ] Decide the final avatar alt-text contract for real photos versus initials
  fallback, including whether Team should use a richer `Photo of ...` pattern.
- [ ] Implement the chosen semantics in `core/widgets/core/team.tsx` without
  widening into unrelated Team product scope.
- [ ] Add focused Team runtime tests for member-card accessible naming and
  avatar alt/fallback semantics.
- [ ] Update Team report/docs/board evidence after the shared accessibility
  contract is actually landed.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/team.tsx` | Implement the shared Team member identity accessibility contract. |
| `tests/vitest/widgets/team.test.tsx` | Add focused runtime regressions for article naming and avatar alt/fallback semantics. |
| `_docs/PLAYWRIGHT/REPORT_TEAM_WIDGET.md` | Replace the current routed/deferred status rows with final shared evidence once implemented. |
| `_docs/_WIDGETS/TEAM.md` | Document the final Team avatar/member-card accessibility behavior if the contract changes. |
| `_docs/_TASKS/README.md` | Keep the board and counts synchronized. |

## Implementation Pseudocode

```tsx
function MemberCard(...) {
  const accessibleNameId = `team-member-${member.id}-name`;
  return (
    <article aria-labelledby={accessibleNameId}>
      <Avatar name={name} ... />
      <h4 id={accessibleNameId}>{name}</h4>
    </article>
  );
}

function Avatar({ name, photo }) {
  if (photo) {
    return <img alt={`Photo of ${name}`} ... />;
  }
  return <span aria-hidden="true">{initial}</span>;
}
```

Data flow:

- Preserve the current safe-photo resolution path.
- Add deterministic member-card naming that works for both photo and initials
  fallback paths.
- Keep the change bounded to Team runtime semantics and tests.

Error handling:

- Invalid or missing photos must continue to fail closed to initials.
- New semantics must not introduce duplicate ids or require editor-only state.

Regression Test Shape:

- `tests/vitest/widgets/team.test.tsx`
  - assert article naming semantics for normal cards and spotlight cards.
  - assert final alt/fallback contract for real photos and initials fallback.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged widget schema unless the chosen
  accessibility contract requires a persisted field, which should be avoided.
- Anti-abuse: no raw HTML/script, unsafe URLs, or secret-bearing payloads.
- Secret handling: unchanged; no media tokens or private profile data in the
  public Team runtime.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/team.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if Team
  runtime output markers or rendering structure change.
- `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_TEAM_WIDGET.md`
- `_docs/_WIDGETS/TEAM.md` if the final runtime contract changes
- `_docs/_TASKS/README.md`

## Acceptance Criteria

- Team member cards expose the agreed accessible-name contract truthfully.
- Avatar alt/fallback semantics are explicit, tested, and reflected in docs.
- TASK-289 closure docs no longer overstate shared Team accessibility coverage.
