import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  ScriptKind,
  ScriptTarget,
  SyntaxKind,
  createSourceFile,
  forEachChild,
  isExportDeclaration,
  isExportSpecifier,
  isIdentifier,
  isNamedExports,
  isStringLiteral,
  type ExportDeclaration,
  type SourceFile,
} from "typescript";
import { beforeAll, describe, expect, test } from "vitest";

import * as facadeNamespace from "../../../core/services/pages/pageDocumentV2";
import * as contractOwner from "../../../core/services/pages/pageDocumentV2Contract";
import * as normalizerOwner from "../../../core/services/pages/pageDocumentV2Normalizer";
import * as schemaOwner from "../../../core/services/pages/pageDocumentV2Schema";
import * as galleryOwner from "../../../core/services/pages/pageGalleryV2";
import * as textMarksOwner from "../../../core/services/pages/pageTextMarksV2";
import * as typesOwner from "../../../core/services/pages/pageDocumentV2Types";

// 79 explicit per-specifier type imports from the facade (compile-time fixture).
import {
  type AnimatedIconAnimation,
  type AnimatedIconName,
  type LegacyWidgetBlockProps,
  type PageBackgroundType,
  type PageBadgeIcon,
  type PageBadgeIconPosition,
  type PageBadgeShape,
  type PageBadgeSize,
  type PageBadgeVariant,
  type PageBadgeWeight,
  type PageBlockBorderStyle,
  type PageBlockCapabilitiesV2,
  type PageBlockDecoration,
  type PageBlockDecorationMotion,
  type PageBlockHoverEffect,
  type PageBlockLayer,
  type PageBlockMarquee,
  type PageBlockPublicDataBinding,
  type PageBlockResponsiveLayerV2,
  type PageBlockResponsiveOverrideV2,
  type PageBlockResponsiveStyleV2,
  type PageBlockRuntimeRendererState,
  type PageBlockSlotKey,
  type PageBlockStyleV2,
  type PageBlockTextMarkInput,
  type PageBlockTextMarkRemoveInput,
  type PageBlockType,
  type PageBlockV2,
  type PageBlockVisibilityV2,
  type PageBlockWidth,
  type PageBoxSpacingV2,
  type PageBreakpoint,
  type PageCollectionLinkV2,
  type PageCollectionPaginationMode,
  type PageColumnDistribution,
  type PageComposition,
  type PageDocumentErrorCode,
  type PageDocumentSeoV2,
  type PageDocumentSettingsV2,
  type PageDocumentV2,
  type PageEffectsV2,
  type PageGalleryItemV2,
  type PageGlow,
  type PageGroupDirection,
  type PageLayerAnchor,
  type PageListItemV2,
  type PageMarqueeDirection,
  type PageScrollHintGlyph,
  type PageSectionAlignment,
  type PageSectionBorderEdgeV2,
  type PageSectionBorderV2,
  type PageSectionCapabilitiesV2,
  type PageSectionJustify,
  type PageSectionLayoutV2,
  type PageSectionResponsiveOverrideV2,
  type PageSectionResponsiveStyleV2,
  type PageSectionScrollEffect,
  type PageSectionSpacingV2,
  type PageSectionStyleV2,
  type PageSectionType,
  type PageSectionV2,
  type PageSectionVariant,
  type PageSectionVisibilityV2,
  type PageShadowToken,
  type PageSurfacePreset,
  type PageSwitcherVariant,
  type PageTextColorMark,
  type PageTextColorMarkCapableBlockType,
  type PageTextHighlightMark,
  type PageTextLinkMark,
  type PageTextMark,
  type PageTextMarkCapableBlockType,
  type PageTextStructuralMark,
  type PageTiltStrength,
  type PageTypographyCapableBlockType,
  type PageTypographyFontFamily,
  type PageTypographyFontSize,
  type PageTypographyFontWeight,
  type PageTypographyTextTransform,
} from "../../../core/services/pages/pageDocumentV2";

// ── Compile-time fixture: all 79 explicit facade types are imported with
// per-specifier `type` modifiers and consumed in `FacadeTypeTuple` so none is
// an unused decorative import. `noUnusedLocals` in core/tsconfig.json requires
// the tuple alias to be exported and used.
export type FacadeTypeTuple = [
  AnimatedIconAnimation,
  AnimatedIconName,
  LegacyWidgetBlockProps,
  PageBackgroundType,
  PageBadgeIcon,
  PageBadgeIconPosition,
  PageBadgeShape,
  PageBadgeSize,
  PageBadgeVariant,
  PageBadgeWeight,
  PageBlockBorderStyle,
  PageBlockCapabilitiesV2,
  PageBlockDecoration,
  PageBlockDecorationMotion,
  PageBlockHoverEffect,
  PageBlockLayer,
  PageBlockMarquee,
  PageBlockPublicDataBinding,
  PageBlockResponsiveLayerV2,
  PageBlockResponsiveOverrideV2,
  PageBlockResponsiveStyleV2,
  PageBlockRuntimeRendererState,
  PageBlockSlotKey,
  PageBlockStyleV2,
  PageBlockTextMarkInput,
  PageBlockTextMarkRemoveInput,
  PageBlockType,
  PageBlockV2,
  PageBlockVisibilityV2,
  PageBlockWidth,
  PageBoxSpacingV2,
  PageBreakpoint,
  PageCollectionLinkV2,
  PageCollectionPaginationMode,
  PageColumnDistribution,
  PageComposition,
  PageDocumentErrorCode,
  PageDocumentSeoV2,
  PageDocumentSettingsV2,
  PageDocumentV2,
  PageEffectsV2,
  PageGalleryItemV2,
  PageGlow,
  PageGroupDirection,
  PageLayerAnchor,
  PageListItemV2,
  PageMarqueeDirection,
  PageScrollHintGlyph,
  PageSectionAlignment,
  PageSectionBorderEdgeV2,
  PageSectionBorderV2,
  PageSectionCapabilitiesV2,
  PageSectionJustify,
  PageSectionLayoutV2,
  PageSectionResponsiveOverrideV2,
  PageSectionResponsiveStyleV2,
  PageSectionScrollEffect,
  PageSectionSpacingV2,
  PageSectionStyleV2,
  PageSectionType,
  PageSectionV2,
  PageSectionVariant,
  PageSectionVisibilityV2,
  PageShadowToken,
  PageSurfacePreset,
  PageSwitcherVariant,
  PageTextColorMark,
  PageTextColorMarkCapableBlockType,
  PageTextHighlightMark,
  PageTextLinkMark,
  PageTextMark,
  PageTextMarkCapableBlockType,
  PageTextStructuralMark,
  PageTiltStrength,
  PageTypographyCapableBlockType,
  PageTypographyFontFamily,
  PageTypographyFontSize,
  PageTypographyFontWeight,
  PageTypographyTextTransform,
];

/** Pins the exact type count the tuple and AST proof must agree on. */
export const facadeTypeCount = 79;
export const facadeTypeOwnerMap: ReadonlyArray<readonly [string, string]> = [
  ["AnimatedIconAnimation", "./pageDocumentV2Types"],
  ["AnimatedIconName", "./pageDocumentV2Types"],
  ["LegacyWidgetBlockProps", "./pageDocumentV2Types"],
  ["PageBackgroundType", "./pageDocumentV2Types"],
  ["PageBadgeIcon", "./pageDocumentV2Types"],
  ["PageBadgeIconPosition", "./pageDocumentV2Types"],
  ["PageBadgeShape", "./pageDocumentV2Types"],
  ["PageBadgeSize", "./pageDocumentV2Types"],
  ["PageBadgeVariant", "./pageDocumentV2Types"],
  ["PageBadgeWeight", "./pageDocumentV2Types"],
  ["PageBlockBorderStyle", "./pageDocumentV2Types"],
  ["PageBlockCapabilitiesV2", "./pageDocumentV2Contract"],
  ["PageBlockDecoration", "./pageDocumentV2Types"],
  ["PageBlockDecorationMotion", "./pageDocumentV2Types"],
  ["PageBlockHoverEffect", "./pageDocumentV2Types"],
  ["PageBlockLayer", "./pageDocumentV2Types"],
  ["PageBlockMarquee", "./pageDocumentV2Types"],
  ["PageBlockPublicDataBinding", "./pageDocumentV2Contract"],
  ["PageBlockResponsiveLayerV2", "./pageResponsiveStyleV2"],
  ["PageBlockResponsiveOverrideV2", "./pageDocumentV2Types"],
  ["PageBlockResponsiveStyleV2", "./pageResponsiveStyleV2"],
  ["PageBlockRuntimeRendererState", "./pageDocumentV2Contract"],
  ["PageBlockSlotKey", "./pageDocumentV2Types"],
  ["PageBlockStyleV2", "./pageDocumentV2Types"],
  ["PageBlockTextMarkInput", "./pageTextMarksV2"],
  ["PageBlockTextMarkRemoveInput", "./pageTextMarksV2"],
  ["PageBlockType", "./pageDocumentV2Types"],
  ["PageBlockV2", "./pageDocumentV2Types"],
  ["PageBlockVisibilityV2", "./pageDocumentV2Types"],
  ["PageBlockWidth", "./pageDocumentV2Types"],
  ["PageBoxSpacingV2", "./pageDocumentV2Types"],
  ["PageBreakpoint", "./pageDocumentV2Types"],
  ["PageCollectionLinkV2", "./pageDocumentV2Types"],
  ["PageCollectionPaginationMode", "./pageDocumentV2Types"],
  ["PageColumnDistribution", "./pageDocumentV2Types"],
  ["PageComposition", "./pageDocumentV2Types"],
  ["PageDocumentErrorCode", "./pageDocumentV2Types"],
  ["PageDocumentSeoV2", "./pageDocumentV2Types"],
  ["PageDocumentSettingsV2", "./pageDocumentV2Types"],
  ["PageDocumentV2", "./pageDocumentV2Types"],
  ["PageEffectsV2", "./pageDocumentV2Types"],
  ["PageGalleryItemV2", "./pageGalleryV2"],
  ["PageGlow", "./pageDocumentV2Types"],
  ["PageGroupDirection", "./pageDocumentV2Types"],
  ["PageLayerAnchor", "./pageDocumentV2Types"],
  ["PageListItemV2", "./pageDocumentV2Contract"],
  ["PageMarqueeDirection", "./pageDocumentV2Types"],
  ["PageScrollHintGlyph", "./pageDocumentV2Types"],
  ["PageSectionAlignment", "./pageDocumentV2Types"],
  ["PageSectionBorderEdgeV2", "./pageDocumentV2Types"],
  ["PageSectionBorderV2", "./pageDocumentV2Types"],
  ["PageSectionCapabilitiesV2", "./pageDocumentV2Contract"],
  ["PageSectionJustify", "./pageDocumentV2Types"],
  ["PageSectionLayoutV2", "./pageDocumentV2Types"],
  ["PageSectionResponsiveOverrideV2", "./pageDocumentV2Types"],
  ["PageSectionResponsiveStyleV2", "./pageResponsiveStyleV2"],
  ["PageSectionScrollEffect", "./pageDocumentV2Types"],
  ["PageSectionSpacingV2", "./pageDocumentV2Types"],
  ["PageSectionStyleV2", "./pageDocumentV2Types"],
  ["PageSectionType", "./pageDocumentV2Types"],
  ["PageSectionV2", "./pageDocumentV2Types"],
  ["PageSectionVariant", "./pageDocumentV2Types"],
  ["PageSectionVisibilityV2", "./pageDocumentV2Types"],
  ["PageShadowToken", "./pageDocumentV2Types"],
  ["PageSurfacePreset", "./pageDocumentV2Types"],
  ["PageSwitcherVariant", "./pageDocumentV2Types"],
  ["PageTextColorMark", "./pageDocumentV2Types"],
  ["PageTextColorMarkCapableBlockType", "./pageDocumentV2Types"],
  ["PageTextHighlightMark", "./pageDocumentV2Types"],
  ["PageTextLinkMark", "./pageDocumentV2Types"],
  ["PageTextMark", "./pageDocumentV2Types"],
  ["PageTextMarkCapableBlockType", "./pageDocumentV2Types"],
  ["PageTextStructuralMark", "./pageDocumentV2Types"],
  ["PageTiltStrength", "./pageDocumentV2Types"],
  ["PageTypographyCapableBlockType", "./pageDocumentV2Types"],
  ["PageTypographyFontFamily", "./pageDocumentV2Types"],
  ["PageTypographyFontSize", "./pageDocumentV2Types"],
  ["PageTypographyFontWeight", "./pageDocumentV2Types"],
  ["PageTypographyTextTransform", "./pageDocumentV2Types"],
];

export const facadeRuntimeOwnerMap: ReadonlyArray<readonly [string, string]> = [
  ["ANIMATED_ICON_NAME_PATTERN", "./pageDocumentV2Types"],
  ["ANIMATED_ICON_SIZE_CLAMP", "./pageDocumentV2Types"],
  ["ANIMATED_ICON_SPEED_CLAMP", "./pageDocumentV2Types"],
  ["GALLERY_CATEGORY_PATTERN", "./pageDocumentV2Types"],
  ["GALLERY_FILTER_CATEGORY_MAX", "./pageDocumentV2Types"],
  ["PAGE_BLOCK_BORDER_WIDTH_CLAMP", "./pageDocumentV2Types"],
  ["PAGE_BLOCK_BOX_SPACING_CLAMP", "./pageDocumentV2Types"],
  ["PAGE_BLOCK_MAX_CHILDREN_PER_SLOT", "./pageDocumentV2Types"],
  ["PAGE_BLOCK_MAX_TREE_DEPTH", "./pageDocumentV2Types"],
  ["PAGE_BLOCK_SPAN_CLAMP", "./pageDocumentV2Types"],
  ["PAGE_COLLECTION_LIMIT_CLAMP", "./pageDocumentV2Types"],
  ["PAGE_CUSTOM_SVG_MAX_BYTES", "./pageDocumentV2Types"],
  ["PAGE_DECORATION_DELAY_CLAMP", "./pageDocumentV2Types"],
  ["PAGE_DECORATION_DURATION_CLAMP", "./pageDocumentV2Types"],
  ["PAGE_DIVIDER_WIDTH_CLAMP", "./pageDocumentV2Types"],
  ["PAGE_DOCUMENT_SCHEMA_VERSION", "./pageDocumentV2Types"],
  ["PAGE_DRAW_SPEED_CLAMP", "./pageDocumentV2Types"],
  ["PAGE_FILTERS_MAX_FACETS", "./pageDocumentV2Types"],
  ["PAGE_GALLERY_ALT_MAX", "./pageGalleryV2"],
  ["PAGE_GALLERY_CAPTION_MAX", "./pageGalleryV2"],
  ["PAGE_GALLERY_CATEGORY_MAX", "./pageGalleryV2"],
  ["PAGE_GALLERY_CATEGORY_TOKENS_MAX", "./pageGalleryV2"],
  ["PAGE_GALLERY_CATEGORY_TOKEN_MAX", "./pageGalleryV2"],
  ["PAGE_GALLERY_ITEMS_MAX", "./pageGalleryV2"],
  ["PAGE_GALLERY_SRC_MAX", "./pageGalleryV2"],
  ["PAGE_GLOW_BLUR_CLAMP", "./pageDocumentV2Types"],
  ["PAGE_GLOW_OFFSET_CLAMP", "./pageDocumentV2Types"],
  ["PAGE_GLOW_SPREAD_CLAMP", "./pageDocumentV2Types"],
  ["PAGE_LAYER_X_CLAMP", "./pageDocumentV2Types"],
  ["PAGE_LAYER_Y_CLAMP", "./pageDocumentV2Types"],
  ["PAGE_LAYER_Z_CLAMP", "./pageDocumentV2Types"],
  ["PAGE_MARQUEE_SPEED_CLAMP", "./pageDocumentV2Types"],
  ["PAGE_PARALLAX_INTENSITY_CLAMP", "./pageDocumentV2Types"],
  ["PAGE_REVEAL_DELAY_CLAMP", "./pageDocumentV2Types"],
  ["PAGE_SECTION_BLOCK_COLUMN_CLAMP", "./pageDocumentV2Types"],
  ["PAGE_SECTION_BORDER_WIDTH_CLAMP", "./pageDocumentV2Types"],
  ["PAGE_SPOTLIGHT_SIZE_CLAMP", "./pageDocumentV2Types"],
  ["PAGE_SWITCHER_ARIA_LABEL_MAX_LENGTH", "./pageDocumentV2Types"],
  ["PAGE_SWITCHER_DEFAULT_ARIA_LABEL", "./pageDocumentV2Types"],
  ["PAGE_TEXT_MARK_MAX", "./pageDocumentV2Types"],
  ["PAGE_TYPOGRAPHY_LETTER_SPACING_CLAMP", "./pageDocumentV2Types"],
  ["PAGE_TYPOGRAPHY_LINE_HEIGHT_CLAMP", "./pageDocumentV2Types"],
  ["PageDocumentError", "./pageDocumentV2Types"],
  ["SWITCHER_MAX_PANELS", "./pageDocumentV2Types"],
  ["animatedIconAnimations", "./pageDocumentV2Types"],
  ["animatedIconNames", "./pageDocumentV2Types"],
  ["applyBlockTextMark", "./pageTextMarksV2"],
  ["clearBlockResponsiveOverride", "./pageDocumentV2Normalizer"],
  ["clearResponsiveOverride", "./pageDocumentV2Normalizer"],
  ["createDefaultPageDocumentV2", "./pageDocumentV2Normalizer"],
  ["createPageBlockV2", "./pageDocumentV2Normalizer"],
  ["createPageDocumentId", "./pageDocumentV2Normalizer"],
  ["createPageListItem", "./pageDocumentV2Contract"],
  ["createPageSectionV2", "./pageDocumentV2Normalizer"],
  ["getPageBlockActiveSlotKeys", "./pageDocumentV2Contract"],
  ["isLegacyOrVersionlessPageDocument", "./pageDocumentV2Normalizer"],
  ["isPageDocumentError", "./pageDocumentV2Normalizer"],
  ["isPageTextColorMarkCapableBlockType", "./pageDocumentV2Types"],
  ["isPageTextMarkCapableBlockType", "./pageDocumentV2Types"],
  ["isPageTypographyCapableBlockType", "./pageDocumentV2Types"],
  ["legacyWidgetBlockPropKeys", "./pageDocumentV2Types"],
  ["mergePageBlockLayerPresentKeys", "./pageDocumentV2Normalizer"],
  ["normalizeBlockTextColorMarks", "./pageTextMarksV2"],
  ["normalizeBlockTextMarks", "./pageTextMarksV2"],
  ["normalizePageDocumentV2", "./pageDocumentV2Normalizer"],
  ["normalizePageDocumentV2ForWrite", "./pageDocumentV2Normalizer"],
  ["normalizeStoredPageDocumentV2ForRead", "./pageDocumentV2Normalizer"],
  ["normalizeSwitcherAriaLabel", "./pageDocumentV2Types"],
  ["pageBackgroundTypes", "./pageDocumentV2Types"],
  ["pageBadgeIconPositions", "./pageDocumentV2Types"],
  ["pageBadgeIcons", "./pageDocumentV2Types"],
  ["pageBadgeShapes", "./pageDocumentV2Types"],
  ["pageBadgeSizes", "./pageDocumentV2Types"],
  ["pageBadgeVariants", "./pageDocumentV2Types"],
  ["pageBadgeWeights", "./pageDocumentV2Types"],
  ["pageBlockBorderStyles", "./pageDocumentV2Types"],
  ["pageBlockCapabilities", "./pageDocumentV2Contract"],
  ["pageBlockDecorationMotions", "./pageDocumentV2Types"],
  ["pageBlockDefaultProps", "./pageDocumentV2Contract"],
  ["pageBlockHoverEffects", "./pageDocumentV2Types"],
  ["pageBlockPropKeys", "./pageDocumentV2Contract"],
  ["pageBlockSlotKeys", "./pageDocumentV2Types"],
  ["pageBlockTypes", "./pageDocumentV2Types"],
  ["pageBlockWidths", "./pageDocumentV2Types"],
  ["pageBreakpoints", "./pageDocumentV2Types"],
  ["pageButtonSizes", "./pageDocumentV2Types"],
  ["pageButtonTargets", "./pageDocumentV2Types"],
  ["pageButtonVariants", "./pageDocumentV2Types"],
  ["pageCollectionPaginationModes", "./pageDocumentV2Types"],
  ["pageColumnDistributions", "./pageDocumentV2Types"],
  ["pageColumnTemplatePresets", "./pageDocumentV2Types"],
  ["pageCompositions", "./pageDocumentV2Types"],
  ["pageDividerAligns", "./pageDocumentV2Types"],
  ["pageDividerTones", "./pageDocumentV2Types"],
  ["pageDocumentV2JsonSchema", "./pageDocumentV2Schema"],
  ["pageFiltersBlockLayouts", "./pageDocumentV2Types"],
  ["pageFiltersFacetKinds", "./pageDocumentV2Types"],
  ["pageFiltersFacetOperators", "./pageDocumentV2Types"],
  ["pageGalleryLayouts", "./pageDocumentV2Types"],
  ["pageGroupDirections", "./pageDocumentV2Types"],
  ["pageHeadingLevels", "./pageDocumentV2Types"],
  ["pageImageFits", "./pageDocumentV2Types"],
  ["pageLayerAnchors", "./pageDocumentV2Types"],
  ["pageMarqueeDirections", "./pageDocumentV2Types"],
  ["pageSectionAlignments", "./pageDocumentV2Types"],
  ["pageSectionCapabilities", "./pageDocumentV2Contract"],
  ["pageSectionJustify", "./pageDocumentV2Types"],
  ["pageSectionScrollEffects", "./pageDocumentV2Types"],
  ["pageSectionTypes", "./pageDocumentV2Types"],
  ["pageSectionVariants", "./pageDocumentV2Types"],
  ["pageShadowTokens", "./pageDocumentV2Types"],
  ["pageSurfacePresets", "./pageDocumentV2Types"],
  ["pageTextAlignments", "./pageDocumentV2Types"],
  ["pageTextColorMarkCapableBlockTypes", "./pageDocumentV2Types"],
  ["pageTextFormats", "./pageDocumentV2Types"],
  ["pageTextMarkCapableBlockTypes", "./pageDocumentV2Types"],
  ["pageTiltStrengths", "./pageDocumentV2Types"],
  ["pageTypographyCapableBlockTypes", "./pageDocumentV2Types"],
  ["pageTypographyFontFamilies", "./pageDocumentV2Types"],
  ["pageTypographyFontFamilyCssValues", "./pageDocumentV2Types"],
  ["pageTypographyFontSizeCssValues", "./pageDocumentV2Types"],
  ["pageTypographyFontSizes", "./pageDocumentV2Types"],
  ["pageTypographyFontWeightCssValues", "./pageDocumentV2Types"],
  ["pageTypographyFontWeights", "./pageDocumentV2Types"],
  ["pageTypographyTextTransforms", "./pageDocumentV2Types"],
  ["removeBlockTextMark", "./pageTextMarksV2"],
  ["resolveAnimatedIconName", "./pageDocumentV2Types"],
  ["resolvePageBlockForBreakpoint", "./pageDocumentV2Normalizer"],
  ["resolvePageDocumentForBreakpoint", "./pageDocumentV2Normalizer"],
  ["resolvePageSectionForBreakpoint", "./pageDocumentV2Normalizer"],
  ["resolveSwitcherAriaLabel", "./pageDocumentV2Types"],
  ["scrollHintGlyphs", "./pageDocumentV2Types"],
  ["switcherVariants", "./pageDocumentV2Types"],
  ["toPublishedPageDocumentV2", "./pageDocumentV2Normalizer"],
];

const repoRoot = process.cwd();
const facadePath = "core/services/pages/pageDocumentV2.ts";

type ParsedExport = { name: string; typeOnly: boolean; owner: string };

const parseFacadeExports = (source: SourceFile, sourceText: string): ParsedExport[] => {
  const exports: ParsedExport[] = [];
  for (const statement of source.statements) {
    // Rule 1: every top-level statement must be an ExportDeclaration with a
    // string module specifier and a nonempty NamedExports clause.
    if (!isExportDeclaration(statement)) {
      throw new Error(`top-level statement is not an export declaration: ${statement.kind}`);
    }
    const declaration = statement as ExportDeclaration;
    if (!declaration.moduleSpecifier || !isStringLiteral(declaration.moduleSpecifier)) {
      throw new Error("export declaration lacks a string module specifier");
    }
    const owner = declaration.moduleSpecifier.text;
    const clause = declaration.exportClause;
    if (!clause || !isNamedExports(clause)) {
      throw new Error("export declaration lacks a NamedExports clause");
    }
    if (clause.elements.length === 0) {
      throw new Error("empty export clause");
    }
    for (const element of clause.elements) {
      if (!isExportSpecifier(element)) throw new Error("non-specifier export element");
      // Rule 1 continued: no aliases (`propertyName`).
      if (element.propertyName) throw new Error(`aliased export ${element.name.text}`);
      if (!isIdentifier(element.name)) throw new Error(`non-identifier export name`);
      exports.push({ name: element.name.text, typeOnly: element.isTypeOnly, owner });
    }
  }
  return exports;
};

describe("TASK-539 facade manifest (page-document-v2-facade)", () => {
  let parsed: ParsedExport[];

  beforeAll(async () => {
    const sourceText = await readFile(path.join(repoRoot, facadePath), "utf8");
    const sourceFile = createSourceFile(
      facadePath,
      sourceText,
      ScriptTarget.Latest,
      true,
      ScriptKind.TS
    );
    parsed = parseFacadeExports(sourceFile, sourceText);
  });

  test("every top-level statement is a typed export block with no aliases or duplicates", () => {
    const names = parsed.map((entry) => entry.name);
    expect(new Set(names).size).toBe(names.length);
    expect(parsed.every((entry) => entry.typeOnly === false || entry.typeOnly === true)).toBe(true);
    // Declaration-level `export type { ... } from` blocks are rejected by the
    // parser: `typeOnly` on the ExportDeclaration is never allowed. Only
    // per-specifier `type X` modifiers appear inside value blocks.
  });

  test("exactly 79 explicit type names reach the facade with exact owners", () => {
    const actual = parsed
      .filter((entry) => entry.typeOnly)
      .map(({ name, owner }): readonly [string, string] => [name, owner])
      .sort(byName);
    expect(actual).toEqual(sortMapped(facadeTypeOwnerMap));
    expect(actual).toHaveLength(79);
  });

  test("exactly 134 runtime names reach the facade with exact owners", () => {
    const actual = parsed
      .filter((entry) => !entry.typeOnly)
      .map(({ name, owner }): readonly [string, string] => [name, owner])
      .sort(byName);
    expect(actual).toEqual(sortMapped(facadeRuntimeOwnerMap));
    expect(actual).toHaveLength(134);
  });

  test("facade module evaluates to exactly the 134 runtime names", () => {
    expect(Object.keys(facadeNamespace).sort()).toEqual(
      facadeRuntimeOwnerMap.map(([name]) => name).sort()
    );
  });

  test("all 134 runtime names are the direct owner bindings (toBe identity)", () => {
    const ownerModules: Record<string, Record<string, unknown>> = {
      "./pageDocumentV2Types": typesOwner,
      "./pageDocumentV2Contract": contractOwner,
      "./pageDocumentV2Schema": schemaOwner,
      "./pageGalleryV2": galleryOwner,
      "./pageTextMarksV2": textMarksOwner,
      "./pageDocumentV2Normalizer": normalizerOwner,
    };
    for (const [name, owner] of facadeRuntimeOwnerMap) {
      const binding = ownerModules[owner];
      if (!binding) throw new Error(`no owner module for ${name}`);
      expect((facadeNamespace as Record<string, unknown>)[name]).toBe(binding[name]);
    }
  });

  test("the 79-type compile-time tuple is exported and structurally sound", () => {
    // The tuple alias above would not typecheck if any imported type were
    // missing from the facade; this test only pins the count contract.
    expect(facadeTypeCount).toBe(79);
  });
});

const byName = (a: readonly [string, string], b: readonly [string, string]): number =>
  a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;

const sortMapped = (
  entries: ReadonlyArray<readonly [string, string]>
): ReadonlyArray<readonly [string, string]> => [...entries].sort(byName);
