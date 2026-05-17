# TASK-283-02: Section Background Media and Layering Model

# FileName: TASK-283-02_Section_Background_Media_and_Layering_Model.md

**Priority:** High
**Category:** Widgets + Section + Media + Runtime Render + Admin UI
**Estimated Effort:** Very Large
**Dependencies:** TASK-256-02, TASK-256-05-01, TASK-283, TASK-283-01
**Status:** To Do

---

## Overview

Add a Section-owned background media model for images and video-like decorative
backgrounds, plus bounded layering controls for overlay and content.

This leaf covers report findings C2 and W11. It does not own generic media
library contracts, shared image-alt policy, token-aware color pickers, or
gradient Clear controls.

## Scope Boundary

In scope:

- Section `style.backgroundMedia` data for decorative images and optional muted
  looping video backgrounds when the existing media/runtime safety patterns can
  be reused;
- asset-backed media selection that stores `source`, `assetId`, and resolved
  `src` consistently with the existing Hero media flow;
- bounded `mediaFit`, `mediaPosition`, `mediaOpacity`, and `mediaBlendMode`
  tokens;
- bounded overlay/content layer order only inside the Section surface;
- editor controls that reuse `MediaPicker` for asset-backed sources and make
  decorative media behavior explicit without promising content images;
- SSR-safe output with no autoplay surprises when video support is deferred.

Out of scope:

- raw HTML, iframe embeds, arbitrary remote scripts, or unbounded CSS;
- global Media Library redesign or upload API changes;
- generic responsive image/LCP policy outside the Section background surface;
- TASK-256 clear/token/color-picker fixes.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:56` - C2 background image/video
  support is missing.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:75` - W11 z-index layer controls.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:186-194,253-259` - current
  background/overlay DOM and layering model.

## Sub-Tasks

- [ ] Define a bounded `SectionBackgroundMedia` shape under `SectionData.style`
  or a dedicated `SectionData.background` owner without breaking legacy style
  payloads.
- [ ] Add normalizer helpers that accept legacy blocks with no media and reject
  or strip unsafe media payloads through schema validation.
- [ ] Render image backgrounds as decorative CSS/background layers or safe
  absolutely positioned media elements with `aria-hidden` when appropriate.
- [ ] Decide whether video background support lands in this leaf or is deferred
  to TASK-283-08 with exact owner/reason if the current media stack lacks a safe
  primitive.
- [ ] Reuse `core/admin/ui/media/MediaPicker.tsx` for asset selection with
  image/video accept filters, and keep the selected value compatible with
  existing media client/cache behavior.
- [ ] Resolve selected `assetId` through `listMediaCached({ force: true })`
  with stale-request protection and inline error state, matching the Hero media
  editor flow instead of persisting picker-only state.
- [ ] Add Visual controls for media source, fit, position, opacity, blend, and
  layer priority.
- [ ] Keep overlay color/opacity controls compatible with existing data and with
  TASK-256 duplicate-control cleanup.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/section.tsx` | Extend schema/types/defaults/normalizer and render safe background media plus bounded layer classes/styles. |
| `core/admin/ui/widgets/editors/SectionEditors.tsx` | Add Visual controls for media background and layer behavior, wiring Section media fields to `MediaPicker`. |
| `core/admin/ui/media/MediaPicker.tsx` | Reuse as the asset picker owner. Touch only if Section background media needs a missing accept/preview behavior that should be shared. |
| `core/admin/services/mediaClient.ts` | Use the existing `listMediaCached` lookup to resolve selected `assetId` to `src`; do not introduce a Section-only media fetcher. |
| `tests/vitest/widgets/section.test.tsx` | Add SSR assertions for decorative media output, legacy no-media defaults, opacity/blend bounds, and no script/html leakage. |
| `tests/vitest/ui/section-editor-wave.test.tsx` | Add editor coverage for media controls and emitted normalized payloads. |
| `tests/vitest/ui/media-picker.test.tsx` | Run and update only if `MediaPicker` behavior changes for Section media selection. |
| `tests/unit/widgets/validator.test.ts` | Run and update when schema/defaults change. |

## Implementation Pseudocode

Schema shape:

```ts
type SectionBackgroundMedia = {
  kind?: "none" | "image" | "video";
  source?: "library" | "external";
  assetId?: string;
  src?: string;
  alt?: "";
  fit?: "cover" | "contain";
  position?: "center" | "top" | "bottom" | "left" | "right";
  opacity?: number;
  blendMode?: "normal" | "multiply" | "screen" | "overlay";
};
```

Normalizer flow:

```ts
function normalizeSectionBackgroundMedia(media: unknown): SectionBackgroundMedia {
  const kind = resolveMediaKind(media?.kind);
  if (kind === "none") return { kind: "none" };
  const source = resolveMediaSource(media?.source);
  return {
    kind,
    source,
    assetId: source === "library" ? normalizeAssetId(media?.assetId) : undefined,
    src: sanitizeMediaSource(media?.src),
    alt: "",
    fit: resolveMediaFit(media?.fit),
    position: resolveMediaPosition(media?.position),
    opacity: clampPercent(media?.opacity, 100),
    blendMode: resolveBlendMode(media?.blendMode),
  };
}
```

Editor media lookup flow:

```ts
async function handleSectionBackgroundAssetChange(assetId: string | null) {
  requestIdRef.current += 1;
  const requestId = requestIdRef.current;
  if (!assetId) {
    updateBackgroundMedia({ source: "library", assetId: undefined, src: undefined });
    return;
  }

  updateBackgroundMedia({ source: "library", assetId });
  try {
    const items = await listMediaCached({ force: true });
    if (requestId !== requestIdRef.current) return;
    const match = items.find((item) => item.id === assetId);
    if (!match) {
      setLookupError("Selected media could not be resolved.");
      return;
    }
    updateBackgroundMedia({ source: "library", assetId, src: match.url });
  } catch {
    if (requestId === requestIdRef.current) {
      setLookupError("Failed to resolve media URL.");
    }
  }
}
```

Renderer flow:

```tsx
{backgroundMedia.kind === "image" && isSafeSectionMediaSource(backgroundMedia.src) ? (
  <div
    aria-hidden="true"
    className={joinClasses("pointer-events-none absolute inset-0 z-[0]", mediaFitClass)}
    style={compactStyle({
      backgroundImage: `url(${backgroundMedia.src})`,
      backgroundPosition: positionMap[backgroundMedia.position],
      opacity: backgroundMedia.opacity / 100,
      mixBlendMode: backgroundMedia.blendMode,
    })}
  />
) : null}
```

Error handling:

- Unsafe or empty media sources normalize to `kind: "none"` or are rejected by
  schema/tests according to the existing widget validator pattern.
- Asset IDs selected through `MediaPicker` must resolve through existing media
  client/cache seams; do not persist privileged media URLs or picker-only state.
- Stale media lookup responses must be ignored so a slow asset resolution cannot
  overwrite a newer selection.
- Video support must be deferred rather than shipped if the current runtime does
  not have a safe reusable decorative-video primitive.
- Layer controls cannot place content below a non-interactive overlay in a way
  that hides focus or pointer affordances.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: media and layer fields must be schema-bound with
  `additionalProperties: false`.
- Anti-abuse: no raw HTML, script URLs, event handlers, iframes, arbitrary
  classes, or arbitrary z-index values. Media URLs must follow existing safe
  media/source rules.
- Secret handling: no private media tokens, provider keys, or privileged URLs in
  persisted widget data, diagnostics, or Playwright evidence.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/section-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/media-picker.test.tsx` if
  `MediaPicker` behavior changes.
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict` before closure because media input handling is
  security-adjacent.
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/SECTION.md` with background media and layer behavior.
- Update `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md` rows C2 and W11 after
  validation or explicit deferral.
- Update `_docs/WIDGETS.md` only if the shared widget media contract changes.

## Acceptance Criteria

- Section supports safe decorative background media or records an explicit
  deferral for video support with owner and reason.
- Overlay/media/content layers remain bounded, accessible, and deterministic.
- Existing Section blocks with color/gradient-only backgrounds remain backward
  compatible.
- Tests prove schema, normalizer, renderer, and editor behavior for media and
  layering.
