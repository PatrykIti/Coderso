import type { AssistantActionPlan, AssistantIntentFamily } from "./actionPlanTypes";
import { normalizeAssistantActionPlan } from "./actionPlanSchema";
import { throwAssistantSiteBuilderIntakeError } from "./assistantSiteBuilderIntakeErrors";
import {
  buildSiteBuilderIntakeCompileResult,
  type AssistantSiteBuilderIntakeCompileResult,
} from "./assistantSiteBuilderIntakeCompiler";
import { normalizeAssistantSiteBuilderIntakeSession } from "./assistantSiteBuilderIntakeNormalizer";
import type {
  AssistantSiteBuilderContentEngineId,
  AssistantSiteBuilderIntakeSession,
} from "./assistantSiteBuilderIntakeTypes";
import {
  buildCatalogFamilyPlan,
  type CatalogFamilyPreset,
} from "./blueprints/catalogFamilyBlueprint";
import {
  PORTFOLIO_PROJECTS_PRESET,
  PRODUCT_CATALOG_PRESET,
  SERVICES_DIRECTORY_PRESET,
} from "./blueprints/catalogFamilyPresets";

type ExecutableContentEngineId = Extract<
  AssistantSiteBuilderContentEngineId,
  "services" | "products" | "portfolio" | "case-studies"
>;

type ContentEnginePlanRegistration = {
  preset: CatalogFamilyPreset;
  intentFamily: AssistantIntentFamily;
};

export type AssistantSiteBuilderContentEngineActionPlanResult = {
  schemaVersion: 1;
  engineId: ExecutableContentEngineId;
  plan: AssistantActionPlan;
  compileResult: AssistantSiteBuilderIntakeCompileResult;
};

const contentEnginePlanRegistrations: Record<
  ExecutableContentEngineId,
  ContentEnginePlanRegistration
> = {
  services: {
    preset: SERVICES_DIRECTORY_PRESET,
    intentFamily: "services_directory",
  },
  products: {
    preset: PRODUCT_CATALOG_PRESET,
    intentFamily: "product_catalog",
  },
  portfolio: {
    preset: PORTFOLIO_PROJECTS_PRESET,
    intentFamily: "portfolio_projects",
  },
  "case-studies": {
    preset: PORTFOLIO_PROJECTS_PRESET,
    intentFamily: "portfolio_projects",
  },
};

const isExecutableContentEngineId = (
  value: AssistantSiteBuilderContentEngineId
): value is ExecutableContentEngineId =>
  Object.prototype.hasOwnProperty.call(contentEnginePlanRegistrations, value);

export const buildReviewedContentEngineActionPlanFromIntake = (
  session: AssistantSiteBuilderIntakeSession
): AssistantSiteBuilderContentEngineActionPlanResult => {
  const normalized = normalizeAssistantSiteBuilderIntakeSession(session);
  const compileResult = buildSiteBuilderIntakeCompileResult(normalized.facts ?? {});
  if (compileResult.gates.length > 0) {
    return throwAssistantSiteBuilderIntakeError("intake_session_invalid", {
      reason: "content_engine_plan_blocked",
      gates: compileResult.gates,
    });
  }

  const engineId = compileResult.reviewFacts.contentEngineDecisions.decisions.find((decision) =>
    isExecutableContentEngineId(decision.id)
  )?.id;

  if (!engineId || !isExecutableContentEngineId(engineId)) {
    return throwAssistantSiteBuilderIntakeError("intake_session_invalid", {
      reason: "content_engine_plan_unavailable",
      contentEngineIds: compileResult.reviewFacts.contentEngineDecisions.decisions.map(
        (decision) => decision.id
      ),
    });
  }

  const registration = contentEnginePlanRegistrations[engineId];
  const plan = normalizeAssistantActionPlan(
    buildCatalogFamilyPlan(registration.preset, {
      promptKind: "setup_request",
      intentFamily: registration.intentFamily,
    })
  );

  return {
    schemaVersion: 1,
    engineId,
    plan,
    compileResult,
  };
};
