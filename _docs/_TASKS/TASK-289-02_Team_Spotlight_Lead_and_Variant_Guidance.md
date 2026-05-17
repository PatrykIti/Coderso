# TASK-289-02: Team Spotlight Lead and Variant Guidance

# FileName: TASK-289-02_Team_Spotlight_Lead_and_Variant_Guidance.md

**Priority:** Medium
**Category:** Widgets + Team + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-289, TASK-256-01, TASK-256-06-04
**Status:** To Do

---

## Overview

Add Team-specific spotlight lead selection and authoring guidance after
TASK-256 makes the existing spotlight controls truthful.

This leaf does not own the current misleading `columns` selector, Wizard
variant/count truthfulness, or baseline spotlight accessibility. Those remain
TASK-256-06-04. TASK-289-02 owns the product expansion that lets authors choose
which member is highlighted instead of relying only on array index `0`.

## Source Findings

- `REPORT_TEAM_WIDGET.md:226-228` - UX-03 lacks a clear spotlight lead
  indicator.
- `REPORT_TEAM_WIDGET.md:285-288` - BF-04 spotlight always uses `members[0]`
  and requires manual reorder to change the lead.
- `REPORT_TEAM_WIDGET.md:174-185,230-232,367-372` - BUG-03/UX-04 spotlight
  columns truthfulness remains TASK-256 scope and must be treated as a
  dependency.

## Sub-Tasks

- [ ] Add a schema-owned `spotlightLeadId` or equivalent bounded field with
  legacy fallback to the first member.
- [ ] Add a Visual editor action such as `Set as spotlight lead` inside each
  member panel.
- [ ] Show the active spotlight lead state in the editor without relying only on
  member position.
- [ ] Preserve reorder behavior so moving members does not silently change the
  selected lead when stable IDs exist.
- [ ] Keep public runtime output backward compatible for payloads without a
  lead ID.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/team.tsx` | Extend `TeamData`/schema/defaults/normalizer with lead selection if chosen, resolve lead/rest members by stable ID, and preserve `data-team-spotlight-lead` markers. |
| `core/admin/ui/widgets/editors/TeamEditors.tsx` | Add lead selection actions and editor indicators inside member panels. |
| `tests/vitest/widgets/team.test.tsx` | Cover legacy first-member fallback, selected lead rendering, reorder stability, and invalid lead fallback. |
| `tests/vitest/ui/team-editor-wave.test.tsx` | Cover lead action UI and stable value updates. |
| `tests/unit/widgets/validator.test.ts` | Cover schema acceptance/rejection if a new persisted field is added. |
| `_docs/_WIDGETS/TEAM.md` | Document spotlight lead selection and fallback behavior. |

## Implementation Pseudocode

```tsx
type TeamData = {
  header?: TeamHeader;
  members: TeamMember[];
  spotlightLeadId?: string;
  style?: TeamStyle;
};

function resolveSpotlightMembers(data: TeamData) {
  const members = normalizeTeamMembers(data.members);
  const lead =
    members.find((member) => member.id === data.spotlightLeadId) ?? members[0];
  return {
    lead,
    rest: members.filter((member) => member.id !== lead?.id),
  };
}

function setSpotlightLead(value: TeamData, memberId: string) {
  updateValue(value, onChange, (current) => ({
    ...current,
    spotlightLeadId: memberId,
  }));
}
```

Data flow:

- Normalize `spotlightLeadId` only when it references a current member ID.
- Keep existing payloads rendering exactly as before when no lead ID is stored.
- If the selected lead member is removed, fall back to the first remaining
  member and clear or update the persisted lead field in the same normalized
  update path.
- Use stable IDs instead of indexes for editor state and tests.

Error handling:

- Invalid lead IDs must not crash renderer/editor output.
- Reordered members must keep the same selected lead.
- If TASK-256 changes member ID normalization, reuse its final helper shape
  rather than adding a parallel resolver.

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
- Reject-unknown validation: add `spotlightLeadId` to `teamSchema` only if this
  leaf persists it; keep `additionalProperties: false` and reject unknown Team
  fields.
- Anti-abuse: lead IDs are inert references to local members and must not carry
  URLs, markup, scripts, class names, inline handlers, or browser-executed user
  content.
- Secret handling: do not place private member data, media tokens, provider
  keys, signed URLs, or privileged settings in widget JSON, browser cache,
  diagnostics, or report evidence.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/team.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/team-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema changes.
- `bun test tests/unit/widgets/registry.test.ts` if registry/default wiring
  changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/TEAM.md`
- `_docs/PLAYWRIGHT/REPORT_TEAM_WIDGET.md`
- `_docs/WIDGET_PACK_MATRIX.md` only if pack readiness changes
- `_docs/_TASKS/TASK-289-02_Team_Spotlight_Lead_and_Variant_Guidance.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/README.md` / final TASK-289 changelog entry via
  TASK-289-06 closure

## Acceptance Criteria

- Authors can choose the spotlight lead without using reorder as the only
  mechanism.
- Spotlight lead selection survives reorder and has a deterministic fallback
  when the selected member is removed.
- TASK-256 remains the owner for misleading spotlight columns/count fixes.
