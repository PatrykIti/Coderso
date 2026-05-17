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
editor canvas to configure image URLs, basic link URLs, or media-picked logo
assets.

Source report findings:

- UX-03 Wizard missing Image URL and Link URL per logo
- UX-04 missing thumbnail preview
- UX-06 missing Media Library picker
- BF-10 image URL validation/preview feedback

Explicitly out of scope:

- Defining a separate Logo Cloud `alt` field; TASK-256 owns the media
  accessibility baseline.
- Defining generic link URL validation or safe href behavior; TASK-256 owns
  shared link feedback. This leaf may wire the Logo Cloud `href` authoring
  surface and display TASK-256 validation output once available.
- Persisting private media metadata, signed URLs, or provider credentials.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/logoCloud.tsx` | Extend logo item schema only if the existing `image` string must gain a paired `assetId` or source field. Keep legacy `image` URL support. |
| `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` | Add Wizard image/link inputs or picker entry points, Visual thumbnails, MediaPicker integration, and image preview feedback for logo images. |
| `core/admin/ui/media/MediaPicker.tsx` | Reuse only; do not fork or add Logo Cloud-specific picker behavior unless the shared picker lacks required typed output. |
| `tests/vitest/ui/logo-cloud-editor-wave.test.tsx` | Cover Wizard image/link updates, Visual thumbnail rendering, MediaPicker selection flow, image unavailable/error feedback, and TASK-256 link-feedback integration when available. |
| `tests/vitest/widgets/logoCloud.test.tsx` | Cover backward-compatible normalization if schema changes. |
| `tests/unit/widgets/validator.test.ts` | Cover accepted/rejected logo item fields only if intentionally expanding the generic Bun validator suite. |
| `_docs/_WIDGETS/LOGO_CLOUD.md` | Document image source behavior and editor ownership. |
| `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md` | Record fixed evidence for UX-03/UX-04/UX-06 and the BF-10 image-feedback slice. |

## Implementation Pseudocode

```tsx
type LogoCloudLogo = {
  id?: string;
  name?: string;
  image?: string;
  imageAssetId?: string;
  href?: string;
};

async function resolveLogoMediaAsset(assetId: string) {
  const items = await listMediaCached({ force: true });
  const match = items.find((item) => item.id === assetId);
  if (!match?.url) throw new Error("logo_cloud_media_not_found");
  return {
    imageAssetId: assetId,
    image: match.url,
    name: match.title?.trim() || match.originalName?.trim(),
  };
}

function LogoImageControl({ logo, index }: LogoImageControlProps) {
  return (
    <div>
      {logo.image ? (
        <img src={logo.image} alt="" className="h-8 w-8 rounded object-contain" loading="lazy" />
      ) : null}
      <Input
        value={logo.image ?? ""}
        onChange={(event) => updateLogo(value, onChange, index, { image: event.target.value })}
      />
      <Input
        value={logo.href ?? ""}
        onChange={(event) => updateLogo(value, onChange, index, { href: event.target.value })}
      />
      <MediaPicker
        value={logo.imageAssetId ?? null}
        onChange={(next) => void handleLogoAssetChange(index, next)}
        multiple={false}
        accept={["image/*"]}
      />
    </div>
  );
}
```

Editor data flow:

1. Wizard keeps its minimal setup role, but each visible logo row gets compact
   image and link fields or an image-picker affordance next to the name field.
2. Visual repeated logo cards reuse the same image control and show a bounded
   thumbnail preview when `logo.image` is non-empty.
3. MediaPicker selection resolves the public media URL through
   `listMediaCached`; store only the public URL and optional stable asset ID if
   schema ownership accepts it.
4. Manual image URL and link URL entry remain supported for backward
   compatibility.
5. Link URL validation UI consumes TASK-256 shared safe-link output when that
   contract exists; do not hand-roll a second link validator in this leaf.

Error handling:

- If MediaPicker resolution fails, show an inline error and keep the previous
  logo data unchanged.
- If selected media is unavailable, keep the selected ID out of persisted data
  unless a public URL was resolved.
- Broken external image URLs must not crash the editor; thumbnail fallback should
  show a compact unavailable state.
- Link URL feedback must consume TASK-256 shared validation/safe href results;
  unsafe hrefs are not locally classified here.
- Legacy logo entries with only `image` keep rendering and editing.

Regression-test shape:

- Mock `MediaPicker` at the editor import seam to emit the selected image ID
  shape used by the real picker.
- Mock the media cache client used by the editor, including success,
  not-found, and failure cases for `listMediaCached`.
- Assert Wizard edits persist both `logos[index].image` and
  `logos[index].href`.
- Assert Visual thumbnails render success and unavailable states without
  mutating saved logo data.

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
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/LOGO_CLOUD.md`
- `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md`
- `_docs/_TASKS/README.md` on status transition.
- `_docs/_CHANGELOG/README.md` and a changelog entry when this leaf is completed
  independently or through TASK-274-06 closure.

## Acceptance Criteria

- Wizard can seed real logo images and basic link URLs without requiring a
  Visual-mode round trip.
- Visual logo cards show bounded thumbnails for configured images.
- Media Library picking uses existing media ownership and failure handling.
- Existing manual image URL payloads still normalize and render.
- No TASK-256 link validation, safe href, or alt-text contract is duplicated in
  this leaf.
