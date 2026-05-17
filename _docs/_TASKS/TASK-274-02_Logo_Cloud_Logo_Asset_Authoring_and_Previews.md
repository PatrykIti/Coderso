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

type UseLogoMediaSelectionOptions = {
  value: LogoCloudData;
  onChange: (next: LogoCloudData) => void;
  persistAssetId: boolean;
};

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

function resolveSingleMediaPickerId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const [first] = value;
    return typeof first === "string" ? first : null;
  }
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

function useLogoMediaSelection({
  value,
  onChange,
  persistAssetId,
}: UseLogoMediaSelectionOptions) {
  const requestIdsByLogoRef = useRef<Record<string, number>>({});
  const structureVersionRef = useRef(0);
  const latestValueRef = useRef(value);
  latestValueRef.current = value;

  function resolveRequestKey(index: number, logo: LogoCloudLogo) {
    const rowKey = logo.id?.trim() || `index:${index}`;
    return `${structureVersionRef.current}:${rowKey}`;
  }

  function invalidateLogoMediaRequest(index: number, logo: LogoCloudLogo) {
    const requestKey = resolveRequestKey(index, logo);
    requestIdsByLogoRef.current[requestKey] = (requestIdsByLogoRef.current[requestKey] ?? 0) + 1;
  }

  function invalidateAllLogoMediaRequests() {
    structureVersionRef.current += 1;
    requestIdsByLogoRef.current = {};
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
    updateLogo(latestValueRef.current, onChange, index, patch);
  }

  async function handleLogoAssetChange(
    index: number,
    logo: LogoCloudLogo,
    assetId: string | null,
  ) {
    const requestKey = resolveRequestKey(index, logo);
    const requestId = (requestIdsByLogoRef.current[requestKey] ?? 0) + 1;
    requestIdsByLogoRef.current[requestKey] = requestId;
    if (!assetId) return commitLogoPatch(index, { image: "", imageAssetId: undefined });
    const next = await resolveLogoMediaAsset(assetId);
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
    commitLogoPatch,
  };
}

function LogoCloudVisualEditor({ value, onChange }: LogoCloudVisualEditorProps) {
  const mediaSelection = useLogoMediaSelection({
    value,
    onChange,
    persistAssetId,
  });

  function handleLogoStructureEdit(updater: (current: LogoCloudData) => LogoCloudData) {
    mediaSelection.invalidateAllLogoMediaRequests();
    updateValue(value, onChange, updater);
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

function LogoImageControl({ logo, index, mediaSelection }: LogoImageControlProps) {
  const { handleLogoAssetChange, invalidateLogoMediaRequest, commitLogoPatch } = mediaSelection;

  return (
    <div>
      {logo.image ? (
        <img src={logo.image} alt="" className="h-8 w-8 rounded object-contain" loading="lazy" />
      ) : null}
      <Input
        value={logo.image ?? ""}
        onChange={(event) => {
          invalidateLogoMediaRequest(index, logo);
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
        value={logo.imageAssetId ?? null}
        onChange={(next) => void handleLogoAssetChange(index, logo, resolveSingleMediaPickerId(next))}
        multiple={false}
        accept={["image/*"]}
      />
    </div>
  );
}
```

Editor data flow:

1. Wizard keeps its minimal setup role, but each visible logo row gets compact
   image, alt, and link fields or an image-picker affordance next to the name
   field.
2. Visual and Wizard parent editors create one `useLogoMediaSelection` instance
   and pass its handlers into repeated logo rows. Do not instantiate the hook in
   `LogoImageControl`; row unmounts must not freeze `latestValueRef`.
3. Visual repeated logo cards reuse the same image control and show a bounded
   thumbnail preview when `logo.image` is non-empty.
4. MediaPicker selection resolves the public media URL through cache-first
   `listMediaCached({ force: false })` or the equivalent default call. Store the
   public URL by default; store `imageAssetId` only if `logoCloud.tsx` makes that
   field schema-owned, normalized, documented, and tested.
   Adapt `MediaPicker`'s `unknown` `onChange` payload through
   `resolveSingleMediaPickerId` before calling the media resolver.
5. Manual image URL and link URL entry remain supported for backward
   compatibility.
6. Link URL validation UI consumes TASK-256 shared safe-link output when that
   contract exists; do not hand-roll a second link validator in this leaf.
7. Runtime `img` output uses explicit `logo.alt` when present and falls back to
   `logo.name` for backward compatibility.
8. Parent-owned add, remove, count, move, drag/drop, and other structural
   `logos[]` edits must route through a parent helper such as
   `handleLogoStructureEdit`, which calls `invalidateAllLogoMediaRequests`
   before changing `logos[]`. Manual image URL edits use the row-level
   invalidation helper.

Error handling:

- If MediaPicker resolution fails, show an inline error and keep the previous
  logo data unchanged.
- Unknown or malformed MediaPicker values resolve to `null` and clear only the
  picker-owned image/asset fields for that row.
- Guard async media-cache resolution with a per-logo request ID/ref and commit
  resolved patches through a `latestValueRef` helper. After `await`, re-read the
  current logo row/index by stable logo key before applying the image/name patch.
  Do not call `updateLogo` with a stale `value`, captured index, or captured
  `logo.name` from before `await`.
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
  `null`.
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
- Assert unrelated logo edits made while media resolution is pending are
  preserved when the media selection resolves, proving the commit path uses the
  latest editor value.
- Assert moving or removing a logo while media resolution is pending does not
  patch the wrong row; stable-ID rows update in their new position, and removed
  rows no-op.
- Assert remove-then-add before media resolution does not patch the new row even
  when the normalizer reuses a fallback id such as `logo-1`.
- Assert Wizard edits persist `logos[index].image`, `logos[index].alt`, and
  `logos[index].href`.
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
