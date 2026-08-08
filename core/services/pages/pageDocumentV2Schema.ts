import {
  blockDepthJsonSchemaRef,
  booleanSchema,
  numericSchema,
  pageBlockDepthJsonSchemas,
  pageBlockStyleJsonSchema,
  pageGlowJsonSchema,
  pageSectionBorderJsonSchema,
} from "./pageBlockJsonSchemaV2";
import { PAGE_CSS_VALUE_MAX_LENGTH } from "./pageAuthoringSanitizers";
import {
  menuAppearanceAlignments,
  menuAppearanceDropdownDirections,
  menuAppearanceFontWeights,
  menuAppearanceMobileModes,
  menuAppearanceShadows,
  menuAppearanceTextTransforms,
} from "../menus/normalizeMenuAppearance";
import { mobileBreakpoints } from "./pageDocumentV2Contract";
import {
  PAGE_DOCUMENT_SCHEMA_VERSION,
  PAGE_PARALLAX_INTENSITY_CLAMP,
  PAGE_SPOTLIGHT_SIZE_CLAMP,
  pageBackgroundTypes,
  pageBreakpoints,
  pageCompositions,
  pageSectionAlignments,
  pageSectionJustify,
  pageSectionScrollEffects,
  pageSectionTypes,
  pageSectionVariants,
  pageShadowTokens,
  pageSurfacePresets,
} from "./pageDocumentV2Types";

type RecordValue = Record<string, unknown>;

const partialSectionLayoutJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  properties: {
    columns: numericSchema(1, 4),
    align: { type: "string", enum: [...pageSectionAlignments] },
    justify: { type: "string", enum: [...pageSectionJustify] },
    maxWidth: numericSchema(320, 1920),
    stackVertical: booleanSchema,
  },
};

const partialSectionStyleJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  properties: {
    // maxLength defence-in-depth (ReDoS): deep validation owned by
    // `sanitizeAuthoringCssBackground`; cap oversized input before any regex.
    background: { type: "string", maxLength: PAGE_CSS_VALUE_MAX_LENGTH },
    backgroundType: { type: "string", enum: [...pageBackgroundTypes] },
    backgroundImage: { type: ["string", "null"] },
    accent: { type: "string" },
    radius: numericSchema(0, 64),
    shadow: { type: "string", enum: [...pageShadowTokens] },
    // Harmless defence-in-depth mirror (TASK-521-01-L01): section effects render
    // device-uniform, but a hand-authored responsive[bp].style carrying these
    // round-trips instead of being rejected by additionalProperties:false.
    scrollEffect: { type: "string", enum: [...pageSectionScrollEffects] },
    parallaxIntensity: numericSchema(
      PAGE_PARALLAX_INTENSITY_CLAMP.min,
      PAGE_PARALLAX_INTENSITY_CLAMP.max
    ),
    // TASK-522-01-L03 section composition fields (present-only mirror).
    surfacePreset: { type: "string", enum: [...pageSurfacePresets] },
    composition: { type: "string", enum: [...pageCompositions] },
    // TASK-525-01-L02 full-bleed background (present-only boolean).
    fullBleed: booleanSchema,
    // ── TASK-531 REGION: glow box-shadow (present-only mirror).
    glow: pageGlowJsonSchema,
    // ── END TASK-531 REGION ──────────────────────────────────────────────────
    // ── TASK-534 ── static grain overlay (present-only boolean).
    noiseOverlay: booleanSchema,
    // ── TASK-533-01 REGION: asymmetric column ratio (value validated at
    // normalize by sanitizeAuthoringGridTemplate; string shape only here).
    columnTemplate: { type: "string" },
    // ── END TASK-533-01 REGION ────────────────────────────────────────────────
    // ── TASK-533-02 REGION: per-edge section border (present-only object).
    border: pageSectionBorderJsonSchema,
    // ── END TASK-533-02 REGION ────────────────────────────────────────────────
  },
};

const partialSectionSpacingJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  properties: {
    paddingTop: numericSchema(0, 240),
    paddingBottom: numericSchema(0, 240),
    paddingLeft: numericSchema(0, 240),
    paddingRight: numericSchema(0, 240),
    gap: numericSchema(0, 120),
  },
};

const partialSectionVisibilityJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  properties: {
    visible: { type: "boolean" },
    authOnly: { type: "boolean" },
    anchor: { type: ["string", "null"] },
    startsAt: { type: ["string", "null"] },
    endsAt: { type: ["string", "null"] },
  },
};

const sectionResponsiveJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(
    mobileBreakpoints.map((breakpoint) => [
      breakpoint,
      {
        type: "object",
        additionalProperties: false,
        properties: {
          layout: partialSectionLayoutJsonSchema,
          style: partialSectionStyleJsonSchema,
          spacing: partialSectionSpacingJsonSchema,
          visibility: partialSectionVisibilityJsonSchema,
        },
      },
    ])
  ),
};

export const pageDocumentV2JsonSchema: RecordValue = {
  type: "object",
  required: ["schemaVersion", "sections"],
  additionalProperties: false,
  $defs: { pageBlockStyle: pageBlockStyleJsonSchema, ...pageBlockDepthJsonSchemas },
  properties: {
    schemaVersion: { const: PAGE_DOCUMENT_SCHEMA_VERSION },
    breakpoints: {
      type: "array",
      items: { type: "string", enum: [...pageBreakpoints] },
      minItems: 3,
      maxItems: 3,
    },
    seo: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        image: { type: ["string", "null"] },
      },
    },
    settings: {
      type: "object",
      additionalProperties: false,
      properties: {
        template: { type: "string" },
        showInNav: { type: "boolean" },
        revisionRetention: { type: "number", minimum: 1, maximum: 100 },
        // Menu-host appearance vehicle (TASK-458-03). Deep validation
        // (color shapes, numeric clamps) is owned by
        // `normalizeMenuAppearance`; the JSON schema mirrors the shape and
        // reject-unknown contract.
        menuAppearance: {
          type: "object",
          additionalProperties: false,
          properties: {
            surfaceColor: { type: "string" },
            linkColor: { type: "string" },
            linkHoverColor: { type: "string" },
            linkActiveColor: { type: "string" },
            itemGap: { type: "number" },
            paddingY: { type: "number" },
            paddingX: { type: "number" },
            alignment: { type: "string", enum: [...menuAppearanceAlignments] },
            fontSize: { type: "number" },
            fontWeight: { type: "number", enum: [...menuAppearanceFontWeights] },
            textTransform: { type: "string", enum: [...menuAppearanceTextTransforms] },
            borderColor: { type: "string" },
            borderWidth: { type: "number" },
            shadow: { type: "string", enum: [...menuAppearanceShadows] },
            sticky: { type: "boolean" },
            dropdownDirection: {
              type: "string",
              enum: [...menuAppearanceDropdownDirections],
            },
            mobileMode: { type: "string", enum: [...menuAppearanceMobileModes] },
          },
        },
        // Per-page effects (TASK-521-01-L02). Deep validation (safe color,
        // numeric clamp) is owned by `normalizeEffects`; this mirrors the shape
        // and the reject-unknown contract in lockstep.
        effects: {
          type: "object",
          additionalProperties: false,
          properties: {
            cursorSpotlight: { type: "boolean" },
            spotlightColor: { type: "string" },
            spotlightSize: {
              type: "number",
              minimum: PAGE_SPOTLIGHT_SIZE_CLAMP.min,
              maximum: PAGE_SPOTLIGHT_SIZE_CLAMP.max,
            },
            // ── TASK-534 ── page-root static grain overlay (present-only boolean).
            noiseOverlay: { type: "boolean" },
          },
        },
        // TASK-523-01 per-page canvas background. Deep color/gradient validation
        // is owned by `sanitizeAuthoringCssBackground` in `normalizeSettings`
        // (exactly as `menuAppearance`'s deep validation is owned by
        // `normalizeMenuAppearance`); the schema mirrors only the shape.
        // maxLength defence-in-depth (ReDoS): this multi-layer-capable field previously
        // had NO cap; bound it so oversized input is rejected before any regex.
        background: { type: "string", maxLength: PAGE_CSS_VALUE_MAX_LENGTH },
        collectionLink: {
          type: "object",
          required: ["contentTypeId", "pageRole"],
          additionalProperties: false,
          properties: {
            contentTypeId: { type: "string", minLength: 1 },
            pageRole: { type: "string", enum: ["canonical-list-page", "supporting-page"] },
            compositionKey: { type: ["string", "null"] },
            listingQueryId: { type: ["string", "null"] },
            listingTemplateId: { type: ["string", "null"] },
          },
        },
      },
    },
    sections: {
      type: "array",
      items: {
        type: "object",
        required: [
          "id",
          "type",
          "name",
          "variant",
          "layout",
          "style",
          "spacing",
          "visibility",
          "responsive",
          "blocks",
        ],
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1 },
          type: { type: "string", enum: [...pageSectionTypes] },
          name: { type: "string", minLength: 1 },
          variant: { type: "string", enum: [...pageSectionVariants] },
          layout: {
            type: "object",
            required: ["columns", "align", "justify", "maxWidth"],
            additionalProperties: false,
            properties: {
              columns: { type: "number", minimum: 1, maximum: 4 },
              align: { type: "string", enum: [...pageSectionAlignments] },
              justify: { type: "string", enum: [...pageSectionJustify] },
              maxWidth: { type: "number", minimum: 320, maximum: 1920 },
              stackVertical: { type: "boolean" },
            },
          },
          style: {
            type: "object",
            required: ["background", "backgroundType", "accent", "radius", "shadow"],
            additionalProperties: false,
            properties: {
              // maxLength defence-in-depth (ReDoS): deep validation owned by
              // `sanitizeAuthoringCssBackground`; cap oversized input before any regex.
              background: { type: "string", maxLength: PAGE_CSS_VALUE_MAX_LENGTH },
              backgroundType: { type: "string", enum: [...pageBackgroundTypes] },
              backgroundImage: { type: ["string", "null"] },
              accent: { type: "string" },
              radius: { type: "number", minimum: 0, maximum: 64 },
              shadow: { type: "string", enum: [...pageShadowTokens] },
              scrollEffect: { type: "string", enum: [...pageSectionScrollEffects] },
              parallaxIntensity: {
                type: "number",
                minimum: PAGE_PARALLAX_INTENSITY_CLAMP.min,
                maximum: PAGE_PARALLAX_INTENSITY_CLAMP.max,
              },
              // TASK-522-01-L03 section composition fields (present-only mirror).
              surfacePreset: { type: "string", enum: [...pageSurfacePresets] },
              composition: { type: "string", enum: [...pageCompositions] },
              // TASK-525-01-L02 full-bleed background (present-only boolean).
              fullBleed: booleanSchema,
              // ── TASK-531 REGION: glow box-shadow (present-only; MUST mirror the
              // partial + block schemas or a top-level style.glow fails
              // additionalProperties:false and breaks the section-glow round-trip.
              glow: pageGlowJsonSchema,
              // ── END TASK-531 REGION ────────────────────────────────────────
              // ── TASK-534 ── static grain overlay (present-only boolean).
              noiseOverlay: booleanSchema,
              // ── TASK-533-01 REGION: asymmetric column ratio (MUST mirror the
              // partial schema or a top-level style.columnTemplate fails
              // additionalProperties:false; value validated at normalize).
              columnTemplate: { type: "string" },
              // ── END TASK-533-01 REGION ─────────────────────────────────────
              // ── TASK-533-02 REGION: per-edge section border (MUST mirror the
              // partial schema or a top-level style.border fails
              // additionalProperties:false and breaks the border round-trip).
              border: pageSectionBorderJsonSchema,
              // ── END TASK-533-02 REGION ─────────────────────────────────────
            },
          },
          spacing: {
            type: "object",
            required: ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "gap"],
            additionalProperties: false,
            properties: {
              paddingTop: { type: "number", minimum: 0, maximum: 240 },
              paddingBottom: { type: "number", minimum: 0, maximum: 240 },
              paddingLeft: { type: "number", minimum: 0, maximum: 240 },
              paddingRight: { type: "number", minimum: 0, maximum: 240 },
              gap: { type: "number", minimum: 0, maximum: 120 },
            },
          },
          visibility: {
            type: "object",
            required: ["visible", "authOnly"],
            additionalProperties: false,
            properties: {
              visible: { type: "boolean" },
              authOnly: { type: "boolean" },
              anchor: { type: ["string", "null"] },
              startsAt: { type: ["string", "null"] },
              endsAt: { type: ["string", "null"] },
            },
          },
          responsive: sectionResponsiveJsonSchema,
          blocks: {
            type: "array",
            items: blockDepthJsonSchemaRef(1),
          },
        },
      },
    },
  },
};
