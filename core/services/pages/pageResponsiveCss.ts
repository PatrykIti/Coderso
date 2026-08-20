/**
 * Responsive CSS emission contract (TASK-423-01, split by TASK-539-06-L01).
 *
 * Stable explicit facade over the cohesive responsive-CSS modules. Converts
 * stored Page V2 responsive deltas (`section.responsive[bp]`,
 * `block.responsive[bp]`) into deterministic, selector-scoped `@media` rules
 * so the public runtime can serve desktop-resolved base markup plus media
 * queries instead of flattening the cascade server-side.
 *
 * This facade re-exports only the stable public names; implementation lives in
 * the one-way graph facade -> Orchestration -> Section/Block -> Declarations
 * -> Contracts. No `export *`; every name here is explicit so the renderer,
 * site-shell CSS, menu CSS, public render, and tests keep a stable import
 * surface.
 *
 * Contract decisions frozen here:
 * - Desktop stays the base markup; only `tablet` and `mobile` deltas emit CSS.
 * - Tablet rules are range-bounded (`min-width` AND `max-width`) because the
 *   editor cascade model makes mobile inherit DESKTOP, not tablet. A plain
 *   `max-width` tablet query would leak tablet overrides into mobile widths.
 * - Every declaration carries `!important` because the desktop base values are
 *   emitted as inline `style` attributes by `pageRendererV2.tsx`; non-important
 *   stylesheet rules can never beat inline styles.
 * - Section rules target the section content element (the node that carries
 *   the inline section style), scoped through the stable per-id attributes the
 *   renderer already emits — except full-bleed paint, which targets the
 *   section root, and visibility rules, which target the id node itself.
 * - Block frame/element/text and hoisted tilt/layer rules use one shared
 *   `:is(primary canonical selector, replica styling-only alias selector)`
 *   scope; grid-span rules remain canonical-only on the renderer-stamped
 *   `data-page-block-grid-item` hook.
 * - Only schema-clamped numbers, enum-token lookups, sanitized colors,
 *   parsed background paint, sanitized custom font sizes, and
 *   CSS-string-escaped ids/urls reach the output. Anything else fails
 *   closed into diagnostics — never guessed CSS.
 * - `responsive[bp].props` (content overrides) are unsupported and surface as
 *   diagnostics until a dedicated content-override contract exists — with ONE
 *   explicit exception: `props.align` on heading/text blocks (the
 *   schema-enumerated text-align prop, TASK-424) maps to a `text-align` rule
 *   on the block's painted text node.
 * - Nodes hidden at the desktop base (or living in inactive `columns` slots)
 *   have no public markup, so their overrides are unreachable: diagnostics,
 *   no CSS. Restoring visibility at a smaller breakpoint
 *   (`visible: true` over a hidden base) therefore cannot be expressed either.
 *
 * This module is Bun-free and import-side-effect free (Vitest lane).
 */

export {
  PAGE_BLOCK_ELEMENT_ATTRIBUTE,
  PAGE_BLOCK_ID_ATTRIBUTE,
  PAGE_BLOCK_TEXT_ATTRIBUTE,
  PAGE_SECTION_CONTENT_ATTRIBUTE,
  PAGE_SECTION_ID_ATTRIBUTE,
  PAGE_TILT_PARENT_LAYER_ATTRIBUTE,
  isPageBlockVisualElementType,
  pageBlockVisualElementTypes,
  pageResponsiveCssBreakpoints,
  pageResponsiveMediaBounds,
  pageResponsiveMediaQueries,
  type PageBlockVisualElementType,
  type PageResponsiveCssBreakpoint,
  type PageResponsiveCssDiagnostic,
  type PageResponsiveCssDiagnosticReason,
  type PageResponsiveCssOptions,
  type PageResponsiveCssPlan,
} from "./pageResponsiveCssContracts";
export {
  buildPageResponsiveCss,
  buildPageResponsiveCssPlan,
} from "./pageResponsiveCssOrchestration";
