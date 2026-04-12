import type {
  AssistantAdminContext,
  AssistantIntentFamily,
  AssistantPromptKind,
} from "./actionPlanTypes";

export const normalizeAssistantPlannerPrompt = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

export const includesAny = (value: string, candidates: string[]) =>
  candidates.some((candidate) => value.includes(candidate));

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
  "usun",
  "usuń",
  "usuw",
  "skasuj",
  "kasuj",
  "delete",
  "remove",
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

const destructiveKeywords = [
  "usun",
  "usuń",
  "usuw",
  "skasuj",
  "kasuj",
  "delete",
  "remove",
];

export const isLikelyDeletePrompt = (prompt: string) =>
  includesAny(normalizeAssistantPlannerPrompt(prompt), destructiveKeywords);

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

const productCheckoutKeywords = [
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

const bookingServiceKeywords = [
  "booking",
  "bookings",
  "rezerwacja",
  "rezerwacje",
  "rezerwacji",
  "umow",
  "umów",
  "appointment",
  "appointments",
  "calendar",
  "kalendarz",
];

const editorialContentHubKeywords = [
  "blog",
  "posts",
  "posty",
  "wpisy",
  "artykuly",
  "artykuły",
  "editorial",
  "content hub",
  "hub tresci",
  "hub treści",
  "aktualnosci",
  "aktualności",
];

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
  "kategorii",
  "cenie",
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

export const isLikelyHouseProjectsCatalogPrompt = (prompt: string) => {
  const normalized = normalizeAssistantPlannerPrompt(prompt);
  return (
    includesAny(normalized, catalogKeywords) &&
    includesAny(normalized, houseProjectKeywords)
  );
};

const isLikelyProductCatalogPrompt = (prompt: string) => {
  const normalized = normalizeAssistantPlannerPrompt(prompt);
  if (isLikelyHouseProjectsCatalogPrompt(normalized)) return false;
  return (
    includesAny(normalized, productCatalogKeywords) &&
    includesAny(normalized, catalogKeywords)
  );
};

const isLikelyPortfolioProjectsPrompt = (prompt: string) => {
  const normalized = normalizeAssistantPlannerPrompt(prompt);
  if (isLikelyHouseProjectsCatalogPrompt(normalized)) return false;
  return includesAny(normalized, portfolioKeywords);
};

const isLikelyServicesDirectoryPrompt = (prompt: string) => {
  const normalized = normalizeAssistantPlannerPrompt(prompt);
  return includesAny(normalized, serviceDirectoryKeywords);
};

export const resolveIntentFamily = (prompt: string): AssistantIntentFamily => {
  const normalized = normalizeAssistantPlannerPrompt(prompt);
  if (isLikelyHouseProjectsCatalogPrompt(normalized)) return "catalog_showcase";
  if (includesAny(normalized, houseProjectsRefinementKeywords)) return "catalog_showcase";
  if (isLikelyProductCatalogPrompt(normalized)) return "product_catalog";
  if (includesAny(normalized, productRefinementKeywords)) return "product_catalog";
  if (includesAny(normalized, productCatalogKeywords) && includesAny(normalized, productCheckoutKeywords)) {
    return "product_catalog";
  }
  if (isLikelyServicesDirectoryPrompt(normalized)) return "services_directory";
  if (includesAny(normalized, servicesRefinementKeywords)) return "services_directory";
  if (isLikelyPortfolioProjectsPrompt(normalized)) return "portfolio_projects";
  if (includesAny(normalized, portfolioRefinementKeywords)) return "portfolio_projects";
  if (includesAny(normalized, bookingServiceKeywords)) return "booking_service";
  if (includesAny(normalized, editorialContentHubKeywords)) return "editorial_content_hub";
  if (includesAny(normalized, leadCaptureKeywords)) return "lead_capture_site";
  if (includesAny(normalized, catalogKeywords)) return "catalog_showcase";
  return "unknown";
};

export const classifyAssistantPrompt = (prompt: string) => {
  const normalized = normalizeAssistantPlannerPrompt(prompt);
  const intentFamily = resolveIntentFamily(normalized);
  const hasSetupSignal = includesAny(normalized, setupKeywords);
  const hasRefinementSignal = includesAny(normalized, refinementKeywords);
  const hasDocsSignal = includesAny(normalized, docsQuestionKeywords);

  let promptKind: AssistantPromptKind = "unknown";
  if (hasDocsSignal && !hasSetupSignal) {
    promptKind = "docs_question";
  } else if (hasRefinementSignal && !hasSetupSignal) {
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

const catalogContextText = (context: AssistantAdminContext) => {
  const catalog = context.resourceCatalog;
  if (!catalog) return "";
  const contentTypes = catalog.contentTypes.flatMap((item) => [
    item.id,
    item.slug,
    item.name,
  ]);
  const queries = catalog.listings.queries.flatMap((item) => [item.id, item.name]);
  const templates = catalog.listings.templates.flatMap((item) => [
    item.id,
    item.slug,
    item.name,
  ]);
  const forms = catalog.forms.flatMap((item) => [
    item.id,
    item.slug ?? "",
    item.name,
  ]);
  return [...contentTypes, ...queries, ...templates, ...forms]
    .join(" ")
    .toLowerCase();
};

export const resolveContextualRefinementFamily = (
  context: AssistantAdminContext,
  fallback: AssistantIntentFamily
): AssistantIntentFamily => {
  const runtime = context.runtimeSnapshot;
  const route = normalizeAssistantPlannerPrompt(
    [
      context.route ?? "",
      runtime?.route ?? "",
      runtime?.activeHref ?? "",
      runtime?.selectedResource?.kind ?? "",
      runtime?.selectedResource?.id ?? "",
      catalogContextText(context),
    ].join(" ")
  );

  if (!route) return fallback;
  if (route.includes("projekty-domow") || route.includes("house-projects")) {
    return "catalog_showcase";
  }
  if (route.includes("produkty") || route.includes("products")) {
    return "product_catalog";
  }
  if (route.includes("portfolio")) {
    return "portfolio_projects";
  }
  if (route.includes("uslugi") || route.includes("usługi") || route.includes("services")) {
    return "services_directory";
  }
  return fallback;
};
