import type {
  AssistantActionContext,
  AssistantActionPlan,
  AssistantIntentFamily,
  AssistantPromptKind,
  AssistantPlanQuestion,
  AssistantSiteKitPlanInput,
} from "./actionPlanTypes";
import type { AssistantProvider } from "./providers/providerTypes";
import { buildAssistantAdminContext } from "./adminContextService";
import { normalizeAssistantActionPlan } from "./actionPlanSchema";
import { adaptProviderDraftPlan } from "./actionPlanProviderAdapter";
import {
  classifyAssistantPrompt,
  includesAny,
  isLikelyDeletePrompt,
  normalizeAssistantPlannerPrompt,
  resolveContextualRefinementFamily,
} from "./actionPlanHeuristics";
import {
  buildProviderPlanningPromptPackage,
  type AssistantProviderPlanningEvidence,
} from "./providerPlanningContext";
import { buildGuidedSiteBuilderPlanResult } from "./siteBuilderPlanAdapter";
import { buildCatalogFamilyRefinementPlan } from "./blueprints/catalogFamilyBlueprint";
import { buildBookingServiceNeedsInputPlan } from "./blueprints/bookingServiceBlueprint";
import { buildEditorialContentHubPlan } from "./blueprints/editorialContentHubBlueprint";
import { buildLeadCaptureSitePlan } from "./blueprints/leadCaptureBlueprint";
import {
  buildProductCheckoutNeedsInputPlan,
  buildProductInquiryCatalogPlan,
} from "./blueprints/productInquiryBlueprint";
import { buildHouseProjectsCatalogPlan } from "./blueprints/houseProjectsCatalogBlueprint";
import { buildCatalogFamilyPlan } from "./blueprints/catalogFamilyBlueprint";
import {
  CATALOG_FAMILY_PRESETS,
  PORTFOLIO_PROJECTS_PRESET,
  PRODUCT_CATALOG_PRESET,
  SERVICES_DIRECTORY_PRESET,
} from "./blueprints/catalogFamilyPresets";
import type { AssistantCustomScreenSummary } from "./adminContextTypes";

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
const inquiryKeywords = ["formularz", "form", "zapytania", "inquiry", "quote", "lead"];
const checkoutKeywords = [
  "checkout",
  "payment",
  "payments",
  "cart",
  "koszyk",
  "platnosc",
  "płatność",
  "platnosci",
  "płatności",
];

const screenDeleteKeywords = [
  "screen",
  "screens",
  "ekran",
  "ekrany",
  "ekranow",
  "ekranów",
  "custom screen",
  "custom screens",
];

const countWords = new Map<string, number>([
  ["jeden", 1],
  ["jedna", 1],
  ["one", 1],
  ["dwa", 2],
  ["dwie", 2],
  ["two", 2],
  ["trzy", 3],
  ["three", 3],
]);

const extractRequestedDeleteCount = (normalizedPrompt: string) => {
  const digitMatch = normalizedPrompt.match(/\b(\d{1,2})\b/);
  if (digitMatch?.[1]) return Number(digitMatch[1]);
  for (const [word, count] of countWords) {
    if (normalizedPrompt.includes(` ${word} `) || normalizedPrompt.startsWith(`${word} `)) {
      return count;
    }
  }
  return null;
};

const extractQuotedPrefix = (prompt: string) => {
  const match = prompt.match(/['"“”]([^'"“”]+)['"“”]/);
  return match?.[1]?.trim() || null;
};

const extractNamedPrefix = (prompt: string) => {
  const quoted = extractQuotedPrefix(prompt);
  if (quoted) return quoted;
  const normalized = prompt.replace(/\s+/g, " ").trim();
  const match = normalized.match(/prefix(?:ie|em)?\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};

const buildCustomScreenDeleteNeedsInputPlan = (
  prompt: string,
  reason: string
): AssistantActionPlan => ({
  id: "plan-custom-screen-delete-needs-input",
  status: "needs_input",
  intentId: "custom-screen-delete-needs-input",
  promptKind: "refinement_request",
  intentFamily: "unknown",
  title: "Custom screen delete needs review context",
  answer: [
    "I can delete custom screens only through a reviewed typed action plan.",
    "",
    reason,
    "",
    "Use a specific screen name prefix or select the exact screens to remove.",
  ].join("\n"),
  summary: "Custom screen deletion could not be planned safely from the current context.",
  confidence: 0.4,
  assumptions: [`Original prompt: ${prompt.trim() || "empty prompt"}`],
  questions: [
    {
      id: "custom-screen-delete-target",
      label: "Which exact custom screens should I delete?",
      description:
        "Provide an exact prefix or names so I can build a dry-run plan for specific screens.",
      required: true,
    },
  ],
  actions: [],
});

const sortScreensByName = (screens: AssistantCustomScreenSummary[]) =>
  [...screens].sort((left, right) => left.name.localeCompare(right.name));

const buildCustomScreenDeletePlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  normalizedPrompt: string
): AssistantActionPlan | null => {
  if (!isLikelyDeletePrompt(normalizedPrompt) || !includesAny(normalizedPrompt, screenDeleteKeywords)) {
    return null;
  }

  const prefix = extractNamedPrefix(prompt);
  const screens = context.resourceCatalog?.customScreens ?? [];
  if (!prefix) {
    return buildCustomScreenDeleteNeedsInputPlan(
      prompt,
      "The prompt did not include a clear custom screen name prefix."
    );
  }
  if (screens.length === 0) {
    return buildCustomScreenDeleteNeedsInputPlan(
      prompt,
      "I do not have the server-side custom screen catalog in this planning context."
    );
  }

  const normalizedPrefix = normalizeAssistantPlannerPrompt(prefix);
  const matches = sortScreensByName(screens).filter((screen) =>
    normalizeAssistantPlannerPrompt(screen.name).startsWith(normalizedPrefix)
  );
  const requestedCount = extractRequestedDeleteCount(` ${normalizedPrompt} `);
  if (matches.length === 0) {
    return buildCustomScreenDeleteNeedsInputPlan(
      prompt,
      `No custom screens matched the prefix "${prefix}".`
    );
  }
  if (requestedCount !== null && matches.length !== requestedCount) {
    return buildCustomScreenDeleteNeedsInputPlan(
      prompt,
      `The prefix "${prefix}" matched ${matches.length} custom screen(s), but the prompt requested ${requestedCount}.`
    );
  }
  if (requestedCount === null && matches.length > 1) {
    return buildCustomScreenDeleteNeedsInputPlan(
      prompt,
      `The prefix "${prefix}" matched ${matches.length} custom screen(s). Add an exact count or exact names before deletion.`
    );
  }

  return {
    id: `plan-custom-screen-delete-${normalizedPrefix.replace(/[^a-z0-9]+/g, "-")}`,
    status: "ready",
    intentId: "custom-screen-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: `Delete ${matches.length} custom screen${matches.length === 1 ? "" : "s"}`,
    answer:
      "I can delete the matching custom screens through the reviewed LLM Guide action flow.",
    summary: `Delete ${matches.length} custom screen${matches.length === 1 ? "" : "s"} matching prefix "${prefix}".`,
    confidence: 0.86,
    assumptions: [
      "Deletion is limited to custom screens resolved from the server-side resource catalog.",
      "Dry-run must be reviewed before execution.",
    ],
    questions: [],
    actions: matches.map((screen) => ({
      id: `custom-screen-delete-${screen.id}`,
      type: "custom-screen.delete" as const,
      title: `Delete ${screen.name}`,
      description:
        "Delete a custom screen selected from the server-side resource catalog.",
      input: {
        id: screen.id,
        name: screen.name,
        expectedNamePrefix: prefix,
      },
    })),
  };
};

const buildReadyPlanForIntentFamily = (
  intentFamily: AssistantIntentFamily,
  options: {
    promptKind: AssistantPromptKind;
    intentFamily: AssistantIntentFamily;
    normalizedPrompt?: string;
  }
) => {
  switch (intentFamily) {
    case "catalog_showcase":
      return buildHouseProjectsCatalogPlan(options);
    case "product_catalog":
      if (includesAny(options.normalizedPrompt ?? "", checkoutKeywords)) {
        return buildProductCheckoutNeedsInputPlan({ promptKind: options.promptKind });
      }
      if (includesAny(options.normalizedPrompt ?? "", inquiryKeywords)) {
        return buildProductInquiryCatalogPlan(options);
      }
      return buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, options);
    case "portfolio_projects":
      return buildCatalogFamilyPlan(PORTFOLIO_PROJECTS_PRESET, options);
    case "services_directory":
      return buildCatalogFamilyPlan(SERVICES_DIRECTORY_PRESET, options);
    case "lead_capture_site":
      return buildLeadCaptureSitePlan({ promptKind: options.promptKind });
    case "booking_service":
      return buildBookingServiceNeedsInputPlan({ promptKind: options.promptKind });
    case "editorial_content_hub":
      return buildEditorialContentHubPlan({ promptKind: options.promptKind });
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
    normalizedPrompt?: string;
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

export type AssistantProviderDraftPlanInput = AssistantActionPlanInput & {
  provider?: AssistantProvider | null;
  llmAvailable?: boolean;
  evidence?: AssistantProviderPlanningEvidence[];
  limits?: {
    maxInputTokens?: number;
    maxOutputTokens?: number;
    timeoutMs?: number;
  };
};

const providerPlannerSystemPrompt = [
  "You draft Nextless LLM Guide action plans.",
  "Return only JSON.",
  "Use only supported typed actions and never invent arbitrary commands.",
  "The local server will validate your draft through a strict schema before any dry-run or execution.",
].join(" ");

const parseProviderDraftJson = (value: string) => JSON.parse(value) as unknown;

const buildProviderRequestLimits = (
  limits: AssistantProviderDraftPlanInput["limits"] | undefined
) => ({
  maxInputTokens: Math.max(1, Math.floor(limits?.maxInputTokens ?? 4_000)),
  maxOutputTokens: Math.max(1, Math.floor(limits?.maxOutputTokens ?? 1_500)),
  timeoutMs: Math.max(1_000, Math.floor(limits?.timeoutMs ?? 15_000)),
});

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

  const deletePlan = buildCustomScreenDeletePlan(
    input.prompt,
    context,
    classification.normalizedPrompt
  );
  if (deletePlan) return normalizeAssistantActionPlan(deletePlan);

  if (
    classification.promptKind === "setup_request" &&
    intentFamily !== "unknown"
  ) {
    const readyPlan = buildReadyPlanForIntentFamily(intentFamily, {
      promptKind: classification.promptKind,
      intentFamily,
      normalizedPrompt: classification.normalizedPrompt,
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

export const planAssistantActionsWithProviderDraft = async (
  input: AssistantProviderDraftPlanInput
): Promise<AssistantActionPlan> => {
  if (!input.llmAvailable || !input.provider) {
    return planAssistantActions(input);
  }

  try {
    const promptPackage = buildProviderPlanningPromptPackage({
      prompt: input.prompt,
      context: input.context,
      evidence: input.evidence,
    });
    const response = await input.provider.complete({
      systemPrompt: providerPlannerSystemPrompt,
      userMessage: JSON.stringify(promptPackage),
      snippets: [],
      limits: buildProviderRequestLimits(input.limits),
    });
    return adaptProviderDraftPlan({
      prompt: input.prompt,
      draft: parseProviderDraftJson(response.text),
    });
  } catch {
    return planAssistantActions(input);
  }
};
