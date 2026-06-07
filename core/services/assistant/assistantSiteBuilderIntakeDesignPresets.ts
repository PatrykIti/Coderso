import { throwAssistantSiteBuilderIntakeError } from "./assistantSiteBuilderIntakeErrors";
import { assertTokenOverrides } from "../theme/tokenValidation";
import type { DesignTokenOverrides } from "../theme/tokenTypes";
import type {
  AssistantSiteBuilderDesignPresetFacts,
  AssistantSiteBuilderDesignPresetId,
  AssistantSiteBuilderDesignPresetTokenFacts,
  AssistantSiteBuilderIntakeOptionDefinition,
  AssistantSiteBuilderSectionRoleId,
} from "./assistantSiteBuilderIntakeTypes";
import {
  assistantSiteBuilderDesignAccentIds,
  assistantSiteBuilderDesignContrastIds,
  assistantSiteBuilderDesignCornerRadiusIds,
  assistantSiteBuilderDesignDensityIds,
  assistantSiteBuilderDesignImageTreatmentIds,
  assistantSiteBuilderDesignPresetIds,
  assistantSiteBuilderDesignSpacingIds,
  assistantSiteBuilderDesignToneIds,
  assistantSiteBuilderDesignTypographyIds,
  assistantSiteBuilderSectionRoleIds,
} from "./assistantSiteBuilderIntakeTypes";

export type AssistantSiteBuilderDesignPresetDefinition = {
  id: AssistantSiteBuilderDesignPresetId;
  label: string;
  description: string;
  tokens: AssistantSiteBuilderDesignPresetTokenFacts;
  themeTokenHints: DesignTokenOverrides;
  supportedSectionRoleIds: readonly AssistantSiteBuilderSectionRoleId[];
  gapCodes: readonly string[];
};

const allSectionRoles = assistantSiteBuilderSectionRoleIds;
const commerceAndListingSections = [
  "value-proposition",
  "services-overview",
  "featured-items",
  "proof",
  "comparison",
  "pricing",
  "faq",
  "lead-capture",
  "contact",
  "call-to-action",
] as const satisfies readonly AssistantSiteBuilderSectionRoleId[];

const contentSections = [
  "value-proposition",
  "featured-items",
  "proof",
  "faq",
  "lead-capture",
  "contact",
  "content-feed",
  "call-to-action",
] as const satisfies readonly AssistantSiteBuilderSectionRoleId[];

const serviceSections = [
  "value-proposition",
  "services-overview",
  "proof",
  "process",
  "benefits",
  "faq",
  "lead-capture",
  "contact",
  "call-to-action",
] as const satisfies readonly AssistantSiteBuilderSectionRoleId[];

const supportedTokenSets = {
  toneId: new Set<string>(assistantSiteBuilderDesignToneIds),
  contrastId: new Set<string>(assistantSiteBuilderDesignContrastIds),
  densityId: new Set<string>(assistantSiteBuilderDesignDensityIds),
  typographyId: new Set<string>(assistantSiteBuilderDesignTypographyIds),
  imageTreatmentId: new Set<string>(assistantSiteBuilderDesignImageTreatmentIds),
  spacingId: new Set<string>(assistantSiteBuilderDesignSpacingIds),
  cornerRadiusId: new Set<string>(assistantSiteBuilderDesignCornerRadiusIds),
  accentId: new Set<string>(assistantSiteBuilderDesignAccentIds),
} as const;

const secretLikeValuePattern =
  /\b(password|token|secret|api[-_\s]?key|authorization|cookie|bearer|csrf|session)\b/iu;

const unsupportedGapCodes = ["theme-application-pending"] as const;

const cloneThemeTokenHints = (input: DesignTokenOverrides): DesignTokenOverrides => ({
  ...(input.colors ? { colors: { ...input.colors } } : {}),
  ...(input.neutrals ? { neutrals: { ...input.neutrals } } : {}),
  ...(input.spacing ? { spacing: { ...input.spacing } } : {}),
  ...(input.radius ? { radius: { ...input.radius } } : {}),
  ...(input.typography ? { typography: { ...input.typography } } : {}),
});

const freezeThemeTokenHints = (input: DesignTokenOverrides): DesignTokenOverrides =>
  Object.freeze({
    ...(input.colors ? { colors: Object.freeze({ ...input.colors }) } : {}),
    ...(input.neutrals ? { neutrals: Object.freeze({ ...input.neutrals }) } : {}),
    ...(input.spacing ? { spacing: Object.freeze({ ...input.spacing }) } : {}),
    ...(input.radius ? { radius: Object.freeze({ ...input.radius }) } : {}),
    ...(input.typography ? { typography: Object.freeze({ ...input.typography }) } : {}),
  });

const collectStringValues = (value: unknown): string[] => {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((item) => collectStringValues(item));
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((item) =>
      collectStringValues(item)
    );
  }
  return [];
};

const definition = (
  input: AssistantSiteBuilderDesignPresetDefinition
): AssistantSiteBuilderDesignPresetDefinition => input;

const rawDesignPresetDefinitions = [
  definition({
    id: "modern",
    label: "Modern",
    description: "Clean contemporary layout with balanced density and one clear accent.",
    tokens: {
      toneId: "clean",
      contrastId: "medium",
      densityId: "balanced",
      typographyId: "sans",
      imageTreatmentId: "crisp",
      spacingId: "md",
      cornerRadiusId: "md",
      accentId: "single-accent",
    },
    themeTokenHints: {
      colors: { primary: "#2563eb", secondary: "#0f766e", accent: "#f59e0b" },
      neutrals: { bg: "#ffffff", surface: "#f8fafc", border: "#dbe3ea", text: "#111827" },
      radius: { md: "8px", lg: "12px" },
      spacing: { md: "1rem", lg: "1.5rem" },
      typography: {
        sans: '"Inter", "IBM Plex Sans", Arial, sans-serif',
        display: '"Space Grotesk", "Helvetica Neue", Arial, sans-serif',
      },
    },
    supportedSectionRoleIds: allSectionRoles,
    gapCodes: unsupportedGapCodes,
  }),
  definition({
    id: "editorial",
    label: "Editorial",
    description: "Calm magazine-like structure for content, stories, work, and resources.",
    tokens: {
      toneId: "editorial",
      contrastId: "medium",
      densityId: "spacious",
      typographyId: "serif-accent",
      imageTreatmentId: "editorial-crop",
      spacingId: "lg",
      cornerRadiusId: "sm",
      accentId: "subtle-accent",
    },
    themeTokenHints: {
      colors: { primary: "#334155", secondary: "#475569", accent: "#b45309" },
      neutrals: { bg: "#fffaf5", surface: "#ffffff", border: "#e7ded4", text: "#1f2937" },
      radius: { md: "4px", lg: "8px" },
      spacing: { lg: "1.75rem", xl: "2.5rem" },
      typography: {
        sans: '"IBM Plex Sans", Arial, sans-serif',
        display: '"Libre Baskerville", Georgia, serif',
      },
    },
    supportedSectionRoleIds: contentSections,
    gapCodes: unsupportedGapCodes,
  }),
  definition({
    id: "retro",
    label: "Retro",
    description: "Warm display-led visual direction with controlled nostalgic accents.",
    tokens: {
      toneId: "warm",
      contrastId: "high",
      densityId: "balanced",
      typographyId: "display-accent",
      imageTreatmentId: "duotone",
      spacingId: "md",
      cornerRadiusId: "md",
      accentId: "warm-accent",
    },
    themeTokenHints: {
      colors: { primary: "#7c2d12", secondary: "#0f766e", accent: "#eab308" },
      neutrals: { bg: "#fff7ed", surface: "#fffbeb", border: "#fed7aa", text: "#2f1b12" },
      radius: { md: "10px", lg: "14px" },
      spacing: { md: "1rem", xl: "2.25rem" },
      typography: {
        sans: '"IBM Plex Sans", Arial, sans-serif',
        display: '"Space Grotesk", "Helvetica Neue", Arial, sans-serif',
      },
    },
    supportedSectionRoleIds: contentSections,
    gapCodes: unsupportedGapCodes,
  }),
  definition({
    id: "minimal",
    label: "Minimal",
    description: "Quiet spacious layout with restrained hierarchy and soft accents.",
    tokens: {
      toneId: "minimal",
      contrastId: "low",
      densityId: "spacious",
      typographyId: "sans",
      imageTreatmentId: "quiet",
      spacingId: "lg",
      cornerRadiusId: "sm",
      accentId: "subtle-accent",
    },
    themeTokenHints: {
      colors: { primary: "#111827", secondary: "#64748b", accent: "#2563eb" },
      neutrals: { bg: "#ffffff", surface: "#ffffff", border: "#e5e7eb", text: "#111827" },
      radius: { md: "4px", lg: "8px" },
      spacing: { lg: "2rem", xl: "3rem" },
      typography: {
        sans: '"IBM Plex Sans", Arial, sans-serif',
        display: '"IBM Plex Sans", Arial, sans-serif',
      },
    },
    supportedSectionRoleIds: allSectionRoles,
    gapCodes: unsupportedGapCodes,
  }),
  definition({
    id: "bold",
    label: "Bold",
    description: "High-contrast campaign layout for launch pages and strong calls to action.",
    tokens: {
      toneId: "expressive",
      contrastId: "high",
      densityId: "spacious",
      typographyId: "display-accent",
      imageTreatmentId: "high-contrast",
      spacingId: "xl",
      cornerRadiusId: "lg",
      accentId: "strong-accent",
    },
    themeTokenHints: {
      colors: { primary: "#111827", secondary: "#dc2626", accent: "#facc15" },
      neutrals: { bg: "#ffffff", surface: "#f3f4f6", border: "#111827", text: "#111827" },
      radius: { md: "12px", lg: "16px" },
      spacing: { xl: "2.5rem", "2xl": "4rem" },
      typography: {
        sans: '"IBM Plex Sans", Arial, sans-serif',
        display: '"Space Grotesk", "Helvetica Neue", Arial, sans-serif',
      },
    },
    supportedSectionRoleIds: commerceAndListingSections,
    gapCodes: unsupportedGapCodes,
  }),
  definition({
    id: "luxury",
    label: "Luxury",
    description: "Premium spacious layout with calm contrast and cinematic media treatment.",
    tokens: {
      toneId: "premium",
      contrastId: "medium",
      densityId: "spacious",
      typographyId: "serif-accent",
      imageTreatmentId: "cinematic",
      spacingId: "xl",
      cornerRadiusId: "lg",
      accentId: "muted-premium",
    },
    themeTokenHints: {
      colors: { primary: "#1f2937", secondary: "#78716c", accent: "#a16207" },
      neutrals: { bg: "#fbfaf8", surface: "#ffffff", border: "#ded8cf", text: "#1c1917" },
      radius: { md: "10px", lg: "16px" },
      spacing: { xl: "2.5rem", "2xl": "4rem" },
      typography: {
        sans: '"IBM Plex Sans", Arial, sans-serif',
        display: '"Cormorant Garamond", Georgia, serif',
      },
    },
    supportedSectionRoleIds: serviceSections,
    gapCodes: unsupportedGapCodes,
  }),
  definition({
    id: "utilitarian",
    label: "Utilitarian",
    description: "Compact work-focused layout for dashboards, directories, and repeat scanning.",
    tokens: {
      toneId: "work-focused",
      contrastId: "medium",
      densityId: "compact",
      typographyId: "sans",
      imageTreatmentId: "functional",
      spacingId: "sm",
      cornerRadiusId: "sm",
      accentId: "status-accent",
    },
    themeTokenHints: {
      colors: { primary: "#0f172a", secondary: "#334155", accent: "#0d9488" },
      neutrals: { bg: "#f8fafc", surface: "#ffffff", border: "#cbd5e1", text: "#0f172a" },
      radius: { sm: "2px", md: "4px" },
      spacing: { sm: "0.5rem", md: "0.875rem" },
      typography: {
        sans: '"IBM Plex Sans", Arial, sans-serif',
        display: '"IBM Plex Sans", Arial, sans-serif',
      },
    },
    supportedSectionRoleIds: serviceSections,
    gapCodes: unsupportedGapCodes,
  }),
] as const satisfies readonly AssistantSiteBuilderDesignPresetDefinition[];

const assertDesignPresetDefinition = (preset: AssistantSiteBuilderDesignPresetDefinition) => {
  for (const [field, allowed] of Object.entries(supportedTokenSets)) {
    const tokenId = preset.tokens[field as keyof AssistantSiteBuilderDesignPresetTokenFacts];
    if (!allowed.has(tokenId)) {
      throwAssistantSiteBuilderIntakeError("intake_registry_invalid", {
        registryName: "designPresets",
        presetId: preset.id,
        field,
        tokenId,
      });
    }
  }

  for (const sectionRoleId of preset.supportedSectionRoleIds) {
    if (!assistantSiteBuilderSectionRoleIds.includes(sectionRoleId)) {
      throwAssistantSiteBuilderIntakeError("intake_registry_invalid", {
        registryName: "designPresets",
        presetId: preset.id,
        sectionRoleId,
      });
    }
  }

  try {
    assertTokenOverrides(preset.themeTokenHints);
  } catch {
    throwAssistantSiteBuilderIntakeError("intake_registry_invalid", {
      registryName: "designPresets",
      presetId: preset.id,
      reason: "theme_token_hints_invalid",
    });
  }

  const stringValues = [
    ...collectStringValues(preset.id),
    ...collectStringValues(preset.label),
    ...collectStringValues(preset.description),
    ...collectStringValues(preset.tokens),
    ...collectStringValues(preset.themeTokenHints),
    ...collectStringValues(preset.supportedSectionRoleIds),
    ...collectStringValues(preset.gapCodes),
  ];
  if (stringValues.some((value) => secretLikeValuePattern.test(value))) {
    throwAssistantSiteBuilderIntakeError("intake_registry_invalid", {
      registryName: "designPresets",
      presetId: preset.id,
      reason: "secret_like_value",
    });
  }
};

const freezeDesignPresetDefinitions = (
  definitions: readonly AssistantSiteBuilderDesignPresetDefinition[]
): readonly AssistantSiteBuilderDesignPresetDefinition[] => {
  const seenIds = new Set<string>();
  for (const preset of definitions) {
    if (seenIds.has(preset.id)) {
      throwAssistantSiteBuilderIntakeError("intake_registry_duplicate", {
        registryName: "designPresets",
        id: preset.id,
      });
    }
    seenIds.add(preset.id);
    assertDesignPresetDefinition(preset);
  }

  return Object.freeze(
    definitions.map((preset) =>
      Object.freeze({
        ...preset,
        tokens: Object.freeze({ ...preset.tokens }),
        themeTokenHints: freezeThemeTokenHints(preset.themeTokenHints),
        supportedSectionRoleIds: Object.freeze([...preset.supportedSectionRoleIds]),
        gapCodes: Object.freeze([...preset.gapCodes]),
      })
    )
  );
};

export const siteBuilderIntakeDesignPresetDefinitions = freezeDesignPresetDefinitions(
  rawDesignPresetDefinitions
);

const designPresetsById = new Map(
  siteBuilderIntakeDesignPresetDefinitions.map((preset) => [preset.id, preset])
);

export const siteBuilderIntakeDesignPresetOptionDefinitions = Object.freeze(
  siteBuilderIntakeDesignPresetDefinitions.map(
    (preset): AssistantSiteBuilderIntakeOptionDefinition<AssistantSiteBuilderDesignPresetId> =>
      Object.freeze({
        id: preset.id,
        label: preset.label,
        description: preset.description,
      })
  )
);

export const listSiteBuilderIntakeDesignPresets = () => siteBuilderIntakeDesignPresetDefinitions;

export const resolveSiteBuilderIntakeDesignPreset = (
  presetId: string
): AssistantSiteBuilderDesignPresetDefinition => {
  const preset = designPresetsById.get(presetId as AssistantSiteBuilderDesignPresetId);
  if (preset) {
    return preset;
  }

  return throwAssistantSiteBuilderIntakeError("intake_option_invalid", {
    registryId: "designPresets",
    optionId: presetId,
  });
};

export const buildSiteBuilderIntakeDesignPresetFacts = (
  presetId: string
): AssistantSiteBuilderDesignPresetFacts => {
  const preset = resolveSiteBuilderIntakeDesignPreset(presetId);
  return {
    presetId: preset.id,
    label: preset.label,
    tokens: { ...preset.tokens },
    themeTokenHints: cloneThemeTokenHints(preset.themeTokenHints),
    supportedSectionRoleIds: [...preset.supportedSectionRoleIds],
    gapCodes: [...preset.gapCodes],
  };
};

export const isSiteBuilderIntakeDesignPresetId = (
  presetId: string
): presetId is AssistantSiteBuilderDesignPresetId =>
  assistantSiteBuilderDesignPresetIds.includes(presetId as AssistantSiteBuilderDesignPresetId);
