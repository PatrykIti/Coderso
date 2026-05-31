# TASK-263-05: CTA Banner Layout Media and Motion Options

# FileName: TASK-263-05_CTA_Banner_Layout_Media_and_Motion_Options.md

**Priority:** Medium
**Category:** Widgets + Runtime Render + Admin UI + Media + Motion
**Estimated Effort:** Large
**Dependencies:** TASK-263, TASK-263-03, TASK-263-04, TASK-256-07
**Status:** Done (2026-05-17)

---

## Overview

Add larger CTA Banner presentation options requested by
`_docs/PLAYWRIGHT/REPORT_CTA_BANNER_WIDGET.md`: full-width mode, gradient
background, background media, and bounded entrance effects.

This leaf is intentionally later in the family because it expands the CTA data
model. The BF-05 width audit is now resolved: shared page/block layout already
owns container width through the existing Layout panel, so CTA Banner must not
add a second width contract. This leaf closes BF-05 by removing the CTA-local
hardcoded inner `max-w-6xl` wrapper and documenting that full-width is achieved
through the shared block Layout panel (`WidgetBlock.layout.container`).

This leaf must also stay conservative about motion, following the same two-way
decision used by Timeline motion work: either ship CSS-only, reduced-motion-safe
CTA-local presets, or record an explicit no-code/shared-task deferral.

## Sub-Tasks

- [ ] Remove the CTA-local hardcoded `max-w-6xl` inner wrapper so the existing
  shared block Layout panel can truthfully deliver BF-05 full-width behavior.
- [ ] Update CTA docs/report evidence to point BF-05 at the shared block Layout
  panel instead of inventing a CTA-local width field.
- [ ] Reuse one existing background owner-model from the repo instead of
  inventing a CTA-only `background.mode` contract; prefer Hero-style
  `background.color` / `background.gradient` / `background.media` unless the
  audit proves Section-style split fields are materially better for CTA.
- [ ] Reuse existing ID-based media picker/admin components for background
  image selection; do not introduce a new media storage or upload contract.
- [ ] Model media-library selections as an asset ID plus resolved public URL
  metadata, following the existing Hero background-media pattern instead of
  treating `MediaPicker` as a raw `src` picker.
- [ ] Add allowlisted image fit/position fields for background media.
- [ ] Add bounded motion preset fields only if they can stay CSS-only,
  SSR-safe, and reduced-motion aware. Otherwise record an explicit no-code or
  shared-task deferral instead of forcing motion into this leaf.
- [ ] Keep all expanded fields backward compatible and optional.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/ctaBanner.tsx` | Remove the redundant internal width constraint so shared block layout can own BF-05; add background/motion schema, defaults, normalizer, and render output only for CTA-owned fields. |
| `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` | Add CTA-owned background/media controls and motion decisions; do not add a second width control for BF-05. |
| `core/admin/ui/media/MediaPicker.tsx` | Reuse for background image selection if media selection is implemented; do not create a new media API. |
| `tests/vitest/widgets/ctaBanner.test.tsx` | Cover shared-layout-compatible wrapper cleanup, gradient style, image style, motion attrs/classes or no-code deferral, and legacy fallback. |
| `tests/vitest/ui/cta-banner-editor-wave.test.tsx` | Cover BF-05 block-layout patching when used, editor controls, and mode-specific field visibility. |
| `tests/vitest/ui/media-picker.test.tsx` | Run/update only if this leaf changes `MediaPicker` behavior instead of only consuming it. |
| `tests/unit/widgets/validator.test.ts` | Update when schema/defaults change. |
| `_docs/_WIDGETS/CTA_BANNER.md` | Document layout, background, media, and motion options. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if CTA Banner readiness/completeness changes. |

## Reference Patterns

- `core/admin/ui/widgets/editors/HeroEditors.tsx` for background gradient/media
  editor flow and asset-resolution error handling.
- `core/widgets/core/hero.tsx` for the existing background/media runtime shape.
- `core/admin/ui/widgets/editors/SectionEditors.tsx` for bounded gradient field
  copy if the audit proves Section-style split fields are better than Hero-style
  gradient strings.

## Implementation Pseudocode

```ts
type CtaMotionPreset = "none" | "fade-in" | "slide-up";

type CtaBannerData = {
  background?: {
    color?: string;
    gradient?: string;
    media?: {
      type?: "none" | "image";
      source?: "library" | "external";
      assetId?: string;
      src?: string;
      fit?: "cover" | "contain";
      position?: "center" | "top" | "bottom";
      overlay?: string;
    };
  };
  motion?: {
    preset?: CtaMotionPreset;
  };
};
```

Editor media selection flow:

```ts
async function resolveBackgroundImageSelection(assetId: string | null) {
  requestIdRef.current += 1;
  const requestId = requestIdRef.current;
  setMediaLookupError(null);
  try {
    const items = await listMediaCached({ force: false });
    if (requestId !== requestIdRef.current) return null;
    const asset = items.find((item) => item.id === assetId);
    return {
      type: assetId ? "image" : "none",
      source: assetId ? "library" : "external",
      assetId: assetId ?? undefined,
      src: asset?.url,
      fit: "cover",
      position: "center",
    };
  } catch (error) {
    if (requestId !== requestIdRef.current) return null;
    setMediaLookupError(isApiClientError(error) ? error.message : "Failed to resolve selected media.");
    return null;
  }
}
```

Renderer helpers:

```ts
function resolveSurfaceClass() {
  return "w-full px-4 py-8";
}

function resolveBackgroundStyle(data: CtaBannerData): CSSProperties {
  const gradient = resolveClearableStyleValue(data.background?.gradient);
  const color = resolveClearableStyleValue(data.background?.color);
  const image = data.background?.media?.type === "image" ? data.background.media.src : undefined;
  return compactStyle({
    backgroundColor: color,
    backgroundImage: image ? [gradient, `url(${image})`].filter(Boolean).join(", ") : gradient,
    backgroundSize: image ? data.background?.media?.fit ?? "cover" : undefined,
    backgroundPosition: image ? data.background?.media?.position ?? "center" : undefined,
  }) ?? {};
}
```

Error handling:

- BF-05 uses the shared block Layout panel and CTA wrapper cleanup. This leaf
  should not add a competing width schema inside CTA data.
- `MediaPicker` emits media IDs or `null`; CTA editor code must resolve IDs
  through the existing cached media lookup before writing any `src` snapshot.
- Missing or unsafe resolved media URLs fall back to solid background.
- Background gradient/media should follow one existing owner-model from the repo
  rather than mixing a CTA-only `mode` shape with Hero/Section semantics.
- Motion presets are fixed enums, must not inject custom JavaScript, and should
  fail closed under reduced-motion preferences. If CSS-only motion is not
  acceptable, record the no-code or shared-task deferral instead of forcing a
  one-off runtime script.
- Old blocks with only `style.background` render exactly as before.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: all layout/background/motion fields must be
  allowlisted in `ctaBannerSchema`.
- Anti-abuse: image URLs must use existing media/safe URL rules; gradients and
  motion are bounded enums or sanitized color/token values. No scripts, raw CSS
  blobs, untrusted classes, private media URLs, or provider credentials.
- Secret handling: media provider keys and private upload credentials must never
  be persisted in widget data, browser cache, diagnostics, or report evidence.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/ctaBanner.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/cta-banner-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` when schema changes
- `bun run test:vitest -- tests/vitest/ui/media-picker.test.tsx` if this leaf
  changes `MediaPicker` behavior instead of only consuming it
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/CTA_BANNER.md` with width, gradient, image, and motion
  behavior.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if this changes pack readiness.
- Update `_docs/PLAYWRIGHT/REPORT_CTA_BANNER_WIDGET.md` rows BF-04, BF-05,
  BF-06, and BF-10 after validation.

## Changelog Policy

- Covered by the TASK-263 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- BF-05 is satisfied through shared block layout plus CTA wrapper cleanup. CTA
  does not introduce a competing width schema.
- Gradient and image backgrounds are editor-owned, schema-owned, normalized, and
  safe without inventing a third background contract just for CTA.
- Motion options are either bounded, CSS-only, and reduced-motion safe, or they
  are explicitly deferred without public runtime scripts.
- Existing CTA Banner payloads render unchanged until new fields are configured.
