# TASK-256-06-02: CTA Banner, Logo Cloud, and Gallery Media Links

# FileName: TASK-256-06-02_CTA_Banner_Logo_Cloud_and_Gallery_Media_Links.md

**Priority:** High
**Category:** Widgets + Marketing Content + Media + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256-01, TASK-256-02, TASK-256-04, TASK-256-06
**Status:** To Do

---

## Overview

Repair media/link/clear/accessibility drift for `cta-banner`, `logo-cloud`, and
`gallery-mosaic`. These widgets expose public-facing marketing links and media,
so the repair must preserve safe-href normalization, clear semantics, alt text,
and truthful editor controls.

## Drift Evidence

- `_docs/PLAYWRIGHT/REPORT_CTA_BANNER_WIDGET.md:132-161,175-185,223-241` for
  empty badge, description color, border/clear, action labels, URL validation,
  focus state, and priority fixes.
- `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md:38-116,134-153` for missing
  link `rel`, heading/section ARIA, hoverColor truthfulness, logo height, Wizard
  image/link gaps, alt text, and image picker scope.
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:54-94,195-220,274-281` for
  media type ambiguity, overlay alpha loss, alt/caption semantics, video picker
  scope, feature-left minimum handling, link security, and hover-caption
  accessibility.
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:3` is now marked
  `Zakończony`; this leaf may use the current report ranges for planning, while
  TASK-256-08 must still refresh fixed/deferred status after implementation.

## Scope Decision Matrix

| Finding | TASK-256 action | Owner | Follow-up policy |
|---|---|---|---|
| CTA empty badge/text/focus/clear drift | Fix here | `CtaBannerEditors.tsx`, `ctaBanner.tsx` | None |
| CTA BF/accessibility list beyond current controls, including animation, icon controls, and broad layout additions | Future product scope unless the current control already exists and is misleading | Future CTA task | TASK-256-08 records deferral |
| Logo Cloud link `rel`, section aria, hoverColor truthfulness | Fix here | `LogoCloudEditors.tsx`, `logoCloud.tsx` | None |
| Logo Cloud image picker, drag/drop, marquee, eyebrow/background | Future product scope unless needed to repair broken current flow | Future widget task | TASK-256-08 records deferral |
| Gallery Mosaic overlay alpha loss and image/video ambiguity | Fix here because current controls can destroy data or mislead users | `GalleryMosaicEditors.tsx` | None |
| Gallery Mosaic alt text and link security | Fix here | `galleryMosaic.tsx`, editor tests | None |
| Gallery Mosaic video `title`, hover-caption keyboard/touch access, and autoplay control | Fix here when it changes current runtime semantics; otherwise create explicit accessibility follow-up | `galleryMosaic.tsx`, `GalleryMosaicEditors.tsx` | TASK-256-08 creates follow-up if schema expansion is required |
| Gallery Mosaic lightbox, drag/drop, per-item ratio, object-position | Future product scope | Future widget task | TASK-256-08 records deferral |

## Sub-Tasks

- [ ] Hide empty CTA badge spans and apply configured description text color.
- [ ] Add CTA Visual clear controls and action-field labels.
- [ ] Add CTA button focus-visible and safe URL validation feedback.
- [ ] Add Logo Cloud safe external-link output and section/header ARIA.
- [ ] Gate Logo Cloud `hoverColor` controls when grayscale is inactive.
- [ ] Preserve Gallery Mosaic overlay alpha and add opacity-aware editing.
- [ ] Make Gallery Mosaic media type selection explicit when image and video
  fields are both present.
- [ ] Add separate alt/figure semantics for Gallery Mosaic images where the
  data model changes are accepted.

## Files to Change

| File | Lines | Required change |
|---|---:|---|
| `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` | 250-550 | Visual clear controls, action labels, URL feedback, and focus-state controls. |
| `core/widgets/core/ctaBanner.tsx` | 185-200, 333-389 | Empty badge suppression, description color, border class, focus-visible, and safe link output. |
| `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` | 284-694 | Wizard image/link scope decisions, hoverColor gating, alt/link fields if model changes, and Advanced duplicate controls. |
| `core/widgets/core/logoCloud.tsx` | 268-401 | Link `rel`/target handling, section labels, heading semantics, logo height fallback, and hoverColor output. |
| `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` | 92-98, 448, 559-598, 720-832 | Overlay alpha-safe editing, image/video type clarity, video media picker scope, and duplicated Advanced controls. |
| `core/widgets/core/galleryMosaic.tsx` | 159-275, 314-507 | Explicit resolver defaults, feature-left one-item handling, link safety, alt/figure semantics, and redundant row-span cleanup. |
| `tests/vitest/ui/cta-banner-editor-wave.test.tsx` | existing suite | Add clear/action/focus/url regressions. |
| `tests/vitest/widgets/ctaBanner.test.tsx` | existing suite | Add badge/color/focus/link regressions. |
| `tests/vitest/ui/logo-cloud-editor-wave.test.tsx` | existing suite | Add hoverColor/alt/link/Wizard regressions. |
| `tests/vitest/widgets/logoCloud.test.tsx` | existing suite | Add link/ARIA/height regressions. |
| `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx` | existing suite | Add overlay/media-type/Advanced regressions. |
| `tests/vitest/widgets/galleryMosaic.test.tsx` | existing suite | Add alt/link/feature-left/figure regressions. |

## Implementation Pseudocode

CTA badge:

```tsx
function shouldRenderBadge(data: CtaBannerData, variant: CtaBannerVariantId) {
  return variant === "with-badge" && Boolean(data.badge?.label?.trim());
}
```

Logo link:

```tsx
function renderLogoLink(href: string | undefined, content: ReactNode) {
  const safeHref = normalizeWidgetSafeHref(href);
  if (!safeHref) return content;
  const external = isExternalWidgetHref(safeHref);
  return (
    <a href={safeHref} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
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
- Existing CTA/logo/gallery URLs normalize through the same safe-href owner.
- If adding `alt` fields requires schema migration, keep fallback behavior
  backward compatible and update validator tests.

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
- `bun run test:vitest -- tests/vitest/widgets/ctaBanner.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/logoCloud.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/galleryMosaic.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts`
- `bun test tests/unit/widgets/validator.test.ts` if schemas/defaults change.
- `bun test tests/unit/widgets/registry.test.ts` if registry/default wiring changes.
- Run `bun --cwd core lint` and `bun --cwd core lint:types`.

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
- Major new media-product features are deferred with physical follow-up tasks
  during TASK-256-08 closure.
