# TASK-272-08: Hero Responsive Images and LCP Priority

# FileName: TASK-272-08_Hero_Responsive_Images_and_LCP_Priority.md

**Priority:** Medium
**Category:** Widgets + Hero + Media + Performance + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256-04, TASK-272-02, TASK-272-04
**Status:** Done (2026-05-19)

---

## Overview

Define and implement Hero-specific image loading behavior for responsive images,
inline media, centered background images, and LCP priority.

This leaf must resolve the tension between generic lazy-loading guidance and
Hero above-the-fold LCP behavior. The result should be a deterministic Hero
policy, not a one-off hardcoded attribute.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:226-227` - BF-07 missing `srcset` /
  responsive images.
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:238-239` - BF-11 missing
  `fetchpriority="high"` for Hero LCP image.
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:260-261` - A5/A6 image loading and
  LCP priority.
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:296` - priority summary.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/hero.tsx` | Extend Hero media output with bounded loading/fetch-priority policy and current-model responsive image attributes. Add `sizes` for current single-source images. Do not add `srcSet` unless a separate media-owner task first exposes real generated variants. |
| `core/admin/ui/widgets/editors/HeroEditors.tsx` | Add Hero media performance controls only if authors need to override default policy. Prefer sensible defaults and read-only diagnostics over advanced knobs. |
| `core/admin/services/mediaClient.ts` | Current model exposes `MediaRecord.url`, dimensions, and metadata only; do not change it in this Hero leaf. If responsive variants are promoted, split a separate media-service/API task before implementing `srcSet`. |
| `core/services/media/mediaService.ts`, `core/server/routes/mediaRoutes.ts`, and `core/server/validation/mediaSchemas.ts` | Out of scope for TASK-272-08 unless a separate media variant task is created. Name these owners there with full API/security contract if variants are promoted. |
| `tests/vitest/widgets/hero.test.tsx` | Assert centered/split/media-center image output includes the intended `loading`, `fetchPriority`, and `sizes` attributes for current single-source images. Assert `srcSet`/`picture` only after a media-owner variant task lands. |
| `tests/vitest/ui/hero-editor-wave.test.tsx` | Cover any new performance controls or diagnostics. |
| `tests/unit/widgets/validator.test.ts` | Run and update if schema fields change. |
| `_docs/_WIDGETS/HERO.md` | Document the Hero image loading policy. |
| `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md` | Mark BF-07/BF-11/A5/A6 fixed or record evidence/deferral. |

## Implementation Pseudocode

```ts
type HeroImageLoading = "auto" | "eager" | "lazy";
type HeroFetchPriority = "auto" | "high" | "low";

function resolveHeroImagePolicy(variant: string, media: HeroMedia, layout: HeroData["layout"]) {
  const likelyLcp = variant === "centered" || variant === "split" || variant === "media-center";
  return {
    loading: likelyLcp ? "eager" : "lazy",
    fetchPriority: likelyLcp ? "high" : "auto",
    sizes: variant === "centered" ? "100vw" : "(min-width: 768px) 50vw, 100vw",
  };
}
```

Runtime flow:

```tsx
<img
  src={media.src}
  alt={media.alt ?? ""}
  loading={policy.loading}
  fetchPriority={policy.fetchPriority}
  sizes={policy.sizes}
/>
```

Error handling:

- If the media service does not expose resized variants, do not fake `srcset`.
  Record a concrete deferral in the report and still add correct `sizes`,
  loading, and fetch-priority policy for current single-source images.
- External image URLs must not be transformed into guessed variant URLs.
- Background images cannot directly use `<img fetchPriority>`. If the centered
  Hero background remains CSS-only, add a hidden preload/diagnostic only if it
  is already an accepted local pattern; otherwise document the deferral and
  prefer `media-center`/inline image for LCP-critical images.
- Avoid browser-only APIs in pure widget renderer tests.

## Security Contract

No API routes are added by this Hero leaf. Responsive image variants remain
deferred until a separate media-owner task adds real generated variants.

- Endpoint visibility: none for Hero-only work. If media variants are promoted
  in a separate task, that task must document the existing or new media route
  visibility.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering for
  Hero-only work. Any media variant API work must state authenticated media
  read/write permissions, CSRF expectations for writes, and the rate-limit
  bucket in its own task.
- Reject-unknown validation: any new media policy fields must be strict enums.
- Anti-abuse: no remote URL rewriting, no untrusted `srcset` generation, no raw
  HTML injection, and no secrets in diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/hero.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx` if editor
  controls or diagnostics change.
- `bun test tests/unit/widgets/validator.test.ts` if schema fields change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/HERO.md`
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md`
- `_docs/_TASKS/TASK-272-08_Hero_Responsive_Images_and_LCP_Priority.md`
- `_docs/_TASKS/README.md` on status changes

## Final Evidence

- Closed on 2026-05-19 with deterministic Hero image loading, fetch-priority,
  and `sizes` behavior, plus an explicit defer note for future true
  `srcset`/`picture` media-variant support.
- Focused proof lives in `tests/vitest/widgets/hero.test.tsx` and TASK-272-09.

## Acceptance Criteria

- Hero has a documented image loading policy that handles LCP vs lazy-loading
  without contradictory attributes.
- Inline Hero image output includes deterministic loading/fetch-priority/sizes
  behavior.
- Responsive image support is either implemented through real media variants or
  explicitly deferred with evidence that the current media model cannot supply
  variants.
- The implementation does not invent Hero-local media variant storage.
