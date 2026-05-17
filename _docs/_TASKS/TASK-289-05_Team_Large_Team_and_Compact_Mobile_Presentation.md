# TASK-289-05: Team Large Team and Compact Mobile Presentation

# FileName: TASK-289-05_Team_Large_Team_and_Compact_Mobile_Presentation.md

**Priority:** Low
**Category:** Widgets + Team + Runtime Render + Responsive UX
**Estimated Effort:** Large
**Dependencies:** TASK-289, TASK-289-01, TASK-289-04, TASK-256-04, TASK-256-06-04
**Status:** To Do

---

## Overview

Decide and implement bounded Team presentation options for larger teams and
compact-list mobile density.

This leaf is lower priority because the current widget has a documented
`teamMemberMax = 12` bound and the report does not prove runtime failure. It
owns either a small product expansion such as `load more`/pagination and mobile
bio visibility, or a documented no-support decision if the product should keep
Team sections intentionally limited.

## Source Findings

- `REPORT_TEAM_WIDGET.md:314-316` - BF-11 notes no pagination or load-more for
  teams larger than 12.
- `REPORT_TEAM_WIDGET.md:322-324` - BF-13 notes compact-list mobile density and
  possible mobile bio hiding.
- `REPORT_TEAM_WIDGET.md:14-19` - current widget type, bounds, and owner files.

## Sub-Tasks

- [ ] Decide whether Team v1 should keep the 12-member hard limit or add a
  bounded presentation pattern for more profiles.
- [ ] If expanding, add a schema-owned display limit and public `show more`
  interaction with reduced-motion/accessibility safeguards.
- [ ] If not expanding, update docs/report closure with the product reason and
  preserve validator coverage for the max-12 contract.
- [ ] Add compact-list mobile bio visibility controls only if the current
  responsive layout remains too dense after TASK-289-04 presentation controls.
- [ ] Preserve admin canvas and public frontend parity for any display-density
  decisions.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/team.tsx` | Add display-limit/mobile-density fields and renderer behavior if expansion is selected, or preserve max-12 contract. |
| `core/admin/ui/widgets/editors/TeamEditors.tsx` | Add bounded controls and explanatory diagnostics if expansion is selected. |
| `tests/vitest/widgets/team.test.tsx` | Cover max-12/no-support policy or load-more/mobile-density rendering. |
| `tests/vitest/ui/team-editor-wave.test.tsx` | Cover any new display-limit/mobile-density editor controls. |
| `tests/unit/widgets/validator.test.ts` | Cover schema changes or unchanged max-bound enforcement. |
| `_docs/_WIDGETS/TEAM.md` | Document the chosen larger-team and compact-mobile behavior. |
| `_docs/PLAYWRIGHT/REPORT_TEAM_WIDGET.md` | Mark BF-11/BF-13 fixed or deferred with a product reason. |

## Implementation Pseudocode

```tsx
type TeamDisplay = {
  initialVisibleCount?: 3 | 6 | 9 | 12;
  compactMobileBio?: "show" | "hide";
};

function resolveVisibleMembers(members: TeamMember[], display: TeamDisplay, expanded: boolean) {
  const initialCount = normalizeTeamInitialVisibleCount(display.initialVisibleCount);
  return expanded ? members : members.slice(0, initialCount);
}

function TeamShowMoreButton({ hiddenCount, onToggle }) {
  if (hiddenCount <= 0) return null;
  return <button type="button" aria-expanded={expanded}>Show {hiddenCount} more</button>;
}
```

Data flow:

- Keep `members` bounded unless the product decision explicitly changes the
  schema maximum and validator tests.
- If a public `show more` interaction is added, keep all state per widget
  instance and do not depend on global IDs.
- Use data attributes only for deterministic test evidence, not for storing
  private profile data.

Error handling:

- Invalid display limits normalize to the existing full-render behavior.
- If JavaScript is unavailable, the public runtime should still show a useful
  deterministic member list.
- Mobile bio hiding must keep member names and roles accessible and must not
  remove content needed for screen readers unless an accessible alternative is
  provided.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: new display fields must be schema-bound enums or
  clamped numeric values.
- Anti-abuse: no raw HTML, scripts, unbounded class names, or secret-bearing
  payloads in Team display fields.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/team.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/team-editor-wave.test.tsx` if editor
  controls are added.
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if shared
  renderer output changes.
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/TEAM.md`
- `_docs/PLAYWRIGHT/REPORT_TEAM_WIDGET.md`
- `_docs/WIDGET_PACK_MATRIX.md` only if pack readiness changes

## Acceptance Criteria

- The Team large-list behavior is explicitly implemented or explicitly deferred
  with a product reason.
- Compact-list mobile density is controlled or documented as intentionally
  unchanged.
- Admin canvas and public runtime remain consistent.
