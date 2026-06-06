import { getSiteBuilderIntakeOption } from "./assistantSiteBuilderIntakeRegistry";
import type {
  AssistantSiteBuilderContentEngineId,
  AssistantSiteBuilderIntakeFacts,
  AssistantSiteBuilderPageRoleId,
  AssistantSiteBuilderSectionRoleId,
} from "./assistantSiteBuilderIntakeTypes";

export type AssistantSiteBuilderContentEngineDecisionSource =
  | "explicit"
  | "page-role"
  | "section-role"
  | "goal"
  | "topic"
  | "vertical"
  | "summary";

export type AssistantSiteBuilderContentEngineCapability =
  | "content_type"
  | "entry_seed"
  | "listing_page"
  | "detail_page"
  | "filters"
  | "seo_defaults";

export type AssistantSiteBuilderContentEngineActionFamily =
  | "content-type.upsert"
  | "entry.sample.create"
  | "listing-query.upsert"
  | "listing-template.upsert"
  | "detail-page.upsert"
  | "page.upsert";

export type AssistantSiteBuilderContentEngineDecisionReason = {
  source: AssistantSiteBuilderContentEngineDecisionSource;
  value: string;
};

export type AssistantSiteBuilderContentEngineDecision = {
  id: AssistantSiteBuilderContentEngineId;
  label: string;
  status: "supported";
  sources: AssistantSiteBuilderContentEngineDecisionReason[];
  capabilities: AssistantSiteBuilderContentEngineCapability[];
  actionFamilies: AssistantSiteBuilderContentEngineActionFamily[];
  requiresCustomScreen: boolean;
  requiresPublicWriteEndpoint: false;
};

export type AssistantSiteBuilderContentEngineGate = {
  code: "content_engine_unsupported";
  severity: "warning";
  requestedEngineId: string;
  source: AssistantSiteBuilderContentEngineDecisionSource;
  message: string;
};

export type AssistantSiteBuilderContentEngineQuestion = {
  code: "content_engine_scope_missing";
  engineId: AssistantSiteBuilderContentEngineId;
  message: string;
};

export type AssistantSiteBuilderContentEngineDecisionResult = {
  schemaVersion: 1;
  decisions: AssistantSiteBuilderContentEngineDecision[];
  staticPageRoles: AssistantSiteBuilderPageRoleId[];
  questions: AssistantSiteBuilderContentEngineQuestion[];
  gates: AssistantSiteBuilderContentEngineGate[];
};

const pageRoleContentEngineIds: Readonly<
  Partial<Record<AssistantSiteBuilderPageRoleId, AssistantSiteBuilderContentEngineId>>
> = Object.freeze({
  services: "services",
  products: "products",
  portfolio: "portfolio",
  "case-studies": "case-studies",
  blog: "blog",
  team: "team",
  locations: "locations",
  faq: "faq",
  testimonials: "testimonials",
});

const sectionRoleContentEngineIds: Readonly<
  Partial<Record<AssistantSiteBuilderSectionRoleId, AssistantSiteBuilderContentEngineId>>
> = Object.freeze({
  "services-overview": "services",
  proof: "testimonials",
  faq: "faq",
  "content-feed": "blog",
});

const engineOrder: readonly AssistantSiteBuilderContentEngineId[] = [
  "services",
  "products",
  "portfolio",
  "case-studies",
  "blog",
  "team",
  "locations",
  "faq",
  "testimonials",
];

const engineCapabilities = Object.freeze({
  services: ["content_type", "entry_seed", "listing_page", "detail_page", "seo_defaults"],
  products: [
    "content_type",
    "entry_seed",
    "listing_page",
    "detail_page",
    "filters",
    "seo_defaults",
  ],
  portfolio: ["content_type", "entry_seed", "listing_page", "detail_page", "seo_defaults"],
  "case-studies": ["content_type", "entry_seed", "listing_page", "detail_page", "seo_defaults"],
  blog: ["content_type", "entry_seed", "listing_page", "detail_page", "seo_defaults"],
  team: ["content_type", "entry_seed", "listing_page", "seo_defaults"],
  locations: [
    "content_type",
    "entry_seed",
    "listing_page",
    "detail_page",
    "filters",
    "seo_defaults",
  ],
  faq: ["content_type", "entry_seed", "listing_page", "seo_defaults"],
  testimonials: ["content_type", "entry_seed", "listing_page", "seo_defaults"],
} satisfies Record<
  AssistantSiteBuilderContentEngineId,
  readonly AssistantSiteBuilderContentEngineCapability[]
>);

const engineActionFamilies = Object.freeze({
  services: [
    "content-type.upsert",
    "entry.sample.create",
    "listing-query.upsert",
    "listing-template.upsert",
    "detail-page.upsert",
    "page.upsert",
  ],
  products: [
    "content-type.upsert",
    "entry.sample.create",
    "listing-query.upsert",
    "listing-template.upsert",
    "detail-page.upsert",
    "page.upsert",
  ],
  portfolio: [
    "content-type.upsert",
    "entry.sample.create",
    "listing-query.upsert",
    "listing-template.upsert",
    "detail-page.upsert",
    "page.upsert",
  ],
  "case-studies": [
    "content-type.upsert",
    "entry.sample.create",
    "listing-query.upsert",
    "listing-template.upsert",
    "detail-page.upsert",
    "page.upsert",
  ],
  blog: [
    "content-type.upsert",
    "entry.sample.create",
    "listing-query.upsert",
    "listing-template.upsert",
    "detail-page.upsert",
    "page.upsert",
  ],
  team: ["content-type.upsert", "entry.sample.create", "listing-template.upsert", "page.upsert"],
  locations: [
    "content-type.upsert",
    "entry.sample.create",
    "listing-query.upsert",
    "listing-template.upsert",
    "detail-page.upsert",
    "page.upsert",
  ],
  faq: ["content-type.upsert", "entry.sample.create", "listing-template.upsert", "page.upsert"],
  testimonials: [
    "content-type.upsert",
    "entry.sample.create",
    "listing-template.upsert",
    "page.upsert",
  ],
} satisfies Record<
  AssistantSiteBuilderContentEngineId,
  readonly AssistantSiteBuilderContentEngineActionFamily[]
>);

const textSignalEngines: Readonly<Record<AssistantSiteBuilderContentEngineId, readonly string[]>> =
  Object.freeze({
    services: ["service", "services", "uslugi", "usługi", "oferta", "offer"],
    products: ["product", "products", "produkty", "sklep", "shop", "menu", "packages"],
    portfolio: ["portfolio", "projects", "projekty", "realizacje"],
    "case-studies": ["case", "studies", "results", "outcomes", "historie", "wyniki"],
    blog: ["blog", "posts", "articles", "news", "poradnik", "aktualnosci", "aktualności"],
    team: ["team", "people", "staff", "experts", "zespol", "zespół", "pracownicy"],
    locations: [
      "locations",
      "branches",
      "venues",
      "offices",
      "lokalizacje",
      "oddzialy",
      "oddziały",
    ],
    faq: ["faq", "questions", "pytania"],
    testimonials: ["testimonials", "reviews", "opinie", "references", "referencje"],
  });

const unsupportedTextSignals = Object.freeze([
  {
    requestedEngineId: "events",
    keywords: ["event", "events", "calendar", "wydarzenia", "kalendarz"],
  },
  {
    requestedEngineId: "jobs",
    keywords: ["jobs", "careers", "recruitment", "rekrutacja", "kariera"],
  },
  {
    requestedEngineId: "courses",
    keywords: ["courses", "lessons", "learning", "kursy", "lekcje", "szkolenia"],
  },
] as const);

const unique = <T extends string>(values: readonly T[]): T[] => [...new Set(values)];

const lowerText = (values: readonly unknown[]) =>
  values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase();

const tokenizeText = (text: string) => text.match(/[\p{L}\p{N}]+/gu) ?? [];

const hasSignal = (text: string, signals: readonly string[]) => {
  const tokens = new Set(tokenizeText(text));
  return signals.some((signal) =>
    signal.includes(" ") ? text.includes(signal) : tokens.has(signal)
  );
};

const validateEngineId = (engineId: string): AssistantSiteBuilderContentEngineId =>
  getSiteBuilderIntakeOption("contentEngines", engineId).id as AssistantSiteBuilderContentEngineId;

const createDecision = (
  engineId: AssistantSiteBuilderContentEngineId,
  sources: AssistantSiteBuilderContentEngineDecisionReason[]
): AssistantSiteBuilderContentEngineDecision => ({
  id: engineId,
  label: getSiteBuilderIntakeOption("contentEngines", engineId).label,
  status: "supported",
  sources,
  capabilities: [...engineCapabilities[engineId]],
  actionFamilies: [...engineActionFamilies[engineId]],
  requiresCustomScreen: true,
  requiresPublicWriteEndpoint: false,
});

const addSource = (
  decisions: Map<
    AssistantSiteBuilderContentEngineId,
    AssistantSiteBuilderContentEngineDecisionReason[]
  >,
  order: AssistantSiteBuilderContentEngineId[],
  engineId: AssistantSiteBuilderContentEngineId,
  source: AssistantSiteBuilderContentEngineDecisionSource,
  value: string
) => {
  const sources = decisions.get(engineId) ?? [];
  if (!sources.some((item) => item.source === source && item.value === value)) {
    sources.push({ source, value });
  }
  if (!decisions.has(engineId)) order.push(engineId);
  decisions.set(engineId, sources);
};

const collectTextSignals = (
  text: string,
  source: AssistantSiteBuilderContentEngineDecisionSource,
  decisions: Map<
    AssistantSiteBuilderContentEngineId,
    AssistantSiteBuilderContentEngineDecisionReason[]
  >,
  order: AssistantSiteBuilderContentEngineId[],
  gates: AssistantSiteBuilderContentEngineGate[]
) => {
  if (!text) return;

  for (const engineId of engineOrder) {
    if (hasSignal(text, textSignalEngines[engineId])) {
      addSource(decisions, order, engineId, source, engineId);
    }
  }

  for (const signal of unsupportedTextSignals) {
    if (!hasSignal(text, signal.keywords)) continue;
    if (
      gates.some(
        (gate) => gate.requestedEngineId === signal.requestedEngineId && gate.source === source
      )
    ) {
      continue;
    }
    gates.push({
      code: "content_engine_unsupported",
      severity: "warning",
      requestedEngineId: signal.requestedEngineId,
      source,
      message: `The "${signal.requestedEngineId}" content engine is not supported by the guided site builder yet.`,
    });
  }
};

const collectQuestions = (
  decisions: readonly AssistantSiteBuilderContentEngineDecision[]
): AssistantSiteBuilderContentEngineQuestion[] =>
  decisions
    .filter((decision) =>
      decision.sources.every(
        (source) => source.source !== "explicit" && source.source !== "page-role"
      )
    )
    .map((decision) => ({
      code: "content_engine_scope_missing",
      engineId: decision.id,
      message: `Confirm which page should own the ${decision.label} content engine before action assembly.`,
    }));

export const resolveSiteBuilderIntakeContentEngines = (
  facts: AssistantSiteBuilderIntakeFacts
): AssistantSiteBuilderContentEngineDecisionResult => {
  const decisions = new Map<
    AssistantSiteBuilderContentEngineId,
    AssistantSiteBuilderContentEngineDecisionReason[]
  >();
  const gates: AssistantSiteBuilderContentEngineGate[] = [];
  const order: AssistantSiteBuilderContentEngineId[] = [];
  const pageRoleIds = unique([...(facts.pageRoles ?? [])]);
  const sectionRoleIds = unique([...(facts.sectionRoles ?? [])]);

  for (const engineId of facts.contentEngines ?? []) {
    addSource(decisions, order, validateEngineId(engineId), "explicit", engineId);
  }

  for (const pageRoleId of pageRoleIds) {
    const engineId = pageRoleContentEngineIds[pageRoleId];
    if (engineId) addSource(decisions, order, engineId, "page-role", pageRoleId);
  }

  for (const sectionRoleId of sectionRoleIds) {
    const engineId = sectionRoleContentEngineIds[sectionRoleId];
    if (engineId) addSource(decisions, order, engineId, "section-role", sectionRoleId);
  }

  collectTextSignals(lowerText(facts.goals ?? []), "goal", decisions, order, gates);
  collectTextSignals(lowerText([facts.topic]), "topic", decisions, order, gates);
  collectTextSignals(lowerText([facts.vertical]), "vertical", decisions, order, gates);
  collectTextSignals(
    lowerText([facts.summary, facts.offerSummary, facts.primaryGoal]),
    "summary",
    decisions,
    order,
    gates
  );

  const resolvedDecisions = order.map((engineId) =>
    createDecision(engineId, decisions.get(engineId) ?? [])
  );

  return {
    schemaVersion: 1,
    decisions: resolvedDecisions,
    staticPageRoles: pageRoleIds.filter((pageRoleId) => !pageRoleContentEngineIds[pageRoleId]),
    questions: collectQuestions(resolvedDecisions),
    gates,
  };
};
