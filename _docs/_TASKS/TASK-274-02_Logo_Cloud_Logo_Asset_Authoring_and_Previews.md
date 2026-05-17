# TASK-274-02: Logo Cloud Logo Asset Authoring and Previews

# FileName: TASK-274-02_Logo_Cloud_Logo_Asset_Authoring_and_Previews.md

**Priority:** High
**Category:** Widgets + Logo Cloud + Media Library + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-274, TASK-256-06-02
**Status:** To Do

---

## Overview

Make Logo Cloud starter/logo authoring useful without forcing users to leave the
editor canvas to configure image URLs, alt text, basic link URLs, or
media-picked logo assets.

Source report findings:

- UX-03 Wizard missing Image URL and Link URL per logo
- UX-04 missing thumbnail preview
- UX-05 missing separate `alt` text per logo
- UX-06 missing Media Library picker
- BF-10 image URL validation/preview feedback

Explicitly out of scope:

- Defining generic link URL validation or safe href behavior; TASK-256 owns
  shared link feedback. This leaf may wire the Logo Cloud `href` authoring
  surface and display TASK-256 validation output once available.
- Persisting private media metadata, signed URLs, or provider credentials.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/logoCloud.tsx` | Add optional per-logo `alt` text, render `alt || name`, and prefer keeping persisted image ownership to the existing `image` URL plus `href`; add `imageAssetId` only if schema-owned persistence is explicitly accepted and validator-tested. Keep legacy `image` URL support. |
| `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` | Add Wizard image/link/alt inputs or picker entry points, Visual thumbnails, MediaPicker integration, and image preview feedback for logo images. |
| `core/admin/ui/media/MediaPicker.tsx` | Reuse only; do not fork or add Logo Cloud-specific picker behavior unless the shared picker lacks required typed output. |
| `core/admin/services/mediaClient.ts` | Reuse `listMediaCached` as the media cache seam and mock it in editor tests; do not duplicate media fetching in the Logo Cloud editor. |
| `tests/vitest/ui/logo-cloud-editor-wave.test.tsx` | Cover Wizard image/link/alt updates, Visual thumbnail rendering, MediaPicker selection flow, image unavailable/error feedback, and TASK-256 link-feedback integration when available. |
| `tests/vitest/widgets/logoCloud.test.tsx` | Cover backward-compatible normalization if schema changes. |
| `tests/unit/widgets/validator.test.ts` | Cover accepted/rejected logo item fields only if intentionally expanding the generic Bun validator suite. |
| `_docs/_WIDGETS/LOGO_CLOUD.md` | Document image source behavior and editor ownership. |
| `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md` | Record fixed evidence for UX-03/UX-04/UX-05/UX-06 and the BF-10 image-feedback slice. |

## Implementation Pseudocode

```tsx
type LogoCloudLogo = {
  id?: string;
  name?: string;
  alt?: string;
  image?: string;
  imageAssetId?: string;
  href?: string;
};

type LogoMediaPickerChange =
  | { kind: "select"; assetId: string }
  | { kind: "clear" }
  | { kind: "invalid" };

type CommitLogoMutation = (
  updater: (current: LogoCloudData) => LogoCloudData,
  options?: { structural?: boolean }
) => void;

type UseLogoMediaSelectionOptions = {
  value: LogoCloudData;
  commitLogoMutation: CommitLogoMutation;
  persistAssetId: boolean;
};

type UseLogoCloudEditCoordinatorOptions = {
  value: LogoCloudData;
  onChange: (next: LogoCloudData) => void;
  persistAssetId: boolean;
};

// Default stays false unless this leaf makes imageAssetId schema-owned.
const logoCloudSupportsSchemaOwnedImageAssetId = false;

async function resolveLogoMediaAsset(assetId: string) {
  const items = await listMediaCached({ force: false });
  const match = items.find((item) => item.id === assetId);
  if (!match?.url) throw new Error("logo_cloud_media_not_found");
  return {
    imageAssetId: assetId,
    image: match.url,
    name: match.title?.trim() || match.originalName?.trim(),
  };
}

function resolveLogoMediaPickerChange(value: unknown): LogoMediaPickerChange {
  if (value === null) return { kind: "clear" };
  if (typeof value === "string" && value.trim()) {
    return { kind: "select", assetId: value };
  }
  return { kind: "invalid" };
}

function resolveLogoRowKey(index: number, logo: LogoCloudLogo) {
  return logo.id?.trim() || `index:${index}`;
}

function patchLogoCloudLogo(
  current: LogoCloudData,
  index: number,
  patch: Partial<LogoCloudLogo>
) {
  const logos = normalizeLogoCloudLogos(current.logos);
  if (!logos[index]) return current;
  const nextLogos = [...logos];
  nextLogos[index] = { ...nextLogos[index], ...patch };
  return { ...current, logos: nextLogos };
}

function useLogoMediaSelection({
  value,
  commitLogoMutation,
  persistAssetId,
}: UseLogoMediaSelectionOptions) {
  const requestIdsByLogoRef = useRef<Record<string, number>>({});
  const structureVersionRef = useRef(0);
  const latestValueRef = useRef(value);
  const [selectedAssetIdsByLogoKey, setSelectedAssetIdsByLogoKey] = useState<Record<string, string>>({});
  latestValueRef.current = value;

  function resolveRequestKey(index: number, logo: LogoCloudLogo) {
    return `${structureVersionRef.current}:${resolveLogoRowKey(index, logo)}`;
  }

  function invalidateLogoMediaRequest(index: number, logo: LogoCloudLogo) {
    const requestKey = resolveRequestKey(index, logo);
    requestIdsByLogoRef.current[requestKey] = (requestIdsByLogoRef.current[requestKey] ?? 0) + 1;
  }

  function invalidateAllLogoMediaRequests() {
    structureVersionRef.current += 1;
    requestIdsByLogoRef.current = {};
    setSelectedAssetIdsByLogoKey({});
  }

  function findLogoIndexByRequestKey(requestKey: string) {
    const logos = normalizeLogoCloudLogos(latestValueRef.current.logos);
    const rowKey = requestKey.slice(requestKey.indexOf(":") + 1);
    if (!rowKey.startsWith("index:")) {
      return logos.findIndex((item) => item.id === rowKey);
    }
    const fallbackIndex = Number(rowKey.slice("index:".length));
    return Number.isInteger(fallbackIndex) ? fallbackIndex : -1;
  }

  function commitLogoPatch(index: number, patch: Partial<LogoCloudLogo>) {
    commitLogoMutation((current) => patchLogoCloudLogo(current, index, patch));
  }

  function clearTransientAssetSelection(index: number, logo: LogoCloudLogo) {
    const rowKey = resolveLogoRowKey(index, logo);
    setSelectedAssetIdsByLogoKey((current) => {
      const { [rowKey]: _removed, ...next } = current;
      return next;
    });
  }

  function getLogoPickerValue(index: number, logo: LogoCloudLogo) {
    const rowKey = resolveLogoRowKey(index, logo);
    return logo.imageAssetId ?? selectedAssetIdsByLogoKey[rowKey] ?? null;
  }

  function clearLogoImage(index: number, logo: LogoCloudLogo) {
    invalidateLogoMediaRequest(index, logo);
    clearTransientAssetSelection(index, logo);
    commitLogoPatch(index, { image: "", imageAssetId: undefined });
  }

  async function handleLogoAssetChange(
    index: number,
    logo: LogoCloudLogo,
    change: LogoMediaPickerChange,
  ) {
    if (change.kind === "clear") {
      clearLogoImage(index, logo);
      return;
    }
    if (change.kind === "invalid") {
      invalidateLogoMediaRequest(index, logo);
      return;
    }
    const assetId = change.assetId;
    const requestKey = resolveRequestKey(index, logo);
    const rowKey = resolveLogoRowKey(index, logo);
    const requestId = (requestIdsByLogoRef.current[requestKey] ?? 0) + 1;
    requestIdsByLogoRef.current[requestKey] = requestId;
    setSelectedAssetIdsByLogoKey((current) => ({ ...current, [rowKey]: assetId }));
    const next = await resolveLogoMediaAsset(assetId).catch((error) => {
      clearTransientAssetSelection(index, logo);
      throw error;
    });
    if (requestIdsByLogoRef.current[requestKey] !== requestId) return;
    const latestIndex = findLogoIndexByRequestKey(requestKey);
    if (latestIndex < 0) return;
    const latestLogo = normalizeLogoCloudLogos(latestValueRef.current.logos)[latestIndex];
    if (!latestLogo) return;
    commitLogoPatch(latestIndex, {
      image: next.image,
      // Persist only when TASK-274-02 makes imageAssetId schema-owned.
      imageAssetId: persistAssetId ? assetId : undefined,
      name: latestLogo.name?.trim() ? latestLogo.name : next.name,
    });
  }

  return {
    handleLogoAssetChange,
    invalidateLogoMediaRequest,
    invalidateAllLogoMediaRequests,
    clearLogoImage,
    commitLogoPatch,
    clearTransientAssetSelection,
    getLogoPickerValue,
  };
}

function useLogoCloudEditCoordinator({
  value,
  onChange,
  persistAssetId,
}: UseLogoCloudEditCoordinatorOptions) {
  const mediaSelectionRef = useRef<ReturnType<typeof useLogoMediaSelection> | null>(null);
  const commitLogoMutation: CommitLogoMutation = (updater, options) => {
    if (options?.structural) mediaSelectionRef.current?.invalidateAllLogoMediaRequests();
    updateValue(value, onChange, updater);
  };
  const mediaSelection = useLogoMediaSelection({
    value,
    commitLogoMutation,
    persistAssetId,
  });
  mediaSelectionRef.current = mediaSelection;

  return {
    commitLogoMutation,
    mediaSelection,
  };
}

function LogoCloudWizardEditor({ value, onChange }: LogoCloudEditorProps) {
  const logos = normalizeLogoCloudLogos(normalizeValue(value).logos);
  const { commitLogoMutation, mediaSelection } = useLogoCloudEditCoordinator({
    value,
    onChange,
    persistAssetId: logoCloudSupportsSchemaOwnedImageAssetId,
  });

  function handleLogoStructureEdit(updater: (current: LogoCloudData) => LogoCloudData) {
    commitLogoMutation(updater, { structural: true });
  }

  return (
    <>
      <LogoCountSelect onChange={(count) => handleLogoStructureEdit((current) => setLogoCountInData(current, count))} />
      {logos.map((logo, index) => (
        <LogoImageControl
          key={logo.id}
          logo={logo}
          index={index}
          mediaSelection={mediaSelection}
        />
      ))}
      <Button onClick={() => handleLogoStructureEdit(addLogoToData)}>Add logo</Button>
    </>
  );
}

function LogoCloudVisualEditor({ value, onChange }: LogoCloudEditorProps) {
  const logos = normalizeLogoCloudLogos(normalizeValue(value).logos);
  const { commitLogoMutation, mediaSelection } = useLogoCloudEditCoordinator({
    value,
    onChange,
    persistAssetId: logoCloudSupportsSchemaOwnedImageAssetId,
  });

  function handleLogoStructureEdit(updater: (current: LogoCloudData) => LogoCloudData) {
    commitLogoMutation(updater, { structural: true });
  }

  return (
    <>
      {logos.map((logo, index) => (
        <LogoImageControl
          key={logo.id}
          logo={logo}
          index={index}
          mediaSelection={mediaSelection}
        />
      ))}
      <Button onClick={() => handleLogoStructureEdit(addLogoToData)}>Add logo</Button>
    </>
  );
}

function LogoImageControl({ logo, index, mediaSelection }: LogoImageControlProps) {
  const {
    handleLogoAssetChange,
    invalidateLogoMediaRequest,
    clearLogoImage,
    clearTransientAssetSelection,
    commitLogoPatch,
  } = mediaSelection;

  return (
    <div>
      {logo.image ? (
        <img src={logo.image} alt="" className="h-8 w-8 rounded object-contain" loading="lazy" />
      ) : null}
      <Input
        value={logo.image ?? ""}
        onChange={(event) => {
          invalidateLogoMediaRequest(index, logo);
          clearTransientAssetSelection(index, logo);
          commitLogoPatch(index, { image: event.target.value, imageAssetId: undefined });
        }}
      />
      <Input
        value={logo.alt ?? ""}
        onChange={(event) => commitLogoPatch(index, { alt: event.target.value })}
      />
      <Input
        value={logo.href ?? ""}
        onChange={(event) => commitLogoPatch(index, { href: event.target.value })}
      />
      <MediaPicker
        value={mediaSelection.getLogoPickerValue(index, logo)}
        onChange={(next) => void handleLogoAssetChange(index, logo, resolveLogoMediaPickerChange(next))}
        multiple={false}
        accept={["image/*"]}
      />
      <Button type="button" onClick={() => clearLogoImage(index, logo)}>Clear image</Button>
    </div>
  );
}
```

Editor data flow:

1. Wizard keeps its minimal setup role, but each visible logo row gets compact
   image, alt, and link fields or an image-picker affordance next to the name
   field.
2. Visual and Wizard parent editors both use the shared
   `useLogoCloudEditCoordinator` hook, which owns `commitLogoMutation` and one
   `useLogoMediaSelection` instance for that editor render. Do not instantiate
   the media hook in `LogoImageControl`; row unmounts must not freeze
   `latestValueRef`.
3. Visual repeated logo cards reuse the same image control and show a bounded
   thumbnail preview when `logo.image` is non-empty.
4. MediaPicker selection resolves the public media URL through cache-first
   `listMediaCached({ force: false })` or the equivalent default call. Store the
   public URL by default; store `imageAssetId` only if `logoCloud.tsx` makes that
   field schema-owned, normalized, documented, and tested. Adapt
   `MediaPicker`'s `unknown` `onChange` payload through
   `resolveLogoMediaPickerChange` before calling the media resolver: string
   selects an asset, `null` is the real single-select picker clear event, and
   every other payload is invalid/no-op. When `imageAssetId` is not schema-owned,
   keep the selected asset id only in transient `selectedAssetIdsByLogoKey` state
   so the current picker can render the selected item/remove affordance without
   persisting a new field.
5. Manual image URL and link URL entry remain supported for backward
   compatibility. Use an explicit Clear image control and the MediaPicker's
   trusted single-select remove event for destructive image removal; do not
   treat malformed or unknown non-null picker payloads as a request to erase an
   existing manual URL. The picker remove event is available only for a persisted
   or transient selected asset id; the explicit Clear image control remains the
   destructive path for legacy manual URLs with no selected asset state.
6. Link URL validation UI consumes TASK-256 shared safe-link output when that
   contract exists; do not hand-roll a second link validator in this leaf.
7. Runtime `img` output uses explicit `logo.alt` when present and falls back to
   `logo.name` for backward compatibility.
8. Parent-owned add, remove, count, move, drag/drop, and other structural
   `logos[]` edits must route through a parent `commitLogoMutation` helper with
   `{ structural: true }`, which calls `invalidateAllLogoMediaRequests` before
   changing `logos[]`. Non-structural row edits use the same coordinator without
   the structural flag so TASK-274-03 pending Undo state is cleared consistently.
   Manual image URL edits also use the row-level invalidation helper.
9. Replace the current side-effect-only `updateLogo(value, onChange, ...)` call
   sites with a pure `patchLogoCloudLogo(current, index, patch)` helper inside
   the coordinator path. When TASK-274-03 is present, the shared coordinator must
   expose the same `commitLogoEdit` implementation to Wizard and Visual rather
   than keeping a second mutation path in either mode.

Error handling:

- If MediaPicker resolution fails, show an inline error and keep the previous
  logo data unchanged.
- The MediaPicker's trusted single-select remove event emits `null` and clears
  `image` plus `imageAssetId`. Unknown or malformed non-null MediaPicker values
  resolve to `invalid`, invalidate only the row's pending media request, and keep
  the previous `image`/`imageAssetId` unchanged.
- If `resolveLogoMediaAsset` fails after a selection, clear only the transient
  picker selection for that row, surface the inline error, and keep persisted
  logo data unchanged.
- Guard async media-cache resolution with a per-logo request ID/ref and commit
  resolved patches through a `latestValueRef` helper. After `await`, re-read the
  current logo row/index by stable logo key before applying the image/name patch.
  Do not call the current side-effect `updateLogo(value, onChange, ...)` helper
  with a stale `value`, captured index, or captured `logo.name` from before
  `await`.
- Structural list edits bump `structureVersionRef` and clear request IDs so
  remove-then-add cannot let reused fallback ids such as `logo-1` receive an old
  media resolution.
- If selected media is unavailable, keep the selected ID out of persisted data
  unless a public URL was resolved.
- Broken external image URLs must not crash the editor; thumbnail fallback should
  show a compact unavailable state.
- Link URL feedback must consume TASK-256 shared validation/safe href results;
  unsafe hrefs are not locally classified here.
- Empty `alt` normalizes to omitted/empty and runtime falls back to `name`; it
  must not render `"undefined"` or duplicate placeholder copy.
- Legacy logo entries with only `image` keep rendering and editing.

Regression-test shape:

- Mock `MediaPicker` at the editor import seam to emit the selected image ID
  shape used by the real picker, plus malformed payloads that must resolve to
  `invalid` and the real single-select remove event that emits `null`.
- Mock the media cache client used by the editor, including success,
  not-found, and failure cases for `listMediaCached`.
- Assert stale media-cache races do not overwrite newer selections: trigger two
  picker selections for the same logo, resolve the first request last, and
  verify the second selection remains persisted.
- Assert cross-row media selections resolve independently and a late request for
  one row does not discard a valid selection on another row.
- Assert a manual image URL edit invalidates an in-flight media selection for
  that row and clears any stale `imageAssetId` unless schema-owned persistence
  explicitly keeps it.
- Assert malformed or unknown non-null MediaPicker payloads do not clear an
  existing manual image URL, while both the real picker `null` remove event and
  the explicit Clear image control clear `image` and `imageAssetId`.
- Assert a picker-selected asset id is retained in transient editor state when
  `imageAssetId` is not schema-owned, so the MediaPicker selected item and remove
  affordance render during the current edit session without persisting
  `imageAssetId`.
- Assert a legacy manual image URL with no persisted/transient asset id can still
  be cleared by the explicit Clear image button.
- Assert unrelated logo edits made while media resolution is pending are
  preserved when the media selection resolves, proving the commit path uses the
  latest editor value.
- Assert moving, removing, adding, or changing logo count while media resolution
  is pending invalidates in-flight selections and does not patch any row; users
  can select media again after the structural edit.
- Assert remove-then-add before media resolution does not patch the new row even
  when the normalizer reuses a fallback id such as `logo-1`.
- Assert Wizard edits persist `logos[index].image`, `logos[index].alt`, and
  `logos[index].href`.
- Assert Wizard and Visual row edits both route through the shared
  `useLogoCloudEditCoordinator` path, so TASK-274-03 pending Undo and structural
  media invalidation behavior cannot be bypassed by one editor mode.
- Assert Visual thumbnails render success and unavailable states without
  mutating saved logo data.
- Assert runtime rendering uses explicit alt text when present and `name`
  fallback for legacy payloads.

## Sub-Tasks

- None. This is an execution-ready implementation leaf.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged admin page/template save flow and media
  list/read permissions.
- Reject-unknown validation: any added `logos[]` field must be schema-owned and
  validator-tested.
- Anti-abuse: persist only public media URLs/asset IDs already allowed by the
  media library. Do not store upload credentials, signed private URLs, provider
  keys, raw HTML, scripts, or arbitrary class names in widget data.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/logoCloud.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` only when intentionally adding
  Logo Cloud coverage to the generic Bun validator suite.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/LOGO_CLOUD.md`
- `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md`
- `_docs/_TASKS/README.md` on status transition.
- `_docs/_CHANGELOG/README.md` and a changelog entry when this leaf is completed
  independently or through TASK-274-06 closure.

## Acceptance Criteria

- Wizard can seed real logo images, alt text, and basic link URLs without
  requiring a Visual-mode round trip.
- Visual logo cards show bounded thumbnails for configured images.
- Media Library picking uses existing media ownership and failure handling.
- Existing manual image URL payloads still normalize and render.
- No TASK-256 link validation or safe href contract is duplicated in this leaf.
