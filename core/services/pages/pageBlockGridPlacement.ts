/**
 * Shared page block grid-placement contract (TASK-539-03-L05).
 *
 * Single Bun-free source for WHERE a section-root block actually paints in the
 * rendered section grid. The renderer, the Page editor canvas, and the public
 * responsive CSS all classify placement through `resolvePageBlockGridPlacement`
 * so editor affordances (span controls, ghost tiles, frame chrome) always agree
 * with the painted markup. Consumers must import the literal, enum, and
 * resolver from here instead of duplicating or re-deriving them.
 *
 * Classification contract:
 * - A nested slot child is ALWAYS `"none"`: only section roots are direct grid
 *   items, even when an ancestor root is itself a grid item.
 * - Per-column composition (a section whose composition column count is >= 2
 *   AND at least one visible/enabled ROOT block carries a `style.column`
 *   assignment) moves every root block into a single-column wrapper stack, so
 *   no root is a direct grid item of the section grid.
 * - Non-default `media-split` variants paint a dedicated media/column layout
 *   rather than the root grid; the default `media-split` variant keeps the
 *   ordinary root grid.
 * - Timeline/gallery/FAQ/testimonials roots are wrapped by their template
 *   chrome (`"section-template-wrapper"`).
 * - Every other resolved template keeps the ordinary root grid
 *   (`"block-frame"`); unknown layout states fall back to this resolved
 *   template behavior, never raw CSS.
 *
 * Consumer policy (fixed, stated at call sites, never re-derived):
 * - PageEditor passes `{ includeHiddenBlocks: true }` (Admin sees every root
 *   exactly as authored).
 * - The renderer passes the real `PageBlockRenderContext.includeHiddenBlocks`.
 * - Public responsive CSS passes `{ includeHiddenBlocks: false }` (the public
 *   visible-root set, identical to the front renderer).
 *
 * The exported attribute is a fixed trusted literal; consumers put only
 * normalized block IDs in its value.
 *
 * This module is Bun-free and import-side-effect free (Vitest lane).
 */

import type { PageBlockPath } from "./pageBlockPaths";
import type { PageSectionV2 } from "./pageDocumentV2";
import { pageSectionBlocksHaveColumnAssignments } from "./pageSectionColumns";
import {
  getPageSectionCompositionColumns,
  resolvePageSectionTemplate,
} from "./pageSectionTemplates";

/** Fixed trusted attribute keyed to section-root grid items. */
export const PAGE_BLOCK_GRID_ITEM_ATTRIBUTE = "data-page-block-grid-item" as const;

/**
 * Where a section-root block paints in the rendered section grid:
 * - `"block-frame"`: direct child of the section content grid (span controls
 *   and frame chrome apply).
 * - `"section-template-wrapper"`: wrapped by template chrome (timeline axis,
 *   gallery cards, FAQ, testimonials); not a direct grid cell.
 * - `"none"`: nested slot child, per-column composition, or a non-default
 *   media-split layout; no direct grid placement.
 */
export type PageBlockGridPlacementTarget = "block-frame" | "section-template-wrapper" | "none";

/**
 * Classifies the grid placement of the section root block addressed by
 * `blockPath`. The section/path/options and their nested arrays and objects are
 * read-only: this function never mutates or rewrites the input section while
 * forming the visible-root view.
 */
export function resolvePageBlockGridPlacement(
  section: PageSectionV2,
  blockPath: PageBlockPath,
  options: { includeHiddenBlocks: boolean }
): PageBlockGridPlacementTarget {
  if (blockPath.length !== 1) return "none";

  const rootBlocks = options.includeHiddenBlocks
    ? section.blocks
    : section.blocks.filter((block) => block.visibility.visible);
  const perColumn =
    getPageSectionCompositionColumns(section) >= 2 &&
    rootBlocks.length > 0 &&
    pageSectionBlocksHaveColumnAssignments(rootBlocks);
  if (perColumn) return "none";

  const template = resolvePageSectionTemplate(section);
  if (template.template === "media-split" && template.variant !== "default") {
    return "none";
  }
  if (
    template.template === "timeline" ||
    template.template === "gallery" ||
    template.template === "faq" ||
    template.template === "testimonials"
  ) {
    return "section-template-wrapper";
  }
  return "block-frame";
}
