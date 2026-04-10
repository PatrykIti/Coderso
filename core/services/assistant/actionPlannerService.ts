import type {
  AssistantActionContext,
  AssistantActionPlan,
  AssistantIntentFamily,
  AssistantPromptKind,
  AssistantPlanQuestion,
} from "./actionPlanTypes";
import { buildAssistantAdminContext } from "./adminContextService";
import { buildHouseProjectsCatalogPlan } from "./blueprints/houseProjectsCatalogBlueprint";

const normalizePrompt = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const houseProjectKeywords = [
  "projekt",
  "projekty",
  "dom",
  "domow",
  "domów",
  "house",
  "houses",
  "home design",
  "home designs",
];

const catalogKeywords = [
  "katalog",
  "catalog",
  "showcase",
  "prezentowac",
  "present",
  "portfolio",
  "listing",
];

const setupKeywords = [
  "potrzebuje",
  "chce",
  "potrzebuję",
  "stworz",
  "stwórz",
  "zrob",
  "zrób",
  "utworz",
  "utwórz",
  "build",
  "create",
  "set up",
];

const refinementKeywords = [
  "dodaj",
  "dorzuc",
  "dołóż",
  "zmien",
  "zmień",
  "update",
  "adjust",
  "refine",
  "expand",
  "extend",
  "filtr",
  "filter",
  "formularz",
  "form",
  "layout",
  "uklad",
  "układ",
  "status",
  "price",
  "cene",
  "cenę",
];

const docsQuestionKeywords = [
  "gdzie",
  "where",
  "jak",
  "how",
  "which screen",
  "where can i find",
  "ustawienia",
  "settings",
  "kolory",
  "colors",
  "configure",
];

const productCatalogKeywords = [
  "produkt",
  "produkty",
  "product",
  "products",
  "shop",
  "sklep",
];

const portfolioKeywords = [
  "portfolio",
  "projekt",
  "projekty",
  "project",
  "projects",
  "case study",
  "case studies",
];

const serviceDirectoryKeywords = [
  "uslugi",
  "usługi",
  "services",
  "service",
  "directory",
  "katalog uslug",
  "katalog usług",
  "provider",
  "providers",
];

const leadCaptureKeywords = [
  "lead",
  "leady",
  "kontakt",
  "contact",
  "formularz kontaktowy",
  "contact form",
  "wycena",
  "quote",
];

const includesAny = (value: string, candidates: string[]) =>
  candidates.some((candidate) => value.includes(candidate));

export const isLikelyHouseProjectsCatalogPrompt = (prompt: string) => {
  const normalized = normalizePrompt(prompt);
  return (
    includesAny(normalized, catalogKeywords) &&
    includesAny(normalized, houseProjectKeywords)
  );
};

const resolveIntentFamily = (prompt: string): AssistantIntentFamily => {
  const normalized = normalizePrompt(prompt);
  if (isLikelyHouseProjectsCatalogPrompt(normalized)) return "catalog_showcase";
  if (includesAny(normalized, productCatalogKeywords)) return "product_catalog";
  if (includesAny(normalized, serviceDirectoryKeywords)) return "services_directory";
  if (includesAny(normalized, portfolioKeywords)) return "portfolio_projects";
  if (includesAny(normalized, leadCaptureKeywords)) return "lead_capture_site";
  if (includesAny(normalized, catalogKeywords)) return "catalog_showcase";
  return "unknown";
};

export const classifyAssistantPrompt = (prompt: string) => {
  const normalized = normalizePrompt(prompt);
  const intentFamily = resolveIntentFamily(normalized);
  const hasSetupSignal = includesAny(normalized, setupKeywords);
  const hasRefinementSignal = includesAny(normalized, refinementKeywords);
  const hasDocsSignal = includesAny(normalized, docsQuestionKeywords);

  let promptKind: AssistantPromptKind = "unknown";
  if (hasDocsSignal && !hasSetupSignal) {
    promptKind = "docs_question";
  } else if (hasRefinementSignal) {
    promptKind = "refinement_request";
  } else if (hasSetupSignal || intentFamily !== "unknown") {
    promptKind = "setup_request";
  }

  return {
    normalizedPrompt: normalized,
    promptKind,
    intentFamily,
  };
};

export const isLikelyGuidePlanningPrompt = (prompt: string) => {
  const classification = classifyAssistantPrompt(prompt);
  return (
    classification.promptKind === "setup_request" ||
    classification.promptKind === "refinement_request"
  );
};

const buildClarifyingPlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  classification: {
    promptKind: AssistantPromptKind;
    intentFamily: AssistantIntentFamily;
  }
): AssistantActionPlan => {
  const questions: AssistantPlanQuestion[] = [
    {
      id: "catalog-domain",
      label: "What structured catalog should I create?",
      description:
        "For example: house projects, real estate offers, products, or service packages.",
      required: true,
    },
    {
      id: "admin-surface",
      label: "Should I create a dedicated admin screen for managing records?",
      description:
        "I can use Coderso Entries only, or also add a Custom Screen shortcut in the sidebar.",
      required: false,
    },
  ];

  const routeHint = context.route
    ? `Current admin route: ${context.route}.`
    : "No active admin route was provided.";

  return {
    id: "plan-needs-input",
    status: "needs_input",
    intentId:
      classification.intentFamily === "unknown"
        ? "generic-guide-needs-input"
        : `${classification.intentFamily}-needs-input`,
    promptKind: classification.promptKind,
    intentFamily: classification.intentFamily,
    title: "Need more guidance before planning",
    answer: [
      "I can generate a structured Coderso setup, but this prompt is still too open for safe execution.",
      "",
      routeHint,
      "",
      "Please clarify the type of catalog you want me to create, or describe the business surface more concretely.",
    ].join("\n"),
    summary: "The prompt does not yet map cleanly to a safe typed setup plan.",
    confidence: 0.35,
    assumptions: [
      `Original prompt: ${prompt.trim() || "empty prompt"}`,
    ],
    questions,
    actions: [],
  };
};

export type AssistantActionPlanInput = {
  prompt: string;
  context?: AssistantActionContext;
};

export const planAssistantActions = (
  input: AssistantActionPlanInput
): AssistantActionPlan => {
  const context = buildAssistantAdminContext(input.context);
  const classification = classifyAssistantPrompt(input.prompt);
  if (!classification.normalizedPrompt) {
    return buildClarifyingPlan(input.prompt, context, classification);
  }

  if (
    classification.promptKind === "setup_request" &&
    classification.intentFamily === "catalog_showcase" &&
    isLikelyHouseProjectsCatalogPrompt(classification.normalizedPrompt)
  ) {
    return buildHouseProjectsCatalogPlan({
      promptKind: classification.promptKind,
      intentFamily: classification.intentFamily,
    });
  }

  return buildClarifyingPlan(input.prompt, context, classification);
};
