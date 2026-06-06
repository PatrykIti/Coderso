import type {
  AssistantActionContext,
  AssistantActionPlan,
  AssistantIntentFamily,
  AssistantPromptKind,
  AssistantPlanQuestion,
  AssistantSiteKitPlanInput,
} from "./actionPlanTypes";
import type { AssistantProvider } from "./providers/providerTypes";
import {
  buildAssistantAdminContext,
  readTrustedAssistantResourceCatalog,
  sanitizeAssistantPlanningContext,
} from "./adminContextService";
import {
  assertReviewedSiteKitStaticCoverage,
  buildReviewedSiteKitLaunchReadiness,
} from "./assistantSiteBuilderIntakeStaticActions";
import { cloneAdvancedRuntimeOverrides } from "./siteBuilderAdvancedRuntimeOverrides";
import { normalizeAssistantActionPlan } from "./actionPlanSchema";
import {
  classifyAssistantPrompt,
  includesAny,
  normalizeAssistantPlannerPrompt,
  resolveContextualRefinementFamily,
} from "./actionPlanHeuristics";
import {
  buildProviderPlanningPromptPackage,
  type AssistantProviderPlanningEvidence,
} from "./providerPlanningContext";
import { assistantOperationPolicy } from "./operationPolicy/assistantOperationPolicy";
import { buildProviderPlannerSystemPrompt } from "./operationPolicy/providerGuidance";
import {
  hasDestructiveActions,
  hasActionCountMismatchWithPolicy,
  hasDestructiveCountMismatchWithPolicy,
  hasPromptDestructiveIntentMismatchWithPolicy,
  hasPromptImpliedFieldMismatchWithPolicy,
  isBroadDestructivePromptWithPolicy,
} from "./operationPolicy/safetyPolicy";
import { buildGuidedSiteBuilderPlanResult } from "./siteBuilderPlanAdapter";
import { buildCatalogFamilyRefinementPlan } from "./blueprints/catalogFamilyBlueprint";
import { buildBookingServiceNeedsInputPlan } from "./blueprints/bookingServiceBlueprint";
import { assembleComposedBlueprintPlan } from "./blueprints/blueprintActionAssembler";
import { resolveBlueprintCandidates } from "./blueprints/blueprintCandidateResolver";
import { buildBlueprintCompositionGraph } from "./blueprints/blueprintCompositionGraph";
import { attachBlueprintShadowMetadata } from "./blueprints/blueprintComposerShadow";
import { buildEditorialContentHubPlan } from "./blueprints/editorialContentHubBlueprint";
import { buildFullServiceSitePlan } from "./blueprints/fullServiceSiteBlueprint";
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
import {
  buildCmsOperationDraftFromPrompt,
  type CmsResolvedTargetCandidate,
  resolveCmsOperationTargets,
} from "./cmsTargetResolver";
import { mapCmsOperationToActionPlan } from "./cmsOperationActionMapper";
import {
  resolveSiteBuilderFollowUpTarget,
  type AssistantSiteBuilderFollowUpResolution,
} from "./assistantSiteBuilderFollowUpResolver";
import {
  type CmsOperationDraft,
  buildCmsOperationDraftJsonSchema,
  normalizeCmsOperationDraft,
  normalizeCmsOperationDraftWithPolicy,
} from "./cmsOperationDraftSchema";
import {
  getResolverResourcePolicyForDraft,
  inferFiltersFromPromptWithPolicy,
  resolveFieldIntentWithPolicy,
} from "./operationPolicy/resolverPolicy";
import { chooseProviderResponseContract, resolveModelCapabilityProfile } from "./modelCapabilities";
import { buildCmsOperationDraftFromPlanningState } from "./cmsPlanningState";
import {
  buildBasicSiteBuilderNeedsInputPlan,
  shouldStartBasicSiteBuilderGuide,
} from "./assistantSiteBuilderIntakeBasicFlow";
import { buildAdvancedSiteBuilderNeedsInputPlan } from "./assistantSiteBuilderIntakeAdvancedFlow";
import { buildActionPlanRequestFromReviewedIntake } from "./assistantSiteBuilderIntakeCompiler";
import { normalizeAssistantSiteBuilderIntakeSession } from "./assistantSiteBuilderIntakeNormalizer";
import { redactAssistantUnsafeText } from "./assistantRedaction";

export {
  classifyAssistantPrompt,
  isLikelyGuidePlanningPrompt,
  isLikelyHouseProjectsCatalogPrompt,
} from "./actionPlanHeuristics";
export { buildProviderPlanningPromptPackage } from "./providerPlanningContext";

const filterKeywords = ["filtr", "filter", "filters", "facets", "filtrowanie"];

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
const existingPageFollowUpKeywords = [
  "sekcj",
  "section",
  "galer",
  "gallery",
  "projekty",
  "projects",
  "portfolio",
  "wnetrz",
  "wnętrz",
  "na stronie",
  "on page",
  "this page",
];

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
    case "service_business_full_site":
      return buildFullServiceSitePlan({
        prompt: options.normalizedPrompt,
        promptKind: options.promptKind,
      });
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

  const includeFilters = includesAny(normalizedPrompt, filterKeywords) || selectedFacets.length > 0;
  const includeLayoutUpdate = includesAny(normalizedPrompt, layoutKeywords);
  const includeStatusOrPrice =
    includesAny(normalizedPrompt, statusKeywords) || includesAny(normalizedPrompt, priceKeywords);

  if (!includeFilters && !includeLayoutUpdate && !includeStatusOrPrice) {
    const includeForm = includesAny(normalizedPrompt, [
      "formularz",
      "form",
      "zapytania",
      "inquiry",
      "quote",
    ]);
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

const buildBlueprintComposerSetupPlan = (input: {
  prompt: string;
  context?: AssistantActionContext;
  promptKind: AssistantPromptKind;
  intentFamily: AssistantIntentFamily;
  normalizedPrompt?: string;
}): AssistantActionPlan | null => {
  if (input.promptKind !== "setup_request" || input.intentFamily === "unknown") return null;

  const trustedContext = input.context
    ? {
        ...input.context,
        resourceCatalog: readTrustedAssistantResourceCatalog(input.context),
      }
    : undefined;
  const candidates = resolveBlueprintCandidates({
    prompt: input.prompt,
    context: trustedContext,
  });
  const primary = candidates.find((candidate) => candidate.role === "primary");
  const adjuncts = candidates.filter((candidate) => candidate.role === "adjunct");
  const gated = candidates.filter((candidate) => candidate.role === "gated");

  if (!primary) return null;
  if (gated.length === 0 && adjuncts.length === 0) return null;

  const graph = buildBlueprintCompositionGraph({
    candidates,
    promptKind: input.promptKind,
    intentFamily: input.intentFamily,
  });

  return assembleComposedBlueprintPlan({
    prompt: input.prompt,
    promptKind: input.promptKind,
    intentFamily: input.intentFamily,
    graph,
    resourceCatalog: trustedContext?.resourceCatalog ?? null,
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
    assumptions: [`Original prompt: ${describePlannerPrompt(prompt)}`],
    questions,
    actions: [],
  };
};

const buildDocsGuidancePlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>
): AssistantActionPlan => {
  const routeHint = context.route
    ? `Current admin route: ${context.route}.`
    : "No active admin route was provided.";
  return {
    id: "plan-docs-guidance",
    status: "ready",
    intentId: "docs-guidance",
    responseKind: "docs",
    promptKind: "docs_question",
    intentFamily: "unknown",
    title: "Documentation guidance",
    answer: [
      "This looks like a documentation or how-to question rather than a CMS operation.",
      "",
      routeHint,
      "",
      "Ask what you want me to inspect, change, create, delete, or configure if this should become a reviewed LLM Guide plan.",
    ].join("\n"),
    summary: "The prompt is classified as non-mutating documentation guidance.",
    confidence: 0.62,
    assumptions: [
      "LLM Guide did not plan a mutation for this prompt.",
      `Original prompt: ${describePlannerPrompt(prompt)}`,
    ],
    questions: [],
    actions: [],
  };
};

const describeCmsTargetQuery = (draft: CmsOperationDraft) => {
  const query =
    draft.targetQuery?.exactName ??
    draft.targetQuery?.prefix ??
    draft.targetQuery?.slug ??
    draft.targetQuery?.text ??
    null;
  return query ? redactAssistantUnsafeText(query) : null;
};

const toInspectionCandidates = (candidates: CmsResolvedTargetCandidate[]) =>
  candidates.slice(0, 10).map((candidate) => ({
    kind: candidate.kind,
    id: candidate.id,
    label: candidate.label,
    slug: candidate.slug,
    status: candidate.status,
    adminHref: candidate.adminHref,
  }));

const describePlannerPrompt = (prompt: string) => {
  const trimmed = prompt.trim();
  if (!trimmed) return "empty prompt";
  return redactAssistantUnsafeText(trimmed);
};

const buildGenericCmsInspectionPlan = (
  prompt: string,
  draft: CmsOperationDraft,
  context: ReturnType<typeof buildAssistantAdminContext>
): AssistantActionPlan | null => {
  if (draft.operation !== "inspect" && draft.operation !== "find") return null;
  const resolution = resolveCmsOperationTargets(draft, context);
  const candidates = toInspectionCandidates(resolution.candidates);
  const safeQuery = describeCmsTargetQuery(draft);
  const matchStatus =
    resolution.status === "unsupported"
      ? "unsupported"
      : resolution.status === "no_match"
        ? "no_match"
        : resolution.status === "ambiguous"
          ? "ambiguous"
          : "matched";
  const candidateLines =
    candidates.length > 0
      ? candidates
          .map((candidate) => {
            const slug = candidate.slug ? ` (${candidate.slug})` : "";
            const status = candidate.status ? ` - ${candidate.status}` : "";
            return `- ${candidate.label}${slug}${status}`;
          })
          .join("\n")
      : "No matching CMS resources were found.";

  return {
    id: `plan-cms-${draft.resourceKind}-inspect`,
    status: "ready",
    intentId: "cms-resource-inspect",
    responseKind: "inspection",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    inspection: {
      kind: "resource-candidates",
      operation: draft.operation,
      resourceKind: draft.resourceKind,
      matchStatus,
      query: safeQuery,
      candidates,
      truncated: resolution.candidates.length > candidates.length,
    },
    title: "CMS resource inspection",
    answer: [
      safeQuery
        ? `I searched ${draft.resourceKind} resources for "${safeQuery}".`
        : `I searched visible ${draft.resourceKind} resources.`,
      "",
      candidateLines,
    ].join("\n"),
    summary:
      candidates.length > 0
        ? `Found ${resolution.candidates.length} ${draft.resourceKind} candidate(s).`
        : `No ${draft.resourceKind} candidates matched the request.`,
    confidence:
      resolution.status === "exact" ? 0.84 : resolution.status === "candidates" ? 0.72 : 0.58,
    assumptions: [
      "Inspection uses trusted active context and server-side resource catalog summaries.",
      "No changes are planned for this read-only response.",
      `Original prompt: ${describePlannerPrompt(prompt)}`,
    ],
    questions: [],
    actions: [],
  };
};

const buildGenericCmsInspectionOperationPlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>
): AssistantActionPlan | null => {
  const draft = buildCmsOperationDraftFromPrompt(prompt, context);
  if (!draft) return null;
  return buildGenericCmsInspectionPlan(prompt, draft, context);
};

type GenericCmsOperationPlanOptions = {
  siteBuilderFollowUp?: boolean;
  destructiveFollowUp?: boolean;
};

const sanitizeFollowUpText = (value: string | null) =>
  value ? redactAssistantUnsafeText(value) : value;

const sanitizeFollowUpAssumption = (assumption: string) => {
  const sanitized = redactAssistantUnsafeText(assumption);
  if (sanitized === "[REDACTED]" && /^Original prompt:/i.test(assumption)) {
    return "Original prompt: [REDACTED]";
  }
  return sanitized;
};

const siteBuilderFollowUpUpdateResourceKinds = new Set([
  "page",
  "content-type",
  "entry",
  "listing-query",
  "listing-template",
  "detail-page",
  "custom-screen",
  "form",
  "media",
  "plugin-store",
]);

const siteBuilderFollowUpArchiveResourceKinds = new Set([
  "page",
  "content-type",
  "entry",
  "listing-query",
  "listing-template",
  "detail-page",
  "custom-screen",
]);

const siteBuilderFollowUpDeleteResourceKinds = new Set([
  "page",
  "content-type",
  "entry",
  "listing-query",
  "listing-template",
  "detail-page",
  "custom-screen",
]);

const isSiteBuilderFollowUpMutationDraft = (draft: CmsOperationDraft) =>
  (draft.operation === "update" &&
    siteBuilderFollowUpUpdateResourceKinds.has(draft.resourceKind)) ||
  (draft.operation === "archive" &&
    siteBuilderFollowUpArchiveResourceKinds.has(draft.resourceKind));

const isSiteBuilderFollowUpDestructiveDraft = (draft: CmsOperationDraft) =>
  draft.operation === "delete" && siteBuilderFollowUpDeleteResourceKinds.has(draft.resourceKind);

const shouldAutoEnableSiteBuilderFollowUpForLocalDraft = (draft: CmsOperationDraft) =>
  isSiteBuilderFollowUpMutationDraft(draft) &&
  draft.resourceKind !== "media" &&
  draft.resourceKind !== "plugin-store";

const shouldUseSiteBuilderFollowUpResolver = (
  context: ReturnType<typeof buildAssistantAdminContext>,
  options: GenericCmsOperationPlanOptions | undefined
) =>
  options?.siteBuilderFollowUp === true &&
  Boolean(context.resourceCatalog || context.activeSurface);

const describeFollowUpDraftQuery = (draft: CmsOperationDraft | null) =>
  sanitizeFollowUpText(
    draft?.targetQuery?.exactName ??
      draft?.targetQuery?.prefix ??
      draft?.targetQuery?.slug ??
      draft?.targetQuery?.text ??
      null
  );

const toFollowUpInspectionCandidates = (resolution: AssistantSiteBuilderFollowUpResolution) =>
  resolution.candidates.slice(0, 10).map((candidate) => ({
    kind: candidate.kind,
    id: candidate.id,
    label: candidate.label,
    slug: candidate.slug,
    status: candidate.status,
    adminHref: candidate.adminHref,
  }));

const buildSiteBuilderFollowUpNeedsInputPlan = (
  prompt: string,
  draft: CmsOperationDraft | null,
  resolution: Extract<AssistantSiteBuilderFollowUpResolution, { status: "needs_input" }>
): AssistantActionPlan => {
  const code = resolution.question.code;
  const resourceKind =
    resolution.request?.resourceKind ??
    draft?.resourceKind ??
    resolution.candidates[0]?.kind ??
    "page";
  const matchStatus = code === "target_ambiguous" ? "ambiguous" : "no_match";
  return {
    id: `plan-site-builder-follow-up-${resourceKind}-${code}`,
    status: "needs_input",
    intentId: `site-builder-follow-up-${code}`,
    responseKind: "needs_input",
    promptKind: "refinement_request",
    intentFamily: "site_kit",
    inspection: {
      kind: "resource-candidates",
      operation: "find",
      resourceKind,
      matchStatus,
      query: describeFollowUpDraftQuery(draft),
      candidates: toFollowUpInspectionCandidates(resolution),
      truncated: resolution.candidates.length > 10,
    },
    title: "Site change needs an exact target",
    answer: [
      "I can help with this site change, but I need the exact existing CMS target first.",
      "",
      redactAssistantUnsafeText(resolution.question.message, 360),
    ].join("\n"),
    summary: "The follow-up target was not precise enough for a reviewed action plan.",
    confidence: 0.58,
    assumptions: [
      "Free text is treated only as a hint; mutation targets must come from active admin context or the trusted server resource catalog.",
      `Original prompt: ${describePlannerPrompt(prompt)}`,
    ],
    questions: [
      {
        id: "site-builder-follow-up-target",
        label: "Which existing page or builder resource should I change?",
        description:
          "Choose one of the trusted candidates or open the exact page/screen before continuing.",
        required: true,
      },
    ],
    actions: [],
  };
};

const buildSiteBuilderFollowUpGatedPlan = (
  prompt: string,
  draft: CmsOperationDraft,
  resolution: Extract<AssistantSiteBuilderFollowUpResolution, { status: "gated" }>
): AssistantActionPlan => {
  const code = resolution.gate.code;
  return {
    id: `plan-site-builder-follow-up-${draft.resourceKind}-${code}`,
    status: "needs_input",
    intentId: `site-builder-follow-up-${code}`,
    responseKind: "gated",
    promptKind: "refinement_request",
    intentFamily: "site_kit",
    title: "Site change is gated",
    answer: [
      redactAssistantUnsafeText(resolution.gate.message, 360),
      "",
      "No executable action was planned.",
    ].join("\n"),
    summary: "The follow-up was blocked before CMS action assembly.",
    confidence: 0.66,
    assumptions: [
      "Guided site-builder follow-ups only mutate supported generated site resources after target scoping succeeds.",
      `Original prompt: ${describePlannerPrompt(prompt)}`,
    ],
    questions: [
      {
        id: "site-builder-follow-up-supported-target",
        label: "Should this be handled by a different CMS flow?",
        description:
          "Use the matching resource editor or add a typed follow-up action before executing this request.",
        required: true,
      },
    ],
    actions: [],
  };
};

const buildResolvedSiteBuilderFollowUpPlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  draft: CmsOperationDraft
): AssistantActionPlan | null => {
  const resolution = resolveSiteBuilderFollowUpTarget({ prompt, context, draft });
  if (resolution.status === "needs_input") {
    return buildSiteBuilderFollowUpNeedsInputPlan(prompt, draft, resolution);
  }
  if (resolution.status === "gated") {
    return buildSiteBuilderFollowUpGatedPlan(prompt, draft, resolution);
  }
  const plan = mapCmsOperationToActionPlan({ prompt, draft, context });
  if (!plan) {
    return buildSiteBuilderFollowUpGatedPlan(prompt, draft, {
      status: "gated",
      schemaVersion: 1,
      request: resolution.request,
      target: resolution.target,
      candidates: resolution.candidates,
      question: null,
      gate: {
        code: "operation_unsupported",
        message: "The requested operation is not supported for this resource family.",
      },
    });
  }
  return {
    ...plan,
    assumptions: [
      "The follow-up target was resolved by the guided site-builder follow-up resolver before action mapping.",
      ...plan.assumptions.map(sanitizeFollowUpAssumption),
    ],
  };
};

const buildDraftlessSiteBuilderFollowUpPlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  options?: GenericCmsOperationPlanOptions
): AssistantActionPlan | null => {
  if (!shouldUseSiteBuilderFollowUpResolver(context, options) || !context.activeSurface)
    return null;
  const resolution = resolveSiteBuilderFollowUpTarget({ prompt, context, draft: null });
  return resolution.status === "needs_input"
    ? buildSiteBuilderFollowUpNeedsInputPlan(prompt, null, resolution)
    : null;
};

const buildSiteBuilderFollowUpOperationPlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  draft: CmsOperationDraft,
  options?: GenericCmsOperationPlanOptions
): AssistantActionPlan | null => {
  if (
    !shouldUseSiteBuilderFollowUpResolver(context, options) ||
    (!isSiteBuilderFollowUpMutationDraft(draft) &&
      !(options?.destructiveFollowUp === true && isSiteBuilderFollowUpDestructiveDraft(draft)))
  ) {
    return null;
  }
  return buildResolvedSiteBuilderFollowUpPlan(prompt, context, draft);
};

const buildGenericCmsPlanningStateFollowUpPlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>
): AssistantActionPlan | null => {
  const draft = buildCmsOperationDraftFromPlanningState(prompt, context.planningState);
  if (!draft) return null;
  const inspectionPlan = buildGenericCmsInspectionPlan(prompt, draft, context);
  if (inspectionPlan) return inspectionPlan;
  const followUpPlan = buildSiteBuilderFollowUpOperationPlan(prompt, context, draft, {
    siteBuilderFollowUp: true,
    destructiveFollowUp: true,
  });
  if (followUpPlan) return followUpPlan;
  return mapCmsOperationToActionPlan({ prompt, draft, context });
};

const buildGenericCmsOperationPlanFromDraft = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  draft: CmsOperationDraft,
  options?: GenericCmsOperationPlanOptions
): AssistantActionPlan | null => {
  const inspectionPlan = buildGenericCmsInspectionPlan(prompt, draft, context);
  if (inspectionPlan) return inspectionPlan;
  const followUpPlan = buildSiteBuilderFollowUpOperationPlan(prompt, context, draft, options);
  if (followUpPlan) return followUpPlan;
  return mapCmsOperationToActionPlan({ prompt, draft, context });
};

const cloneSiteKitPlanInput = (input: AssistantSiteKitPlanInput): AssistantSiteKitPlanInput => ({
  businessType: input.businessType,
  goals: [...input.goals],
  locale: input.locale,
  region: input.region ?? null,
  siteName: input.siteName ?? null,
  preferredKitId: input.preferredKitId ?? null,
  selectedKitId: input.selectedKitId ?? null,
  enabledStepIds: input.enabledStepIds ? [...input.enabledStepIds] : undefined,
  ...(input.advancedRuntimeOverrides
    ? { advancedRuntimeOverrides: cloneAdvancedRuntimeOverrides(input.advancedRuntimeOverrides) }
    : {}),
});

const buildSiteKitActionPlan = (siteKit: AssistantSiteKitPlanInput): AssistantActionPlan => {
  const requested = cloneSiteKitPlanInput(siteKit);
  const preview = buildGuidedSiteBuilderPlanResult(requested);
  const resolvedInput: AssistantSiteKitPlanInput = {
    ...requested,
    selectedKitId: preview.selectedKitId,
    enabledStepIds: [...preview.enabledStepIds],
  };

  const actionPlan: AssistantActionPlan = {
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
    metadata: {
      planner: "local",
      providerDraftUsed: false,
    },
    assumptions: [
      "The reviewed LLM Guide site-builder intake is the guided entry point into this action engine.",
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
        description: "Apply the selected site kit steps through the shared solution kit installer.",
        input: {
          ...resolvedInput,
          continueOnError: true,
          preview,
        },
      },
    ],
  };
  assertReviewedSiteKitStaticCoverage(actionPlan, resolvedInput);
  actionPlan.metadata = {
    ...actionPlan.metadata,
    planner: "local",
    providerDraftUsed: false,
    launchReadiness: buildReviewedSiteKitLaunchReadiness(actionPlan, resolvedInput),
  };
  return actionPlan;
};

export type AssistantActionPlanInput = {
  prompt: string;
  context?: AssistantActionContext;
};

export type AssistantProviderDraftPlanInput = AssistantActionPlanInput & {
  provider?: AssistantProvider | null;
  providerModel?: string | null;
  llmAvailable?: boolean;
  evidence?: AssistantProviderPlanningEvidence[];
  limits?: {
    maxInputTokens?: number;
    maxOutputTokens?: number;
    timeoutMs?: number;
  };
};

const finalizeAssistantPlan = (
  input: AssistantActionPlanInput,
  context: ReturnType<typeof buildAssistantAdminContext>,
  classification: {
    promptKind?: AssistantPromptKind;
    intentFamily?: AssistantIntentFamily;
  } | null,
  plan: AssistantActionPlan
) =>
  normalizeAssistantActionPlan(
    attachBlueprintShadowMetadata({
      plan,
      prompt: input.prompt,
      context: {
        ...input.context,
        page: context.route ?? input.context?.page,
        locale: context.locale ?? input.context?.locale,
        resourceCatalog: readTrustedAssistantResourceCatalog(input.context),
        runtimeSnapshot: context.runtimeSnapshot ?? input.context?.runtimeSnapshot,
        activeSurface: context.activeSurface ?? input.context?.activeSurface,
        planningState: context.planningState ?? input.context?.planningState,
      },
      promptKind: classification?.promptKind,
      intentFamily: classification?.intentFamily,
    })
  );

const buildRoutedClassification = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  inputContext?: AssistantActionContext
) => {
  const classification = classifyAssistantPrompt(prompt);
  const trustedContextForRouting =
    inputContext?.includeResourceCatalog === true
      ? { ...context, resourceCatalog: inputContext.resourceCatalog ?? null }
      : { ...context, resourceCatalog: null };
  const intentFamily =
    classification.promptKind === "refinement_request"
      ? resolveContextualRefinementFamily(trustedContextForRouting, classification.intentFamily)
      : classification.intentFamily;
  return { ...classification, intentFamily };
};

const shouldTreatUnknownSetupAsExistingSiteFollowUp = (
  classification: ReturnType<typeof buildRoutedClassification>,
  context: ReturnType<typeof buildAssistantAdminContext>
) =>
  (classification.promptKind === "setup_request" ||
    classification.promptKind === "refinement_request") &&
  classification.intentFamily === "unknown" &&
  Boolean(context.activeSurface && context.resourceCatalog) &&
  includesAny(classification.normalizedPrompt, existingPageFollowUpKeywords);

const providerPlannerSystemPrompt = buildProviderPlannerSystemPrompt(assistantOperationPolicy);

const parseProviderDraftJson = (value: string) => {
  const trimmed = value.trim();
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fenced?.[1]) return JSON.parse(fenced[1]) as unknown;
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    }
    throw new Error("provider_draft_json_invalid");
  }
};

const buildProviderRequestLimits = (
  limits: AssistantProviderDraftPlanInput["limits"] | undefined
) => ({
  maxInputTokens: Math.max(1, Math.floor(limits?.maxInputTokens ?? 4_000)),
  maxOutputTokens: Math.max(1, Math.floor(limits?.maxOutputTokens ?? 1_500)),
  timeoutMs: Math.max(1_000, Math.floor(limits?.timeoutMs ?? 15_000)),
});

const tryPlanProviderCmsOperationDraft = (
  input: AssistantProviderDraftPlanInput,
  draft: unknown
) => {
  const trustedContext = sanitizeAssistantPlanningContext(input.context);
  const context = buildAssistantAdminContext(trustedContext);
  const routedClassification = buildRoutedClassification(input.prompt, context, trustedContext);
  try {
    const operationDraft = applyPromptImpliedDraftHintsWithPolicy(
      input.prompt,
      normalizeCmsOperationDraftWithPolicy(draft, assistantOperationPolicy)
    );
    const plan = buildGenericCmsOperationPlanFromDraft(input.prompt, context, operationDraft, {
      siteBuilderFollowUp:
        routedClassification.promptKind === "refinement_request" ||
        isSiteBuilderFollowUpMutationDraft(operationDraft),
    });
    if (!plan) return null;
    return normalizeAssistantActionPlan({
      ...plan,
      metadata: {
        planner: "provider",
        providerDraftUsed: true,
        providerId: input.provider?.id ?? null,
      },
      assumptions: [
        ...plan.assumptions,
        "Provider draft was validated locally before target resolution.",
      ],
    });
  } catch {
    return null;
  }
};

const hasFilterField = (draft: CmsOperationDraft, field: string) =>
  draft.filters?.some((filter) => filter.field === field) ?? false;

const findPromptFieldPolicy = (
  normalizedPrompt: string,
  resourcePolicy: ReturnType<typeof getResolverResourcePolicyForDraft>
) => {
  if (!resourcePolicy) return null;
  return (
    Object.values(resourcePolicy.fields)
      .map((field) => {
        const bestAliasLength = [field.field, ...field.aliases]
          .map((alias) => normalizeAssistantPlannerPrompt(alias))
          .filter((alias) => alias && includesAny(normalizedPrompt, [alias]))
          .reduce((best, alias) => Math.max(best, alias.length), 0);
        return bestAliasLength > 0 ? { field, score: bestAliasLength } : null;
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .sort((left, right) => right.score - left.score)[0]?.field ?? null
  );
};

const coercePolicyMutationValue = (
  value: string | number | boolean | null | undefined,
  valueType: string | undefined
) => {
  if (valueType === "number" && typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  if (valueType === "boolean" && typeof value === "string") {
    const normalized = normalizeAssistantPlannerPrompt(value);
    if (["true", "yes", "tak", "show", "pokaz", "pokaż"].includes(normalized)) return true;
    if (["false", "no", "nie", "hide", "ukryj"].includes(normalized)) return false;
  }
  return value;
};

const applyPromptImpliedDraftHintsWithPolicy = (
  prompt: string,
  draft: CmsOperationDraft
): CmsOperationDraft => {
  const normalizedPrompt = normalizeAssistantPlannerPrompt(prompt);
  const resourcePolicy = getResolverResourcePolicyForDraft(draft);
  const inferredFilters = inferFiltersFromPromptWithPolicy(normalizedPrompt, resourcePolicy).filter(
    (filter) => !hasFilterField(draft, filter.field)
  );
  const promptFieldPolicy = findPromptFieldPolicy(normalizedPrompt, resourcePolicy);
  const inferredFieldIntent =
    draft.operation === "update" && draft.mutation?.value !== undefined
      ? draft.mutation.patch
        ? draft.mutation.fieldIntent
        : (promptFieldPolicy?.field ??
          draft.mutation.fieldIntent ??
          resolveFieldIntentWithPolicy(normalizedPrompt, resourcePolicy))
      : draft.mutation?.fieldIntent;
  const fieldPolicy =
    inferredFieldIntent && resourcePolicy
      ? Object.values(resourcePolicy.fields).find((field) => field.field === inferredFieldIntent)
      : null;
  const mutation = draft.mutation
    ? {
        ...draft.mutation,
        ...(inferredFieldIntent ? { fieldIntent: inferredFieldIntent } : {}),
        ...(draft.mutation.value !== undefined
          ? { value: coercePolicyMutationValue(draft.mutation.value, fieldPolicy?.valueType) }
          : {}),
      }
    : undefined;
  return normalizeCmsOperationDraftWithPolicy(
    {
      ...draft,
      ...(inferredFilters.length > 0
        ? { filters: [...(draft.filters ?? []), ...inferredFilters] }
        : {}),
      ...(mutation ? { mutation } : {}),
    },
    assistantOperationPolicy
  );
};

const buildProviderLocalRecoveryPlan = (input: AssistantProviderDraftPlanInput) => {
  const trustedContext = sanitizeAssistantPlanningContext(input.context);
  const context = buildAssistantAdminContext(trustedContext);
  const routedClassification = buildRoutedClassification(input.prompt, context, trustedContext);
  const policyPlan = buildLocalPolicyOperationPlan(input.prompt, context, {
    siteBuilderFollowUp: routedClassification.promptKind === "refinement_request",
  });
  const plan = policyPlan
    ? policyPlan
    : planAssistantActions({
        prompt: input.prompt,
        context: trustedContext,
      });
  const hasRecoveredActions = plan.status === "ready" && plan.actions.length > 0;
  const hasRecoveredInspection =
    plan.responseKind === "inspection" && (plan.inspection?.candidates.length ?? 0) > 0;
  if (!hasRecoveredActions && !hasRecoveredInspection) return null;
  return normalizeAssistantActionPlan({
    ...plan,
    metadata: {
      planner: "provider",
      providerDraftUsed: false,
      providerId: input.provider?.id ?? null,
    },
    assumptions: [
      ...plan.assumptions,
      "Provider draft was rejected or unsafe.",
      "Local policy planning recovered the safe typed plan or inspection result without reusing provider payload.",
    ],
  });
};

const buildLocalPolicyOperationPlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  options?: GenericCmsOperationPlanOptions
): AssistantActionPlan | null => {
  const normalizedPrompt = normalizeAssistantPlannerPrompt(prompt);
  const readOnlyPrompt = includesAny(normalizedPrompt, [
    "pokaz",
    "pokaż",
    "znajdz",
    "znajdź",
    "find",
    "search",
    "show",
    "jakie",
    "ktore",
    "które",
  ]);
  const rawDraft = buildCmsOperationDraftFromPrompt(prompt, context);
  if (!rawDraft) return null;
  const policyAdjustedDraft = applyPromptImpliedDraftHintsWithPolicy(prompt, rawDraft);
  const draft =
    policyAdjustedDraft.operation === "update" && readOnlyPrompt && !policyAdjustedDraft.mutation
      ? normalizeCmsOperationDraft({
          ...policyAdjustedDraft,
          operation: "inspect",
          constraints: {
            destructive: false,
            requiresConfirmation: false,
          },
        })
      : policyAdjustedDraft;
  const followUpOptions: GenericCmsOperationPlanOptions = {
    siteBuilderFollowUp:
      options?.siteBuilderFollowUp === true ||
      shouldAutoEnableSiteBuilderFollowUpForLocalDraft(draft),
  };
  const hasExplicitTarget = Boolean(
    draft.targetQuery?.exactName ||
    draft.targetQuery?.slug ||
    draft.targetQuery?.prefix ||
    draft.targetQuery?.text ||
    draft.targetQuery?.active ||
    (Array.isArray(draft.mutation?.patch?.items) && draft.mutation.patch.items.length > 0) ||
    draft.operation === "delete" ||
    draft.operation === "archive" ||
    draft.resourceKind === "post" ||
    draft.resourceKind === "media" ||
    draft.resourceKind === "settings-surface" ||
    (draft.filters && draft.filters.length > 0)
  );
  if (
    (draft.operation === "delete" || draft.operation === "archive") &&
    isBroadDestructivePromptWithPolicy(prompt) &&
    !(draft.filters && draft.filters.length > 0)
  ) {
    return {
      id: `plan-cms-${draft.resourceKey ?? draft.resourceKind}-${draft.operation}-broad-blocked`,
      status: "needs_input",
      intentId: `cms-${draft.resourceKey ?? draft.resourceKind}-${draft.operation}-broad-blocked`,
      responseKind: "needs_input",
      promptKind: "refinement_request",
      intentFamily: "unknown",
      title: "Broad destructive operation needs exact targets",
      answer:
        "I cannot plan a broad destructive CMS operation without exact trusted targets and explicit expected counts.",
      summary: "Broad destructive prompt was blocked before action planning.",
      confidence: 0.48,
      assumptions: [`Original prompt: ${describePlannerPrompt(prompt)}`],
      questions: [
        {
          id: "cms-destructive-targets",
          label: "Which exact resources should I change?",
          description:
            "Provide exact names, filters, and expected count before destructive actions.",
          required: true,
        },
      ],
      actions: [],
    };
  }
  if (!hasExplicitTarget) {
    const followUpPlan = buildSiteBuilderFollowUpOperationPlan(
      prompt,
      context,
      draft,
      followUpOptions
    );
    if (followUpPlan) return followUpPlan;
    return null;
  }
  const inspectionPlan = buildGenericCmsInspectionPlan(prompt, draft, context);
  if (inspectionPlan && (inspectionPlan.inspection?.candidates.length ?? 0) > 0) {
    return inspectionPlan;
  }
  const followUpPlan = buildSiteBuilderFollowUpOperationPlan(
    prompt,
    context,
    draft,
    followUpOptions
  );
  if (followUpPlan) return followUpPlan;
  const mutationPlan = mapCmsOperationToActionPlan({ prompt, draft, context });
  if (
    mutationPlan?.responseKind === "action_plan" ||
    mutationPlan?.responseKind === "gated" ||
    mutationPlan?.status === "needs_input"
  ) {
    return mutationPlan;
  }
  return null;
};

const buildReviewedSiteBuilderIntakeRequiredPlan = (prompt: string): AssistantActionPlan =>
  normalizeAssistantActionPlan({
    id: "plan-site-kit-reviewed-intake-required",
    status: "needs_input",
    intentId: "site-kit-reviewed-intake-required",
    responseKind: "gated",
    promptKind: "setup_request",
    intentFamily: "site_kit",
    title: "Reviewed site-builder intake required",
    answer:
      "Use the reviewed LLM Guide site-builder intake before planning or applying a full site.",
    summary: "Direct siteKit planning was blocked before executable action planning.",
    confidence: 0.5,
    assumptions: [`Original prompt: ${describePlannerPrompt(prompt)}`],
    questions: [
      {
        id: "reviewed-site-builder-intake",
        label: "Start the reviewed site-builder intake",
        description:
          "Complete the guided intake, confirm the final review, run a dry-run, then execute.",
        required: true,
      },
    ],
    actions: [],
  });

const withProviderPlannerMetadata = (
  plan: AssistantActionPlan,
  input: AssistantProviderDraftPlanInput
) =>
  normalizeAssistantActionPlan({
    ...plan,
    metadata: {
      planner: "provider",
      providerDraftUsed: true,
      providerId: input.provider?.id ?? null,
    },
    assumptions: [
      ...plan.assumptions,
      "Provider path used deterministic local policy routing or recovery.",
    ],
  });

const withProviderLocalPolicyMetadata = (
  plan: AssistantActionPlan,
  input: AssistantProviderDraftPlanInput,
  assumption: string
) =>
  normalizeAssistantActionPlan({
    ...plan,
    metadata: {
      ...plan.metadata,
      planner: "provider",
      providerDraftUsed: false,
      providerId: input.provider?.id ?? null,
    },
    assumptions: [...plan.assumptions, assumption],
  });

const shouldReturnLocalPolicyPlanBeforeProvider = (plan: AssistantActionPlan) =>
  (plan.responseKind === "action_plan" && plan.actions.length > 0) ||
  (plan.responseKind === "inspection" && (plan.inspection?.candidates.length ?? 0) > 0) ||
  (plan.intentId.startsWith("site-builder-follow-up-") &&
    (plan.responseKind === "needs_input" || plan.responseKind === "gated") &&
    plan.actions.length === 0);

const requiresProviderLlmGate = (context: AssistantActionContext | undefined) =>
  context?.includeResourceCatalog === true || Boolean(context?.siteKit);

const getActiveBasicSiteBuilderIntakeSession = (context: AssistantActionContext | undefined) => {
  const activeSession = context?.siteBuilderIntakeState?.activeSession;
  return activeSession?.mode === "basic" ? activeSession : null;
};

const getActiveAdvancedSiteBuilderIntakeSession = (context: AssistantActionContext | undefined) => {
  const activeSession = context?.siteBuilderIntakeState?.activeSession;
  return activeSession?.mode === "advanced" ? activeSession : null;
};

const shouldStartAdvancedSiteBuilderGuide = (context: AssistantActionContext | undefined) =>
  context?.siteBuilderIntakeState?.requestedMode === "advanced";

const buildReviewedSiteBuilderIntakePlan = (
  session: NonNullable<AssistantActionContext["siteBuilderIntakeState"]>["activeSession"]
) => {
  if (!session) return null;
  const normalizedSession = normalizeAssistantSiteBuilderIntakeSession(session);
  if (normalizedSession.facts?.readyForExecution !== true) return null;
  const request = buildActionPlanRequestFromReviewedIntake(normalizedSession);
  return normalizeAssistantActionPlan(buildSiteKitActionPlan(request.context.siteKit));
};

const buildPreferredBlueprintSetupPlan = (input: {
  prompt: string;
  context: AssistantActionContext | undefined;
}) => {
  const trustedContext = sanitizeAssistantPlanningContext(input.context);
  const context = buildAssistantAdminContext(trustedContext);
  const routedClassification = buildRoutedClassification(input.prompt, context, trustedContext);
  if (
    routedClassification.promptKind !== "setup_request" ||
    routedClassification.intentFamily === "unknown"
  ) {
    return null;
  }

  const composedPlan = buildBlueprintComposerSetupPlan({
    prompt: input.prompt,
    context: {
      ...trustedContext,
      page: context.route ?? trustedContext?.page,
      locale: context.locale ?? trustedContext?.locale,
      resourceCatalog: context.resourceCatalog ?? trustedContext?.resourceCatalog,
      runtimeSnapshot: context.runtimeSnapshot ?? trustedContext?.runtimeSnapshot,
      activeSurface: context.activeSurface ?? trustedContext?.activeSurface,
      planningState: context.planningState ?? trustedContext?.planningState,
    },
    promptKind: routedClassification.promptKind,
    intentFamily: routedClassification.intentFamily,
    normalizedPrompt: routedClassification.normalizedPrompt,
  });

  if (!composedPlan) return null;

  return finalizeAssistantPlan(
    {
      prompt: input.prompt,
      context: trustedContext,
    },
    context,
    routedClassification,
    normalizeAssistantActionPlan({
      ...composedPlan,
      metadata: {
        ...composedPlan.metadata,
        planner: "local",
        providerDraftUsed: false,
      },
      assumptions: [
        ...composedPlan.assumptions,
        "Supported mixed setup requests use the composed blueprint planner before provider drafting.",
      ],
    })
  );
};

export const planAssistantActions = (input: AssistantActionPlanInput): AssistantActionPlan => {
  const directSiteKitRequested = Boolean(input.context?.siteKit);
  const trustedContext = sanitizeAssistantPlanningContext(input.context);
  const normalizedInput = {
    ...input,
    context: trustedContext,
  } satisfies AssistantActionPlanInput;
  const context = buildAssistantAdminContext(trustedContext);
  const activeAdvancedIntakeSession = getActiveAdvancedSiteBuilderIntakeSession(trustedContext);
  const activeBasicIntakeSession = getActiveBasicSiteBuilderIntakeSession(trustedContext);

  const routedClassification = buildRoutedClassification(input.prompt, context, trustedContext);
  const intentFamily = routedClassification.intentFamily;
  const classification = routedClassification;
  if (!classification.normalizedPrompt) {
    return finalizeAssistantPlan(
      normalizedInput,
      context,
      routedClassification,
      buildClarifyingPlan(input.prompt, context, routedClassification)
    );
  }

  if (activeAdvancedIntakeSession) {
    const reviewedPlan = buildReviewedSiteBuilderIntakePlan(activeAdvancedIntakeSession);
    if (reviewedPlan) return reviewedPlan;

    return finalizeAssistantPlan(
      normalizedInput,
      context,
      routedClassification,
      buildAdvancedSiteBuilderNeedsInputPlan({ session: activeAdvancedIntakeSession })
    );
  }

  if (activeBasicIntakeSession) {
    const reviewedPlan = buildReviewedSiteBuilderIntakePlan(activeBasicIntakeSession);
    if (reviewedPlan) return reviewedPlan;

    return finalizeAssistantPlan(
      normalizedInput,
      context,
      routedClassification,
      buildBasicSiteBuilderNeedsInputPlan({ session: activeBasicIntakeSession })
    );
  }

  if (directSiteKitRequested) {
    return buildReviewedSiteBuilderIntakeRequiredPlan(input.prompt);
  }

  if (shouldStartAdvancedSiteBuilderGuide(trustedContext)) {
    return finalizeAssistantPlan(
      normalizedInput,
      context,
      routedClassification,
      buildAdvancedSiteBuilderNeedsInputPlan({})
    );
  }

  if (
    shouldStartBasicSiteBuilderGuide({
      prompt: input.prompt,
      context: trustedContext,
    })
  ) {
    return finalizeAssistantPlan(
      normalizedInput,
      context,
      routedClassification,
      buildBasicSiteBuilderNeedsInputPlan({})
    );
  }

  if (
    intentFamily === "service_business_full_site" &&
    classification.promptKind !== "docs_question"
  ) {
    const setupClassification = {
      ...routedClassification,
      promptKind: "setup_request" as const,
    };
    const readyPlan = buildReadyPlanForIntentFamily(intentFamily, {
      promptKind: setupClassification.promptKind,
      intentFamily,
      normalizedPrompt: classification.normalizedPrompt,
    });
    if (readyPlan)
      return finalizeAssistantPlan(normalizedInput, context, setupClassification, readyPlan);
  }

  const siteBuilderFollowUpOptions: GenericCmsOperationPlanOptions = {
    siteBuilderFollowUp: classification.promptKind === "refinement_request",
  };

  if (shouldTreatUnknownSetupAsExistingSiteFollowUp(classification, context)) {
    const setupFollowUpPlan = buildDraftlessSiteBuilderFollowUpPlan(input.prompt, context, {
      siteBuilderFollowUp: true,
    });
    if (setupFollowUpPlan) {
      return finalizeAssistantPlan(
        normalizedInput,
        context,
        {
          ...routedClassification,
          promptKind: "refinement_request",
          intentFamily: "site_kit",
        },
        setupFollowUpPlan
      );
    }
  }

  if (classification.promptKind !== "setup_request") {
    const planningStatePlan = buildGenericCmsPlanningStateFollowUpPlan(input.prompt, context);
    if (planningStatePlan)
      return finalizeAssistantPlan(
        normalizedInput,
        context,
        routedClassification,
        planningStatePlan
      );
    const genericInspectionPlan = buildGenericCmsInspectionOperationPlan(input.prompt, context);
    if (genericInspectionPlan) {
      return finalizeAssistantPlan(
        normalizedInput,
        context,
        routedClassification,
        genericInspectionPlan
      );
    }
    const draft = buildCmsOperationDraftFromPrompt(input.prompt, context);
    const preferBlueprintRefinement =
      classification.promptKind === "refinement_request" &&
      intentFamily !== "unknown" &&
      draft?.resourceKind === "form" &&
      draft.operation === "create";
    if (!preferBlueprintRefinement) {
      const genericMutationPlan = buildLocalPolicyOperationPlan(
        input.prompt,
        context,
        siteBuilderFollowUpOptions
      );
      if (genericMutationPlan) {
        return finalizeAssistantPlan(
          normalizedInput,
          context,
          routedClassification,
          genericMutationPlan
        );
      }
    }
    const draftlessFollowUpPlan = buildDraftlessSiteBuilderFollowUpPlan(
      input.prompt,
      context,
      siteBuilderFollowUpOptions
    );
    if (draftlessFollowUpPlan) {
      return finalizeAssistantPlan(
        normalizedInput,
        context,
        routedClassification,
        draftlessFollowUpPlan
      );
    }
  }
  if (classification.promptKind === "docs_question") {
    return finalizeAssistantPlan(
      normalizedInput,
      context,
      routedClassification,
      buildDocsGuidancePlan(input.prompt, context)
    );
  }
  if (classification.promptKind === "setup_request" && intentFamily !== "unknown") {
    if (intentFamily === "service_business_full_site") {
      const readyPlan = buildReadyPlanForIntentFamily(intentFamily, {
        promptKind: classification.promptKind,
        intentFamily,
        normalizedPrompt: classification.normalizedPrompt,
      });
      if (readyPlan)
        return finalizeAssistantPlan(normalizedInput, context, routedClassification, readyPlan);
    }

    const setupPolicyPlan = buildLocalPolicyOperationPlan(input.prompt, context);
    if (setupPolicyPlan)
      return finalizeAssistantPlan(normalizedInput, context, routedClassification, setupPolicyPlan);

    const composedPlan = buildBlueprintComposerSetupPlan({
      prompt: input.prompt,
      context: {
        ...trustedContext,
        page: context.route ?? trustedContext?.page,
        locale: context.locale ?? trustedContext?.locale,
        resourceCatalog: context.resourceCatalog ?? trustedContext?.resourceCatalog,
        runtimeSnapshot: context.runtimeSnapshot ?? trustedContext?.runtimeSnapshot,
        activeSurface: context.activeSurface ?? trustedContext?.activeSurface,
        planningState: context.planningState ?? trustedContext?.planningState,
      },
      promptKind: classification.promptKind,
      intentFamily,
      normalizedPrompt: classification.normalizedPrompt,
    });
    if (composedPlan) {
      return finalizeAssistantPlan(normalizedInput, context, routedClassification, composedPlan);
    }

    const readyPlan = buildReadyPlanForIntentFamily(intentFamily, {
      promptKind: classification.promptKind,
      intentFamily,
      normalizedPrompt: classification.normalizedPrompt,
    });
    if (readyPlan)
      return finalizeAssistantPlan(normalizedInput, context, routedClassification, readyPlan);
  }

  if (classification.promptKind === "refinement_request" && intentFamily !== "unknown") {
    const refinementPlan = buildRefinementPlanForIntentFamily(input.prompt, intentFamily, {
      promptKind: classification.promptKind,
      intentFamily,
    });
    if (refinementPlan)
      return finalizeAssistantPlan(normalizedInput, context, routedClassification, refinementPlan);
  }

  return finalizeAssistantPlan(
    normalizedInput,
    context,
    routedClassification,
    buildClarifyingPlan(input.prompt, context, routedClassification)
  );
};

export const planAssistantActionsWithProviderDraft = async (
  input: AssistantProviderDraftPlanInput
): Promise<AssistantActionPlan> => {
  const directSiteKitRequested = Boolean(input.context?.siteKit);
  const trustedContext = sanitizeAssistantPlanningContext(input.context);
  const context = buildAssistantAdminContext(trustedContext);
  const routedClassification = buildRoutedClassification(input.prompt, context, trustedContext);
  if (getActiveAdvancedSiteBuilderIntakeSession(trustedContext)) {
    return planAssistantActions({ prompt: input.prompt, context: trustedContext });
  }
  if (getActiveBasicSiteBuilderIntakeSession(trustedContext)) {
    return planAssistantActions({ prompt: input.prompt, context: trustedContext });
  }
  if (shouldStartAdvancedSiteBuilderGuide(trustedContext)) {
    return planAssistantActions({ prompt: input.prompt, context: trustedContext });
  }
  if (directSiteKitRequested) {
    return planAssistantActions({ prompt: input.prompt, context: input.context });
  }
  if (
    shouldStartBasicSiteBuilderGuide({
      prompt: input.prompt,
      context: trustedContext,
    })
  ) {
    return planAssistantActions({ prompt: input.prompt, context: trustedContext });
  }
  if (requiresProviderLlmGate(trustedContext) && (!input.llmAvailable || !input.provider)) {
    throw new Error("assistant_llm_unavailable");
  }
  if (
    routedClassification.intentFamily === "service_business_full_site" &&
    routedClassification.promptKind !== "docs_question"
  ) {
    return planAssistantActions({ ...input, context: trustedContext });
  }
  const preferredBlueprintSetupPlan = buildPreferredBlueprintSetupPlan({
    prompt: input.prompt,
    context: trustedContext,
  });
  if (preferredBlueprintSetupPlan) {
    return preferredBlueprintSetupPlan;
  }

  if (shouldTreatUnknownSetupAsExistingSiteFollowUp(routedClassification, context)) {
    const followUpPlan = buildDraftlessSiteBuilderFollowUpPlan(input.prompt, context, {
      siteBuilderFollowUp: true,
    });
    if (followUpPlan) {
      return finalizeAssistantPlan(
        { ...input, context: trustedContext },
        context,
        {
          ...routedClassification,
          promptKind: "refinement_request",
          intentFamily: "site_kit",
        },
        withProviderLocalPolicyMetadata(
          followUpPlan,
          input,
          "Provider path used deterministic local follow-up target routing before provider drafting."
        )
      );
    }
  }

  const planningStatePlan = buildGenericCmsPlanningStateFollowUpPlan(input.prompt, context);
  if (planningStatePlan) {
    return finalizeAssistantPlan(
      { ...input, context: trustedContext },
      context,
      routedClassification,
      withProviderLocalPolicyMetadata(
        planningStatePlan,
        input,
        "Provider path used deterministic local planning-state follow-up routing before provider drafting."
      )
    );
  }
  if (isBroadDestructivePromptWithPolicy(input.prompt)) {
    return planAssistantActions({ ...input, context: trustedContext });
  }
  const localPolicyPlan = buildLocalPolicyOperationPlan(input.prompt, context, {
    siteBuilderFollowUp: routedClassification.promptKind === "refinement_request",
  });
  if (localPolicyPlan && shouldReturnLocalPolicyPlanBeforeProvider(localPolicyPlan)) {
    const plan = withProviderLocalPolicyMetadata(
      localPolicyPlan,
      input,
      "Provider path used deterministic local policy routing before provider drafting."
    );
    return finalizeAssistantPlan(input, context, routedClassification, plan);
  }

  if (!input.llmAvailable || !input.provider) {
    return planAssistantActions({ ...input, context: trustedContext });
  }

  try {
    const promptPackage = buildProviderPlanningPromptPackage({
      prompt: input.prompt,
      context: trustedContext,
      evidence: input.evidence,
    });
    const response = await input.provider.complete({
      systemPrompt: providerPlannerSystemPrompt,
      userMessage: JSON.stringify(promptPackage),
      snippets: [],
      ...chooseProviderResponseContract(
        resolveModelCapabilityProfile({
          provider: input.provider.id,
          model: input.providerModel ?? "",
        }),
        {
          name: "cms_operation_draft",
          schema: buildCmsOperationDraftJsonSchema(assistantOperationPolicy),
          strict: true,
        }
      ),
      limits: buildProviderRequestLimits(input.limits),
    });
    const draft = parseProviderDraftJson(response.text);
    const operationPlan = tryPlanProviderCmsOperationDraft(input, draft);
    if (operationPlan) {
      if (
        operationPlan.responseKind === "inspection" &&
        (operationPlan.inspection?.candidates.length ?? 0) === 0
      ) {
        const localInspection = buildGenericCmsInspectionOperationPlan(input.prompt, context);
        if (localInspection && (localInspection.inspection?.candidates.length ?? 0) > 0) {
          return finalizeAssistantPlan(
            { ...input, context: trustedContext },
            context,
            routedClassification,
            withProviderPlannerMetadata(localInspection, input)
          );
        }
        const recoveredPlan = buildProviderLocalRecoveryPlan(input);
        if (recoveredPlan)
          return finalizeAssistantPlan(
            { ...input, context: trustedContext },
            context,
            routedClassification,
            recoveredPlan
          );
      }
      if (
        operationPlan.status === "needs_input" ||
        (operationPlan.actions.length === 0 &&
          operationPlan.responseKind !== "inspection" &&
          operationPlan.responseKind !== "docs")
      ) {
        const recoveredPlan = buildProviderLocalRecoveryPlan(input);
        if (recoveredPlan)
          return finalizeAssistantPlan(
            { ...input, context: trustedContext },
            context,
            routedClassification,
            recoveredPlan
          );
      }
      if (
        isBroadDestructivePromptWithPolicy(input.prompt) &&
        hasDestructiveActions(operationPlan)
      ) {
        return planAssistantActions({ ...input, context: trustedContext });
      }
      if (hasDestructiveCountMismatchWithPolicy(input.prompt, operationPlan)) {
        return planAssistantActions({ ...input, context: trustedContext });
      }
      if (hasActionCountMismatchWithPolicy(input.prompt, operationPlan)) {
        return planAssistantActions({ ...input, context: trustedContext });
      }
      if (hasPromptDestructiveIntentMismatchWithPolicy(input.prompt, operationPlan)) {
        return planAssistantActions({ ...input, context: trustedContext });
      }
      if (hasPromptImpliedFieldMismatchWithPolicy(input.prompt, operationPlan)) {
        return planAssistantActions({ ...input, context: trustedContext });
      }
      return finalizeAssistantPlan(
        { ...input, context: trustedContext },
        context,
        routedClassification,
        withProviderPlannerMetadata(operationPlan, input)
      );
    }
    return planAssistantActions({ ...input, context: trustedContext });
  } catch {
    return planAssistantActions({ ...input, context: trustedContext });
  }
};
