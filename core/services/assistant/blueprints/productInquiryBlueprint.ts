import { normalizeAssistantActionPlan } from "../actionPlanSchema";
import type {
  AssistantActionPlan,
  AssistantIntentFamily,
  AssistantPromptKind,
  AssistantPlannedAction,
} from "../actionPlanTypes";
import { buildCatalogFamilyPlan } from "./catalogFamilyBlueprint";
import { PRODUCT_CATALOG_PRESET } from "./catalogFamilyPresets";

const productInquiryFormName = "Product Catalog Inquiry";
const productInquiryFormSlug = "product-catalog-inquiry";

const buildProductInquiryFormAction = (): AssistantPlannedAction => ({
  id: "form-product-catalog-inquiry",
  type: "form.upsert",
  title: "Create product inquiry form",
  description: "Create a public inquiry form for product catalog questions.",
  input: {
    name: productInquiryFormName,
    slug: productInquiryFormSlug,
    status: "published",
    description: "Inquiry form for product catalog leads.",
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
        type: "text",
        label: "Product",
        name: "product",
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
});

export const buildProductInquiryCatalogPlan = (options?: {
  promptKind?: AssistantPromptKind;
  intentFamily?: AssistantIntentFamily;
}): AssistantActionPlan => {
  const base = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: options?.promptKind,
    intentFamily: options?.intentFamily ?? "product_catalog",
  });
  const formAction = buildProductInquiryFormAction();
  const actions = base.actions.map((action) => {
    if (action.type !== "page.upsert") return action;
    return {
      ...action,
      input: {
        ...action.input,
        formEmbed: {
          formName: productInquiryFormName,
          title: "Ask about a product",
          description: "Send a question and we will follow up with details.",
          submitLabel: "Send inquiry",
          successMessage: "Thanks. We will contact you shortly.",
        },
      },
    } satisfies AssistantPlannedAction;
  });

  return normalizeAssistantActionPlan({
    ...base,
    id: "plan-product-inquiry-catalog",
    intentId: "product-inquiry-catalog",
    title: "Product Inquiry Catalog",
    summary:
      "Create a product catalog with listing surfaces and a public inquiry form, without checkout/payment setup.",
    answer:
      "I can set up a product catalog with a public inquiry form. Checkout and payment setup are not included in this plan.",
    assumptions: [
      ...base.assumptions,
      "This pack supports product inquiry and catalog browsing, not checkout or payment processing.",
    ],
    actions: [...actions.slice(0, -1), formAction, actions[actions.length - 1]!],
  });
};

export const buildProductCheckoutNeedsInputPlan = (options?: {
  promptKind?: AssistantPromptKind;
}): AssistantActionPlan =>
  normalizeAssistantActionPlan({
    id: "plan-product-checkout-needs-input",
    status: "needs_input",
    intentId: "product-checkout-needs-prerequisite",
    promptKind: options?.promptKind ?? "setup_request",
    intentFamily: "product_catalog",
    title: "Checkout setup needs a dedicated commerce scope",
    answer:
      "I can set up a product catalog or inquiry flow, but checkout and payment setup need a dedicated commerce/payment adapter first.",
    summary:
      "Checkout/payment resources are not yet exposed through assistant typed actions.",
    confidence: 0.62,
    assumptions: [
      "No payment provider, checkout route, or cart behavior will be created by this plan.",
    ],
    questions: [
      {
        id: "commerce-checkout-scope",
        label: "Which commerce flow should be supported first?",
        description:
          "Choose whether to prioritize product inquiry, cart/checkout, or payment provider setup in a dedicated commerce task.",
        required: true,
      },
    ],
    actions: [],
  });
