import { buildCatalogFamilyPlan } from "../../../core/services/assistant/blueprints/catalogFamilyBlueprint";
import { PRODUCT_CATALOG_PRESET } from "../../../core/services/assistant/blueprints/catalogFamilyPresets";
import { getBlueprintCapabilityRegistration } from "../../../core/services/assistant/blueprints/blueprintCapabilityRegistry";
import type {
  BlueprintActionFragment,
  BlueprintCapabilityRegistration,
  BlueprintCompositionGraph,
  BlueprintConflict,
} from "../../../core/services/assistant/blueprints/blueprintCapabilityTypes";
import type {
  AssistantIntentFamily,
  AssistantPromptKind,
} from "../../../core/services/assistant/actionPlanTypes";

type CatalogFamilyPlan = ReturnType<typeof buildCatalogFamilyPlan>;

/**
 * Shared fixture builders for the blueprint-action-assembler suites.
 * Every builder produces the exact object shape the pre-split suite built
 * inline; only the boilerplate moved here, never assertion behavior.
 */

export function buildProductCatalogPlan(
  promptKind: AssistantPromptKind = "setup_request",
  intentFamily: AssistantIntentFamily = "product_catalog"
): CatalogFamilyPlan {
  return buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, { promptKind, intentFamily });
}

export function getProductCatalogRegistration(): BlueprintCapabilityRegistration {
  const registration = getBlueprintCapabilityRegistration("product-catalog");
  if (!registration) {
    throw new Error("registration_missing");
  }
  return registration;
}

export function buildCatalogFragments(
  base: CatalogFamilyPlan,
  additive: CatalogFamilyPlan,
  options: { baseCapabilityId?: string; additiveCapabilityId?: string } = {}
): BlueprintActionFragment[] {
  const baseCapabilityId = options.baseCapabilityId ?? "product-catalog";
  const additiveCapabilityId = options.additiveCapabilityId ?? "product-catalog-addon";
  return [
    {
      capabilityId: baseCapabilityId,
      planId: base.id,
      title: base.title,
      assumptions: base.assumptions,
      actions: base.actions,
    },
    {
      capabilityId: additiveCapabilityId,
      planId: additive.id,
      title: additive.title,
      assumptions: additive.assumptions,
      actions: additive.actions,
    },
  ];
}

export function buildProductCatalogCompositionGraph(input: {
  registration: BlueprintCapabilityRegistration;
  fragments: BlueprintActionFragment[];
  selectedCapabilityIds: string[];
  conflicts?: BlueprintConflict[];
}): BlueprintCompositionGraph {
  const { registration, fragments, selectedCapabilityIds, conflicts = [] } = input;
  return {
    primary: {
      capabilityId: registration.capability.id,
      role: "primary",
      score: 100,
      matchedSignals: ["intent:product_catalog"],
      reasons: ["Primary product catalog."],
      capability: registration.capability,
    },
    adjuncts: [],
    gated: [],
    resources: [],
    conflicts,
    fragments,
    selectedCapabilityIds,
  };
}
