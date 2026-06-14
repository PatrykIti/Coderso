import { normalizeAssistantActionPlan } from "../actionPlanSchema";
import type {
  AssistantActionPlan,
  AssistantPlannedAction,
  AssistantPromptKind,
} from "../actionPlanTypes";
import { createPageBlockV2, createPageSectionV2 } from "../../pages/pageDocumentV2";
import type { AssistantBusinessBlueprintPack } from "./businessBlueprintTypes";

const leadCaptureFormName = "Lead Capture Inquiry";
const leadCaptureFormSlug = "lead-capture-inquiry";
const leadCapturePageSlug = "/kontakt";

const buildLeadCaptureActions = (): AssistantPlannedAction[] => [
  {
    id: "form-lead-capture-inquiry",
    type: "form.upsert",
    title: "Create public inquiry form",
    description: "Create a public lead capture form with contact and message fields.",
    input: {
      name: leadCaptureFormName,
      slug: leadCaptureFormSlug,
      status: "published",
      description: "Lead capture form for service inquiries.",
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
          label: "What do you need?",
          name: "message",
          required: true,
          orderIndex: 3,
        },
      ],
    },
  },
  {
    id: "page-lead-capture-landing",
    type: "page.upsert",
    title: "Create lead capture landing page",
    description: "Create a simple landing page and embed the inquiry form.",
    input: {
      title: "Kontakt i wycena",
      slug: leadCapturePageSlug,
      status: "published",
      introTitle: "Porozmawiajmy o Twoim projekcie",
      introBody: "Opisz, czego potrzebujesz, a przygotujemy kolejne kroki i wrócimy z odpowiedzią.",
      sections: [
        createPageSectionV2("content", {
          id: "lead-capture-intro",
          name: "Intro",
          blocks: [
            createPageBlockV2("heading", {
              id: "lead-capture-intro-heading",
              props: { text: "Opowiedz nam o swoim projekcie", level: "h2", align: "left" },
            }),
            createPageBlockV2("text", {
              id: "lead-capture-intro-copy",
              props: {
                text: "Uzupelnij formularz, a zespol wroci z informacja, jak mozemy pomoc.",
                format: "plain",
                align: "left",
              },
            }),
          ],
        }),
      ],
      formEmbed: {
        formName: leadCaptureFormName,
        title: "Napisz do nas",
        description: "Zostaw kontakt i krótki opis sprawy.",
        submitLabel: "Wyślij zapytanie",
        successMessage: "Thanks. We will contact you shortly.",
      },
    },
  },
];

export const buildLeadCaptureSitePlan = (options?: {
  promptKind?: AssistantPromptKind;
}): AssistantActionPlan =>
  normalizeAssistantActionPlan({
    id: "plan-lead-capture-site",
    status: "ready",
    intentId: "lead-capture-site",
    promptKind: options?.promptKind ?? "setup_request",
    intentFamily: "lead_capture_site",
    title: "Lead Capture Site",
    answer: "I can create a simple lead capture page with a public inquiry form.",
    summary: "Create a landing page and public inquiry form for collecting leads.",
    confidence: 0.86,
    assumptions: [
      "The first lead capture pack creates a simple page and form without webhook automation.",
      "Public form submission uses the existing forms runtime hardening.",
    ],
    questions: [],
    actions: buildLeadCaptureActions(),
  });

export const LEAD_CAPTURE_SITE_PACK: AssistantBusinessBlueprintPack = {
  id: "lead-capture-site",
  title: "Lead Capture Site",
  intentFamily: "lead_capture_site",
  status: "ready",
  surfaces: ["page", "form"],
  actionTypes: ["form.upsert", "page.upsert"],
  assumptions: [
    "The first lead capture pack creates a simple page and public form without webhook automation.",
    "Public form submission uses the existing forms runtime hardening.",
  ],
  buildPlan: (options) => buildLeadCaptureSitePlan({ promptKind: options?.promptKind }),
};
