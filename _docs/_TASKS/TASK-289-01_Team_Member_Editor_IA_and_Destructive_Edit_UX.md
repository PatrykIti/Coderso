# TASK-289-01: Team Member Editor IA and Destructive Edit UX

# FileName: TASK-289-01_Team_Member_Editor_IA_and_Destructive_Edit_UX.md

**Priority:** High
**Category:** Widgets + Team + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-289, TASK-256-01, TASK-256-06-04
**Status:** To Do

---

## Overview

Repair Team-specific member authoring friction from
`_docs/PLAYWRIGHT/REPORT_TEAM_WIDGET.md` without reopening TASK-256 shared
editor-safety work.

This leaf owns per-member editor IA and repeated-item destructive actions:
member remove confirmation or undo, social-link remove confirmation or undo,
placing social links with the member they belong to, and adding an efficient
top-level member add action for long lists.

## Source Findings

- `REPORT_TEAM_WIDGET.md:217-220` - UX-01 remove member immediately deletes
  filled profile data.
- `REPORT_TEAM_WIDGET.md:222-224` - UX-02 social links are in a separate
  section from the member content.
- `REPORT_TEAM_WIDGET.md:247-249` - UX-08 social link remove deletes
  immediately.
- `REPORT_TEAM_WIDGET.md:251-253` - UX-09 add member action is only at the
  bottom of a long member list.
- `REPORT_TEAM_WIDGET.md:255-258` - UX-10 unsafe default URL is TASK-256 scope,
  but this leaf must preserve the final empty/default behavior when moving the
  controls.
- `REPORT_TEAM_WIDGET.md:260-264` - UX-11 count reduction warning is TASK-256
  scope; this leaf must not duplicate count-selector logic.

## Sub-Tasks

- [ ] Move or mirror social link controls into each member card/panel while
  preserving the existing normalized `members[].socialLinks[]` payload shape.
- [ ] Add a recoverable or confirmed remove flow for `removeMember`.
- [ ] Add a recoverable or confirmed remove flow for `removeMemberSocialLink`.
- [ ] Add a top add-member action near the member-section heading and keep the
  bottom action as a secondary affordance or remove it if the top action is
  enough.
- [ ] Preserve TASK-256 final behavior for empty social URLs and count-reduction
  warnings.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/TeamEditors.tsx` | Rework member editor IA, colocate social links, add confirm/undo state, add top member action, and keep normalized update helpers. |
| `tests/vitest/ui/team-editor-wave.test.tsx` | Add regressions for social controls inside member panels, member remove confirmation/undo, social remove confirmation/undo, and top add-member behavior. |
| `_docs/_WIDGETS/TEAM.md` | Update Visual editor mode notes if sections or destructive-edit semantics change. |
| `_docs/PLAYWRIGHT/REPORT_TEAM_WIDGET.md` | Mark UX-01, UX-02, UX-08, and UX-09 with final evidence during closure. |

## Implementation Pseudocode

```tsx
type PendingTeamRemoval =
  | { type: "member"; memberId: string; memberName: string }
  | { type: "social"; memberId: string; socialId: string; label: string };

function TeamMemberPanel({ member, memberIndex, pendingRemoval }) {
  return (
    <section aria-labelledby={`team-member-${member.id}-title`}>
      <header>
        <h4 id={`team-member-${member.id}-title`}>{member.name}</h4>
        <Button onClick={() => setPendingRemoval({ type: "member", memberId: member.id })}>
          Remove
        </Button>
      </header>
      <MemberFields />
      <SocialLinksEditor memberIndex={memberIndex} />
    </section>
  );
}

function confirmRemoval(pending: PendingTeamRemoval) {
  if (pending.type === "member") {
    removeMemberById(value, onChange, pending.memberId);
  } else {
    removeMemberSocialLinkById(value, onChange, pending.memberId, pending.socialId);
  }
}
```

Data flow:

- Continue normalizing through `normalizeTeamData`, `normalizeTeamMembers`, and
  `normalizeTeamSocialLinks`.
- Use stable member/social IDs for pending-remove state so reordered members do
  not cause a stale index deletion.
- Keep editor-local confirmation state out of persisted widget data.
- Do not change the public renderer in this leaf.

Error handling:

- If a pending member/social item no longer exists after reorder or count
  changes, clear the pending state without mutating data.
- If only one member remains, keep remove disabled and do not show a dangling
  confirmation.
- If TASK-256 has changed social default URL behavior, reuse that helper path
  instead of reintroducing `"#"` placeholders.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing contract.
- Reject-unknown validation: unchanged unless social/member payload fields are
  added, in which case `teamSchema` and validator tests must be updated.
- Anti-abuse: social URL safety remains TASK-256-owned. This leaf must not add
  raw HTML, script payloads, arbitrary class names, or secrets to widget data.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/team-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/team.test.tsx` if payload
  normalization changes.
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/TEAM.md`
- `_docs/PLAYWRIGHT/REPORT_TEAM_WIDGET.md`
- `_docs/_TASKS/TASK-289-06_Team_Report_Docs_Changelog_and_Closure.md`

## Acceptance Criteria

- Editors can manage a member's content and social links in one local context.
- Member and social-link removals are confirmed or recoverable.
- Long Team lists have an efficient add-member affordance near the top of the
  member section.
- Count-selector data loss and social default URL fixes remain owned by
  TASK-256 and are not duplicated here.
