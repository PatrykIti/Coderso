# TASK-263-05: CTA Banner Layout Media and Motion Options

# FileName: TASK-263-05_CTA_Banner_Layout_Media_and_Motion_Options.md

**Priority:** Medium
**Category:** Widgets + Runtime Render + Admin UI + Media + Motion
**Estimated Effort:** Large
**Dependencies:** TASK-263, TASK-263-03, TASK-263-04, TASK-256-07
**Status:** To Do

---

## Overview

Add larger CTA Banner presentation options requested by
`_docs/PLAYWRIGHT/REPORT_CTA_BANNER_WIDGET.md`: full-width mode, gradient
background, background media, and bounded entrance effects.

This leaf is intentionally later in the family because it expands the CTA data
model. It must first verify whether the existing page-level widget layout
container already satisfies a report request. Do not duplicate page-builder
layout controls inside CTA Banner unless the current CTA renderer itself still
prevents the requested output.

## Sub-Tasks

- [ ] Audit current `WidgetRenderer` container/layout behavior and document
  whether CTA-specific full-width control is still required.
- [ ] If still required, add a CTA-local width mode that can remove the current
  `max-w-6xl px-4 py-8` constraint without fighting the page-level container.
- [ ] Add a background mode model for `solid`, `gradient`, and `image` without
  breaking existing `style.background` payloads.
- [ ] Reuse existing media picker/admin components for background image
  selection; do not introduce a new media storage or upload contract.
- [ ] Add allowlisted image fit/position fields for background media.
- [ ] Add bounded motion preset fields for entrance effects. Prefer CSS classes
  or data attributes already used by the runtime over custom scripts.
- [ ] Keep all expanded fields backward compatible and optional.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/ctaBanner.tsx` | Add width/background/motion schema, defaults, normalizer, and render output. |
| `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` | Add Visual controls for full-width, background mode, gradient/image settings, and motion preset. |
| Existing media picker components | Reuse only if background image selection is implemented; do not create a new media API. |
| `tests/vitest/widgets/ctaBanner.test.tsx` | Cover width mode, gradient style, image style, motion attrs/classes, and legacy fallback. |
| `tests/vitest/ui/cta-banner-editor-wave.test.tsx` | Cover editor controls and mode-specific field visibility. |
| `tests/unit/widgets/validator.test.ts` | Update when schema/defaults change. |
| `_docs/_WIDGETS/CTA_BANNER.md` | Document layout, background, media, and motion options. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if CTA Banner readiness/completeness changes. |

## Implementation Pseudocode

```ts
type CtaBannerWidth = "contained" | "wide" | "full";
type CtaBackgroundMode = "solid" | "gradient" | "image";
type CtaMotionPreset = "none" | "fade-in" | "slide-up";

type CtaBannerData = {
  layout?: {
    width?: CtaBannerWidth;
  };
  background?: {
    mode?: CtaBackgroundMode;
    gradient?: {
      from?: string;
      to?: string;
      direction?: "to-r" | "to-br" | "to-b";
    };
    image?: {
      src?: string;
      alt?: string;
      fit?: "cover" | "contain";
      position?: "center" | "top" | "bottom";
    };
  };
  motion?: {
    preset?: CtaMotionPreset;
  };
};
```

Renderer helpers:

```ts
function resolveOuterClass(width: CtaBannerWidth) {
  if (width === "full") return "w-full px-0 py-8";
  if (width === "wide") return "mx-auto w-full max-w-7xl px-4 py-8";
  return "mx-auto w-full max-w-6xl px-4 py-8";
}

function resolveBackgroundStyle(data: CtaBannerData): CSSProperties {
  if (data.background?.mode === "gradient") return buildSafeGradient(data.background.gradient);
  if (data.background?.mode === "image") return buildSafeImageBackground(data.background.image);
  return { backgroundColor: resolveClearableStyleValue(data.style?.background) };
}
```

Error handling:

- If `layout.width` conflicts with page-level layout, document the precedence and
  keep output deterministic.
- Missing or unsafe media URLs fall back to solid background.
- Gradient colors use existing color/token validation behavior; no arbitrary CSS
  function passthrough unless already accepted by the style contract.
- Motion presets are fixed enums and must not inject custom JavaScript.
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
- Media picker focused test if this leaf reuses a picker and changes its
  integration behavior
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

- Full-width behavior is deterministic and does not fight page-level layout.
- Gradient and image backgrounds are editor-owned, schema-owned, normalized, and
  safe.
- Motion options are bounded and do not add public runtime scripts.
- Existing CTA Banner payloads render unchanged until new fields are configured.
