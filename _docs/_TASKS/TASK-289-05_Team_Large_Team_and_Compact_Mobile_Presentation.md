# TASK-289-05: Team Large Team and Compact Mobile Presentation

# FileName: TASK-289-05_Team_Large_Team_and_Compact_Mobile_Presentation.md

**Priority:** Low
**Category:** Widgets + Team + Runtime Render + Responsive UX
**Estimated Effort:** Large
**Dependencies:** TASK-289, TASK-289-01, TASK-289-04, TASK-256-04, TASK-256-06-04
**Status:** Done (2026-05-22)

---

## Overview

Decide whether to implement bounded Team presentation options for larger teams
and compact-list mobile density, then implement only the chosen product path.

This leaf is lower priority because the current widget has a documented
`teamMemberMax = 12` bound and the report does not prove runtime failure. It
owns either a small product expansion such as `show more`/pagination and mobile
bio visibility, or a documented no-support decision if the product should keep
Team sections intentionally limited. A no-support decision is acceptable when
the max-12 Team contract remains deliberate and is recorded in docs, report
evidence, and tests.

## Source Findings

- `REPORT_TEAM_WIDGET.md:314-316` - BF-11 notes no pagination or load-more for
  teams larger than 12.
- `REPORT_TEAM_WIDGET.md:322-324` - BF-13 notes compact-list mobile density and
  possible mobile bio hiding.
- `REPORT_TEAM_WIDGET.md:14-19` - current widget type, bounds, and owner files.

## Sub-Tasks

- [ ] Decide whether Team v1 should keep the 12-member hard limit or add a
  bounded presentation pattern for more profiles.
- [ ] If expanding, add a schema-owned display limit and static-runtime public
  `show more` interaction with reduced-motion/accessibility safeguards.
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

function renderTeamMemberList(members: TeamMember[], display: TeamDisplay) {
  const initialCount = normalizeTeamInitialVisibleCount(display.initialVisibleCount);
  const visibleMembers = members.slice(0, initialCount);
  const hiddenMembers = members.slice(initialCount);
  return { visibleMembers, hiddenMembers };
}

function TeamShowMoreButton({ hiddenCount, memberListId }) {
  if (hiddenCount <= 0) return null;
  return (
    <button
      type="button"
      data-team-show-more
      aria-expanded="false"
      aria-controls={memberListId}
    >
      Show {hiddenCount} more
    </button>
  );
}
```

Data flow:

- Keep `members` bounded unless the product decision explicitly changes the
  schema maximum and validator tests.
- If the product decision is no-support, do not add display fields or runtime
  interaction; keep max-12 schema/validator coverage and document the reason in
  `_docs/_WIDGETS/TEAM.md` and the report closure.
- If a public `show more` interaction is added, keep all state per widget
  instance and do not depend on global IDs. Follow the static runtime pattern
  used by `core/widgets/core/toggleBlock.tsx`: render a per-widget root marker,
  `data-team-show-more`/hidden-member markers, an inline script scoped to the
  current Team block, no global mutable state, and deterministic no-JS fallback.
- Use data attributes only for deterministic test evidence, not for storing
  private profile data.

Error handling:

- Invalid display limits normalize to the existing full-render behavior.
- If JavaScript is unavailable, the public runtime should still show a useful
  deterministic member list. If expansion is implemented, the no-JS fallback
  should expose all members or a clearly bounded initial list with accessible
  copy; the selected behavior must be covered by renderer tests.
- Mobile bio hiding must keep member names and roles accessible and must not
  remove content needed for screen readers unless an accessible alternative is
  provided.

## Security Contract

No API routes are added.

- Endpoint visibility: none; this leaf uses the existing admin widget editing
  surface and public Team renderer only.
- Auth model: unchanged authenticated admin page/template/widget editing and
  read-only public runtime rendering.
- RBAC: unchanged page/template/widget write permissions.
- CSRF: unchanged existing admin write route protection for persisted widget
  updates.
- Rate-limit bucket: unchanged existing admin write behavior; no public write
  bucket is introduced.
- Reject-unknown validation: new display fields must be schema-bound enums or
  clamped numeric values; if no-support is chosen, keep unknown display fields
  rejected and preserve the current max-12 bound.
- Anti-abuse: no raw HTML, unbounded class names, inline handlers, unsafe URLs,
  or browser-executed user content in Team display fields. If inline runtime
  script is added, it must be static repo-owned code and must not interpolate
  user-authored strings.
- Secret handling: do not place private member data, media tokens, provider
  keys, signed/private URLs, privileged settings, or hidden profile payloads in
  widget JSON, browser cache, diagnostics, script payloads, or report evidence.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/team.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/team-editor-wave.test.tsx` if editor
  controls are added.
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if shared
  renderer output changes.
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/TEAM.md`
- `_docs/PLAYWRIGHT/REPORT_TEAM_WIDGET.md`
- `_docs/WIDGET_PACK_MATRIX.md` only if pack readiness changes
- `_docs/_TASKS/TASK-289-05_Team_Large_Team_and_Compact_Mobile_Presentation.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/README.md` / final TASK-289 changelog entry via
  TASK-289-06 closure

## Acceptance Criteria

- The Team large-list behavior is explicitly implemented or explicitly deferred
  with a product reason.
- Compact-list mobile density is controlled or documented as intentionally
  unchanged.
- Admin canvas and public runtime remain consistent.
