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
editor canvas to verify image URLs.

Source report findings:

- UX-03 Wizard missing Image URL per logo
- UX-04 missing thumbnail preview
- UX-06 missing Media Library picker

Explicitly out of scope:

- Defining a separate Logo Cloud `alt` field; TASK-256 owns the media
  accessibility baseline.
- Defining generic URL validation or safe href behavior; TASK-256 owns shared
  URL feedback. This leaf may display TASK-256 validation output once available.
- Persisting private media metadata, signed URLs, or provider credentials.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/logoCloud.tsx` | Extend logo item schema only if the existing `image` string must gain a paired `assetId` or source field. Keep legacy `image` URL support. |
| `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` | Add Wizard image inputs or picker entry points, Visual thumbnails, and MediaPicker integration for logo images. |
| `core/admin/ui/media/MediaPicker.tsx` | Reuse only; do not fork or add Logo Cloud-specific picker behavior unless the shared picker lacks required typed output. |
| `tests/vitest/ui/logo-cloud-editor-wave.test.tsx` | Cover Wizard image updates, Visual thumbnail rendering, MediaPicker selection flow, and resolution error feedback. |
| `tests/vitest/widgets/logoCloud.test.tsx` | Cover backward-compatible normalization if schema changes. |
| `tests/unit/widgets/validator.test.ts` | Cover accepted/rejected logo item fields if schema changes. |
| `_docs/_WIDGETS/LOGO_CLOUD.md` | Document image source behavior and editor ownership. |
| `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md` | Record fixed evidence for UX-03/UX-04/UX-06. |

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

1. Wizard keeps its minimal setup role, but each visible logo row gets a compact
   image field or image-picker affordance next to the name field.
2. Visual repeated logo cards reuse the same image control and show a bounded
   thumbnail preview when `logo.image` is non-empty.
3. MediaPicker selection resolves the public media URL through
   `listMediaCached`; store only the public URL and optional stable asset ID if
   schema ownership accepts it.
4. Manual URL entry remains supported for backward compatibility.

Error handling:

- If MediaPicker resolution fails, show an inline error and keep the previous
  logo data unchanged.
- If selected media is unavailable, keep the selected ID out of persisted data
  unless a public URL was resolved.
- Broken external image URLs must not crash the editor; thumbnail fallback should
  show a compact unavailable state.
- Legacy logo entries with only `image` keep rendering and editing.

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
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change.
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/LOGO_CLOUD.md`
- `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md`
- `_docs/_TASKS/README.md` on status transition.
- `_docs/_CHANGELOG/README.md` and a changelog entry when this leaf is completed
  independently or through TASK-274-06 closure.

## Acceptance Criteria

- Wizard can seed real logo images without requiring a Visual-mode round trip.
- Visual logo cards show bounded thumbnails for configured images.
- Media Library picking uses existing media ownership and failure handling.
- Existing manual image URL payloads still normalize and render.
- No TASK-256 safe URL or alt-text contract is duplicated in this leaf.
