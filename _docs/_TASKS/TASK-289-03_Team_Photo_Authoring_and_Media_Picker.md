# TASK-289-03: Team Photo Authoring and Media Picker

# FileName: TASK-289-03_Team_Photo_Authoring_and_Media_Picker.md

**Priority:** High
**Category:** Widgets + Team + Admin UI + Media
**Estimated Effort:** Large
**Dependencies:** TASK-289, TASK-256-04, TASK-256-06-04
**Status:** To Do

---

## Overview

Improve Team photo authoring with media-library picking, preview feedback, and
clear recovery paths.

TASK-256-06-04 owns basic Photo URL validation, public avatar safety, lazy
loading, and alt/member accessibility. This leaf builds on that baseline with a
Team-specific authoring experience: choose a media asset, preview it beside the
member, clear back to initials, and keep invalid or missing images explainable
in the editor.

## Source Findings

- `REPORT_TEAM_WIDGET.md:83-84` - invalid Photo URL produces a broken image.
  Basic validation/fallback is TASK-256.
- `REPORT_TEAM_WIDGET.md:242-245` - UX-07 asks for validation and a Media
  Library picker.
- `REPORT_TEAM_WIDGET.md:275-279` - BF-02 lazy runtime images remain TASK-256.

## Sub-Tasks

- [ ] Add a Team member photo picker using the existing admin media/asset picker
  pattern available in the checked-out branch.
- [ ] Add a compact photo preview inside each member panel, including fallback
  initials when no usable image is configured.
- [ ] Add a clear-photo action that removes the optional photo field without
  serializing an empty string.
- [ ] Preserve direct URL entry for authors who paste external image URLs after
  TASK-256 validation lands.
- [ ] Add editor copy that distinguishes `invalid URL`, `empty photo`, and
  `picked media asset` states without exposing backend-only media details.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/TeamEditors.tsx` | Add photo picker trigger, preview, clear action, and validation-state rendering inside member panels. |
| `core/widgets/core/team.tsx` | Update schema/defaults only if media asset metadata is persisted beyond `photo`; keep renderer compatibility. |
| `tests/vitest/ui/team-editor-wave.test.tsx` | Cover picker trigger wiring, clear-photo behavior, preview fallback, and validation-state copy. |
| `tests/vitest/widgets/team.test.tsx` | Cover normalizer compatibility if the photo payload shape changes. |
| `tests/unit/widgets/validator.test.ts` | Cover schema acceptance/rejection if asset metadata is added. |
| `_docs/_WIDGETS/TEAM.md` | Document photo authoring and fallback behavior. |

## Implementation Pseudocode

```tsx
function TeamPhotoField({ member, memberIndex }) {
  const photoState = resolveTeamPhotoEditorState(member.photo);

  return (
    <div>
      <TeamPhotoPreview state={photoState} name={member.name} />
      <Input
        value={member.photo ?? ""}
        onChange={(event) => updateMember(value, onChange, memberIndex, { photo: event.target.value })}
      />
      <Button onClick={() => openMediaPicker({ onSelect: (asset) => setMemberPhoto(asset.url) })}>
        Pick image
      </Button>
      <Button onClick={() => updateMember(value, onChange, memberIndex, { photo: undefined })}>
        Clear photo
      </Button>
    </div>
  );
}
```

Data flow:

- Keep `members[].photo` as the compatibility source unless a stronger existing
  media field pattern is present and documented.
- If media metadata is introduced, normalize it through `team.tsx`; do not keep
  editor-only asset payloads in browser storage.
- Use the existing admin media picker seam rather than adding a Team-only media
  modal.
- Reuse TASK-256 URL validation/fallback helpers once they land.

Error handling:

- Missing media-picker dependencies should degrade to direct URL entry without
  breaking the editor.
- Invalid URLs show inline editor feedback and public rendering must fall back
  safely after TASK-256.
- Clearing a photo must not leave `photo: ""` unless TASK-256 explicitly keeps
  that as the normalized legacy representation.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin media and page editing contract.
- Reject-unknown validation: update `teamSchema` and validator tests if media
  asset metadata is persisted.
- Anti-abuse: picked media URLs must use existing safe media helpers and must
  not expose private tokens, signed URLs, raw HTML, scripts, arbitrary class
  names, or privileged media metadata in widget data.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/team-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/team.test.tsx` if normalizer or
  renderer behavior changes.
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/TEAM.md`
- `_docs/PLAYWRIGHT/REPORT_TEAM_WIDGET.md`
- `_docs/MEDIA_SPEC.md` only if this leaf changes media-picker contract rather
  than reusing it

## Acceptance Criteria

- Team authors can pick, preview, and clear member photos without leaving broken
  images or empty-string payload drift.
- Direct URL entry still works through the TASK-256 validation/fallback path.
- No Team-specific media picker infrastructure is invented when a shared admin
  media seam exists.
