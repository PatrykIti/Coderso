import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

import {
  assistantSiteBuilderContentEngineIds,
  assistantSiteBuilderHeroPresetIds,
  assistantSiteBuilderIntakeModes,
  assistantSiteBuilderIntakeOptionRegistryIds,
  type AssistantSiteBuilderIntakeOptionRegistryId,
  AssistantSiteBuilderIntakeRegistryError,
  assistantSiteBuilderIntakeStepIds,
  assistantSiteBuilderMediaPolicyIds,
  assistantSiteBuilderMenuPresetIds,
  assistantSiteBuilderPageRoleIds,
  assistantSiteBuilderReviewStateIds,
  assistantSiteBuilderSectionRoleIds,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";
import {
  getSiteBuilderIntakeModeDefinition,
  getSiteBuilderIntakeOption,
  getSiteBuilderIntakeStepDefinition,
  isSiteBuilderIntakeMode,
  isSiteBuilderIntakeStepId,
  listSiteBuilderIntakeModes,
  listSiteBuilderIntakeOptionRegistryIds,
  listSiteBuilderIntakeOptions,
  listSiteBuilderIntakeStepDefinitions,
  listSiteBuilderIntakeStepDefinitionsForMode,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeRegistry";

const sourceDir = join(dirname(fileURLToPath(import.meta.url)), "../../../core/services/assistant");

const expectUnique = (ids: readonly string[]) => {
  expect([...new Set(ids)]).toHaveLength(ids.length);
};

test("site-builder intake registry owns stable mode and step ids", () => {
  const modeDefinitions = listSiteBuilderIntakeModes();
  const stepDefinitions = listSiteBuilderIntakeStepDefinitions();

  expect(Object.isFrozen(modeDefinitions)).toBe(true);
  expect(Object.isFrozen(stepDefinitions)).toBe(true);
  expect(modeDefinitions.map((definition) => definition.id)).toEqual([
    ...assistantSiteBuilderIntakeModes,
  ]);
  expect(stepDefinitions.map((definition) => definition.id)).toEqual([
    ...assistantSiteBuilderIntakeStepIds,
  ]);
  expectUnique(stepDefinitions.map((definition) => definition.id));

  for (const definition of stepDefinitions) {
    expect(definition.label.trim()).not.toBe("");
    expect(definition.description.trim()).not.toBe("");
    expect(definition.modeAvailability.length).toBeGreaterThan(0);
    expect(definition.modeAvailability.every(isSiteBuilderIntakeMode)).toBe(true);
    expect(isSiteBuilderIntakeStepId(definition.id)).toBe(true);
  }
});

test("site-builder intake registry separates Basic guidance from Advanced controls", () => {
  const basicStepIds = listSiteBuilderIntakeStepDefinitionsForMode("basic").map(
    (definition) => definition.id
  );
  const advancedStepIds = listSiteBuilderIntakeStepDefinitionsForMode("advanced").map(
    (definition) => definition.id
  );

  expect(basicStepIds).toEqual([
    "business-profile",
    "site-goals",
    "site-map",
    "menu",
    "homepage-sections",
    "hero",
    "subpages",
    "media-policy",
    "review",
  ]);
  expect(basicStepIds).not.toContain("content-engine");
  expect(basicStepIds).not.toContain("design-preset");
  expect(basicStepIds).not.toContain("reference-intake");
  expect(advancedStepIds).toEqual([...assistantSiteBuilderIntakeStepIds]);
});

test("site-builder intake option registries expose generic reusable roles", () => {
  const expectedOptionIdsByRegistry = {
    pageRoles: [...assistantSiteBuilderPageRoleIds],
    menuPresets: [...assistantSiteBuilderMenuPresetIds],
    heroPresets: [...assistantSiteBuilderHeroPresetIds],
    sectionRoles: [...assistantSiteBuilderSectionRoleIds],
    mediaPolicies: [...assistantSiteBuilderMediaPolicyIds],
    contentEngines: [...assistantSiteBuilderContentEngineIds],
    reviewStates: [...assistantSiteBuilderReviewStateIds],
  } satisfies Record<AssistantSiteBuilderIntakeOptionRegistryId, readonly string[]>;

  expect(listSiteBuilderIntakeOptionRegistryIds()).toEqual([
    ...assistantSiteBuilderIntakeOptionRegistryIds,
  ]);

  for (const registryId of listSiteBuilderIntakeOptionRegistryIds()) {
    const options = listSiteBuilderIntakeOptions(registryId);

    expect(Object.isFrozen(options)).toBe(true);
    expect(options.map((option) => option.id)).toEqual(expectedOptionIdsByRegistry[registryId]);
    expectUnique(options.map((option) => option.id));

    for (const option of options) {
      expect(option.label.trim()).not.toBe("");
      expect(option.description.trim()).not.toBe("");
    }
  }

  expect(getSiteBuilderIntakeOption("mediaPolicies", "curated").label).toBe(
    "Curated licensed media"
  );
  expect(getSiteBuilderIntakeOption("pageRoles", "portfolio").description).toContain(
    "work examples"
  );
});

test("site-builder intake registries fail closed for unknown ids", () => {
  expect(() => getSiteBuilderIntakeModeDefinition("expert")).toThrow("intake_mode_invalid");
  expect(() => getSiteBuilderIntakeStepDefinition("database-drop")).toThrow("intake_step_invalid");
  expect(() => listSiteBuilderIntakeOptions("externalMedia")).toThrow(
    "intake_option_registry_invalid"
  );
  expect(() => getSiteBuilderIntakeOption("mediaPolicies", "external-url")).toThrow(
    "intake_option_invalid"
  );

  try {
    getSiteBuilderIntakeStepDefinition("database-drop");
  } catch (error) {
    expect(error).toBeInstanceOf(AssistantSiteBuilderIntakeRegistryError);
    expect((error as AssistantSiteBuilderIntakeRegistryError).code).toBe("intake_step_invalid");
  }
});

test("site-builder intake registry modules stay Bun-free and service-owned", () => {
  const moduleSources = [
    "assistantSiteBuilderIntakeTypes.ts",
    "assistantSiteBuilderIntakeRegistry.ts",
  ].map((fileName) => readFileSync(join(sourceDir, fileName), "utf8"));
  const forbiddenRuntimeImports = [
    /from\s+["'][^"']*db\/client/,
    /from\s+["'][^"']*settings/,
    /from\s+["'][^"']*providers/,
    /from\s+["'][^"']*server\//,
    /\bBun\./,
  ];

  for (const source of moduleSources) {
    for (const pattern of forbiddenRuntimeImports) {
      expect(source).not.toMatch(pattern);
    }
  }
});
