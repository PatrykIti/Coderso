import type {
  AssistantActionContext,
  AssistantActionPlan,
  AssistantActivePageSurfaceContext,
  AssistantActiveSurfaceBlockSummary,
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
import {
  buildCmsOperationDraftFromPrompt,
  type CmsResolvedTargetCandidate,
  resolveCmsOperationTargets,
} from "./cmsTargetResolver";
import { mapCmsOperationToActionPlan } from "./cmsOperationActionMapper";
import type {
  AssistantContentTypeSummary,
  AssistantCustomScreenSummary,
  AssistantFormSummary,
  AssistantListingQuerySummary,
  AssistantListingTemplateSummary,
  AssistantMenuItemSummary,
  AssistantMenuSummary,
  AssistantReferencedWidgetTemplateBlockSummary,
  AssistantReferencedWidgetTemplateSummary,
  AssistantSeoDocumentSummary,
} from "./adminContextTypes";
import {
  type CmsOperationDraft,
  buildCmsOperationDraftJsonSchema,
  normalizeCmsOperationDraft,
  repairCmsOperationDraft,
} from "./cmsOperationDraftSchema";
import {
  chooseProviderResponseContract,
  resolveModelCapabilityProfile,
} from "./modelCapabilities";
import { buildCmsOperationDraftFromPlanningState } from "./cmsPlanningState";

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

const pageDeleteKeywords = [
  "page",
  "pages",
  "strona",
  "strone",
  "stronę",
  "strony",
  "stronie",
];

const includesPageUpdateTargetKeyword = (normalizedPrompt: string) =>
  /\b(page|title|slug|url|nav|navigation|template|publish|published|draft)\b/.test(normalizedPrompt) ||
  includesAny(normalizedPrompt, [
    "strona",
    "strone",
    "stronę",
    "tytul",
    "tytuł",
    "nawigacji",
    "szablon",
    "opublikuj",
    "szkic",
  ]);

const widgetTemplateDeleteKeywords = [
  "widget template",
  "widget templates",
  "template widget",
  "template widgets",
  "szablon widgetu",
  "szablon widgetów",
  "szablony widgetow",
  "szablony widgetów",
  "template",
  "templates",
];

const entryDeleteKeywords = [
  "entry",
  "entries",
  "record",
  "records",
  "wpis",
  "wpisy",
  "rekord",
  "rekordy",
];

const contentTypeDeleteKeywords = [
  "content type",
  "content model",
  "typ tresci",
  "typ treści",
  "model tresci",
  "model treści",
];

const formArchiveKeywords = [
  "archive",
  "archived",
  "archiwizuj",
  "zarchiwizuj",
  "archiwum",
  "hide",
  "ukryj",
  "disable",
  "wylacz",
  "wyłącz",
];

const includesFormTargetKeyword = (normalizedPrompt: string) =>
  /\bforms?\b/.test(normalizedPrompt) ||
  includesAny(normalizedPrompt, ["formularz", "formularze", "formularza"]);

const menuItemDeleteKeywords = [
  "menu item",
  "menu items",
  "pozycje menu",
  "pozycje w menu",
  "pozycje z menu",
  "element menu",
  "elementy menu",
  "link menu",
  "link z menu",
];

const seoDocumentDeleteKeywords = [
  "seo",
  "seo document",
  "seo documents",
  "meta",
  "meta title",
  "meta description",
];

const listingQueryDeleteKeywords = [
  "listing query",
  "listing queries",
  "query listingu",
  "zapytanie listingu",
  "zapytanie listingowe",
  "kwerenda listingowa",
];

const listingTemplateDeleteKeywords = [
  "listing template",
  "listing templates",
  "template listingu",
  "template listingowy",
  "szablon listingu",
  "szablon listingowy",
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

const extractQuotedValues = (prompt: string) =>
  [...prompt.matchAll(/['"“”]([^'"“”]+)['"“”]/g)]
    .map((match) => match[1]?.trim())
    .filter((value): value is string => Boolean(value));

const extractFirstNumber = (normalizedPrompt: string) => {
  const match = normalizedPrompt.match(/\b(\d{1,4})\b/);
  return match?.[1] ? Number(match[1]) : null;
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

const buildPageDeleteNeedsInputPlan = (
  prompt: string,
  reason: string
): AssistantActionPlan => ({
  id: "plan-page-delete-needs-input",
  status: "needs_input",
  intentId: "page-delete-needs-input",
  promptKind: "refinement_request",
  intentFamily: "unknown",
  title: "Page delete needs an active page",
  answer: [
    "I can delete pages only through a reviewed typed action plan.",
    "",
    reason,
    "",
    "Open the page you want to delete or provide an exact page target.",
  ].join("\n"),
  summary: "Page deletion could not be planned safely from the current context.",
  confidence: 0.4,
  assumptions: [`Original prompt: ${prompt.trim() || "empty prompt"}`],
  questions: [
    {
      id: "page-delete-target",
      label: "Which exact page should I delete?",
      description: "Open the page in the editor or provide an exact page target.",
      required: true,
    },
  ],
  actions: [],
});

const buildPageDeletePlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  normalizedPrompt: string
): AssistantActionPlan | null => {
  if (!isLikelyDeletePrompt(normalizedPrompt) || !includesAny(normalizedPrompt, pageDeleteKeywords)) {
    return null;
  }
  if (context.activeSurface?.kind !== "page") {
    return buildPageDeleteNeedsInputPlan(
      prompt,
      "The prompt asks to delete a page, but there is no active page context."
    );
  }
  const page = context.activeSurface.page;
  return {
    id: `plan-page-delete-${page.id}`,
    status: "ready",
    intentId: "page-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: `Delete ${page.title}`,
    answer: "I can delete the active page through the reviewed LLM Guide action flow.",
    summary: `Delete active page "${page.title}" (${page.slug}).`,
    confidence: 0.86,
    assumptions: [
      "The target page is resolved from the active admin page context.",
      "Dry-run must be reviewed before deletion.",
    ],
    questions: [],
    actions: [
      {
        id: `page-delete-${page.id}`,
        type: "page.delete",
        title: `Delete ${page.title}`,
        description: "Delete the active page selected from admin context.",
        input: {
          id: page.id,
          title: page.title,
          slug: page.slug,
          expectedStatus: page.status,
        },
      },
    ],
  };
};

const buildPageUpdateNeedsInputPlan = (
  prompt: string,
  reason: string
): AssistantActionPlan => ({
  id: "plan-page-update-needs-input",
  status: "needs_input",
  intentId: "page-update-needs-input",
  promptKind: "refinement_request",
  intentFamily: "unknown",
  title: "Page update needs an active page",
  answer: [
    "I can update page metadata only through a reviewed typed action plan.",
    "",
    reason,
    "",
    "Open the page editor and provide one exact metadata or settings change.",
  ].join("\n"),
  summary: "Page metadata update could not be planned safely from the current context.",
  confidence: 0.4,
  assumptions: [`Original prompt: ${prompt.trim() || "empty prompt"}`],
  questions: [
    {
      id: "page-update-target",
      label: "Which exact page metadata should I change?",
      description: "Open the page and provide the exact title, slug, status, template, or navigation change.",
      required: true,
    },
  ],
  actions: [],
});

const normalizePlannedSlug = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const extractFirstQuotedText = (prompt: string) => extractQuotedPrefix(prompt);

const extractPageUpdatePatch = (prompt: string, normalizedPrompt: string) => {
  const quoted = extractFirstQuotedText(prompt);
  const patch: {
    title?: string;
    slug?: string;
    status?: "draft" | "published";
    settings?: {
      template?: string;
      showInNav?: boolean;
    };
  } = {};

  if (quoted && /\b(slug|url)\b/.test(normalizedPrompt)) {
    const slug = normalizePlannedSlug(quoted);
    if (slug) patch.slug = slug;
  } else if (quoted && (/\btitle\b/.test(normalizedPrompt) || includesAny(normalizedPrompt, ["tytul", "tytuł"]))) {
    patch.title = quoted;
  } else if (quoted && (/\btemplate\b/.test(normalizedPrompt) || includesAny(normalizedPrompt, ["szablon"]))) {
    patch.settings = { ...(patch.settings ?? {}), template: quoted };
  }

  if (includesAny(normalizedPrompt, ["opublikuj", "publish", "published"])) {
    patch.status = "published";
  }
  if (includesAny(normalizedPrompt, ["draft", "szkic", "unpublish", "wycofaj publikacje"])) {
    patch.status = "draft";
  }
  if (includesAny(normalizedPrompt, ["ukryj", "hide"]) && includesAny(normalizedPrompt, ["nav", "nawigacji", "menu"])) {
    patch.settings = { ...(patch.settings ?? {}), showInNav: false };
  }
  if (includesAny(normalizedPrompt, ["pokaz", "pokaż", "show"]) && includesAny(normalizedPrompt, ["nav", "nawigacji", "menu"])) {
    patch.settings = { ...(patch.settings ?? {}), showInNav: true };
  }

  return Object.keys(patch).length > 0 ? patch : null;
};

const buildPageUpdatePlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  normalizedPrompt: string
): AssistantActionPlan | null => {
  if (
    isLikelyDeletePrompt(normalizedPrompt) ||
    !includesPageUpdateTargetKeyword(normalizedPrompt)
  ) {
    return null;
  }
  if (context.activeSurface?.kind !== "page") {
    return buildPageUpdateNeedsInputPlan(
      prompt,
      "The prompt asks to edit page metadata, but there is no active page context."
    );
  }
  const patch = extractPageUpdatePatch(prompt, normalizedPrompt);
  if (!patch) {
    return buildPageUpdateNeedsInputPlan(
      prompt,
      "The prompt did not include a supported page metadata/settings patch."
    );
  }
  const page = context.activeSurface.page;
  return {
    id: `plan-page-update-${page.id}`,
    status: "ready",
    intentId: "page-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: `Update ${page.title}`,
    answer: "I can update the active page metadata through the reviewed LLM Guide action flow.",
    summary: `Update metadata/settings for active page "${page.title}" (${page.slug}).`,
    confidence: 0.82,
    assumptions: [
      "The target page is resolved from the active admin page context.",
      "The update preserves unrelated page data and blocks.",
    ],
    questions: [],
    actions: [
      {
        id: `page-update-${page.id}`,
        type: "page.update",
        title: `Update ${page.title}`,
        description: "Update active page metadata/settings selected from admin context.",
        input: {
          id: page.id,
          title: page.title,
          slug: page.slug,
          expectedStatus: page.status,
          patch,
        },
      },
    ],
  };
};

const pageWidgetPatchKeywords = [
  "widget",
  "block",
  "blok",
  "bloku",
  "selected block",
  "wybrany blok",
];

const pageTemplateBridgeKeywords = [
  "template-section",
  "template section",
  "template",
  "szablon",
  "section",
  "sekcja",
  "cta",
  "button",
  "przycisk",
  "headline",
  "naglowek",
  "nagłówek",
  "etykiet",
  "tekst",
];

const pageInstanceTargetKeywords = [
  "only this page",
  "this page only",
  "current page",
  "page instance",
  "instance only",
  "locally",
  "local page",
  "only here",
  "tylko ta strona",
  "tylko tej strony",
  "tylko na tej stronie",
  "tylko tutaj",
  "lokalnie",
  "na tej stronie",
  "nie w szablonie",
  "bez zmiany szablonu",
];

const reusableTemplateTargetKeywords = [
  "reusable template",
  "template everywhere",
  "template-wide",
  "every page",
  "all pages",
  "everywhere",
  "global",
  "globally",
  "w szablonie",
  "dla wszystkich stron",
  "na wszystkich stronach",
  "wszystkich stronach",
  "kazdej stronie",
  "każdej stronie",
  "wszedzie",
  "wszędzie",
  "globalnie",
];

const resolvePageWidgetPatchPath = (normalizedPrompt: string, blockType?: string | null) => {
  const promptWithoutQuotedValues = normalizedPrompt.replace(/['"“”][^'"“”]+['"“”]/g, " ");
  if (/\bheadline\b/.test(promptWithoutQuotedValues)) {
    return ["headline"];
  }
  if (/\btitle\b/.test(promptWithoutQuotedValues) || includesAny(promptWithoutQuotedValues, ["tytul", "tytuł", "naglowek", "nagłówek"])) {
    return blockType === "hero" ? ["headline"] : ["title"];
  }
  if (/\blabel\b/.test(promptWithoutQuotedValues) || includesAny(promptWithoutQuotedValues, ["etykiet", "cta", "button", "przycisk"])) {
    return ["label"];
  }
  if (/\bdescription\b/.test(promptWithoutQuotedValues) || includesAny(promptWithoutQuotedValues, ["opis"])) {
    return ["description"];
  }
  if (/\btext\b/.test(promptWithoutQuotedValues) || includesAny(promptWithoutQuotedValues, ["tekst"])) {
    return ["text"];
  }
  return null;
};

const buildPageWidgetPatchNeedsInputPlan = (
  prompt: string,
  reason: string
): AssistantActionPlan => ({
  id: "plan-page-widget-patch-needs-input",
  status: "needs_input",
  intentId: "page-widget-patch-needs-input",
  promptKind: "refinement_request",
  intentFamily: "unknown",
  title: "Page widget patch needs a selected block",
  answer: [
    "I can patch page widget block data only through a reviewed typed action plan.",
    "",
    reason,
    "",
    "Select one page block and provide the exact supported field value.",
  ].join("\n"),
  summary: "Page widget patch could not be planned safely from the current context.",
  confidence: 0.4,
  assumptions: [`Original prompt: ${prompt.trim() || "empty prompt"}`],
  questions: [
    {
      id: "page-widget-patch-target",
      label: "Which selected block field should I update?",
      description: "Select a block and provide a supported field such as title, label, description, or text.",
      required: true,
    },
  ],
  actions: [],
});

const buildSelectedPageWidgetPatchPlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  normalizedPrompt: string
): AssistantActionPlan => {
  if (context.activeSurface?.kind !== "page") {
    return buildPageWidgetPatchNeedsInputPlan(
      prompt,
      "The prompt asks to edit a page widget block, but there is no active page context."
    );
  }
  const blockId = context.activeSurface.selectedBlockId;
  if (!blockId) {
    return buildPageWidgetPatchNeedsInputPlan(
      prompt,
      "No selected block was provided in the active page context."
    );
  }
  const block = context.activeSurface.blocks.find((entry) => entry.id === blockId) ?? null;
  const dataPath = resolvePageWidgetPatchPath(normalizedPrompt, block?.type);
  const value = extractFirstQuotedText(prompt);
  if (!dataPath || !value) {
    return buildPageWidgetPatchNeedsInputPlan(
      prompt,
      "The prompt did not include a supported block field and quoted value."
    );
  }
  const page = context.activeSurface.page;
  return {
    id: `plan-page-widget-patch-${page.id}-${blockId}`,
    status: "ready",
    intentId: "page-widget-patch",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: `Patch ${block?.label ?? blockId}`,
    answer: "I can patch the selected page widget block through the reviewed LLM Guide action flow.",
    summary: `Patch selected block "${block?.label ?? blockId}" on page "${page.title}".`,
    confidence: 0.78,
    assumptions: [
      "The target page is resolved from the active admin page context.",
      "The selected block must still exist and the data path must already exist at dry-run/execute time.",
    ],
    questions: [],
    actions: [
      {
        id: `page-widget-patch-${blockId}`,
        type: "page.widget.patch",
        title: `Patch ${block?.label ?? blockId}`,
        description: "Patch selected page widget block data.",
        input: {
          pageSlug: page.slug,
          operation: "patch-data",
          blockId,
          expectedBlockType: block?.type ?? null,
          dataPath,
          value,
        },
      },
    ],
  };
};

const buildPageWidgetPatchPlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  normalizedPrompt: string
): AssistantActionPlan | null => {
  if (
    isLikelyDeletePrompt(normalizedPrompt) ||
    !includesAny(normalizedPrompt, pageWidgetPatchKeywords)
  ) {
    return null;
  }
  return buildSelectedPageWidgetPatchPlan(prompt, context, normalizedPrompt);
};

const buildPageTemplateTargetNeedsInputPlan = (
  prompt: string,
  reason: string
): AssistantActionPlan => ({
  id: "plan-page-template-target-needs-input",
  status: "needs_input",
  intentId: "page-template-target-needs-input",
  promptKind: "refinement_request",
  intentFamily: "unknown",
  title: "Page or reusable template target needs confirmation",
  answer: [
    "I can see this page uses a reusable widget template.",
    "",
    reason,
    "",
    "Confirm whether this should change only the current page instance or the reusable template that can affect every page using it.",
  ].join("\n"),
  summary: "Template-backed page edit could not be planned before the target was confirmed.",
  confidence: 0.42,
  assumptions: [`Original prompt: ${prompt.trim() || "empty prompt"}`],
  questions: [
    {
      id: "page-template-target",
      label: "Should I edit only this page instance or the reusable template?",
      description:
        "Choose page instance for a local page change, or reusable template for a change that can affect every page using that template.",
      required: true,
    },
  ],
  actions: [],
});

const normalizePromptToken = (value: string | null) =>
  value ? normalizeAssistantPlannerPrompt(value) : null;

const resolveReferencedTemplateTarget = (
  surface: AssistantActivePageSurfaceContext,
  selectedBlock: AssistantActiveSurfaceBlockSummary | null
) => {
  const templates = surface.referencedTemplates ?? [];
  const selectedTemplateId = selectedBlock?.templateId;
  const candidates = selectedTemplateId
    ? templates.filter((template) => template.id === selectedTemplateId)
    : templates;
  return candidates.length === 1 ? candidates[0] : null;
};

const resolveReferencedTemplateBlockTarget = (
  template: AssistantReferencedWidgetTemplateSummary,
  normalizedPrompt: string
): { block: AssistantReferencedWidgetTemplateBlockSummary; dataPath: string[] } | null => {
  const candidates = template.blocks
    .map((block) => {
      const dataPath = resolvePageWidgetPatchPath(normalizedPrompt, block.type);
      if (!dataPath) return null;
      const field = dataPath[dataPath.length - 1];
      if (!field || !block.dataKeys.includes(field)) return null;
      return { block, dataPath };
    })
    .filter((entry): entry is { block: AssistantReferencedWidgetTemplateBlockSummary; dataPath: string[] } =>
      Boolean(entry)
    );

  const labelMatches = candidates.filter((entry) => {
    const label = normalizePromptToken(entry.block.label);
    return label ? normalizedPrompt.includes(label) : false;
  });
  if (labelMatches.length === 1) return labelMatches[0];
  return candidates.length === 1 ? candidates[0] : null;
};

const buildReusableTemplateBlockPatchFromPagePlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  normalizedPrompt: string,
  template: AssistantReferencedWidgetTemplateSummary
): AssistantActionPlan => {
  const value = extractFirstQuotedText(prompt);
  const blockTarget = resolveReferencedTemplateBlockTarget(template, normalizedPrompt);
  if (!value || !blockTarget) {
    return buildPageTemplateTargetNeedsInputPlan(
      prompt,
      "The prompt points at the reusable template, but I could not resolve exactly one nested template block and supported field from the current template summary."
    );
  }
  const page = context.activeSurface?.kind === "page" ? context.activeSurface.page : null;
  return {
    id: `plan-page-referenced-template-block-patch-${template.id}-${blockTarget.block.id}`,
    status: "ready",
    intentId: "page-referenced-template-block-patch",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: `Patch ${blockTarget.block.label ?? blockTarget.block.id}`,
    answer:
      "I can patch the referenced reusable widget template through the reviewed LLM Guide action flow.",
    summary: `Patch block "${blockTarget.block.label ?? blockTarget.block.id}" in reusable template "${template.name}" referenced by page "${page?.title ?? "active page"}".`,
    confidence: 0.76,
    assumptions: [
      "The reusable template target is resolved from server-hydrated active page template references.",
      "This can affect every page that uses the reusable widget template.",
      "The selected template block must still exist and the data path must already exist at dry-run/execute time.",
    ],
    questions: [],
    actions: [
      {
        id: `widget-template-block-patch-${blockTarget.block.id}`,
        type: "widget-template.block.patch",
        title: `Patch ${blockTarget.block.label ?? blockTarget.block.id}`,
        description: "Patch a reusable widget template block referenced by the active page.",
        input: {
          id: template.id,
          name: template.name,
          expectedStatus: template.status,
          blockId: blockTarget.block.id,
          expectedBlockType: blockTarget.block.type,
          dataPath: blockTarget.dataPath,
          value,
        },
      },
    ],
  };
};

const buildPageTemplateTargetResolutionPlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  normalizedPrompt: string
): AssistantActionPlan | null => {
  if (isLikelyDeletePrompt(normalizedPrompt) || context.activeSurface?.kind !== "page") {
    return null;
  }
  const surface = context.activeSurface;
  if (!surface.referencedTemplates?.length) return null;

  const selectedBlock = surface.selectedBlockId
    ? surface.blocks.find((entry) => entry.id === surface.selectedBlockId) ?? null
    : null;
  const selectedTemplateSection = selectedBlock?.type === "template-section";
  const mentionsTemplateBridge =
    includesAny(normalizedPrompt, pageTemplateBridgeKeywords) ||
    includesAny(normalizedPrompt, pageWidgetPatchKeywords);
  const value = extractFirstQuotedText(prompt);
  const selectedDataPath = resolvePageWidgetPatchPath(normalizedPrompt, selectedBlock?.type);
  const wantsPageInstance = includesAny(normalizedPrompt, pageInstanceTargetKeywords);
  const wantsReusableTemplate = includesAny(normalizedPrompt, reusableTemplateTargetKeywords);

  if (!mentionsTemplateBridge || !value || !selectedDataPath) return null;
  if (!selectedTemplateSection && !wantsReusableTemplate) return null;

  if (wantsPageInstance && !wantsReusableTemplate) {
    return buildSelectedPageWidgetPatchPlan(prompt, context, normalizedPrompt);
  }

  const referencedTemplate = resolveReferencedTemplateTarget(surface, selectedBlock);
  if (wantsReusableTemplate && !wantsPageInstance) {
    if (!referencedTemplate) {
      return buildPageTemplateTargetNeedsInputPlan(
        prompt,
        "The prompt points at the reusable template, but the active page references more than one template or none could be resolved for the selected block."
      );
    }
    return buildReusableTemplateBlockPatchFromPagePlan(
      prompt,
      context,
      normalizedPrompt,
      referencedTemplate
    );
  }

  if (selectedTemplateSection || wantsPageInstance || wantsReusableTemplate) {
    return buildPageTemplateTargetNeedsInputPlan(
      prompt,
      wantsPageInstance && wantsReusableTemplate
        ? "The prompt includes both page-instance and reusable-template target signals."
        : "The selected page block is backed by a reusable widget template, so this edit could target either the page instance or the template."
    );
  }

  return null;
};

const buildWidgetTemplateDeleteNeedsInputPlan = (
  prompt: string,
  reason: string
): AssistantActionPlan => ({
  id: "plan-widget-template-delete-needs-input",
  status: "needs_input",
  intentId: "widget-template-delete-needs-input",
  promptKind: "refinement_request",
  intentFamily: "unknown",
  title: "Widget template delete needs an active template",
  answer: [
    "I can delete widget templates only through a reviewed typed action plan.",
    "",
    reason,
    "",
    "Open the widget template you want to delete or provide an exact template target.",
  ].join("\n"),
  summary: "Widget template deletion could not be planned safely from the current context.",
  confidence: 0.4,
  assumptions: [`Original prompt: ${prompt.trim() || "empty prompt"}`],
  questions: [
    {
      id: "widget-template-delete-target",
      label: "Which exact widget template should I delete?",
      description: "Open the template in the editor or provide an exact template target.",
      required: true,
    },
  ],
  actions: [],
});

const buildWidgetTemplateDeletePlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  normalizedPrompt: string
): AssistantActionPlan | null => {
  if (
    !isLikelyDeletePrompt(normalizedPrompt) ||
    !includesAny(normalizedPrompt, widgetTemplateDeleteKeywords)
  ) {
    return null;
  }
  if (context.activeSurface?.kind !== "widget-template") {
    return buildWidgetTemplateDeleteNeedsInputPlan(
      prompt,
      "The prompt asks to delete a widget template, but there is no active widget template context."
    );
  }
  const template = context.activeSurface.template;
  return {
    id: `plan-widget-template-delete-${template.id}`,
    status: "ready",
    intentId: "widget-template-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: `Delete ${template.name}`,
    answer: "I can delete the active widget template through the reviewed LLM Guide action flow.",
    summary: `Delete active widget template "${template.name}".`,
    confidence: 0.86,
    assumptions: [
      "The target widget template is resolved from the active admin template context.",
      "Dry-run must be reviewed before deletion because reusable templates can affect multiple pages.",
    ],
    questions: [],
    actions: [
      {
        id: `widget-template-delete-${template.id}`,
        type: "widget-template.delete",
        title: `Delete ${template.name}`,
        description: "Delete the active reusable widget template selected from admin context.",
        input: {
          id: template.id,
          name: template.name,
          expectedStatus: template.status,
          expectedCategory: template.category,
        },
      },
    ],
  };
};

const widgetTemplateEditKeywords = [
  "widget template",
  "template widget",
  "szablon widgetu",
  "reusable template",
  "template",
  "szablon",
];

const buildWidgetTemplateEditNeedsInputPlan = (
  prompt: string,
  reason: string
): AssistantActionPlan => ({
  id: "plan-widget-template-edit-needs-input",
  status: "needs_input",
  intentId: "widget-template-edit-needs-input",
  promptKind: "refinement_request",
  intentFamily: "unknown",
  title: "Widget template edit needs an active template",
  answer: [
    "I can edit reusable widget templates only through a reviewed typed action plan.",
    "",
    reason,
    "",
    "Open the widget template editor and provide one exact metadata/settings or selected block change.",
  ].join("\n"),
  summary: "Widget template edit could not be planned safely from the current context.",
  confidence: 0.4,
  assumptions: [`Original prompt: ${prompt.trim() || "empty prompt"}`],
  questions: [
    {
      id: "widget-template-edit-target",
      label: "Should I edit the reusable template or the page instance?",
      description:
        "Open the reusable template editor for template-wide changes, or stay on the page editor for page-instance changes.",
      required: true,
    },
  ],
  actions: [],
});

const buildWidgetTemplateMetadataPatch = (prompt: string, normalizedPrompt: string) => {
  const quoted = extractFirstQuotedText(prompt);
  const patch: {
    name?: string;
    description?: string | null;
    category?: string;
    status?: "draft" | "published";
    settings?: {
      wrapperContainer?: "default" | "narrow" | "full";
      sectionGap?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
    };
  } = {};
  if (quoted && (/\bname\b/.test(normalizedPrompt) || includesAny(normalizedPrompt, ["nazwa", "nazwe", "nazwę"]))) {
    patch.name = quoted;
  } else if (quoted && (/\bdescription\b/.test(normalizedPrompt) || includesAny(normalizedPrompt, ["opis"]))) {
    patch.description = quoted;
  } else if (quoted && (/\bcategory\b/.test(normalizedPrompt) || includesAny(normalizedPrompt, ["kategoria", "kategorię"]))) {
    patch.category = quoted;
  } else if (quoted && (/\bcontainer\b/.test(normalizedPrompt) || includesAny(normalizedPrompt, ["szerokosc", "szerokość"]))) {
    if (quoted === "default" || quoted === "narrow" || quoted === "full") {
      patch.settings = { ...(patch.settings ?? {}), wrapperContainer: quoted };
    }
  } else if (quoted && (/\bgap\b/.test(normalizedPrompt) || includesAny(normalizedPrompt, ["odstep", "odstęp"]))) {
    if (["none", "xs", "sm", "md", "lg", "xl", "2xl"].includes(quoted)) {
      patch.settings = {
        ...(patch.settings ?? {}),
        sectionGap: quoted as "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl",
      };
    }
  }
  if (includesAny(normalizedPrompt, ["publish", "published", "opublikuj"])) {
    patch.status = "published";
  }
  if (includesAny(normalizedPrompt, ["draft", "szkic"])) {
    patch.status = "draft";
  }
  return Object.keys(patch).length > 0 ? patch : null;
};

const buildWidgetTemplateEditPlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  normalizedPrompt: string
): AssistantActionPlan | null => {
  if (
    isLikelyDeletePrompt(normalizedPrompt) ||
    !includesAny(normalizedPrompt, widgetTemplateEditKeywords)
  ) {
    return null;
  }
  if (context.activeSurface?.kind !== "widget-template") {
    return buildWidgetTemplateEditNeedsInputPlan(
      prompt,
      "The prompt asks to edit a reusable template, but there is no active widget template context."
    );
  }

  const template = context.activeSurface.template;
  const selectedBlockId = context.activeSurface.selectedBlockId;
  const block = selectedBlockId
    ? context.activeSurface.blocks.find((entry) => entry.id === selectedBlockId) ?? null
    : null;
  const dataPath =
    selectedBlockId && includesAny(normalizedPrompt, pageWidgetPatchKeywords)
      ? resolvePageWidgetPatchPath(normalizedPrompt, block?.type)
      : null;
  const value = dataPath ? extractFirstQuotedText(prompt) : null;
  if (selectedBlockId && block && dataPath && value) {
    return {
      id: `plan-widget-template-block-patch-${template.id}-${selectedBlockId}`,
      status: "ready",
      intentId: "widget-template-block-patch",
      promptKind: "refinement_request",
      intentFamily: "unknown",
      title: `Patch ${block.label ?? selectedBlockId}`,
      answer:
        "I can patch the selected reusable widget template block through the reviewed LLM Guide action flow.",
      summary: `Patch selected block "${block.label ?? selectedBlockId}" in reusable template "${template.name}".`,
      confidence: 0.78,
      assumptions: [
        "The target reusable widget template is resolved from active template context.",
        "The selected block must still exist and the data path must already exist at dry-run/execute time.",
      ],
      questions: [],
      actions: [
        {
          id: `widget-template-block-patch-${selectedBlockId}`,
          type: "widget-template.block.patch",
          title: `Patch ${block.label ?? selectedBlockId}`,
          description: "Patch selected reusable widget template block data.",
          input: {
            id: template.id,
            name: template.name,
            expectedStatus: template.status,
            blockId: selectedBlockId,
            expectedBlockType: block.type,
            dataPath,
            value,
          },
        },
      ],
    };
  }

  const patch = buildWidgetTemplateMetadataPatch(prompt, normalizedPrompt);
  if (!patch) {
    return buildWidgetTemplateEditNeedsInputPlan(
      prompt,
      "The prompt did not include a supported reusable template metadata/settings or selected block patch."
    );
  }
  return {
    id: `plan-widget-template-update-${template.id}`,
    status: "ready",
    intentId: "widget-template-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: `Update ${template.name}`,
    answer:
      "I can update the active reusable widget template through the reviewed LLM Guide action flow.",
    summary: `Update metadata/settings for reusable widget template "${template.name}".`,
    confidence: 0.82,
    assumptions: [
      "The target reusable widget template is resolved from active template context.",
      "The update preserves unrelated blocks and settings.",
    ],
    questions: [],
    actions: [
      {
        id: `widget-template-update-${template.id}`,
        type: "widget-template.update",
        title: `Update ${template.name}`,
        description: "Update reusable widget template metadata/settings.",
        input: {
          id: template.id,
          name: template.name,
          expectedStatus: template.status,
          expectedCategory: template.category,
          patch,
        },
      },
    ],
  };
};

const customScreenEditKeywords = [
  "custom screen",
  "custom screens",
  "screen",
  "screens",
  "ekran",
  "ekranu",
];

const buildCustomScreenEditNeedsInputPlan = (
  prompt: string,
  reason: string
): AssistantActionPlan => ({
  id: "plan-custom-screen-edit-needs-input",
  status: "needs_input",
  intentId: "custom-screen-edit-needs-input",
  promptKind: "refinement_request",
  intentFamily: "unknown",
  title: "Custom screen edit needs an active screen",
  answer: [
    "I can edit custom screens only through a reviewed typed action plan.",
    "",
    reason,
    "",
    "Open the custom screen builder and provide one exact metadata/sidebar/binding or selected block change.",
  ].join("\n"),
  summary: "Custom screen edit could not be planned safely from the current context.",
  confidence: 0.4,
  assumptions: [`Original prompt: ${prompt.trim() || "empty prompt"}`],
  questions: [
    {
      id: "custom-screen-edit-target",
      label: "Which exact custom screen field should I update?",
      description: "Open the custom screen builder and provide a supported field or selected block patch.",
      required: true,
    },
  ],
  actions: [],
});

const buildCustomScreenMetadataPatch = (prompt: string, normalizedPrompt: string) => {
  const quoted = extractFirstQuotedText(prompt);
  const patch: {
    name?: string;
    status?: "draft" | "active";
    showInSidebar?: boolean;
    sidebarLabel?: string | null;
  } = {};
  if (quoted && (/\bname\b/.test(normalizedPrompt) || includesAny(normalizedPrompt, ["nazwa", "nazwe", "nazwę"]))) {
    patch.name = quoted;
  } else if (quoted && includesAny(normalizedPrompt, ["sidebar", "menu"])) {
    patch.sidebarLabel = quoted;
  }
  if (includesAny(normalizedPrompt, ["active", "aktywuj"])) patch.status = "active";
  if (includesAny(normalizedPrompt, ["draft", "szkic"])) patch.status = "draft";
  if (includesAny(normalizedPrompt, ["show", "pokaz", "pokaż"]) && includesAny(normalizedPrompt, ["sidebar", "menu"])) {
    patch.showInSidebar = true;
  }
  if (includesAny(normalizedPrompt, ["hide", "ukryj"]) && includesAny(normalizedPrompt, ["sidebar", "menu"])) {
    patch.showInSidebar = false;
  }
  return Object.keys(patch).length > 0 ? patch : null;
};

const buildCustomScreenEditPlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  normalizedPrompt: string
): AssistantActionPlan | null => {
  if (
    isLikelyDeletePrompt(normalizedPrompt) ||
    !includesAny(normalizedPrompt, customScreenEditKeywords)
  ) {
    return null;
  }
  if (context.activeSurface?.kind !== "custom-screen") {
    return buildCustomScreenEditNeedsInputPlan(
      prompt,
      "The prompt asks to edit a custom screen, but there is no active custom screen context."
    );
  }
  const screen = context.activeSurface.screen;
  const selectedBlockId = context.activeSurface.selectedBlockId;
  const block = selectedBlockId
    ? context.activeSurface.blocks.find((entry) => entry.id === selectedBlockId) ?? null
    : null;
  const dataPath =
    selectedBlockId && block && includesAny(normalizedPrompt, pageWidgetPatchKeywords)
      ? resolvePageWidgetPatchPath(normalizedPrompt, block.type)
      : null;
  const value = dataPath ? extractFirstQuotedText(prompt) : null;
  if (selectedBlockId && block && dataPath && value) {
    return {
      id: `plan-custom-screen-widget-patch-${screen.id}-${selectedBlockId}`,
      status: "ready",
      intentId: "custom-screen-widget-patch",
      promptKind: "refinement_request",
      intentFamily: "unknown",
      title: `Patch ${block.label ?? selectedBlockId}`,
      answer:
        "I can patch the selected custom screen widget through the reviewed LLM Guide action flow.",
      summary: `Patch selected block "${block.label ?? selectedBlockId}" in custom screen "${screen.name}".`,
      confidence: 0.78,
      assumptions: [
        "The target custom screen is resolved from active custom screen context.",
        "The selected block must still exist and the data path must already exist at dry-run/execute time.",
      ],
      questions: [],
      actions: [
        {
          id: `custom-screen-widget-patch-${selectedBlockId}`,
          type: "custom-screen.widget.patch",
          title: `Patch ${block.label ?? selectedBlockId}`,
          description: "Patch selected custom screen widget block data.",
          input: {
            id: screen.id,
            name: screen.name,
            expectedStatus: screen.status,
            blockId: selectedBlockId,
            expectedBlockType: block.type,
            dataPath,
            value,
          },
        },
      ],
    };
  }
  const patch = buildCustomScreenMetadataPatch(prompt, normalizedPrompt);
  if (!patch) {
    return buildCustomScreenEditNeedsInputPlan(
      prompt,
      "The prompt did not include a supported custom screen metadata/sidebar or selected block patch."
    );
  }
  return {
    id: `plan-custom-screen-update-${screen.id}`,
    status: "ready",
    intentId: "custom-screen-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: `Update ${screen.name}`,
    answer:
      "I can update the active custom screen through the reviewed LLM Guide action flow.",
    summary: `Update metadata/sidebar config for custom screen "${screen.name}".`,
    confidence: 0.82,
    assumptions: [
      "The target custom screen is resolved from active custom screen context.",
      "The update preserves unrelated blocks and bindings.",
    ],
    questions: [],
    actions: [
      {
        id: `custom-screen-update-${screen.id}`,
        type: "custom-screen.update",
        title: `Update ${screen.name}`,
        description: "Update custom screen metadata/sidebar config.",
        input: {
          id: screen.id,
          name: screen.name,
          expectedStatus: screen.status,
          expectedContentTypeId: screen.contentTypeId,
          patch,
        },
      },
    ],
  };
};

const readRouteSegmentsFromContext = (context: ReturnType<typeof buildAssistantAdminContext>) =>
  (context.route ?? "")
    .split("/")
    .filter(Boolean);

const readActiveEntryTarget = (context: ReturnType<typeof buildAssistantAdminContext>) => {
  const selected = context.runtimeSnapshot?.selectedResource;
  if (selected?.kind !== "entry" && selected?.kind !== "custom-screen-entry") return null;
  const segments = readRouteSegmentsFromContext(context);
  const entriesIndex = segments.findIndex((segment) => segment === "entries");
  const contentTypeSlug =
    selected.kind === "entry" && entriesIndex >= 0 ? segments[entriesIndex + 1] ?? null : null;
  return {
    id: selected.id,
    contentTypeSlug,
  };
};

const buildEntryDeleteNeedsInputPlan = (
  prompt: string,
  reason: string
): AssistantActionPlan => ({
  id: "plan-entry-delete-needs-input",
  status: "needs_input",
  intentId: "entry-delete-needs-input",
  promptKind: "refinement_request",
  intentFamily: "unknown",
  title: "Entry delete needs an active record",
  answer: [
    "I can delete entries only through a reviewed typed action plan.",
    "",
    reason,
    "",
    "Open the entry you want to delete or provide an exact record target.",
  ].join("\n"),
  summary: "Entry deletion could not be planned safely from the current context.",
  confidence: 0.4,
  assumptions: [`Original prompt: ${prompt.trim() || "empty prompt"}`],
  questions: [
    {
      id: "entry-delete-target",
      label: "Which exact entry should I delete?",
      description: "Open the entry in the editor or provide an exact record target.",
      required: true,
    },
  ],
  actions: [],
});

const buildEntryDeletePlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  normalizedPrompt: string
): AssistantActionPlan | null => {
  if (!isLikelyDeletePrompt(normalizedPrompt) || !includesAny(normalizedPrompt, entryDeleteKeywords)) {
    return null;
  }
  const target = readActiveEntryTarget(context);
  if (!target) {
    return buildEntryDeleteNeedsInputPlan(
      prompt,
      "The prompt asks to delete an entry, but there is no active entry context."
    );
  }
  return {
    id: `plan-entry-delete-${target.id}`,
    status: "ready",
    intentId: "entry-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Delete active entry",
    answer: "I can delete the active entry through the reviewed LLM Guide action flow.",
    summary: "Delete the active entry.",
    confidence: 0.82,
    assumptions: [
      "The target entry is resolved from the active admin route context.",
      "Dry-run must be reviewed before deletion.",
    ],
    questions: [],
    actions: [
      {
        id: `entry-delete-${target.id}`,
        type: "entry.delete",
        title: "Delete active entry",
        description: "Delete the active entry selected from admin context.",
        input: {
          id: target.id,
          contentTypeSlug: target.contentTypeSlug,
        },
      },
    ],
  };
};

const sortContentTypesByName = (types: AssistantContentTypeSummary[]) =>
  [...types].sort((left, right) => left.name.localeCompare(right.name));

const buildContentTypeDeleteNeedsInputPlan = (
  prompt: string,
  reason: string
): AssistantActionPlan => ({
  id: "plan-content-type-delete-needs-input",
  status: "needs_input",
  intentId: "content-type-delete-needs-input",
  promptKind: "refinement_request",
  intentFamily: "unknown",
  title: "Content type delete needs a safe target",
  answer: [
    "I can delete content types only through a reviewed typed action plan.",
    "",
    reason,
    "",
    "Provide an exact content type name/slug or remove dependent entries first.",
  ].join("\n"),
  summary: "Content type deletion could not be planned safely from the current context.",
  confidence: 0.4,
  assumptions: [`Original prompt: ${prompt.trim() || "empty prompt"}`],
  questions: [
    {
      id: "content-type-delete-target",
      label: "Which exact content type should I delete?",
      description:
        "Provide an exact content type name/slug and make sure dependencies are handled.",
      required: true,
    },
  ],
  actions: [],
});

const findContentTypeDeleteTarget = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>
) => {
  const selected = context.runtimeSnapshot?.selectedResource;
  const contentTypes = context.resourceCatalog?.contentTypes ?? [];
  if (selected?.kind === "content-type") {
    return contentTypes.find((entry) => entry.id === selected.id) ?? null;
  }
  const target = extractQuotedPrefix(prompt);
  if (!target) return null;
  const normalizedTarget = normalizeAssistantPlannerPrompt(target);
  return (
    sortContentTypesByName(contentTypes).find((entry) =>
      [entry.id, entry.slug, entry.name]
        .map((value) => normalizeAssistantPlannerPrompt(value))
        .includes(normalizedTarget)
    ) ?? null
  );
};

const buildContentTypeDeletePlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  normalizedPrompt: string
): AssistantActionPlan | null => {
  if (!isLikelyDeletePrompt(normalizedPrompt) || !includesAny(normalizedPrompt, contentTypeDeleteKeywords)) {
    return null;
  }
  const target = findContentTypeDeleteTarget(prompt, context);
  if (!target) {
    return buildContentTypeDeleteNeedsInputPlan(
      prompt,
      "The prompt did not resolve to one exact content type from the server-side catalog."
    );
  }
  if ((target.entryCount ?? 0) > 0) {
    return buildContentTypeDeleteNeedsInputPlan(
      prompt,
      `Content type "${target.name}" still has ${target.entryCount} entries.`
    );
  }
  return {
    id: `plan-content-type-delete-${target.id}`,
    status: "ready",
    intentId: "content-type-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: `Delete ${target.name}`,
    answer: "I can delete the selected content type through the reviewed LLM Guide action flow.",
    summary: `Delete content type "${target.name}" (${target.slug}).`,
    confidence: 0.82,
    assumptions: [
      "The target content type is resolved from the server-side resource catalog.",
      "The catalog reports zero entries for this content type.",
    ],
    questions: [],
    actions: [
      {
        id: `content-type-delete-${target.id}`,
        type: "content-type.delete",
        title: `Delete ${target.name}`,
        description: "Delete a content type selected from the server-side resource catalog.",
        input: {
          id: target.id,
          name: target.name,
          slug: target.slug,
          expectedEntryCount: target.entryCount ?? 0,
        },
      },
    ],
  };
};

const sortListingQueriesByName = (queries: AssistantListingQuerySummary[]) =>
  [...queries].sort((left, right) => left.name.localeCompare(right.name));

const sortListingTemplatesBySlug = (templates: AssistantListingTemplateSummary[]) =>
  [...templates].sort((left, right) => left.slug.localeCompare(right.slug));

const buildListingQueryDeleteNeedsInputPlan = (
  prompt: string,
  reason: string
): AssistantActionPlan => ({
  id: "plan-listing-query-delete-needs-input",
  status: "needs_input",
  intentId: "listing-query-delete-needs-input",
  promptKind: "refinement_request",
  intentFamily: "unknown",
  title: "Listing query delete needs a safe target",
  answer: [
    "I can delete listing queries only through a reviewed typed action plan.",
    "",
    reason,
    "",
    "Open the listing query editor or provide an exact listing query name.",
  ].join("\n"),
  summary: "Listing query deletion could not be planned safely from the current context.",
  confidence: 0.4,
  assumptions: [`Original prompt: ${prompt.trim() || "empty prompt"}`],
  questions: [
    {
      id: "listing-query-delete-target",
      label: "Which exact listing query should I delete?",
      description: "Provide an exact listing query name so I can build a reviewed dry-run plan.",
      required: true,
    },
  ],
  actions: [],
});

const buildListingTemplateDeleteNeedsInputPlan = (
  prompt: string,
  reason: string
): AssistantActionPlan => ({
  id: "plan-listing-template-delete-needs-input",
  status: "needs_input",
  intentId: "listing-template-delete-needs-input",
  promptKind: "refinement_request",
  intentFamily: "unknown",
  title: "Listing template delete needs a safe target",
  answer: [
    "I can delete listing templates only through a reviewed typed action plan.",
    "",
    reason,
    "",
    "Provide an exact listing template name or slug.",
  ].join("\n"),
  summary: "Listing template deletion could not be planned safely from the current context.",
  confidence: 0.4,
  assumptions: [`Original prompt: ${prompt.trim() || "empty prompt"}`],
  questions: [
    {
      id: "listing-template-delete-target",
      label: "Which exact listing template should I delete?",
      description: "Provide an exact listing template name or slug for review.",
      required: true,
    },
  ],
  actions: [],
});

const findListingQueryDeleteTargets = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>
) => {
  const selected = context.runtimeSnapshot?.selectedResource;
  const queries = context.resourceCatalog?.listings.queries ?? [];
  if (selected?.kind === "listing-query") {
    const match = queries.find((entry) => entry.id === selected.id) ?? null;
    return match ? [match] : [];
  }
  const target = extractQuotedPrefix(prompt);
  if (!target) return [];
  const normalizedTarget = normalizeAssistantPlannerPrompt(target);
  return sortListingQueriesByName(queries).filter((entry) =>
    [entry.id, entry.name]
      .map((value) => normalizeAssistantPlannerPrompt(value))
      .includes(normalizedTarget)
  );
};

const findListingTemplateDeleteTargets = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>
) => {
  const selected = context.runtimeSnapshot?.selectedResource;
  const templates = context.resourceCatalog?.listings.templates ?? [];
  if (selected?.kind === "listing-template") {
    const match = templates.find((entry) => entry.id === selected.id) ?? null;
    return match ? [match] : [];
  }
  const target = extractQuotedPrefix(prompt);
  if (!target) return [];
  const normalizedTarget = normalizeAssistantPlannerPrompt(target);
  return sortListingTemplatesBySlug(templates).filter((entry) =>
    [entry.id, entry.name, entry.slug]
      .map((value) => normalizeAssistantPlannerPrompt(value))
      .includes(normalizedTarget)
  );
};

const buildListingQueryDeletePlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  normalizedPrompt: string
): AssistantActionPlan | null => {
  if (
    !isLikelyDeletePrompt(normalizedPrompt) ||
    !includesAny(normalizedPrompt, listingQueryDeleteKeywords)
  ) {
    return null;
  }
  const targets = findListingQueryDeleteTargets(prompt, context);
  if (targets.length !== 1) {
    return buildListingQueryDeleteNeedsInputPlan(
      prompt,
      targets.length > 1
        ? "The prompt matched more than one listing query."
        : "The prompt did not resolve to one exact listing query from active context or the server-side catalog."
    );
  }
  const target = targets[0];
  if (!target) return null;
  return {
    id: `plan-listing-query-delete-${target.id}`,
    status: "ready",
    intentId: "listing-query-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: `Delete ${target.name}`,
    answer: "I can delete the selected listing query through the reviewed LLM Guide action flow.",
    summary: `Delete listing query "${target.name}".`,
    confidence: 0.82,
    assumptions: [
      "The target listing query is resolved from active context or the server-side resource catalog.",
      "Dry-run checks page and widget template references before deletion.",
    ],
    questions: [],
    actions: [
      {
        id: `listing-query-delete-${target.id}`,
        type: "listing-query.delete",
        title: `Delete ${target.name}`,
        description: "Delete a listing query selected from trusted admin context.",
        input: {
          id: target.id,
          name: target.name,
        },
      },
    ],
  };
};

const buildListingTemplateDeletePlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  normalizedPrompt: string
): AssistantActionPlan | null => {
  if (
    !isLikelyDeletePrompt(normalizedPrompt) ||
    !includesAny(normalizedPrompt, listingTemplateDeleteKeywords)
  ) {
    return null;
  }
  const targets = findListingTemplateDeleteTargets(prompt, context);
  if (targets.length !== 1) {
    return buildListingTemplateDeleteNeedsInputPlan(
      prompt,
      targets.length > 1
        ? "The prompt matched more than one listing template."
        : "The prompt did not resolve to one exact listing template from active context or the server-side catalog."
    );
  }
  const target = targets[0];
  if (!target) return null;
  return {
    id: `plan-listing-template-delete-${target.id}`,
    status: "ready",
    intentId: "listing-template-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: `Delete ${target.name}`,
    answer:
      "I can delete the selected listing template through the reviewed LLM Guide action flow.",
    summary: `Delete listing template "${target.name}" (${target.slug}).`,
    confidence: 0.82,
    assumptions: [
      "The target listing template is resolved from active context or the server-side resource catalog.",
      "Dry-run checks page and widget template references before deletion.",
    ],
    questions: [],
    actions: [
      {
        id: `listing-template-delete-${target.id}`,
        type: "listing-template.delete",
        title: `Delete ${target.name}`,
        description: "Delete a listing template selected from trusted admin context.",
        input: {
          id: target.id,
          name: target.name,
          slug: target.slug,
          expectedLayout: target.layout,
        },
      },
    ],
  };
};

const sortFormsByName = (forms: AssistantFormSummary[]) =>
  [...forms].sort((left, right) => left.name.localeCompare(right.name));

const buildFormDeleteNeedsInputPlan = (
  prompt: string,
  reason: string
): AssistantActionPlan => ({
  id: "plan-form-delete-needs-input",
  status: "needs_input",
  intentId: "form-delete-needs-input",
  promptKind: "refinement_request",
  intentFamily: "unknown",
  title: "Form delete needs a safe target",
  answer: [
    "I can delete or archive forms only through a reviewed typed action plan.",
    "",
    reason,
    "",
    "Open the form editor or provide an exact form name or slug.",
  ].join("\n"),
  summary: "Form deletion could not be planned safely from the current context.",
  confidence: 0.4,
  assumptions: [`Original prompt: ${prompt.trim() || "empty prompt"}`],
  questions: [
    {
      id: "form-delete-target",
      label: "Which exact form should I delete or archive?",
      description: "Provide an exact form name or slug so I can build a reviewed dry-run plan.",
      required: true,
    },
  ],
  actions: [],
});

const findFormOperationTargets = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>
) => {
  const selected = context.runtimeSnapshot?.selectedResource;
  const forms = context.resourceCatalog?.forms ?? [];
  if (selected?.kind === "form") {
    const match = forms.find((entry) => entry.id === selected.id) ?? null;
    return match ? [match] : [];
  }
  const target = extractQuotedPrefix(prompt);
  if (!target) return [];
  const normalizedTarget = normalizeAssistantPlannerPrompt(target);
  return sortFormsByName(forms).filter((entry) =>
    [entry.id, entry.slug ?? "", entry.name]
      .map((value) => normalizeAssistantPlannerPrompt(value))
      .includes(normalizedTarget)
  );
};

const buildFormOperationPlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  normalizedPrompt: string
): AssistantActionPlan | null => {
  const isArchive = includesAny(normalizedPrompt, formArchiveKeywords);
  const isDelete = isLikelyDeletePrompt(normalizedPrompt);
  if ((!isDelete && !isArchive) || !includesFormTargetKeyword(normalizedPrompt)) {
    return null;
  }
  const targets = findFormOperationTargets(prompt, context);
  if (targets.length !== 1) {
    return buildFormDeleteNeedsInputPlan(
      prompt,
      targets.length > 1
        ? "The prompt matched more than one form."
        : "The prompt did not resolve to one exact form from active context or the server-side catalog."
    );
  }
  const target = targets[0];
  if (!target?.slug) {
    return buildFormDeleteNeedsInputPlan(
      prompt,
      "The selected form target is missing a stable slug in the server-side catalog."
    );
  }
  const actionType = isArchive ? "form.archive" : "form.delete";
  const operationLabel = isArchive ? "Archive" : "Delete";
  return {
    id: `plan-${actionType.replace(".", "-")}-${target.id}`,
    status: "ready",
    intentId: isArchive ? "form-archive" : "form-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: `${operationLabel} ${target.name}`,
    answer: `I can ${operationLabel.toLowerCase()} the selected form through the reviewed LLM Guide action flow.`,
    summary: `${operationLabel} form "${target.name}" (${target.slug}).`,
    confidence: 0.82,
    assumptions: [
      "The target form is resolved from active context or the server-side resource catalog.",
      isArchive
        ? "Archiving preserves submission history and disables the active form surface."
        : "Dry-run checks submission count before hard deletion.",
    ],
    questions: [],
    actions: [
      {
        id: `${actionType.replace(".", "-")}-${target.id}`,
        type: actionType,
        title: `${operationLabel} ${target.name}`,
        description: `${operationLabel} a form selected from trusted admin context.`,
        input: {
          id: target.id,
          name: target.name,
          slug: target.slug,
          expectedStatus: target.status,
        },
      },
    ],
  };
};

const sortMenusByName = (menus: AssistantMenuSummary[]) =>
  [...menus].sort((left, right) => left.name.localeCompare(right.name));

const sortSeoDocumentsByTarget = (documents: AssistantSeoDocumentSummary[]) =>
  [...documents].sort((left, right) =>
    `${left.targetType}:${left.slug ?? left.targetId}`.localeCompare(
      `${right.targetType}:${right.slug ?? right.targetId}`
    )
  );

const buildMenuItemDeleteNeedsInputPlan = (
  prompt: string,
  reason: string
): AssistantActionPlan => ({
  id: "plan-menu-item-delete-needs-input",
  status: "needs_input",
  intentId: "menu-item-delete-needs-input",
  promptKind: "refinement_request",
  intentFamily: "unknown",
  title: "Menu item delete needs a safe target",
  answer: [
    "I can delete menu items only through a reviewed typed action plan.",
    "",
    reason,
    "",
    "Provide an exact menu item label, href, or item id.",
  ].join("\n"),
  summary: "Menu item deletion could not be planned safely from the current context.",
  confidence: 0.4,
  assumptions: [`Original prompt: ${prompt.trim() || "empty prompt"}`],
  questions: [
    {
      id: "menu-item-delete-target",
      label: "Which exact menu item should I delete?",
      description: "Provide the exact menu item label, href, or item id.",
      required: true,
    },
  ],
  actions: [],
});

const buildSeoDocumentDeleteNeedsInputPlan = (
  prompt: string,
  reason: string
): AssistantActionPlan => ({
  id: "plan-seo-document-delete-needs-input",
  status: "needs_input",
  intentId: "seo-document-delete-needs-input",
  promptKind: "refinement_request",
  intentFamily: "unknown",
  title: "SEO document delete needs a safe target",
  answer: [
    "I can delete SEO documents only through a reviewed typed action plan.",
    "",
    reason,
    "",
    "Provide an exact SEO document slug, target title, or document id.",
  ].join("\n"),
  summary: "SEO document deletion could not be planned safely from the current context.",
  confidence: 0.4,
  assumptions: [`Original prompt: ${prompt.trim() || "empty prompt"}`],
  questions: [
    {
      id: "seo-document-delete-target",
      label: "Which exact SEO document should I delete?",
      description: "Provide the exact SEO slug, target title, or document id.",
      required: true,
    },
  ],
  actions: [],
});

const findMenuItemDeleteTargets = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>
) => {
  const selected = context.runtimeSnapshot?.selectedResource;
  const menus = context.resourceCatalog?.menus ?? [];
  const matches: Array<{ menu: AssistantMenuSummary; item: AssistantMenuItemSummary }> = [];
  const selectedId = selected?.kind === "menu-item" ? selected.id : null;
  const quotedTarget = extractQuotedPrefix(prompt);
  const normalizedTarget = quotedTarget ? normalizeAssistantPlannerPrompt(quotedTarget) : null;

  for (const menu of sortMenusByName(menus)) {
    for (const item of menu.items) {
      if (selectedId && item.id === selectedId) {
        matches.push({ menu, item });
        continue;
      }
      if (!normalizedTarget) continue;
      const candidates = [item.id, item.label, item.href ?? ""].map((value) =>
        normalizeAssistantPlannerPrompt(value)
      );
      if (candidates.includes(normalizedTarget)) {
        matches.push({ menu, item });
      }
    }
  }

  return matches;
};

const findSeoDocumentDeleteTargets = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>
) => {
  const selected = context.runtimeSnapshot?.selectedResource;
  const documents = context.resourceCatalog?.seoDocuments ?? [];
  if (selected?.kind === "seo-document") {
    const match = documents.find((entry) => entry.id === selected.id) ?? null;
    return match ? [match] : [];
  }
  const target = extractQuotedPrefix(prompt);
  if (!target) return [];
  const normalizedTarget = normalizeAssistantPlannerPrompt(target);
  return sortSeoDocumentsByTarget(documents).filter((entry) =>
    [entry.id, entry.targetId, entry.slug ?? "", entry.targetTitle ?? "", entry.title ?? ""]
      .map((value) => normalizeAssistantPlannerPrompt(value))
      .includes(normalizedTarget)
  );
};

const buildMenuItemDeletePlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  normalizedPrompt: string
): AssistantActionPlan | null => {
  if (
    !isLikelyDeletePrompt(normalizedPrompt) ||
    !includesAny(normalizedPrompt, menuItemDeleteKeywords)
  ) {
    return null;
  }
  const targets = findMenuItemDeleteTargets(prompt, context);
  if (targets.length !== 1) {
    return buildMenuItemDeleteNeedsInputPlan(
      prompt,
      targets.length > 1
        ? "The prompt matched more than one menu item."
        : "The prompt did not resolve to one exact menu item from the server-side catalog."
    );
  }
  const target = targets[0];
  if (!target) return null;
  return {
    id: `plan-menu-item-delete-${target.item.id}`,
    status: "ready",
    intentId: "menu-item-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: `Delete ${target.item.label}`,
    answer: "I can delete the selected menu item through the reviewed LLM Guide action flow.",
    summary: `Delete menu item "${target.item.label}" from menu "${target.menu.name}".`,
    confidence: 0.82,
    assumptions: [
      "The target menu item is resolved from the server-side resource catalog.",
      "Deletion uses the menu tree service and preserves unrelated menu items.",
    ],
    questions: [],
    actions: [
      {
        id: `menu-item-delete-${target.item.id}`,
        type: "menu.item.delete",
        title: `Delete ${target.item.label}`,
        description: "Delete a menu item selected from trusted admin context.",
        input: {
          menuId: target.menu.id,
          itemId: target.item.id,
          label: target.item.label,
          expectedHref: target.item.href,
          expectedParentId: target.item.parentId,
        },
      },
    ],
  };
};

const buildSeoDocumentDeletePlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  normalizedPrompt: string
): AssistantActionPlan | null => {
  if (
    !isLikelyDeletePrompt(normalizedPrompt) ||
    !includesAny(normalizedPrompt, seoDocumentDeleteKeywords)
  ) {
    return null;
  }
  const targets = findSeoDocumentDeleteTargets(prompt, context);
  if (targets.length !== 1) {
    return buildSeoDocumentDeleteNeedsInputPlan(
      prompt,
      targets.length > 1
        ? "The prompt matched more than one SEO document."
        : "The prompt did not resolve to one exact SEO document from active context or the server-side catalog."
    );
  }
  const target = targets[0];
  if (!target) return null;
  return {
    id: `plan-seo-document-delete-${target.id}`,
    status: "ready",
    intentId: "seo-document-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: `Delete SEO for ${target.targetTitle ?? target.slug ?? target.targetId}`,
    answer:
      "I can delete the selected SEO document through the reviewed LLM Guide action flow.",
    summary: `Delete SEO document for ${target.targetType} "${target.targetTitle ?? target.slug ?? target.targetId}".`,
    confidence: 0.82,
    assumptions: [
      "The target SEO document is resolved from active context or the server-side resource catalog.",
      "Only the SEO document is deleted; the page or entry target is not deleted.",
    ],
    questions: [],
    actions: [
      {
        id: `seo-document-delete-${target.id}`,
        type: "seo.document.delete",
        title: `Delete SEO for ${target.targetTitle ?? target.slug ?? target.targetId}`,
        description: "Delete a SEO document selected from trusted admin context.",
        input: {
          id: target.id,
          targetType: target.targetType,
          targetId: target.targetId,
          expectedSlug: target.slug,
          expectedTitle: target.title,
        },
      },
    ],
  };
};

const buildDomainUpdateNeedsInputPlan = (
  prompt: string,
  intentId: string,
  title: string,
  reason: string
): AssistantActionPlan => ({
  id: `plan-${intentId}-needs-input`,
  status: "needs_input",
  intentId: `${intentId}-needs-input`,
  promptKind: "refinement_request",
  intentFamily: "unknown",
  title,
  answer: [
    "I can edit this resource only through a reviewed typed action plan.",
    "",
    reason,
    "",
    "Provide one exact target and one supported field/value change.",
  ].join("\n"),
  summary: `${title} could not be planned safely from the current context.`,
  confidence: 0.4,
  assumptions: [`Original prompt: ${prompt.trim() || "empty prompt"}`],
  questions: [
    {
      id: `${intentId}-target`,
      label: "Which exact resource and field should I update?",
      description: "Provide the exact target plus one supported field/value change.",
      required: true,
    },
  ],
  actions: [],
});

const buildEntryUpdatePlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  normalizedPrompt: string
): AssistantActionPlan | null => {
  if (!includesAny(normalizedPrompt, entryDeleteKeywords) || isLikelyDeletePrompt(normalizedPrompt)) {
    return null;
  }
  const target = readActiveEntryTarget(context);
  if (!target) return null;
  const [value] = extractQuotedValues(prompt);
  if (!value) {
    return buildDomainUpdateNeedsInputPlan(
      prompt,
      "entry-update",
      "Entry update needs a value",
      "The prompt did not include a quoted value for a supported entry field."
    );
  }
  const patch: {
    title?: string;
    slug?: string;
    status?: "draft" | "published" | "archived";
  } = includesAny(normalizedPrompt, ["slug", "url"])
    ? { slug: value }
    : includesAny(normalizedPrompt, ["status"]) && (value === "draft" || value === "published" || value === "archived")
      ? { status: value }
      : { title: value };
  return {
    id: `plan-entry-update-${target.id}`,
    status: "ready",
    intentId: "entry-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Update active entry",
    answer: "I can update the active entry through the reviewed LLM Guide action flow.",
    summary: "Update the active entry.",
    confidence: 0.78,
    assumptions: [
      "The target entry is resolved from the active admin route context.",
      "The update preserves unrelated entry fields.",
    ],
    questions: [],
    actions: [
      {
        id: `entry-update-${target.id}`,
        type: "entry.update",
        title: "Update active entry",
        description: "Update the active entry selected from admin context.",
        input: {
          id: target.id,
          contentTypeSlug: target.contentTypeSlug,
          patch,
        },
      },
    ],
  };
};

const buildFormUpdatePlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  normalizedPrompt: string
): AssistantActionPlan | null => {
  if (
    !includesFormTargetKeyword(normalizedPrompt) ||
    isLikelyDeletePrompt(normalizedPrompt) ||
    includesAny(normalizedPrompt, formArchiveKeywords)
  ) {
    return null;
  }
  const targets = findFormOperationTargets(prompt, context);
  if (targets.length !== 1) return null;
  const quoted = extractQuotedValues(prompt);
  const value = quoted.length > 1 ? quoted[1] : quoted[0];
  const target = targets[0];
  if (!target?.slug || !value) return null;
  const patch: {
    name?: string;
    slug?: string;
    status?: "draft" | "published" | "archived";
    submissionAccess?: "public" | "internal";
  } = includesAny(normalizedPrompt, ["status"]) && (value === "draft" || value === "published" || value === "archived")
    ? { status: value }
    : includesAny(normalizedPrompt, ["slug"])
      ? { slug: value }
      : includesAny(normalizedPrompt, ["access"]) && (value === "public" || value === "internal")
        ? { submissionAccess: value }
        : { name: value };
  return {
    id: `plan-form-update-${target.id}`,
    status: "ready",
    intentId: "form-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: `Update ${target.name}`,
    answer: "I can update the selected form through the reviewed LLM Guide action flow.",
    summary: `Update form "${target.name}" (${target.slug}).`,
    confidence: 0.78,
    assumptions: ["The target form is resolved from active context or the server-side resource catalog."],
    questions: [],
    actions: [
      {
        id: `form-update-${target.id}`,
        type: "form.update",
        title: `Update ${target.name}`,
        description: "Update a form selected from trusted admin context.",
        input: {
          id: target.id,
          name: target.name,
          slug: target.slug,
          expectedStatus: target.status,
          patch,
        },
      },
    ],
  };
};

const buildListingQueryUpdatePlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  normalizedPrompt: string
): AssistantActionPlan | null => {
  if (!includesAny(normalizedPrompt, listingQueryDeleteKeywords) || isLikelyDeletePrompt(normalizedPrompt)) {
    return null;
  }
  const targets = findListingQueryDeleteTargets(prompt, context);
  if (targets.length !== 1) return null;
  const target = targets[0];
  if (!target) return null;
  const number = extractFirstNumber(normalizedPrompt);
  const quoted = extractQuotedValues(prompt);
  const value = quoted.length > 1 ? quoted[1] : null;
  const patch =
    includesAny(normalizedPrompt, ["limit"]) && number
      ? { limit: number }
      : value
        ? { name: value }
        : null;
  if (!patch) return null;
  return {
    id: `plan-listing-query-update-${target.id}`,
    status: "ready",
    intentId: "listing-query-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: `Update ${target.name}`,
    answer: "I can update the selected listing query through the reviewed LLM Guide action flow.",
    summary: `Update listing query "${target.name}".`,
    confidence: 0.78,
    assumptions: ["The target listing query is resolved from active context or the server-side resource catalog."],
    questions: [],
    actions: [
      {
        id: `listing-query-update-${target.id}`,
        type: "listing-query.update",
        title: `Update ${target.name}`,
        description: "Update a listing query selected from trusted admin context.",
        input: { id: target.id, name: target.name, patch },
      },
    ],
  };
};

const buildListingTemplateUpdatePlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  normalizedPrompt: string
): AssistantActionPlan | null => {
  if (!includesAny(normalizedPrompt, listingTemplateDeleteKeywords) || isLikelyDeletePrompt(normalizedPrompt)) {
    return null;
  }
  const targets = findListingTemplateDeleteTargets(prompt, context);
  if (targets.length !== 1) return null;
  const target = targets[0];
  if (!target) return null;
  const quoted = extractQuotedValues(prompt);
  const value = quoted.length > 1 ? quoted[1] : null;
  const patch =
    value && includesAny(normalizedPrompt, ["layout"]) && ["grid", "list", "table", "calendar", "map"].includes(value)
      ? { layout: value as "grid" | "list" | "table" | "calendar" | "map" }
      : value
        ? { name: value }
        : null;
  if (!patch) return null;
  return {
    id: `plan-listing-template-update-${target.id}`,
    status: "ready",
    intentId: "listing-template-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: `Update ${target.name}`,
    answer: "I can update the selected listing template through the reviewed LLM Guide action flow.",
    summary: `Update listing template "${target.name}" (${target.slug}).`,
    confidence: 0.78,
    assumptions: ["The target listing template is resolved from active context or the server-side resource catalog."],
    questions: [],
    actions: [
      {
        id: `listing-template-update-${target.id}`,
        type: "listing-template.update",
        title: `Update ${target.name}`,
        description: "Update a listing template selected from trusted admin context.",
        input: {
          id: target.id,
          name: target.name,
          slug: target.slug,
          expectedLayout: target.layout,
          patch,
        },
      },
    ],
  };
};

const buildMenuItemUpdatePlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  normalizedPrompt: string
): AssistantActionPlan | null => {
  if (!includesAny(normalizedPrompt, menuItemDeleteKeywords) || isLikelyDeletePrompt(normalizedPrompt)) {
    return null;
  }
  const targets = findMenuItemDeleteTargets(prompt, context);
  if (targets.length !== 1) return null;
  const quoted = extractQuotedValues(prompt);
  const value = quoted.length > 1 ? quoted[1] : null;
  const target = targets[0];
  if (!target || !value) return null;
  const patch = includesAny(normalizedPrompt, ["href", "url"]) ? { href: value } : { label: value };
  return {
    id: `plan-menu-item-update-${target.item.id}`,
    status: "ready",
    intentId: "menu-item-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: `Update ${target.item.label}`,
    answer: "I can update the selected menu item through the reviewed LLM Guide action flow.",
    summary: `Update menu item "${target.item.label}".`,
    confidence: 0.78,
    assumptions: ["The target menu item is resolved from the server-side resource catalog."],
    questions: [],
    actions: [
      {
        id: `menu-item-update-${target.item.id}`,
        type: "menu.item.update",
        title: `Update ${target.item.label}`,
        description: "Update a menu item selected from trusted admin context.",
        input: {
          menuId: target.menu.id,
          itemId: target.item.id,
          label: target.item.label,
          expectedHref: target.item.href,
          expectedParentId: target.item.parentId,
          patch,
        },
      },
    ],
  };
};

const buildSeoDocumentUpdatePlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  normalizedPrompt: string
): AssistantActionPlan | null => {
  if (!includesAny(normalizedPrompt, seoDocumentDeleteKeywords) || isLikelyDeletePrompt(normalizedPrompt)) {
    return null;
  }
  const targets = findSeoDocumentDeleteTargets(prompt, context);
  if (targets.length !== 1) return null;
  const quoted = extractQuotedValues(prompt);
  const value = quoted.length > 1 ? quoted[1] : null;
  const target = targets[0];
  if (!target || !value) return null;
  const patch =
    includesAny(normalizedPrompt, ["description", "opis"])
      ? { description: value }
      : { title: value };
  return {
    id: `plan-seo-document-update-${target.id}`,
    status: "ready",
    intentId: "seo-document-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: `Update SEO for ${target.targetTitle ?? target.slug ?? target.targetId}`,
    answer: "I can update the selected SEO document through the reviewed LLM Guide action flow.",
    summary: `Update SEO document for ${target.targetType} "${target.targetTitle ?? target.slug ?? target.targetId}".`,
    confidence: 0.78,
    assumptions: ["The target SEO document is resolved from active context or the server-side resource catalog."],
    questions: [],
    actions: [
      {
        id: `seo-document-update-${target.id}`,
        type: "seo.document.update",
        title: `Update SEO for ${target.targetTitle ?? target.slug ?? target.targetId}`,
        description: "Update a SEO document selected from trusted admin context.",
        input: {
          id: target.id,
          targetType: target.targetType,
          targetId: target.targetId,
          expectedSlug: target.slug,
          expectedTitle: target.title,
          patch,
        },
      },
    ],
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
      `Original prompt: ${prompt.trim() || "empty prompt"}`,
    ],
    questions: [],
    actions: [],
  };
};

const describeCmsTargetQuery = (draft: CmsOperationDraft) =>
  draft.targetQuery?.exactName ??
  draft.targetQuery?.prefix ??
  draft.targetQuery?.slug ??
  draft.targetQuery?.text ??
  null;

const toInspectionCandidates = (candidates: CmsResolvedTargetCandidate[]) =>
  candidates.slice(0, 10).map((candidate) => ({
    kind: candidate.kind,
    id: candidate.id,
    label: candidate.label,
    slug: candidate.slug,
    status: candidate.status,
    adminHref: candidate.adminHref,
  }));

const buildGenericCmsInspectionPlan = (
  prompt: string,
  draft: CmsOperationDraft,
  context: ReturnType<typeof buildAssistantAdminContext>
): AssistantActionPlan | null => {
  if (draft.operation !== "inspect" && draft.operation !== "find") return null;
  const resolution = resolveCmsOperationTargets(draft, context);
  const candidates = toInspectionCandidates(resolution.candidates);
  const query = describeCmsTargetQuery(draft);
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
      query,
      candidates,
      truncated: resolution.candidates.length > candidates.length,
    },
    title: "CMS resource inspection",
    answer: [
      query
        ? `I searched ${draft.resourceKind} resources for "${query}".`
        : `I searched visible ${draft.resourceKind} resources.`,
      "",
      candidateLines,
    ].join("\n"),
    summary:
      candidates.length > 0
        ? `Found ${resolution.candidates.length} ${draft.resourceKind} candidate(s).`
        : `No ${draft.resourceKind} candidates matched the request.`,
    confidence:
      resolution.status === "exact"
        ? 0.84
        : resolution.status === "candidates"
          ? 0.72
          : 0.58,
    assumptions: [
      "Inspection uses trusted active context and server-side resource catalog summaries.",
      "No changes are planned for this read-only response.",
      `Original prompt: ${prompt.trim() || "empty prompt"}`,
    ],
    questions: [],
    actions: [],
  };
};

const shouldSkipGenericCmsLocalPrompt = (normalizedPrompt: string) =>
  includesAny(normalizedPrompt, [
    "widget",
    "block",
    "blok",
    "bloku",
    "selected block",
    "wybrany blok",
    "wybranego bloku",
    "template-section",
    "template section",
  ]);

const buildGenericCmsInspectionOperationPlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>
): AssistantActionPlan | null => {
  const normalizedPrompt = normalizeAssistantPlannerPrompt(prompt);
  if (shouldSkipGenericCmsLocalPrompt(normalizedPrompt)) return null;
  const draft = buildCmsOperationDraftFromPrompt(prompt, context);
  if (!draft) return null;
  return buildGenericCmsInspectionPlan(prompt, draft, context);
};

const buildGenericCmsPlanningStateFollowUpPlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>
): AssistantActionPlan | null => {
  const draft = buildCmsOperationDraftFromPlanningState(prompt, context.planningState);
  if (!draft) return null;
  const inspectionPlan = buildGenericCmsInspectionPlan(prompt, draft, context);
  if (inspectionPlan) return inspectionPlan;
  return mapCmsOperationToActionPlan({ prompt, draft, context });
};

const buildGenericCmsExplicitCatalogMutationPlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>
): AssistantActionPlan | null => {
  const normalizedPrompt = normalizeAssistantPlannerPrompt(prompt);
  if (shouldSkipGenericCmsLocalPrompt(normalizedPrompt)) return null;
  const draft = buildCmsOperationDraftFromPrompt(prompt, context);
  if (!draft) return null;
  const hasExplicitTarget = Boolean(
    draft.targetQuery?.exactName ||
      draft.targetQuery?.slug ||
      draft.targetQuery?.prefix ||
      draft.targetQuery?.text
  );
  if (
    draft.resourceKind !== "page" ||
    (draft.operation !== "delete" && draft.operation !== "update") ||
    !hasExplicitTarget ||
    !context.resourceCatalog?.pages?.length
  ) {
    return null;
  }
  return mapCmsOperationToActionPlan({ prompt, draft, context });
};

const buildGenericCmsFallbackMutationPlan = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>
): AssistantActionPlan | null => {
  const normalizedPrompt = normalizeAssistantPlannerPrompt(prompt);
  if (shouldSkipGenericCmsLocalPrompt(normalizedPrompt)) return null;
  const draft = buildCmsOperationDraftFromPrompt(prompt, context);
  if (!draft) return null;
  return mapCmsOperationToActionPlan({ prompt, draft, context });
};

const buildGenericCmsOperationPlanFromDraft = (
  prompt: string,
  context: ReturnType<typeof buildAssistantAdminContext>,
  draft: CmsOperationDraft
): AssistantActionPlan | null => {
  const inspectionPlan = buildGenericCmsInspectionPlan(prompt, draft, context);
  if (inspectionPlan) return inspectionPlan;
  return mapCmsOperationToActionPlan({ prompt, draft, context });
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
  providerModel?: string | null;
  llmAvailable?: boolean;
  evidence?: AssistantProviderPlanningEvidence[];
  limits?: {
    maxInputTokens?: number;
    maxOutputTokens?: number;
    timeoutMs?: number;
  };
};

const providerPlannerSystemPrompt = [
  "You draft Nextless LLM Guide CMS operation drafts.",
  "Return only JSON.",
  "Return a single object with operation, resourceKind, optional targetQuery, optional mutation, and optional constraints.",
  "Use surfaceHint for UI locations such as Screens, Pages, Engine, Admin UI, menu, or sidebar.",
  "Use targetQuery only for actual resource names, slugs, prefixes, routes, or active/current references.",
  "Use filters for active, published, visible, show-in-sidebar, opublikowane, or widoczne language.",
  "For create operations, put explicit item definitions in mutation.patch.items.",
  "For page create items use: title, slug, status, introTitle, introBody, optional ctaLabel.",
  "For form create items use: name, slug, status, submissionAccess, fields.",
  "For multi-create operations, set constraints.expectedCount to the number of mutation.patch.items.",
  "Do not return executable actions.",
  "Do not invent arbitrary commands, SQL, filesystem paths, tools, or resource ids.",
  "The local server will validate your draft, resolve targets from trusted context, and map to a strict plan before any dry-run or execution.",
].join(" ");

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
  const context = buildAssistantAdminContext(input.context);
  try {
    const operationDraft = applyPromptImpliedProviderDraftFilters(
      input.prompt,
      repairCmsOperationDraft(draft) ?? normalizeCmsOperationDraft(draft)
    );
    const plan = buildGenericCmsOperationPlanFromDraft(input.prompt, context, operationDraft);
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

const applyPromptImpliedProviderDraftFilters = (
  prompt: string,
  draft: CmsOperationDraft
): CmsOperationDraft => {
  const normalizedPrompt = normalizeAssistantPlannerPrompt(prompt);
  if (
    draft.resourceKind === "listing-template" &&
    draft.operation === "update" &&
    includesAny(normalizedPrompt, ["layout"]) &&
    typeof draft.mutation?.value === "string" &&
    ["grid", "list", "table", "calendar", "map"].includes(draft.mutation.value)
  ) {
    return normalizeCmsOperationDraft({
      ...draft,
      mutation: {
        ...draft.mutation,
        fieldIntent: "layout",
      },
    });
  }
  if (
    draft.resourceKind === "listing-query" &&
    draft.operation === "update" &&
    includesAny(normalizedPrompt, ["limit"]) &&
    typeof draft.mutation?.value === "number"
  ) {
    return normalizeCmsOperationDraft({
      ...draft,
      mutation: {
        ...draft.mutation,
        fieldIntent: "limit",
      },
    });
  }
  if (
    draft.resourceKind === "form" &&
    (draft.operation === "inspect" || draft.operation === "find") &&
    !hasFilterField(draft, "visibility")
  ) {
    if (includesAny(normalizedPrompt, ["public", "publiczne", "publiczny"])) {
      return normalizeCmsOperationDraft({
        ...draft,
        filters: [
          ...(draft.filters ?? []),
          { field: "visibility", operator: "eq", value: "public" },
        ],
      });
    }
    if (includesAny(normalizedPrompt, ["internal", "wewnetrzne", "wewnętrzne"])) {
      return normalizeCmsOperationDraft({
        ...draft,
        filters: [
          ...(draft.filters ?? []),
          { field: "visibility", operator: "eq", value: "internal" },
        ],
      });
    }
  }
  return draft;
};

const buildProviderLocalRecoveryPlan = (
  input: AssistantProviderDraftPlanInput,
) => {
  const context = buildAssistantAdminContext(input.context);
  const genericPlan = buildGenericCmsFallbackMutationPlan(input.prompt, context);
  const plan = genericPlan?.status === "ready" && genericPlan.actions.length > 0
    ? genericPlan
    : planAssistantActions({
    prompt: input.prompt,
    context: input.context,
      });
  if (!plan || plan.status !== "ready" || plan.actions.length === 0) return null;
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
      "Local explicit prompt fields recovered the typed action input.",
    ],
  });
};

const isProviderBroadDestructivePrompt = (prompt: string) => {
  const normalizedPrompt = normalizeAssistantPlannerPrompt(prompt);
  return (
    includesAny(normalizedPrompt, ["wszystkie", "all", "kazdy", "każdy", "cale", "całe"]) &&
    (isLikelyDeletePrompt(normalizedPrompt) ||
      includesAny(normalizedPrompt, ["archive", "archiwizuj", "zarchiwizuj"]))
  );
};

const hasDestructiveProviderActions = (plan: AssistantActionPlan) =>
  plan.actions.some((action) => action.type.includes(".delete") || action.type.endsWith(".archive"));

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

  if (classification.promptKind !== "setup_request") {
    const planningStatePlan = buildGenericCmsPlanningStateFollowUpPlan(input.prompt, context);
    if (planningStatePlan) return normalizeAssistantActionPlan(planningStatePlan);
    const genericInspectionPlan = buildGenericCmsInspectionOperationPlan(input.prompt, context);
    if (genericInspectionPlan) return normalizeAssistantActionPlan(genericInspectionPlan);
    const explicitCatalogMutationPlan = buildGenericCmsExplicitCatalogMutationPlan(
      input.prompt,
      context
    );
    if (explicitCatalogMutationPlan) {
      return normalizeAssistantActionPlan(explicitCatalogMutationPlan);
    }
  }
  if (classification.promptKind === "docs_question") {
    return normalizeAssistantActionPlan(buildDocsGuidancePlan(input.prompt, context));
  }

  const deletePlan = buildCustomScreenDeletePlan(
    input.prompt,
    context,
    classification.normalizedPrompt
  );
  if (deletePlan) return normalizeAssistantActionPlan(deletePlan);
  const pageDeletePlan = buildPageDeletePlan(
    input.prompt,
    context,
    classification.normalizedPrompt
  );
  if (pageDeletePlan) return normalizeAssistantActionPlan(pageDeletePlan);
  if (classification.promptKind === "refinement_request") {
    const entryUpdatePlan = buildEntryUpdatePlan(
      input.prompt,
      context,
      classification.normalizedPrompt
    );
    if (entryUpdatePlan) return normalizeAssistantActionPlan(entryUpdatePlan);
    const formUpdatePlan = buildFormUpdatePlan(
      input.prompt,
      context,
      classification.normalizedPrompt
    );
    if (formUpdatePlan) return normalizeAssistantActionPlan(formUpdatePlan);
    const listingQueryUpdatePlan = buildListingQueryUpdatePlan(
      input.prompt,
      context,
      classification.normalizedPrompt
    );
    if (listingQueryUpdatePlan) return normalizeAssistantActionPlan(listingQueryUpdatePlan);
    const listingTemplateUpdatePlan = buildListingTemplateUpdatePlan(
      input.prompt,
      context,
      classification.normalizedPrompt
    );
    if (listingTemplateUpdatePlan) return normalizeAssistantActionPlan(listingTemplateUpdatePlan);
    const menuItemUpdatePlan = buildMenuItemUpdatePlan(
      input.prompt,
      context,
      classification.normalizedPrompt
    );
    if (menuItemUpdatePlan) return normalizeAssistantActionPlan(menuItemUpdatePlan);
    const seoDocumentUpdatePlan = buildSeoDocumentUpdatePlan(
      input.prompt,
      context,
      classification.normalizedPrompt
    );
    if (seoDocumentUpdatePlan) return normalizeAssistantActionPlan(seoDocumentUpdatePlan);
    const pageTemplateTargetPlan = buildPageTemplateTargetResolutionPlan(
      input.prompt,
      context,
      classification.normalizedPrompt
    );
    if (pageTemplateTargetPlan) return normalizeAssistantActionPlan(pageTemplateTargetPlan);
    const widgetTemplateEditPlan = buildWidgetTemplateEditPlan(
      input.prompt,
      context,
      classification.normalizedPrompt
    );
    if (widgetTemplateEditPlan) return normalizeAssistantActionPlan(widgetTemplateEditPlan);
    const customScreenEditPlan = buildCustomScreenEditPlan(
      input.prompt,
      context,
      classification.normalizedPrompt
    );
    if (customScreenEditPlan) return normalizeAssistantActionPlan(customScreenEditPlan);
    const pageWidgetPatchPlan = buildPageWidgetPatchPlan(
      input.prompt,
      context,
      classification.normalizedPrompt
    );
    if (pageWidgetPatchPlan) return normalizeAssistantActionPlan(pageWidgetPatchPlan);
    const pageUpdatePlan = buildPageUpdatePlan(
      input.prompt,
      context,
      classification.normalizedPrompt
    );
    if (pageUpdatePlan) return normalizeAssistantActionPlan(pageUpdatePlan);
  }
  const listingQueryDeletePlan = buildListingQueryDeletePlan(
    input.prompt,
    context,
    classification.normalizedPrompt
  );
  if (listingQueryDeletePlan) return normalizeAssistantActionPlan(listingQueryDeletePlan);
  const listingTemplateDeletePlan = buildListingTemplateDeletePlan(
    input.prompt,
    context,
    classification.normalizedPrompt
  );
  if (listingTemplateDeletePlan) return normalizeAssistantActionPlan(listingTemplateDeletePlan);
  const widgetTemplateDeletePlan = buildWidgetTemplateDeletePlan(
    input.prompt,
    context,
    classification.normalizedPrompt
  );
  if (widgetTemplateDeletePlan) return normalizeAssistantActionPlan(widgetTemplateDeletePlan);
  const entryDeletePlan = buildEntryDeletePlan(
    input.prompt,
    context,
    classification.normalizedPrompt
  );
  if (entryDeletePlan) return normalizeAssistantActionPlan(entryDeletePlan);
  const contentTypeDeletePlan = buildContentTypeDeletePlan(
    input.prompt,
    context,
    classification.normalizedPrompt
  );
  if (contentTypeDeletePlan) return normalizeAssistantActionPlan(contentTypeDeletePlan);
  const formOperationPlan = buildFormOperationPlan(
    input.prompt,
    context,
    classification.normalizedPrompt
  );
  if (formOperationPlan) return normalizeAssistantActionPlan(formOperationPlan);
  const menuItemDeletePlan = buildMenuItemDeletePlan(
    input.prompt,
    context,
    classification.normalizedPrompt
  );
  if (menuItemDeletePlan) return normalizeAssistantActionPlan(menuItemDeletePlan);
  const seoDocumentDeletePlan = buildSeoDocumentDeletePlan(
    input.prompt,
    context,
    classification.normalizedPrompt
  );
  if (seoDocumentDeletePlan) return normalizeAssistantActionPlan(seoDocumentDeletePlan);

  if (classification.promptKind === "refinement_request") {
    const genericMutationPlan = buildGenericCmsFallbackMutationPlan(input.prompt, context);
    if (genericMutationPlan) return normalizeAssistantActionPlan(genericMutationPlan);
  }

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
  const context = buildAssistantAdminContext(input.context);
  const planningStatePlan = buildGenericCmsPlanningStateFollowUpPlan(input.prompt, context);
  if (planningStatePlan) return normalizeAssistantActionPlan(planningStatePlan);

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
      ...chooseProviderResponseContract(
        resolveModelCapabilityProfile({
          provider: input.provider.id,
          model: input.providerModel ?? "",
        }),
        {
          name: "cms_operation_draft",
          schema: buildCmsOperationDraftJsonSchema(),
          strict: true,
        }
      ),
      limits: buildProviderRequestLimits(input.limits),
    });
    const draft = parseProviderDraftJson(response.text);
    const operationPlan = tryPlanProviderCmsOperationDraft(input, draft);
    if (operationPlan) {
      if (operationPlan.status === "needs_input" || operationPlan.actions.length === 0) {
        const recoveredPlan = buildProviderLocalRecoveryPlan(input);
        if (recoveredPlan) return recoveredPlan;
      }
      if (isProviderBroadDestructivePrompt(input.prompt) && hasDestructiveProviderActions(operationPlan)) {
        return planAssistantActions(input);
      }
      return operationPlan;
    }
    return adaptProviderDraftPlan({
      prompt: input.prompt,
      draft,
    });
  } catch {
    return planAssistantActions(input);
  }
};
