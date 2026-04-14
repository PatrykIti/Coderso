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
import type {
  AssistantContentTypeSummary,
  AssistantCustomScreenSummary,
  AssistantFormSummary,
  AssistantListingQuerySummary,
  AssistantListingTemplateSummary,
  AssistantMenuItemSummary,
  AssistantMenuSummary,
  AssistantSeoDocumentSummary,
} from "./adminContextTypes";

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
  const pageDeletePlan = buildPageDeletePlan(
    input.prompt,
    context,
    classification.normalizedPrompt
  );
  if (pageDeletePlan) return normalizeAssistantActionPlan(pageDeletePlan);
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
