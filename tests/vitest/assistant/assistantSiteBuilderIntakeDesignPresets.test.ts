import { expect, test } from "vitest";

import {
  ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
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
} from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";
import {
  buildSiteBuilderIntakeDesignPresetFacts,
  listSiteBuilderIntakeDesignPresets,
  resolveSiteBuilderIntakeDesignPreset,
  siteBuilderIntakeDesignPresetOptionDefinitions,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeDesignPresets";
import { normalizeAssistantSiteBuilderIntakeSession } from "../../../core/services/assistant/assistantSiteBuilderIntakeNormalizer";
import {
  getSiteBuilderIntakeOption,
  listSiteBuilderIntakeOptions,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeRegistry";
import { assertTokenOverrides } from "../../../core/services/theme/tokenValidation";

const secretLikePattern =
  /\b(password|token|secret|api[-_\s]?key|authorization|cookie|bearer|csrf|session)\b/iu;

test("site-builder design preset registry is deterministic and complete", () => {
  const presets = listSiteBuilderIntakeDesignPresets();

  expect(Object.isFrozen(presets)).toBe(true);
  expect(presets.map((preset) => preset.id)).toEqual([...assistantSiteBuilderDesignPresetIds]);
  expect(siteBuilderIntakeDesignPresetOptionDefinitions.map((option) => option.id)).toEqual([
    ...assistantSiteBuilderDesignPresetIds,
  ]);
  expect(listSiteBuilderIntakeOptions("designPresets").map((option) => option.id)).toEqual([
    ...assistantSiteBuilderDesignPresetIds,
  ]);

  for (const preset of presets) {
    expect(Object.isFrozen(preset)).toBe(true);
    expect(Object.isFrozen(preset.tokens)).toBe(true);
    expect(Object.isFrozen(preset.themeTokenHints)).toBe(true);
    expect(Object.isFrozen(preset.supportedSectionRoleIds)).toBe(true);
    expect(Object.isFrozen(preset.gapCodes)).toBe(true);
    expect(preset.label.trim()).not.toBe("");
    expect(preset.description.trim()).not.toBe("");
    expect(assistantSiteBuilderDesignToneIds).toContain(preset.tokens.toneId);
    expect(assistantSiteBuilderDesignContrastIds).toContain(preset.tokens.contrastId);
    expect(assistantSiteBuilderDesignDensityIds).toContain(preset.tokens.densityId);
    expect(assistantSiteBuilderDesignTypographyIds).toContain(preset.tokens.typographyId);
    expect(assistantSiteBuilderDesignImageTreatmentIds).toContain(preset.tokens.imageTreatmentId);
    expect(assistantSiteBuilderDesignSpacingIds).toContain(preset.tokens.spacingId);
    expect(assistantSiteBuilderDesignCornerRadiusIds).toContain(preset.tokens.cornerRadiusId);
    expect(assistantSiteBuilderDesignAccentIds).toContain(preset.tokens.accentId);
    expect(() => assertTokenOverrides(preset.themeTokenHints)).not.toThrow();
    expect(preset.supportedSectionRoleIds.length).toBeGreaterThan(0);
    expect(
      preset.supportedSectionRoleIds.every((sectionRoleId) =>
        assistantSiteBuilderSectionRoleIds.includes(sectionRoleId)
      )
    ).toBe(true);
    expect(preset.gapCodes).toEqual(["theme-application-pending"]);
    expect(JSON.stringify(preset)).not.toMatch(secretLikePattern);
  }
});

test("site-builder design presets resolve to copied review facts", () => {
  const definition = resolveSiteBuilderIntakeDesignPreset("luxury");
  const facts = buildSiteBuilderIntakeDesignPresetFacts("luxury");

  expect(facts).toMatchObject({
    presetId: "luxury",
    label: "Luxury",
    tokens: {
      toneId: "premium",
      imageTreatmentId: "cinematic",
    },
    themeTokenHints: {
      colors: {
        accent: "#a16207",
      },
      radius: {
        lg: "16px",
      },
    },
    gapCodes: ["theme-application-pending"],
  });
  expect(facts.tokens).not.toBe(definition.tokens);
  expect(facts.themeTokenHints).not.toBe(definition.themeTokenHints);
  expect(facts.supportedSectionRoleIds).not.toBe(definition.supportedSectionRoleIds);
  expect(facts.gapCodes).not.toBe(definition.gapCodes);
});

test("site-builder design presets fail closed for unknown ids", () => {
  expect(() => resolveSiteBuilderIntakeDesignPreset("custom-css")).toThrow("intake_option_invalid");
  expect(() => getSiteBuilderIntakeOption("designPresets", "custom-css")).toThrow(
    "intake_option_invalid"
  );
});

test("Advanced intake derives backend-owned design preset facts", () => {
  const normalized = normalizeAssistantSiteBuilderIntakeSession({
    version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
    mode: "advanced",
    currentStepId: "design-preset",
    answers: [
      {
        stepId: "design-preset",
        values: {
          designPresetId: "utilitarian",
          designBrief: "Compact, work focused, easy to scan.",
          tone: "practical and direct",
          colorNotes: "muted interface colors with one status accent",
          layoutNotes: "dense but organized sections",
        },
      },
    ],
  });

  expect(normalized.facts).toMatchObject({
    designPresetId: "utilitarian",
    designPreset: {
      presetId: "utilitarian",
      tokens: {
        toneId: "work-focused",
        densityId: "compact",
        imageTreatmentId: "functional",
      },
      themeTokenHints: {
        spacing: {
          md: "0.875rem",
        },
      },
      gapCodes: ["theme-application-pending"],
    },
    designBrief: "Compact, work focused, easy to scan.",
    readyForReview: false,
  });
});
