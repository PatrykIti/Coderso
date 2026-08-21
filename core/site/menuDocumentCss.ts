/**
 * menuDocumentCss — facade over the menu-document stylesheet builder
 * (TASK-542-02-L01 split). Re-exports the public symbols of the three
 * cohesive modules so existing import sites keep importing this path
 * unchanged; adds no new public surface of its own.
 *
 * Modules:
 * - `menuDocumentCssCore` — doc scope attribute + selectors, defaults,
 *   compare keys, equality helpers, shared caret literal.
 * - `menuDocumentCssRules` — positive rule emitters.
 * - `menuDocumentCssDelta` — delta collectors, neutralizer matrix, builders.
 *
 * --- contract (moved from the pre-split single file) ---
 * A published `menuDocumentV2` reuses the SAME `.site-header` / `.site-header-inner`
 * / `.site-nav-*` class names as `SiteHeaderNav`, so it hard-depends on the base
 * layout sheet emitted once from `buildSiteShellCss(...)` (the head-CSS gate in
 * `renderPublicPage.tsx`). This module emits the document's OWN appearance rules
 * scoped under a NEW attribute (`[data-site-menu-doc="true"]`) so they can NEVER
 * collide with `buildSiteShellCss`'s default rules and so they OVERRIDE the base
 * sheet on equal specificity via later source order (the `<style>` renders inside
 * the header, after the head).
 *
 * HARD CONTRACT: `siteShellCss.ts` is NOT imported for its CSS output, NOT
 * modified, NOT re-emitted here. `buildSiteShellCss(null)` stays byte-identical
 * (`tests/unit/pages/siteShellCss.test.ts`). Only the exported defaults constant
 * (`SHELL_APPEARANCE_DEFAULTS`) is reused — a validated value table, not CSS.
 *
 * Safety: the appearance is re-sanitized through `sanitizeMenuAppearance` (base
 * AND mobile-resolved), so the emitted CSS only ever contains validated color
 * shapes, clamped numbers, and enum-mapped strings — raw stored input never
 * reaches the stylesheet. Block ids interpolated into visibility selectors go
 * through `escapeAuthoringCssString`.
 *
 * Per-device model (TASK-501): the desktop appearance is the BASE
 * (`section.layout` + nav-items props); the mobile appearance is the base
 * merged with the sparse `responsive.mobile` override (mobile inherits desktop,
 * Pages cascade). The mobile `@media` branch appends per-GROUP delta rules —
 * a rule group is emitted only when SOME field in its mobile-resolved input
 * differs from base, and a triggered group emits ALL its declarations with
 * explicit/neutral values so clearing an override reverts without leakage —
 * AFTER the mobileMode disclosure/inline rules (source order wins). Per-block
 * visibility overrides gate via doc-scoped dual
 * `data-menu-block-id`/`data-block-id` hide rules. Docs with NO overrides emit
 * byte-identical output to pre-TASK-501 (asserted in
 * `tests/unit/site/menu-document-render.test.tsx`).
 *
 * Two builders share the same scoped rules (ONE `buildMenuRuleSetsForDocument`):
 * - `buildMenuDocumentCss(doc)` — FRONT viewport-media responsive (mobile
 *   disclosure via `@media`), like `buildSiteShellCss`.
 * - `buildMenuDocumentPreviewCss(doc, device)` — ADMIN-CANVAS device-forced: the
 *   `@media` breakpoint is flattened for the selected device (the Design canvas
 *   constrains the FRAME width, so viewport queries do not apply). Consumed by
 *   the in-canvas preview (TASK-499-03).
 *
 * This module is Bun-free.
 */
export {
  NAV_CHROME_COMPARE_KEYS,
  NAV_LEVEL_STYLE_COMPARE_KEYS,
  SITE_MENU_DOC_ATTRIBUTE,
  STRUCTURAL_BASE_ONLY_CHROME_KEYS,
} from "./menuDocumentCssCore";
export { buildMenuDocumentCss, buildMenuDocumentPreviewCss } from "./menuDocumentCssDelta";
