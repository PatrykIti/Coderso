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
- bounded `mediaFit`, `mediaPosition`, `mediaOpacity`, and `mediaBlendMode`
  tokens;
- bounded overlay/content layer order only inside the Section surface;
- editor controls that make decorative media behavior explicit and avoid
  promising content images;
- SSR-safe output with no autoplay surprises when video support is deferred.

Out of scope:

- raw HTML, iframe embeds, arbitrary remote scripts, or unbounded CSS;
- global Media Library redesign or upload API changes;
- generic responsive image/LCP policy outside the Section background surface;
- TASK-256 clear/token/color-picker fixes.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:47` - C2 background image/video
  support is missing.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:69` - W11 z-index layer controls.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:110-117,292-298` - current
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
- [ ] Add Visual controls for media source, fit, position, opacity, blend, and
  layer priority.
- [ ] Keep overlay color/opacity controls compatible with existing data and with
  TASK-256 duplicate-control cleanup.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/section.tsx` | Extend schema/types/defaults/normalizer and render safe background media plus bounded layer classes/styles. |
| `core/admin/ui/widgets/editors/SectionEditors.tsx` | Add Visual controls for media background and layer behavior, using existing media picker/control patterns if available. |
| `tests/vitest/widgets/section.test.tsx` | Add SSR assertions for decorative media output, legacy no-media defaults, opacity/blend bounds, and no script/html leakage. |
| `tests/vitest/ui/section-editor-wave.test.tsx` | Add editor coverage for media controls and emitted normalized payloads. |
| `tests/unit/widgets/validator.test.ts` | Run and update when schema/defaults change. |

## Implementation Pseudocode

Schema shape:

```ts
type SectionBackgroundMedia = {
  kind?: "none" | "image" | "video";
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
  return {
    kind,
    src: sanitizeMediaSource(media?.src),
    alt: "",
    fit: resolveMediaFit(media?.fit),
    position: resolveMediaPosition(media?.position),
    opacity: clampPercent(media?.opacity, 100),
    blendMode: resolveBlendMode(media?.blendMode),
  };
}
```

Renderer flow:

```tsx
{backgroundMedia.kind === "image" && backgroundMedia.src ? (
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
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
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
