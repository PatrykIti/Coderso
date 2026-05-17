# TASK-270-04: Gallery Mosaic Lightbox and Zoom Mode

# FileName: TASK-270-04_Gallery_Mosaic_Lightbox_and_Zoom_Mode.md

**Priority:** Medium
**Category:** Widgets + Gallery Mosaic + Runtime Render + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-256-04, TASK-256-06-02, TASK-270-03
**Status:** To Do

---

## Overview

Add an optional Gallery Mosaic lightbox/zoom presentation mode using the
repo's existing public-widget runtime script pattern.

This leaf is product scope. It must not replace the TASK-256 safe link,
caption, alt, or video-control repairs. It may use those final contracts as the
baseline for lightbox labels, keyboard behavior, and media output. The current
checkout has admin-only Radix dialogs and public widget runtime scripts in
`tabs.tsx` and `toggleBlock.tsx`, but no shared public lightbox/modal helper.
This leaf therefore stays Gallery Mosaic-local and must not introduce a generic
cross-widget modal framework.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:328` - BF-10 reports no
  lightbox or zoom option on click.
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:380` - summary repeats
  lightbox/zoom as a medium-priority product gap.
- `_docs/_WIDGETS/tmp/gallery-mosaic/MATRIX.md:6` - lightbox/modal is Adapt
  only if an existing safe runtime path can be reused. In the current checkout,
  the reusable pattern is the idempotent public widget script used by
  `core/widgets/core/tabs.tsx` and `core/widgets/core/toggleBlock.tsx`; admin
  Radix dialogs are not public runtime owners.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/galleryMosaic.tsx` | Add a bounded `interaction` config, a widget-local idempotent runtime script patterned after `tabsRuntimeClientScript`/`toggleRuntimeClientScript`, safe trigger attributes, a hidden dialog region, focus return, Escape close, backdrop close, and deterministic data markers without unsafe inline handlers. |
| `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` | Add Visual controls for lightbox disabled/enabled mode and bounded zoom behavior; show when link behavior takes precedence if both href and lightbox are configured. |
| `tests/vitest/widgets/galleryMosaic.test.tsx` | Assert lightbox-disabled default, schema normalization, lightbox-enabled trigger/dialog markers, safe labels, href precedence behavior, and embedded runtime script output. |
| `tests/vitest/widgets/galleryMosaicLightboxRuntime.test.ts` | New `// @vitest-environment happy-dom` suite that imports an extractable `getGalleryMosaicLightboxRuntimeScript()` helper or evaluates the exported runtime script against rendered fixture DOM, then asserts trigger open, close-button focus return, backdrop close, Escape close, idempotent double-bind behavior, and link-item precedence. |
| `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx` | Assert editor controls patch the lightbox config and explain interaction precedence. |
| `tests/unit/widgets/validator.test.ts` | Add mandatory strict schema coverage for the interaction config and invalid enum rejection. |
| `tests/vitest/widgets/renderer.test.tsx` | Update only if shared renderer snapshot/markers need awareness of the new interaction output. |
| `_docs/_WIDGETS/GALLERY_MOSAIC.md` | Document lightbox behavior and accessibility expectations. |
| `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md` | Mark BF-10 fixed or deferred with implementation evidence. |

## Implementation Pseudocode

```ts
type GalleryMosaicInteractionMode = "none" | "lightbox";

type GalleryMosaicData = {
  interaction?: {
    mode?: GalleryMosaicInteractionMode;
    zoom?: "fit" | "fill";
  };
};

function resolveGalleryMosaicInteractionMode(value: string | undefined): GalleryMosaicInteractionMode {
  return value === "lightbox" ? "lightbox" : "none";
}

function getGalleryItemInteraction(item: GalleryMosaicItem, mode: GalleryMosaicInteractionMode) {
  if (item.href?.trim()) return { type: "link" as const };
  if (mode === "lightbox") return { type: "lightbox" as const };
  return { type: "none" as const };
}

function renderGalleryLightboxTrigger(item: GalleryMosaicItem, index: number) {
  const id = `gallery-lightbox-${index + 1}`;
  return {
    "data-gallery-lightbox-trigger": id,
    "aria-haspopup": "dialog",
    "aria-controls": id,
    "aria-label": `Open ${item.caption?.trim() || `gallery item ${index + 1}`}`,
  };
}

export const galleryMosaicLightboxRuntimeScript = `
(() => {
  if (typeof window === "undefined") return;
  if (window.__codersoGalleryMosaicLightboxBound === true) return;
  window.__codersoGalleryMosaicLightboxBound = true;
  let lastTrigger = null;
  const close = (dialog) => { dialog.hidden = true; lastTrigger?.focus?.(); };
  const open = (trigger, dialog) => { lastTrigger = trigger; dialog.hidden = false; dialog.querySelector("[data-gallery-lightbox-close]")?.focus?.(); };
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const trigger = target?.closest("[data-gallery-lightbox-trigger]");
    const closeButton = target?.closest("[data-gallery-lightbox-close]");
    const backdrop = target?.closest("[data-gallery-lightbox-backdrop]");
    if (trigger instanceof HTMLElement) {
      const dialog = document.getElementById(trigger.getAttribute("aria-controls") || "");
      if (dialog instanceof HTMLElement) open(trigger, dialog);
    } else if (closeButton instanceof HTMLElement || backdrop instanceof HTMLElement) {
      const dialog = target?.closest("[role='dialog']");
      if (dialog instanceof HTMLElement) close(dialog);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const dialog = document.querySelector("[data-gallery-lightbox-dialog]:not([hidden])");
    if (dialog instanceof HTMLElement) close(dialog);
  });
})();
`;

export function getGalleryMosaicLightboxRuntimeScript() {
  return galleryMosaicLightboxRuntimeScript;
}
```

Error handling:

- Existing `href` behavior remains non-destructive. If a gallery item has a link,
  the editor must explain that navigation wins over lightbox for that item or
  require an explicit user choice.
- Do not introduce a one-off global script if a shared runtime interaction
  helper exists by implementation time.
- Keyboard and focus behavior must be tested: trigger opens the dialog, close
  returns focus to the trigger, Escape closes the dialog, and link items keep
  navigation precedence.
- Test the runtime script in a happy-dom/browser-style suite, not only through
  server `renderToString` assertions. The suite must create fixture markup with
  `[data-gallery-lightbox-trigger]`, `[data-gallery-lightbox-dialog]`,
  `[data-gallery-lightbox-close]`, and `[data-gallery-lightbox-backdrop]`,
  evaluate `getGalleryMosaicLightboxRuntimeScript()`, dispatch click/keydown
  events, and assert visible state plus `document.activeElement`.
- If a shared public runtime lightbox owner exists by implementation time, reuse
  it; otherwise keep the script local to `gallery-mosaic` and idempotently bound
  like the existing tabs/toggle widget scripts.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: existing authenticated admin session for page/template editing and
  unchanged public read-only runtime rendering.
- RBAC: existing page/template widget write permission; no new role or public
  capability.
- CSRF: unchanged admin write route protection; this leaf adds no route.
- Rate-limit bucket: unchanged admin write and public read buckets; no public
  write bucket.
- Reject-unknown validation: new interaction config must be schema-backed and
  reject unknown values.
- Anti-abuse: no raw HTML, unsafe inline event handlers, arbitrary selectors, or
  untrusted script URLs. Media in the lightbox uses the same safe-media output
  as inline tiles.
- Secret handling: lightbox state must not expose private media or local file
  paths.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/galleryMosaic.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/galleryMosaicLightboxRuntime.test.ts`
- `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if shared
  renderer assertions change.
- `bun test tests/unit/widgets/validator.test.ts`
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/GALLERY_MOSAIC.md`
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md`
- `_docs/_TASKS/TASK-270-04_Gallery_Mosaic_Lightbox_and_Zoom_Mode.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Lightbox is opt-in and off by default for existing payloads.
- Lightbox behavior is accessible by keyboard and does not break link items.
- Runtime tests prove trigger/dialog markers, Escape close, focus return
  expectations, and link precedence.
- Runtime output remains deterministic, safe, and testable without committing
  screenshots.
