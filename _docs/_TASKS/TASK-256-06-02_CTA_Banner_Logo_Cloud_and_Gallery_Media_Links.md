# TASK-256-06-02: CTA Banner, Logo Cloud, and Gallery Media Links

# FileName: TASK-256-06-02_CTA_Banner_Logo_Cloud_and_Gallery_Media_Links.md

**Priority:** High
**Category:** Widgets + Marketing Content + Media + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256-01, TASK-256-02, TASK-256-04, TASK-256-06
**Status:** To Do

---

## Overview

Repair shared media/link/clear/accessibility drift for `logo-cloud` and
`gallery-mosaic`, plus any cross-widget helper work that CTA Banner must consume
later. CTA Banner product/runtime/editor fixes from the same report are now
owned by TASK-263. This leaf must not also implement CTA-specific empty badge,
description color, action-label, URL-feedback, focus, layout, icon, or motion
work; it may only provide shared helper contracts that TASK-263 explicitly
depends on. Logo Cloud per-logo `alt`, image picker, Wizard image/link
authoring, drag/drop, marquee, eyebrow/background, and open-new-tab product
controls are deferred to the TASK-274 family.

## Drift Evidence

- `_docs/PLAYWRIGHT/REPORT_CTA_BANNER_WIDGET.md:162-164` for generic Clear
  semantics (TASK-256-02) and `:199-200` only if target/rel needs a reusable
  shared safe-link attribute helper. CTA-specific rows are planned in TASK-263.
- `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md:38-116,119-153,260-262` for
  missing link `rel`, heading/section ARIA, hoverColor truthfulness, and logo
  height safety. Wizard image/link gaps, per-logo `alt`, image picker, marquee,
  drag/drop, product shell fields, and open-new-tab product controls are
  deferred to TASK-274.
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:54-94,140-147,195-225,239-243,274-281,342-347` for
  media type ambiguity, overlay alpha loss, alt/caption semantics, video picker
  scope, feature-left minimum handling, link security, and hover-caption
  accessibility.
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:226,331,383` is explicitly
  outside this shared-contract leaf: video poster image is a Gallery
  Mosaic-specific product field owned by TASK-270-03.
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:3` is now marked
  `Zakończony`; this leaf may use the current report ranges for planning, while
  TASK-256-08 must still refresh fixed/deferred status after implementation.

## Scope Decision Matrix

| Finding | TASK-256 action | Owner | Follow-up policy |
|---|---|---|---|
| CTA empty badge/text/focus/action-label/url-feedback drift | Reclassified to TASK-263 | `TASK-263-01`, `TASK-263-02` | TASK-256-08 records the reclassification, not implementation ownership |
| CTA Clear drift | Generic Clear semantics stay in TASK-256-02; CTA field wiring is TASK-263-03 only if TASK-256-02 leaves a CTA-local hook | `TASK-256-02`, `TASK-263-03` | Do not implement a CTA-only Clear model here |
| CTA target/rel helper need | Provide a shared helper only if target/rel behavior must be reusable across widgets | `widgetSafeHref.ts`, `widgetSafeHref.test.ts` | CTA adoption and CTA product controls stay in TASK-263-04 |
| CTA BF/accessibility list beyond current controls, including animation, icon controls, and broad layout additions | Product scope | TASK-263 | TASK-256-08 records the route |
| Logo Cloud safe href/`rel`, section aria, heading semantics, `logoHeight: "none"` safety, and hoverColor truthfulness | Fix here | `LogoCloudEditors.tsx`, `logoCloud.tsx` | None |
| Logo Cloud image picker, drag/drop, marquee, eyebrow/background, per-logo `alt`, Wizard image/link authoring, and open-new-tab product control | Future product scope unless needed to repair broken current flow | TASK-274 family | TASK-274 owns the physical follow-up leaves; TASK-256 only supplies shared safe link attributes. |
| Gallery Mosaic overlay alpha loss and image/video ambiguity | Fix here because current controls can destroy data or mislead users | `GalleryMosaicEditors.tsx` | None |
| Gallery Mosaic feature-left one-item empty column plus redundant row-span/resolver cleanup | Fix here because current runtime output is visibly misleading for an existing variant | `galleryMosaic.tsx`, `tests/vitest/widgets/galleryMosaic.test.tsx` | None |
| Gallery Mosaic alt text and link security | Fix here | `galleryMosaic.tsx`, editor tests | None |
| Gallery Mosaic Wizard video support and current media-type truthfulness | Fix here for Wizard media accept rules and the current image/video priority controls only | `GalleryMosaicEditors.tsx`, `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx` | Visual per-item MediaPicker remains TASK-270-01 |
| Gallery Mosaic video `title`, hover-caption keyboard/touch access, and autoplay control | Fix here when it changes current runtime semantics; otherwise create explicit accessibility follow-up | `galleryMosaic.tsx`, `GalleryMosaicEditors.tsx` | TASK-256-08 creates follow-up if schema expansion is required |
| Gallery Mosaic Visual per-item MediaPicker, lightbox, drag/drop, per-item ratio, object-position, video poster image, responsive columns, motion, and import/export | Future product scope | TASK-270 | Excluded from TASK-256 and implemented or deferred by physical TASK-270 leaves |

## Sub-Tasks

- [ ] Do not implement CTA Banner product/runtime/editor fixes in this leaf;
  keep those rows routed to TASK-263.
- [ ] If several widgets need target/rel output, add a shared
  `resolveWidgetLinkAttrs()` helper in `widgetSafeHref.ts` and focused tests.
- [ ] Keep generic color Clear semantics in TASK-256-02; do not wire CTA field
  Clear controls here.
- [ ] Add Logo Cloud safe external-link output and section/header ARIA.
- [ ] Gate Logo Cloud `hoverColor` controls when grayscale is inactive.
- [ ] Preserve Gallery Mosaic overlay alpha and add opacity-aware editing.
- [ ] Make Gallery Mosaic media type selection explicit when image and video
  fields are both present.
- [ ] Repair Gallery Mosaic feature-left one-item runtime output and clean up
  redundant row-span/resolver drift without adding new product fields.
- [ ] Limit Gallery Mosaic Wizard media picker repair to current contract video
  support; Visual per-item picker remains TASK-270-01.
- [ ] Add separate alt/figure semantics for Gallery Mosaic images where the
  data model changes are accepted.

## Files to Change

| File | Lines | Required change |
|---|---:|---|
| `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` | n/a | Do not edit for CTA-specific rows in this leaf; TASK-263 owns CTA editor changes. |
| `core/widgets/core/ctaBanner.tsx` | n/a | Do not edit for CTA-specific rows in this leaf; TASK-263 owns CTA renderer changes. |
| `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` | 284-694 | Shared-contract Logo Cloud repairs only: hoverColor gating and link feedback from the shared safe-href helper. Advanced duplicate-control cleanup stays in TASK-256-01; per-logo `alt`, image picker, and Wizard image/link authoring stay in TASK-274. |
| `core/widgets/core/logoCloud.tsx` | 268-401 | Link `rel`/target handling, section labels, heading semantics, logo height fallback, and hoverColor output. |
| `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` | 92-98, 448, 559-598, 720-832 | Overlay alpha-safe editing, current image/video type clarity, Wizard video media picker scope, and duplicated Advanced controls. Visual per-item media picker is TASK-270-01. |
| `core/widgets/core/galleryMosaic.tsx` | 159-275, 314-507 | Explicit resolver defaults, feature-left one-item handling, link safety, alt/figure semantics, video title/control behavior, and redundant row-span cleanup. Poster image remains TASK-270-03. |
| `core/widgets/core/widgetSafeHref.ts` | 1-25 | Extend the shared href owner with a tested helper such as `resolveWidgetLinkAttrs(href, options)` that returns normalized `href`, `target`, and safe `rel` attributes. Do not duplicate external-link detection in individual widgets. |
| `tests/vitest/ui/cta-banner-editor-wave.test.tsx` | n/a | Do not edit for CTA-specific rows in this leaf; TASK-263 owns CTA editor coverage. |
| `tests/vitest/widgets/ctaBanner.test.tsx` | n/a | Do not edit for CTA-specific rows in this leaf; TASK-263 owns CTA runtime coverage. |
| `tests/vitest/ui/logo-cloud-editor-wave.test.tsx` | existing suite | Add hoverColor/link feedback regressions for shared TASK-256 behavior. Per-logo `alt` and Wizard image/link regressions stay in TASK-274-02. |
| `tests/vitest/widgets/logoCloud.test.tsx` | existing suite | Add link/ARIA/height regressions. |
| `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx` | existing suite | Add overlay/current media-type/Wizard-video/Advanced regressions. |
| `tests/vitest/widgets/galleryMosaic.test.tsx` | existing suite | Add alt/link/feature-left/figure/video-control regressions, excluding poster-image product fields. |

## Implementation Pseudocode

Shared link attrs, only if multiple widgets need the same target/rel policy:

```ts
function resolveWidgetLinkAttrs(
  value: string | undefined,
  options: WidgetSafeHrefOptions & { openInNewTab?: boolean } = {},
) {
  const href = normalizeWidgetSafeHref(value, options);
  if (!href) return undefined;
  if (options.openInNewTab) {
    return { href, target: "_blank", rel: "noopener noreferrer" } as const;
  }
  return { href } as const;
}
```

Logo link:

```tsx
function renderLogoLink(href: string | undefined, content: ReactNode) {
  const attrs = resolveWidgetLinkAttrs(href, { allowRelative: true, allowHash: true, allowHttp: true });
  if (!attrs) return content;
  return (
    <a {...attrs}>
      {content}
    </a>
  );
}
```

Gallery media:

```tsx
function resolveGalleryMediaType(item: GalleryMosaicItem): "image" | "video" | "empty" {
  if (item.mediaType === "video" && item.video) return "video";
  if (item.image) return "image";
  if (item.video) return "video";
  return "empty";
}
```

Error handling:

- Overlay color pickers must not replace `rgba(...)` or CSS variables with hex
  fallback values unless the user explicitly chooses a new color.
- Existing logo/gallery URLs normalize through the same safe-href owner. CTA
  adoption of the helper belongs to TASK-263-04.
- If adding media `alt` fields in a TASK-256-owned widget requires schema
  migration, keep fallback behavior backward compatible and update validator
  tests. Logo Cloud per-logo `alt` field work is TASK-274-02.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and before closure.
- For non-trivial or parallel leaf work, prefer a dedicated branch or worktree.
- Stage only the owner files listed in this task plus required docs/reports/changelog files.
- Verify `git diff --name-only --cached` before every commit so unrelated report or code edits stay out of scope.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: update widget validator tests if schemas change.
- Anti-abuse: public links must reject `javascript:`/unsafe data URLs, external
  links must use safe `rel`, media URLs must not expose privileged paths, and no
  user-authored script may run.
- Secret handling: no media provider keys, private URLs, or upload credentials
  in widget data, diagnostics, or reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/cta-banner-editor-wave.test.tsx`
  only if a shared helper change needs CTA compatibility coverage; CTA-specific
  editor regressions stay in TASK-263.
- `bun run test:vitest -- tests/vitest/widgets/ctaBanner.test.tsx` only if a
  shared helper change needs CTA runtime compatibility coverage; CTA-specific
  renderer regressions stay in TASK-263.
- `bun run test:vitest -- tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/logoCloud.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/galleryMosaic.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts`
- `bun test tests/unit/widgets/validator.test.ts` if schemas/defaults change.
- `bun test tests/unit/widgets/registry.test.ts` if registry/default wiring changes.
- Run `bun --cwd core lint` and `bun --cwd core lint:types`.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_CTA_BANNER_WIDGET.md`,
  `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md`, and
  `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md`.
- Update `_docs/_WIDGETS/CTA_BANNER.md`, `_docs/_WIDGETS/LOGO_CLOUD.md`, and
  `_docs/_WIDGETS/GALLERY_MOSAIC.md` when behavior changes.
- Update `_docs/WIDGETS.md` only if shared media/link/clear contracts change.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-256-08 may create the final umbrella changelog entry that explicitly lists this task ID.

## Acceptance Criteria

- CTA, Logo Cloud, and Gallery Mosaic links stay safe and accessible.
- Media editors do not destroy alpha/CSS variable values accidentally.
- Public output has meaningful alt/ARIA semantics or documented deferrals.
- Logo Cloud per-logo `alt` schema/editor work remains a documented TASK-274-02
  deferral, not part of this shared-contract leaf.
- Major new media-product features are deferred with physical follow-up tasks
  during TASK-256-08 closure.
