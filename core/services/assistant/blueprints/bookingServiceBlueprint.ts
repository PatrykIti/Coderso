import { normalizeAssistantActionPlan } from "../actionPlanSchema";
import type {
  AssistantActionPlan,
  AssistantPromptKind,
} from "../actionPlanTypes";
import type { AssistantBusinessBlueprintPack } from "./businessBlueprintTypes";

export const buildBookingServiceNeedsInputPlan = (options?: {
  promptKind?: AssistantPromptKind;
}): AssistantActionPlan =>
  normalizeAssistantActionPlan({
    id: "plan-booking-service-needs-input",
    status: "needs_input",
    intentId: "booking-service-needs-prerequisite",
    promptKind: options?.promptKind ?? "setup_request",
    intentFamily: "booking_service",
    title: "Booking setup needs a supported adapter first",
    answer:
      "I can see this is a booking setup request, but I need a supported booking action adapter before I can safely create booking resources.",
    summary:
      "Booking resources, schedules, and public reservation behavior are not yet exposed through assistant typed actions.",
    confidence: 0.64,
    assumptions: [
      "No booking resources will be created until booking action adapters are implemented.",
      "This avoids creating a parallel assistant-only booking write path.",
    ],
    questions: [
      {
        id: "booking-adapter-scope",
        label: "Which booking setup should be supported first?",
        description:
          "Choose whether to prioritize service/resource setup, availability schedules, or public reservation flow in a dedicated adapter task.",
        required: true,
      },
    ],
    actions: [],
  });

export const BOOKING_SERVICE_PACK: AssistantBusinessBlueprintPack = {
  id: "booking-service",
  title: "Booking Service Business",
  intentFamily: "booking_service",
  status: "requires-prerequisite",
  surfaces: ["page"],
  actionTypes: [],
  assumptions: [
    "Booking domain services exist, but assistant booking action adapters are not implemented yet.",
    "No booking resources should be created through a parallel assistant-only path.",
  ],
  buildPlan: (options) =>
    buildBookingServiceNeedsInputPlan({ promptKind: options?.promptKind }),
};
