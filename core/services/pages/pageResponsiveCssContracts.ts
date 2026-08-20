/**
 * Responsive CSS shared contracts (TASK-539-06-L01 split).
 *
 * Single owner of every public hook, media bound/query, options type,
 * diagnostic shape, plan shape, and shared collector type consumed by the
 * responsive-CSS modules and their consumers. The stable
 * `pageResponsiveCss.ts` facade explicitly re-exports the public names from
 * here; the renderer and other consumers import through the facade, never
 * from this module directly.
 *
 * This module is Bun-free and import-side-effect free (Vitest lane).
 */

import type { PageBlockV2 } from "./pageDocumentV2";

/**
 * Stable per-node attribute hooks. `pageRendererV2.tsx` already emits all
 * three on public markup (`toPageSectionRenderProps`, `toPageBlockRenderProps`,
 * `PageSectionContent`).
 */
export const PAGE_SECTION_ID_ATTRIBUTE = "data-section-id" as const;
export const PAGE_BLOCK_ID_ATTRIBUTE = "data-block-id" as const;
export const PAGE_SECTION_CONTENT_ATTRIBUTE = "data-page-section-content" as const;
/** Stable hook on the inner visual element of re-routed block types. */
export const PAGE_BLOCK_ELEMENT_ATTRIBUTE = "data-page-block-element" as const;
/**
 * Stable hook on the text node(s) a typography-capable block paints (the
 * `<h1>`/`<p>`/`<blockquote>`/list/statistic/card text elements). Typography
 * style must land on the text node itself because baked utility classes on
 * those nodes (e.g. `text-5xl`, `font-semibold`) would beat values inherited
 * from the block frame. The renderer emits it; this builder scopes responsive
 * typography overrides to the same node(s).
 */
export const PAGE_BLOCK_TEXT_ATTRIBUTE = "data-page-block-text" as const;

/**
 * TASK-535 — stable hook on the `[data-tilt-parent]` perspective WRAPPER that a
 * tilt+layer block hoists its layer placement onto (see `splitBlockComposition` /
 * `renderPageBlockWithFrame` in pageRendererV2). The base `--layer-x/y/z` live on
 * the wrapper (the consumer of the layered-canvas CSS), NOT the `[data-block-id]`
 * frame, and CSS custom props inherit DOWNWARD only — so a per-device `--layer-*`
 * override MUST target the wrapper, not the frame. The renderer stamps the block
 * id here ONLY when the layer placement was hoisted to the wrapper (tilt+layer);
 * the block collector retargets the responsive layer override at it.
 */
export const PAGE_TILT_PARENT_LAYER_ATTRIBUTE = "data-tilt-parent-for" as const;

/**
 * Style-target contract shared with `pageRendererV2.tsx`: block types whose
 * visual identity is an inner element (the `<a>` of a button, the `<img>` of
 * an image) carry the visual style surface (background, text color, border,
 * radius, shadow, opacity) on that element, while the block frame keeps only
 * layout-affecting style (width/align/padding/margin). The renderer emits
 * `PAGE_BLOCK_ELEMENT_ATTRIBUTE="true"` on the inner element and this builder
 * scopes the matching responsive style keys to the same element.
 */
export const pageBlockVisualElementTypes = ["button", "image"] as const;
export type PageBlockVisualElementType = (typeof pageBlockVisualElementTypes)[number];

export const isPageBlockVisualElementType = (
  type: PageBlockV2["type"]
): type is PageBlockVisualElementType =>
  (pageBlockVisualElementTypes as readonly string[]).includes(type);

export const pageResponsiveCssBreakpoints = ["tablet", "mobile"] as const;
export type PageResponsiveCssBreakpoint = (typeof pageResponsiveCssBreakpoints)[number];

/**
 * Single owned source for public media-query bounds. The bounds bracket the
 * editor canvas device widths (desktop 1080 / tablet 744 / mobile 390 from
 * `PageEditor.tsx`): desktop >= 1024, tablet 640-1023, mobile <= 639.
 */
export const pageResponsiveMediaBounds = {
  tablet: { minWidth: 640, maxWidth: 1023 },
  mobile: { maxWidth: 639 },
} as const;

export const pageResponsiveMediaQueries: Record<PageResponsiveCssBreakpoint, string> = {
  tablet: `(min-width: ${pageResponsiveMediaBounds.tablet.minWidth}px) and (max-width: ${pageResponsiveMediaBounds.tablet.maxWidth}px)`,
  mobile: `(max-width: ${pageResponsiveMediaBounds.mobile.maxWidth}px)`,
};

export type PageResponsiveCssDiagnosticReason =
  | "props_override_unsupported"
  | "not_css_expressible"
  | "unsafe_color_value"
  | "unsafe_background_value"
  | "markup_absent_at_base"
  | "unsafe_scope_id";

export type PageResponsiveCssDiagnostic = {
  scope: "section" | "block";
  id: string;
  breakpoint: PageResponsiveCssBreakpoint;
  /** Override group or field that failed closed; `*` covers the whole node. */
  key: string;
  reason: PageResponsiveCssDiagnosticReason;
};

export type PageResponsiveCssPlan = {
  css: string;
  diagnostics: PageResponsiveCssDiagnostic[];
};

export type PageResponsiveCssOptions = {
  /**
   * Trusted ancestor selector prepended (descendant combinator) to every
   * emitted rule so a secondary document — e.g. the site-shell footer
   * template (TASK-455) — can ride the same builder without its section/block
   * ids colliding with the page document's rules. Callers must pass an owned
   * literal; the value is validated against a conservative charset and the
   * builder throws `page_responsive_css_scope_invalid` otherwise (callers
   * already fail closed on builder errors).
   */
  scopeSelector?: string;
};

/** One deterministic sorted declaration inside a rule body. */
export type CssDeclaration = { property: string; value: string };

/**
 * Shared collector context threaded through section/block projection. Rules
 * and diagnostics are appended in document traversal order; the orchestration
 * layer splits the rules into per-breakpoint `@media` shells.
 */
export type CollectorContext = {
  breakpoint: PageResponsiveCssBreakpoint;
  rules: string[];
  diagnostics: PageResponsiveCssDiagnostic[];
  /** Optional trusted ancestor selector prepended to every emitted rule. */
  selectorPrefix: string;
};
