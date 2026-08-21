/**
 * Responsive CSS orchestration (TASK-539-06-L01 split).
 *
 * Owns the recursive section/block traversal with exact `PageBlockPath`s,
 * per-breakpoint `@media` shells, diagnostics ordering, and the public
 * `buildPageResponsiveCssPlan` / `buildPageResponsiveCss` entry points. The
 * traversal carries the owning `PageSectionV2` and exact `PageBlockPath` so the
 * block projectors can classify grid placement through the shared owner
 * (`resolvePageBlockGridPlacement`, public visible-root policy
 * `includeHiddenBlocks: false`).
 *
 * Dependency position: facade -> Orchestration -> Section/Block -> Declarations
 * -> Contracts.
 *
 * This module is Bun-free and import-side-effect free (Vitest lane).
 */

import {
  getPageBlockActiveSlotKeys,
  pageBlockCapabilities,
  type PageBlockResponsiveOverrideV2,
  type PageBlockV2,
  type PageDocumentV2,
  type PageSectionResponsiveOverrideV2,
  type PageSectionV2,
} from "./pageDocumentV2";
import type { PageBlockPath, PageBlockPathSegment } from "./pageBlockPaths";
import { resolvePageBlockGridPlacement } from "./pageBlockGridPlacement";
import {
  blockElementSelector,
  blockGridItemScopeSelector,
  blockStyleScopeSelector,
  blockTextSelector,
  blockTiltLayerScopeSelector,
  pushDiagnostic,
  pushRule,
  resolveSelectorPrefix,
  sectionContentSelector,
  sectionRootSelector,
} from "./pageResponsiveCssDeclarations";
import {
  pageResponsiveCssBreakpoints,
  pageResponsiveMediaQueries,
  type CollectorContext,
  type PageResponsiveCssDiagnostic,
  type PageResponsiveCssOptions,
  type PageResponsiveCssPlan,
} from "./pageResponsiveCssContracts";
import { collectBlockDeclarations } from "./pageResponsiveCssBlock";
import {
  collectSectionDeclarations,
  pushStackedSectionResetRule,
} from "./pageResponsiveCssSection";

/**
 * The renderer's shared span predicate (mirrored exactly from
 * `pageSectionRendererV2.tsx` / `pageBlockRenderStyles.ts`): true when ANY
 * base/tablet/mobile style carries an authored colSpan or rowSpan. The renderer
 * stamps the grid-item hook only when this holds AND the placement is legal;
 * the responsive builder emits span CSS under the same predicate.
 */
const hasAnyAuthoredSpan = (block: PageBlockV2): boolean =>
  [block.style, block.responsive?.tablet?.style, block.responsive?.mobile?.style].some(
    (style) => style?.colSpan !== undefined || style?.rowSpan !== undefined
  );

const hasBlockOverride = (override: PageBlockResponsiveOverrideV2): boolean =>
  Boolean(
    (override.props && Object.keys(override.props).length > 0) ||
    (override.style && Object.keys(override.style).length > 0) ||
    (override.visibility && Object.keys(override.visibility).length > 0)
  );

const hasSectionOverride = (override: PageSectionResponsiveOverrideV2): boolean =>
  Boolean(
    (override.layout && Object.keys(override.layout).length > 0) ||
    (override.style && Object.keys(override.style).length > 0) ||
    (override.spacing && Object.keys(override.spacing).length > 0) ||
    (override.visibility && Object.keys(override.visibility).length > 0)
  );

const walkBlock = (
  section: PageSectionV2,
  block: PageBlockV2,
  path: PageBlockPath,
  context: CollectorContext,
  markupAbsent: boolean
): void => {
  const id = typeof block.id === "string" ? block.id.trim() : "";
  const baseVisible = block.visibility?.visible !== false;
  const absent = markupAbsent || !baseVisible;
  const override = block.responsive?.[context.breakpoint];

  if (override && hasBlockOverride(override)) {
    if (absent) {
      pushDiagnostic(context, "block", id, "*", "markup_absent_at_base");
    } else if (!id) {
      pushDiagnostic(context, "block", id, "*", "unsafe_scope_id");
    } else {
      // TASK-539-03-L05 placement classification (public visible-root policy)
      // and the renderer's shared has-any-span predicate gate span emission.
      const spanTarget = resolvePageBlockGridPlacement(section, path, {
        includeHiddenBlocks: false,
      });
      const hasAnySpan = hasAnyAuthoredSpan(block);
      const { frame, gridItem, element, text, wrapper } = collectBlockDeclarations(
        block,
        override,
        context,
        spanTarget,
        hasAnySpan
      );
      pushRule(context, blockStyleScopeSelector(id), frame);
      pushRule(context, blockGridItemScopeSelector(id), gridItem);
      pushRule(context, blockElementSelector(id), element);
      pushRule(context, blockTextSelector(id), text);
      // TASK-535 — tilt+layer per-device layer offsets ride the hoisted wrapper.
      pushRule(context, blockTiltLayerScopeSelector(id), wrapper);
    }
  }

  const activeSlotKeys = new Set(getPageBlockActiveSlotKeys(block));
  for (const slotKey of pageBlockCapabilities[block.type].slots) {
    const children = block.slots?.[slotKey];
    if (!children || children.length === 0) continue;
    // Children in inactive slots (e.g. `column:3` when a columns block renders
    // two columns at the desktop base) have no public markup.
    const childAbsent = absent || !activeSlotKeys.has(slotKey);
    for (let index = 0; index < children.length; index += 1) {
      const segment: PageBlockPathSegment = { slotKey, index };
      const childPath = [...path, segment] as PageBlockPath;
      walkBlock(section, children[index]!, childPath, context, childAbsent);
    }
  }
};

const walkSection = (section: PageSectionV2, context: CollectorContext): void => {
  const id = typeof section.id === "string" ? section.id.trim() : "";
  const baseVisible = section.visibility?.visible !== false;
  const override = section.responsive?.[context.breakpoint];

  if (override && hasSectionOverride(override)) {
    if (!baseVisible) {
      pushDiagnostic(context, "section", id, "*", "markup_absent_at_base");
    } else if (!id) {
      pushDiagnostic(context, "section", id, "*", "unsafe_scope_id");
    } else {
      const { content, root } = collectSectionDeclarations(section, override, context);
      pushRule(context, sectionRootSelector(id), root);
      pushRule(context, sectionContentSelector(id), content);
      if (override.layout?.stackVertical === true) {
        pushStackedSectionResetRule(section, context);
      }
    }
  }

  for (let index = 0; index < section.blocks.length; index += 1) {
    const rootPath = [{ index }] as PageBlockPath;
    walkBlock(section, section.blocks[index]!, rootPath, context, !baseVisible);
  }
};

export const buildPageResponsiveCssPlan = (
  document: PageDocumentV2,
  options?: PageResponsiveCssOptions
): PageResponsiveCssPlan => {
  const diagnostics: PageResponsiveCssDiagnostic[] = [];
  const mediaBlocks: string[] = [];
  const selectorPrefix = resolveSelectorPrefix(options);

  for (const breakpoint of pageResponsiveCssBreakpoints) {
    const context: CollectorContext = { breakpoint, rules: [], diagnostics, selectorPrefix };
    for (const section of document.sections) {
      walkSection(section, context);
    }
    if (context.rules.length === 0) continue;
    mediaBlocks.push(
      `@media ${pageResponsiveMediaQueries[breakpoint]}{\n${context.rules.join("\n")}\n}`
    );
  }

  return { css: mediaBlocks.join("\n"), diagnostics };
};

export const buildPageResponsiveCss = (
  document: PageDocumentV2,
  options?: PageResponsiveCssOptions
): string => buildPageResponsiveCssPlan(document, options).css;
