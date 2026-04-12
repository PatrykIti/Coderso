import type {
  AssistantActionContext,
  AssistantActionPlan,
  AssistantIntentFamily,
  AssistantPromptKind,
  AssistantPlanQuestion,
  AssistantSiteKitPlanInput,
} from "./actionPlanTypes";
import { buildAssistantAdminContext } from "./adminContextService";
import { normalizeAssistantActionPlan } from "./actionPlanSchema";
import {
  classifyAssistantPrompt,
  includesAny,
  normalizeAssistantPlannerPrompt,
  resolveContextualRefinementFamily,
} from "./actionPlanHeuristics";
import { buildGuidedSiteBuilderPlanResult } from "./siteBuilderPlanAdapter";
import { buildCatalogFamilyRefinementPlan } from "./blueprints/catalogFamilyBlueprint";
import { buildHouseProjectsCatalogPlan } from "./blueprints/houseProjectsCatalogBlueprint";
import { buildCatalogFamilyPlan } from "./blueprints/catalogFamilyBlueprint";
import {
  CATALOG_FAMILY_PRESETS,
  PORTFOLIO_PROJECTS_PRESET,
  PRODUCT_CATALOG_PRESET,
  SERVICES_DIRECTORY_PRESET,
} from "./blueprints/catalogFamilyPresets";

export {
  classifyAssistantPrompt,
  isLikelyGuidePlanningPrompt,
  isLikelyHouseProjectsCatalogPrompt,
} from "./actionPlanHeuristics";
export { buildProviderPlanningPromptPackage } from "./providerPlanningContext";

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

const priceKeywords = ["cena", "cene", "cenę", "cenie", "price", "pricing"];
const statusKeywords = ["status", "statuses"];

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

  const normalizedPrompt = normalizeAssistantPlannerPrompt(prompt);
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
    const includeForm =
      includesAny(normalizedPrompt, ["formularz", "form", "zapytania", "inquiry", "quote"]);
    if (!includeForm) return null;

    return buildCatalogFamilyRefinementPlan(preset, {
      promptKind: options.promptKind,
      intentFamily: options.intentFamily,
      refinementId: "inquiry-form",
      title: `Add Inquiry Form to ${preset.title}`,
      answer: `I can add an inquiry form to the existing ${preset.title.toLowerCase()} setup without creating duplicate catalog resources.`,
      summary:
        "Create an inquiry form and embed it on the existing catalog page while reusing the current listing/query resources.",
      assumptions: [
        "The inquiry form is public and captures contact details plus message.",
        "The form is embedded on the existing catalog page through the current page action family.",
      ],
      extraActions: [
        {
          id: `form-${preset.key}-inquiry`,
          type: "form.upsert",
          title: `Create ${preset.title} inquiry form`,
          description:
            "Create or update a public inquiry form that can be embedded on the catalog page.",
          input: {
            name: `${preset.title} Inquiry`,
            slug: `${preset.key}-inquiry`,
            status: "published",
            description: `Inquiry form for ${preset.title.toLowerCase()}.`,
            successMessage: "Thanks. We will contact you shortly.",
            submissionAccess: "public",
            fields: [
              {
                type: "text",
                label: "Full name",
                name: "full_name",
                required: true,
                orderIndex: 0,
              },
              {
                type: "email",
                label: "Email",
                name: "email",
                required: true,
                orderIndex: 1,
              },
              {
                type: "phone",
                label: "Phone",
                name: "phone",
                required: false,
                orderIndex: 2,
              },
              {
                type: "textarea",
                label: "Message",
                name: "message",
                required: true,
                orderIndex: 3,
              },
            ],
          },
        },
      ],
      pageOverrides: {
        formEmbed: {
          formName: `${preset.title} Inquiry`,
          title: `Ask about ${preset.title.toLowerCase()}`,
          description: "Send a question and we will follow up with details.",
          submitLabel: "Send inquiry",
          successMessage: "Thanks. We will contact you shortly.",
        },
      },
    });
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

const cloneSiteKitPlanInput = (
  input: AssistantSiteKitPlanInput
): AssistantSiteKitPlanInput => ({
  businessType: input.businessType,
  goals: [...input.goals],
  locale: input.locale,
  region: input.region ?? null,
  siteName: input.siteName ?? null,
  preferredKitId: input.preferredKitId ?? null,
  selectedKitId: input.selectedKitId ?? null,
  enabledStepIds: input.enabledStepIds ? [...input.enabledStepIds] : undefined,
});

const buildSiteKitActionPlan = (
  siteKit: AssistantSiteKitPlanInput
): AssistantActionPlan => {
  const requested = cloneSiteKitPlanInput(siteKit);
  const preview = buildGuidedSiteBuilderPlanResult(requested);
  const resolvedInput: AssistantSiteKitPlanInput = {
    ...requested,
    selectedKitId: preview.selectedKitId,
    enabledStepIds: [...preview.enabledStepIds],
  };

  return {
    id: `plan-site-kit-${preview.selectedKitId}`,
    status: "ready",
    intentId: "site-kit-install",
    promptKind: "setup_request",
    intentFamily: "site_kit",
    title: `${preview.selectedKitTitle} Site Kit`,
    answer: `I can prepare the ${preview.selectedKitTitle} site kit through the shared LLM Guide action flow.`,
    summary:
      "Recommend the matching site kit, dry-run the selected steps, then execute the kit installer through typed assistant actions.",
    confidence: preview.plan.confidence / 100,
    assumptions: [
      "The AI Site Wizard is a guided entry point into the same LLM Guide action engine.",
      "Selected kit steps stay editable before execution and are applied through the solution kit installer.",
    ],
    questions: [],
    actions: [
      {
        id: `site-kit-recommend-${preview.selectedKitId}`,
        type: "site-kit.recommend",
        title: `Recommend ${preview.selectedKitTitle}`,
        description:
          "Select the most relevant site kit from the business type, goals, locale, and optional preferred kit.",
        input: {
          ...resolvedInput,
          preview,
        },
      },
      {
        id: `site-kit-install-${preview.selectedKitId}`,
        type: "site-kit.install",
        title: `Install ${preview.selectedKitTitle}`,
        description:
          "Apply the selected site kit steps through the shared solution kit installer.",
        input: {
          ...resolvedInput,
          continueOnError: true,
          preview,
        },
      },
    ],
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
  if (input.context?.siteKit) {
    return normalizeAssistantActionPlan(buildSiteKitActionPlan(input.context.siteKit));
  }

  const classification = classifyAssistantPrompt(input.prompt);
  const intentFamily =
    classification.promptKind === "refinement_request"
      ? resolveContextualRefinementFamily(context, classification.intentFamily)
      : classification.intentFamily;
  const routedClassification = { ...classification, intentFamily };
  if (!classification.normalizedPrompt) {
    return normalizeAssistantActionPlan(
      buildClarifyingPlan(input.prompt, context, routedClassification)
    );
  }

  if (
    classification.promptKind === "setup_request" &&
    intentFamily !== "unknown"
  ) {
    const readyPlan = buildReadyPlanForIntentFamily(intentFamily, {
      promptKind: classification.promptKind,
      intentFamily,
    });
    if (readyPlan) return normalizeAssistantActionPlan(readyPlan);
  }

  if (
    classification.promptKind === "refinement_request" &&
    intentFamily !== "unknown"
  ) {
    const refinementPlan = buildRefinementPlanForIntentFamily(
      input.prompt,
      intentFamily,
      {
        promptKind: classification.promptKind,
        intentFamily,
      }
    );
    if (refinementPlan) return normalizeAssistantActionPlan(refinementPlan);
  }

  return normalizeAssistantActionPlan(
    buildClarifyingPlan(input.prompt, context, routedClassification)
  );
};
