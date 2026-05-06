import type { AssistantActionContext, AssistantIntentFamily } from "../actionPlanTypes";
import {
  classifyAssistantPrompt,
  includesAny,
  normalizeAssistantPlannerPrompt,
} from "../actionPlanHeuristics";

const leadCaptureKeywords = ["lead", "kontakt", "contact", "wycena", "quote", "contact form"];

const productInquiryKeywords = [
  "inquiry",
  "zapytanie",
  "ask about",
  "ask for details",
  "quote form",
  "product form",
];

const editorialKeywords = [
  "blog",
  "posts",
  "posty",
  "wpisy",
  "editorial",
  "content hub",
  "aktualności",
];

const bookingKeywords = ["booking", "appointment", "calendar", "rezerwacja", "rezerwacje"];

const checkoutKeywords = [
  "checkout",
  "payment",
  "payments",
  "cart",
  "koszyk",
  "płatność",
  "płatności",
];

const mediaKeywords = [
  "media",
  "gallery",
  "hero image",
  "upload",
  "attach",
  "replace image",
  "remove image",
];

const catalogContextText = (context: AssistantActionContext | undefined) => {
  const catalog = context?.resourceCatalog;
  if (!catalog) return "";
  const contentTypes = catalog.contentTypes.flatMap((item) => [item.id, item.slug, item.name]);
  const queries = catalog.listings.queries.flatMap((item) => [item.id, item.name]);
  const templates = catalog.listings.templates.flatMap((item) => [item.id, item.slug, item.name]);
  const forms = catalog.forms.flatMap((item) => [item.id, item.slug ?? "", item.name]);
  return [...contentTypes, ...queries, ...templates, ...forms].join(" ");
};

const resolveIntentFamilyFromText = (value: string) => {
  if (!value) return "unknown" as AssistantIntentFamily;
  if (value.includes("projekty-domow") || value.includes("house-projects")) {
    return "catalog_showcase" as AssistantIntentFamily;
  }
  if (value.includes("portfolio")) {
    return "portfolio_projects" as AssistantIntentFamily;
  }
  if (value.includes("uslugi") || value.includes("usługi") || value.includes("services")) {
    return "services_directory" as AssistantIntentFamily;
  }
  if (value.includes("produkty") || value.includes("products")) {
    return "product_catalog" as AssistantIntentFamily;
  }
  return "unknown" as AssistantIntentFamily;
};

const hasCatalogAwareAdminSurface = (context: AssistantActionContext | undefined) => {
  const route = normalizeAssistantPlannerPrompt(
    [
      context?.page ?? "",
      context?.runtimeSnapshot?.route ?? "",
      context?.runtimeSnapshot?.activeHref ?? "",
    ].join(" ")
  );
  return (
    route.includes("/admin/advanced/entries") ||
    route.includes("/admin/advanced/listings") ||
    route.includes("/admin/advanced/engine")
  );
};

const contextRouteToIntentFamily = (context: AssistantActionContext | undefined) => {
  const routeText = normalizeAssistantPlannerPrompt(
    [
      context?.page ?? "",
      context?.runtimeSnapshot?.route ?? "",
      context?.runtimeSnapshot?.activeHref ?? "",
      context?.runtimeSnapshot?.selectedResource?.kind ?? "",
    ].join(" ")
  );

  const routeIntentFamily = resolveIntentFamilyFromText(routeText);
  if (routeIntentFamily !== "unknown") return routeIntentFamily;
  if (!hasCatalogAwareAdminSurface(context)) return "unknown";

  const selectedResourceText = normalizeAssistantPlannerPrompt(
    context?.runtimeSnapshot?.selectedResource?.id ?? ""
  );
  const selectedResourceIntentFamily = resolveIntentFamilyFromText(selectedResourceText);
  if (selectedResourceIntentFamily !== "unknown") return selectedResourceIntentFamily;

  const catalogText = normalizeAssistantPlannerPrompt(catalogContextText(context));
  const detectedFamilies = [
    catalogText.includes("projekty-domow") || catalogText.includes("house-projects")
      ? ("catalog_showcase" as AssistantIntentFamily)
      : null,
    catalogText.includes("produkty") || catalogText.includes("products")
      ? ("product_catalog" as AssistantIntentFamily)
      : null,
    catalogText.includes("portfolio") ? ("portfolio_projects" as AssistantIntentFamily) : null,
    catalogText.includes("uslugi") ||
    catalogText.includes("usługi") ||
    catalogText.includes("services")
      ? ("services_directory" as AssistantIntentFamily)
      : null,
  ].filter((entry): entry is AssistantIntentFamily => entry !== null);
  const uniqueFamilies = [...new Set(detectedFamilies)];
  return uniqueFamilies.length === 1 ? uniqueFamilies[0]! : "unknown";
};

export const extractBlueprintPromptSignals = (input: {
  prompt: string;
  context?: AssistantActionContext;
}) => {
  const classification = classifyAssistantPrompt(input.prompt);
  const normalizedPrompt = classification.normalizedPrompt;
  const contextualIntentFamily = contextRouteToIntentFamily(input.context);

  return {
    normalizedPrompt,
    intentFamily: classification.intentFamily,
    promptKind: classification.promptKind,
    wantsLeadCapture: includesAny(normalizedPrompt, leadCaptureKeywords),
    wantsProductInquiry:
      includesAny(normalizedPrompt, productInquiryKeywords) ||
      (includesAny(normalizedPrompt, ["product", "produkt", "products", "produkty"]) &&
        includesAny(normalizedPrompt, ["inquiry", "zapyt", "quote", "kontakt"])),
    wantsEditorialHub: includesAny(normalizedPrompt, editorialKeywords),
    wantsBooking: includesAny(normalizedPrompt, bookingKeywords),
    wantsCheckout: includesAny(normalizedPrompt, checkoutKeywords),
    wantsMedia: includesAny(normalizedPrompt, mediaKeywords),
    contextualIntentFamily,
  };
};
