import {
  type PageBlockV2,
  type PageBreakpoint,
  type PageDocumentV2,
  type PageSectionV2,
} from "./pageDocumentV2Types";
import { resolvePageDocumentForBreakpoint } from "./pageDocumentV2Normalizer";
import { isPageSectionFullBleed } from "./pageSectionRenderStyles";
import { resolvePageSectionTemplate } from "./pageSectionTemplates";

export const emptyDocumentContent = "This page has no content yet.";

export const resolvePageRenderTree = (
  document: PageDocumentV2,
  breakpoint: PageBreakpoint
): PageDocumentV2 => resolvePageDocumentForBreakpoint(document, breakpoint);

/**
 * TASK-521-05-L03 / TASK-523-02 — STATIC cursor-spotlight rule. Ships as a module
 * const (NOT a Tailwind arbitrary variant): the radial-gradient carries multiple
 * `var()` refs + raw commas, a fragile/unreliable JIT case we do NOT gamble on.
 * Scoped under `[data-page-spotlight]` so it is inert unless the root marker is
 * present.
 *
 * TASK-523-02 — Occlusion-proof. A NON-gated base rule lifts the overlay ABOVE
 * opaque section backgrounds and makes it ADD light without blocking
 * (`mix-blend-mode:screen` + `pointer-events:none`) — `position:fixed;inset:0`
 * pins it to the viewport. The radial-gradient (the moving glow itself) stays
 * inside the `@media (prefers-reduced-motion: no-preference)` gate so reduce users
 * get NO gradient. Reads only VALIDATED custom props off the root.
 *
 * Hard Invariant #4 / Acceptance Criteria #4: the overlay z-index is STRICTLY
 * BELOW the front sticky nav (`sticky z-40`, see navigation.tsx / widgetRenderer)
 * so screen-blend never tints the menu bar. The overlay and nav are sibling
 * children of the same root stacking context (`<Root>` forms no stacking
 * context), so `z-index:30` still paints above opaque section content but below
 * the nav. Do NOT raise this to/above 40 without owner re-approval of the
 * nav-tint tradeoff.
 *
 * Occlusion-proofing (TASK-523-02): the ONLY other author-controllable surface
 * in this same root stacking context is a layered-canvas `[data-layer]`, which
 * maps `layer.z` straight to `z-index` (pageCompositionEffects.tsx). Its bound
 * `PAGE_LAYER_Z_CLAMP.max` is capped STRICTLY BELOW 30 so no authored layer can
 * reach the overlay and hide the glow. If you change the overlay z-index, keep
 * `PAGE_LAYER_Z_CLAMP.max < overlay z-index < nav z-index (40)`.
 */
export const PAGE_SPOTLIGHT_CSS =
  "[data-page-spotlight] [data-page-spotlight-overlay]{" +
  "position:fixed;inset:0;z-index:30;" +
  "mix-blend-mode:screen;pointer-events:none}" +
  "@media (prefers-reduced-motion: no-preference){" +
  "[data-page-spotlight] [data-page-spotlight-overlay]{" +
  "background:radial-gradient(var(--spotlight-size,400px) at " +
  "var(--spotlight-x,50%) var(--spotlight-y,50%)," +
  "var(--spotlight-color,color-mix(in srgb,var(--primary) 14%,transparent))," +
  "transparent 70%)}" +
  "}";

/**
 * TASK-522-05-L01 — present-only scan for ANY authored 522 composition effect.
 * Drives the page-root composition `<style>` + widens 521-05's runtime `<script>`
 * emit predicate. A no-effect document returns false ⇒ nothing emitted ⇒
 * byte-identical to post-521 (Hard Invariant 9). Recurses through nested slots.
 */
const blockUsesCompositionEffect = (block: PageBlockV2): boolean => {
  const s = block.style;
  if (
    s &&
    (s.decoration != null ||
      (s.tilt != null && s.tilt !== "none") ||
      s.surfacePreset != null ||
      s.hoverEffect != null ||
      s.composition === "layered" ||
      s.marquee != null ||
      s.layer != null ||
      // TASK-539-05-L01 — magnetic is a transform-bearing channel: the ONE
      // host formula that composes `--cx-magnetic-*` lives in
      // PAGE_COMPOSITION_EFFECTS_CSS, so a magnetic-only block independently
      // requires that stylesheet (the interactivity CSS only carries the
      // transition). No magnetic block ever renders without its host formula.
      s.magnetic === true)
  ) {
    return true;
  }
  if (block.type === "customSvg" && block.props.drawIn === true) return true;
  if (block.slots) {
    for (const children of Object.values(block.slots)) {
      if (children) {
        for (const child of children) {
          if (blockUsesCompositionEffect(child)) return true;
        }
      }
    }
  }
  return false;
};

export const docUsesCompositionEffects = (document: PageDocumentV2): boolean => {
  for (const section of document.sections) {
    const ss = section.style;
    // TASK-539-05-L01 — a section with ANY authored scrollEffect stamps the
    // transform host on its blocks (reveal) / rides the composition channel,
    // so the composition stylesheet must be present for those documents too.
    if (
      ss &&
      (ss.surfacePreset != null || ss.composition === "layered" || ss.scrollEffect != null)
    ) {
      return true;
    }
    for (const block of section.blocks) {
      if (blockUsesCompositionEffect(block)) return true;
    }
  }
  return false;
};

/**
 * TASK-535 — whether ANY section is full-bleed (template `full-width` OR the
 * author-toggled `style.fullBleed`, via the shared `isPageSectionFullBleed`
 * predicate). Full-bleed sections paint a FIXED-literal `width:100vw` bleed box
 * (`toPageSectionBleedStyle`); `100vw` counts the vertical-scrollbar gutter, so
 * on a scrolling page it is a few px WIDER than the content area and pushes a
 * spurious HORIZONTAL scrollbar. Present-only: gates an `overflow-x:clip` guard
 * on the page root so the 100vw bleed can never cause horizontal scroll. Empty
 * for a page with no full-bleed section ⇒ the root style stays byte-identical.
 */
export const docHasFullBleedSection = (sections: readonly PageSectionV2[]): boolean =>
  sections.some((section) => isPageSectionFullBleed(section, resolvePageSectionTemplate(section)));

/**
 * Whether ANY block authors a mouse-tilt (`style.tilt !== "none"`). The 522
 * block-tilt binding is APPENDED INTO 521-05's single runtime source string, so a
 * tilt has no runtime unless that ONE emit fires — this OR-widens 521-05's emit
 * predicate rather than adding a second `<script>` (which would double-run
 * reveal/parallax/spotlight). Recurses through nested slots.
 */
const blockUsesCompositionTilt = (block: PageBlockV2): boolean => {
  if (block.style?.tilt != null && block.style.tilt !== "none") return true;
  if (block.slots) {
    for (const children of Object.values(block.slots)) {
      if (children) {
        for (const child of children) {
          if (blockUsesCompositionTilt(child)) return true;
        }
      }
    }
  }
  return false;
};

export const usesCompositionTilt = (document: PageDocumentV2): boolean => {
  for (const section of document.sections) {
    for (const block of section.blocks) {
      if (blockUsesCompositionTilt(block)) return true;
    }
  }
  return false;
};

/**
 * TASK-535 — whether a document authors the cursor spotlight
 * (`settings.effects.cursorSpotlight`). Exported so the site shell can thread the
 * SIBLING document's spotlight need into `PageDocumentRender`'s `peerSpotlightOn`,
 * de-duplicating the single viewport-fixed spotlight overlay DIV across the
 * `<main>` (primary) and footer (secondary) documents.
 */
export const documentUsesSpotlight = (document: PageDocumentV2): boolean =>
  !!document.settings?.effects?.cursorSpotlight;
