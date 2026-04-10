import type {
  AssistantActionContext,
  AssistantActionPlan,
  AssistantIntentFamily,
  AssistantPromptKind,
  AssistantPlanQuestion,
} from "./actionPlanTypes";
import { buildAssistantAdminContext } from "./adminContextService";
import { buildCatalogFamilyRefinementPlan } from "./blueprints/catalogFamilyBlueprint";
import { buildHouseProjectsCatalogPlan } from "./blueprints/houseProjectsCatalogBlueprint";
import { buildCatalogFamilyPlan } from "./blueprints/catalogFamilyBlueprint";
import {
  CATALOG_FAMILY_PRESETS,
  PORTFOLIO_PROJECTS_PRESET,
  PRODUCT_CATALOG_PRESET,
  SERVICES_DIRECTORY_PRESET,
} from "./blueprints/catalogFamilyPresets";

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
  "produktow",
  "produktów",
  "product",
  "products",
  "shop",
  "sklep",
];

const portfolioKeywords = [
  "portfolio",
  "case study",
  "case studies",
  "realizacja",
  "realizacje",
  "showreel",
];

const serviceDirectoryKeywords = [
  "uslugi",
  "usługi",
  "uslug",
  "usług",
  "services",
  "service",
  "directory",
  "katalog uslug",
  "katalog usług",
  "katalogu uslug",
  "katalogu usług",
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

const filterKeywords = [
  "filtr",
  "filter",
  "filters",
  "facets",
  "filtrowanie",
];

const layoutKeywords = [
  "layout",
  "uklad",
  "układ",
  "cards",
  "karty",
  "kart",
  "grid",
  "siatka",
  "compact",
  "minimal",
];

const priceKeywords = ["cena", "cene", "cenę", "price", "pricing"];
const statusKeywords = ["status", "statuses"];
const houseProjectsRefinementKeywords = [
  "metraz",
  "metraż",
  "pokoi",
  "rooms",
  "bathrooms",
  "floors",
];
const productRefinementKeywords = [
  "sku",
  "stock",
  "magazyn",
  "inventory",
  "category",
  "kategoria",
];
const servicesRefinementKeywords = [
  "response time",
  "czas odpowiedzi",
  "service type",
  "typ uslugi",
  "typ usługi",
];
const portfolioRefinementKeywords = [
  "client",
  "klient",
  "delivery year",
  "rok realizacji",
  "realizacja",
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

const isLikelyProductCatalogPrompt = (prompt: string) => {
  const normalized = normalizePrompt(prompt);
  if (isLikelyHouseProjectsCatalogPrompt(normalized)) return false;
  return (
    includesAny(normalized, productCatalogKeywords) &&
    includesAny(normalized, catalogKeywords)
  );
};

const isLikelyPortfolioProjectsPrompt = (prompt: string) => {
  const normalized = normalizePrompt(prompt);
  if (isLikelyHouseProjectsCatalogPrompt(normalized)) return false;
  return includesAny(normalized, portfolioKeywords);
};

const isLikelyServicesDirectoryPrompt = (prompt: string) => {
  const normalized = normalizePrompt(prompt);
  return includesAny(normalized, serviceDirectoryKeywords);
};

const resolveIntentFamily = (prompt: string): AssistantIntentFamily => {
  const normalized = normalizePrompt(prompt);
  if (isLikelyHouseProjectsCatalogPrompt(normalized)) return "catalog_showcase";
  if (includesAny(normalized, houseProjectsRefinementKeywords)) return "catalog_showcase";
  if (isLikelyProductCatalogPrompt(normalized)) return "product_catalog";
  if (includesAny(normalized, productRefinementKeywords)) return "product_catalog";
  if (isLikelyServicesDirectoryPrompt(normalized)) return "services_directory";
  if (includesAny(normalized, servicesRefinementKeywords)) return "services_directory";
  if (isLikelyPortfolioProjectsPrompt(normalized)) return "portfolio_projects";
  if (includesAny(normalized, portfolioRefinementKeywords)) return "portfolio_projects";
  if (includesAny(normalized, leadCaptureKeywords)) return "lead_capture_site";
  if (includesAny(normalized, catalogKeywords)) return "catalog_showcase";
  return "unknown";
};

const buildReadyPlanForIntentFamily = (
  intentFamily: AssistantIntentFamily,
  options: {
    promptKind: AssistantPromptKind;
    intentFamily: AssistantIntentFamily;
  }
) => {
  switch (intentFamily) {
    case "catalog_showcase":
      return buildHouseProjectsCatalogPlan(options);
    case "product_catalog":
      return buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, options);
    case "portfolio_projects":
      return buildCatalogFamilyPlan(PORTFOLIO_PROJECTS_PRESET, options);
    case "services_directory":
      return buildCatalogFamilyPlan(SERVICES_DIRECTORY_PRESET, options);
    default:
      return null;
  }
};

const buildRefinementPlanForIntentFamily = (
  prompt: string,
  intentFamily: AssistantIntentFamily,
  options: {
    promptKind: AssistantPromptKind;
    intentFamily: AssistantIntentFamily;
  }
) => {
  const preset = CATALOG_FAMILY_PRESETS[intentFamily as keyof typeof CATALOG_FAMILY_PRESETS];
  if (!preset) return null;

  const normalizedPrompt = normalizePrompt(prompt);
  const selectedFacets = preset.refinement.availableFacets.filter((facet) => {
    const label = facet.label.toLowerCase();
    const field = facet.field?.toLowerCase() ?? "";
    if (intentFamily === "catalog_showcase") {
      if (label.includes("area") || field.includes("aream2")) {
        return includesAny(normalizedPrompt, ["metraz", "metraż", "area"]);
      }
      if (label.includes("rooms") || field.includes("rooms")) {
        return includesAny(normalizedPrompt, ["pokoi", "rooms"]);
      }
    }
    if (intentFamily === "product_catalog") {
      if (field.includes("category")) {
        return includesAny(normalizedPrompt, ["category", "kategoria"]);
      }
      if (field.includes("price")) {
        return includesAny(normalizedPrompt, priceKeywords);
      }
    }
    if (intentFamily === "services_directory") {
      if (field.includes("responsetimehours")) {
        return includesAny(normalizedPrompt, ["response time", "czas odpowiedzi"]);
      }
      if (field.includes("servicetype")) {
        return includesAny(normalizedPrompt, ["service type", "typ uslugi", "typ usługi"]);
      }
    }
    if (intentFamily === "portfolio_projects") {
      if (field.includes("deliveryyear")) {
        return includesAny(normalizedPrompt, ["delivery year", "rok realizacji"]);
      }
      if (field.includes("clientname")) {
        return includesAny(normalizedPrompt, ["client", "klient"]);
      }
    }
    if (field.includes("projectstatus")) {
      return includesAny(normalizedPrompt, statusKeywords);
    }
    return false;
  });

  const includeFilters =
    includesAny(normalizedPrompt, filterKeywords) || selectedFacets.length > 0;
  const includeLayoutUpdate = includesAny(normalizedPrompt, layoutKeywords);
  const includeStatusOrPrice =
    includesAny(normalizedPrompt, statusKeywords) ||
    includesAny(normalizedPrompt, priceKeywords);

  if (!includeFilters && !includeLayoutUpdate && !includeStatusOrPrice) {
    return null;
  }

  const facets = [
    {
      id: "sort",
      kind: "sort",
      label: "Sort",
      sortOptions: [
        {
          value: "title:asc",
          label: "Title A-Z",
          field: "title",
          dir: "asc",
        },
        {
          value: "updatedAt:desc",
          label: "Newest first",
          field: "updatedAt",
          dir: "desc",
        },
      ],
    },
    ...(selectedFacets.length > 0
      ? selectedFacets
      : includeFilters
        ? preset.refinement.availableFacets
        : []),
  ];

  return buildCatalogFamilyRefinementPlan(preset, {
    promptKind: options.promptKind,
    intentFamily: options.intentFamily,
    refinementId: "refinement",
    title: `Refine ${preset.title}`,
    answer: `I can refine the existing ${preset.title.toLowerCase()} setup without creating duplicate resources.`,
    summary:
      "Update the existing catalog page and keep the current listing/query resources instead of provisioning a second setup.",
    assumptions: [
      "The refinement flow reuses the canonical preset resource keys for this catalog family.",
      "Missing refinement facets fall back to the family defaults when the prompt only asks for generic filtering.",
    ],
    pageOverrides: {
      ...(includeLayoutUpdate
        ? {
            contentListStyle: {
              columns: "2",
              cardStyle: "minimal",
            },
          }
        : {}),
      ...(includeFilters
        ? {
            listingFilters: {
              title: preset.refinement.defaultFilterTitle,
              description: preset.refinement.defaultFilterDescription,
              autoApply: true,
              showSearch: true,
              searchPlaceholder: preset.refinement.defaultSearchPlaceholder,
              searchLabel: "Search",
              applyLabel: "Apply filters",
              facets: facets as Array<Record<string, unknown>>,
            },
          }
        : {}),
    },
  });
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
    classification.intentFamily !== "unknown"
  ) {
    const readyPlan = buildReadyPlanForIntentFamily(classification.intentFamily, {
      promptKind: classification.promptKind,
      intentFamily: classification.intentFamily,
    });
    if (readyPlan) return readyPlan;
  }

  if (
    classification.promptKind === "refinement_request" &&
    classification.intentFamily !== "unknown"
  ) {
    const refinementPlan = buildRefinementPlanForIntentFamily(
      input.prompt,
      classification.intentFamily,
      {
        promptKind: classification.promptKind,
        intentFamily: classification.intentFamily,
      }
    );
    if (refinementPlan) return refinementPlan;
  }

  return buildClarifyingPlan(input.prompt, context, classification);
};
