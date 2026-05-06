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

const contextRouteToIntentFamily = (context: AssistantActionContext | undefined) => {
  const routeText = normalizeAssistantPlannerPrompt(
    [
      context?.page ?? "",
      context?.runtimeSnapshot?.route ?? "",
      context?.runtimeSnapshot?.activeHref ?? "",
      context?.runtimeSnapshot?.selectedResource?.kind ?? "",
    ].join(" ")
  );

  if (!routeText) return "unknown" as AssistantIntentFamily;
  if (routeText.includes("projekty-domow") || routeText.includes("house-projects")) {
    return "catalog_showcase";
  }
  if (routeText.includes("produkty") || routeText.includes("products")) {
    return "product_catalog";
  }
  if (routeText.includes("portfolio")) {
    return "portfolio_projects";
  }
  if (
    routeText.includes("uslugi") ||
    routeText.includes("usługi") ||
    routeText.includes("services")
  ) {
    return "services_directory";
  }
  return "unknown";
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
