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
| `core/admin/ui/media/MediaPicker.tsx` | Reuse the existing `MediaPicker` component contract; do not create a Team-only media modal. |
| `core/admin/services/mediaClient.ts` | Reuse `listMediaCached({ force: false })` to resolve selected media IDs to public URLs, matching the `GalleryMosaicEditors.tsx` pattern. |
| `core/widgets/core/team.tsx` | Update schema/defaults only if media asset metadata is persisted beyond `photo`; keep renderer compatibility. |
| `tests/vitest/ui/team-editor-wave.test.tsx` | Cover picker trigger wiring, clear-photo behavior, preview fallback, and validation-state copy. |
| `tests/vitest/widgets/team.test.tsx` | Cover normalizer compatibility if the photo payload shape changes. |
| `tests/unit/widgets/validator.test.ts` | Cover schema acceptance/rejection if asset metadata is added. |
| `_docs/_WIDGETS/TEAM.md` | Document photo authoring and fallback behavior. |

## Implementation Pseudocode

```tsx
const [selectedPhotoMediaIdsByMemberId, setSelectedPhotoMediaIdsByMemberId] =
  useState<Record<string, string>>({});
const [photoPickerError, setPhotoPickerError] = useState<string | null>(null);

function TeamPhotoField({ member, memberIndex }) {
  const photoState = resolveTeamPhotoEditorState(member.photo);
  const selectedMediaId = selectedPhotoMediaIdsByMemberId[member.id] ?? null;

  return (
    <div>
      <TeamPhotoPreview state={photoState} name={member.name} />
      <Input
        value={member.photo ?? ""}
        onChange={(event) => updateMember(value, onChange, memberIndex, { photo: event.target.value })}
      />
      <MediaPicker
        value={selectedMediaId}
        onChange={(nextValue) => handleTeamPhotoMediaSelection(member.id, memberIndex, nextValue)}
        multiple={false}
        accept={["image/*"]}
        maxItems={1}
      />
      <Button onClick={() => clearTeamPhoto(member.id, memberIndex)}>
        Clear photo
      </Button>
    </div>
  );
}

async function handleTeamPhotoMediaSelection(
  memberId: string,
  memberIndex: number,
  nextValue: unknown
) {
  const mediaId = Array.isArray(nextValue) ? nextValue[0] : nextValue;
  if (!mediaId) {
    clearTeamPhoto(memberId, memberIndex);
    return;
  }

  setPhotoPickerError(null);
  try {
    const mediaItems = await listMediaCached({ force: false });
    const selected = mediaItems.find((item) => item.id === String(mediaId));
    if (!selected?.url) {
      setPhotoPickerError("Selected image is no longer available.");
      return;
    }

    setSelectedPhotoMediaIdsByMemberId((current) => ({
      ...current,
      [memberId]: String(mediaId),
    }));
    updateMember(value, onChange, memberIndex, { photo: selected.url });
  } catch {
    setPhotoPickerError("Failed to resolve selected media.");
  }
}

function clearTeamPhoto(memberId: string, memberIndex: number) {
  setSelectedPhotoMediaIdsByMemberId(({ [memberId]: _removed, ...rest }) => rest);
  updateMember(value, onChange, memberIndex, { photo: undefined });
}
```

Data flow:

- Keep `members[].photo` as the compatibility source unless a stronger existing
  media field pattern is present and documented. The default implementation
  path is to map the `MediaPicker` selected ID to a public URL through
  `listMediaCached({ force: false })`, matching `GalleryMosaicEditors.tsx`, and
  persist only `members[].photo`.
- Keep selected media IDs in editor-local state for the current session. If a
  future implementation chooses to persist `photoMediaId` for editor
  continuity, normalize it through `team.tsx`, add schema/validator coverage,
  and keep `members[].photo` as the public renderer compatibility source.
- Use `core/admin/ui/media/MediaPicker.tsx` rather than adding a Team-only media
  modal. The existing single-select contract returns the selected media ID via
  `onChange(id)`, not an asset object.
- Reuse TASK-256 URL validation/fallback helpers once they land.

Error handling:

- Missing media-picker dependencies should leave direct URL entry usable without
  breaking the editor.
- If `listMediaCached` cannot resolve the selected ID, keep the previous photo
  value, show inline editor feedback, and do not serialize partial asset
  metadata.
- Invalid URLs show inline editor feedback and public rendering must fall back
  safely after TASK-256.
- Clearing a photo must not leave `photo: ""` unless TASK-256 explicitly keeps
  that as the normalized legacy representation.

## Security Contract

No API routes are added.

- Endpoint visibility: none; this leaf uses the existing admin widget editing
  and media browsing surfaces plus read-only public Team rendering.
- Auth model: unchanged authenticated admin page/template/widget editing and
  authenticated admin media-library browsing; public runtime remains read-only.
- RBAC: unchanged page/template/widget write permissions and existing media
  library access rules.
- CSRF: unchanged existing admin write route protection for persisted widget
  updates.
- Rate-limit bucket: unchanged existing admin/media behavior; no public write
  bucket is introduced.
- Reject-unknown validation: update `teamSchema` and validator tests if media
  asset metadata or `photoMediaId` is persisted; keep unknown fields rejected.
- Anti-abuse: picked media URLs must use existing safe media helpers and must
  not expose raw HTML, scripts, arbitrary class names, inline handlers, unsafe
  URL bypasses, or browser-executed user content.
- Secret handling: do not store private media tokens, signed/private URLs,
  provider keys, privileged media metadata, or upload credentials in widget
  JSON, browser cache, diagnostics, or report evidence.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/team-editor-wave.test.tsx`
  - Mock `core/admin/services/mediaClient.ts` `listMediaCached` in this suite to
    cover ID-to-URL mapping, unresolved IDs, rejected media-list loads,
    clear-photo behavior, and preservation of the direct URL input.
- `bun run test:vitest -- tests/vitest/widgets/team.test.tsx` if normalizer or
  renderer behavior changes.
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/TEAM.md`
- `_docs/PLAYWRIGHT/REPORT_TEAM_WIDGET.md`
- `_docs/MEDIA_SPEC.md` only if this leaf changes media-picker contract rather
  than reusing it
- `_docs/_TASKS/TASK-289-03_Team_Photo_Authoring_and_Media_Picker.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/README.md` / final TASK-289 changelog entry via
  TASK-289-06 closure

## Acceptance Criteria

- Team authors can pick, preview, and clear member photos without leaving broken
  images or empty-string payload drift.
- Direct URL entry still works through the TASK-256 validation/fallback path.
- No Team-specific media picker infrastructure is invented when a shared admin
  media seam exists.
