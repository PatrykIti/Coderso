import type { AssistantActionContext, AssistantIntentFamily } from "../actionPlanTypes";
import {
  findBlueprintCapabilitiesForIntentFamily,
  getBlueprintCapabilityRegistration,
  listBlueprintCapabilityRegistrations,
} from "./blueprintCapabilityRegistry";
import { extractBlueprintPromptSignals } from "./blueprintPromptSignals";
import type {
  BlueprintCandidate,
  BlueprintCapabilityRegistration,
} from "./blueprintCapabilityTypes";

const candidateRoleOrder = {
  primary: 0,
  adjunct: 1,
  gated: 2,
} as const;

const primaryCapabilityIntentFamilies = new Set<AssistantIntentFamily>([
  "catalog_showcase",
  "product_catalog",
  "portfolio_projects",
  "services_directory",
  "lead_capture_site",
  "editorial_content_hub",
  "booking_service",
]);

const addCandidate = (target: BlueprintCandidate[], candidate: BlueprintCandidate | null) => {
  if (!candidate) return;
  const existing = target.find((entry) => entry.capabilityId === candidate.capabilityId);
  if (!existing) {
    target.push(candidate);
    return;
  }
  if (candidate.score > existing.score) {
    existing.score = candidate.score;
    existing.role = candidate.role;
    existing.matchedSignals = [...candidate.matchedSignals];
    existing.reasons = [...candidate.reasons];
  }
};

const createCandidate = (
  registration: BlueprintCapabilityRegistration,
  role: BlueprintCandidate["role"],
  score: number,
  matchedSignals: string[],
  reasons: string[]
): BlueprintCandidate | null => {
  if (score <= 0) return null;
  return {
    capabilityId: registration.capability.id,
    role,
    score,
    matchedSignals,
    reasons,
  };
};

const resolvePrimaryRegistration = (intentFamily: AssistantIntentFamily) => {
  const registrations = findBlueprintCapabilitiesForIntentFamily(intentFamily);
  return registrations[0] ?? null;
};

export const resolveBlueprintCandidates = (input: {
  prompt: string;
  context?: AssistantActionContext;
}) => {
  const signals = extractBlueprintPromptSignals(input);
  const candidates: BlueprintCandidate[] = [];

  const primaryIntentFamily = primaryCapabilityIntentFamilies.has(signals.intentFamily)
    ? signals.intentFamily
    : primaryCapabilityIntentFamilies.has(signals.contextualIntentFamily)
      ? signals.contextualIntentFamily
      : "unknown";
  const primaryRegistration =
    primaryIntentFamily !== "unknown" ? resolvePrimaryRegistration(primaryIntentFamily) : null;

  if (primaryRegistration) {
    addCandidate(
      candidates,
      createCandidate(
        primaryRegistration,
        primaryRegistration.capability.merge.role === "gated" ? "gated" : "primary",
        primaryRegistration.capability.merge.priority + 20,
        [`intent:${primaryIntentFamily}`],
        [`Prompt matched ${primaryRegistration.capability.label}.`]
      )
    );
  }

  const productInquiry = getBlueprintCapabilityRegistration("product-inquiry-catalog");
  if (
    productInquiry &&
    primaryRegistration?.capability.id === "product-catalog" &&
    signals.wantsProductInquiry &&
    !signals.wantsCheckout
  ) {
    addCandidate(
      candidates,
      createCandidate(
        productInquiry,
        "adjunct",
        productInquiry.capability.merge.priority + 18,
        ["module:product-inquiry"],
        ["Prompt asks for product inquiry alongside the product catalog."]
      )
    );
  }

  const leadCapture = getBlueprintCapabilityRegistration("lead-capture-site");
  if (leadCapture) {
    const shouldAddLeadCapture =
      signals.wantsLeadCapture &&
      leadCapture.capability.id !== primaryRegistration?.capability.id &&
      !(primaryRegistration?.capability.id === "product-catalog" && signals.wantsProductInquiry);
    if (shouldAddLeadCapture) {
      addCandidate(
        candidates,
        createCandidate(
          leadCapture,
          primaryRegistration ? "adjunct" : "primary",
          leadCapture.capability.merge.priority + (primaryRegistration ? 12 : 20),
          ["module:lead-capture"],
          ["Prompt asks for a contact or quote capture flow."]
        )
      );
    }
  }

  const servicesDirectory = getBlueprintCapabilityRegistration("services-directory");
  if (
    servicesDirectory &&
    signals.wantsServicesDirectory &&
    servicesDirectory.capability.id !== primaryRegistration?.capability.id
  ) {
    addCandidate(
      candidates,
      createCandidate(
        servicesDirectory,
        primaryRegistration ? "adjunct" : "primary",
        servicesDirectory.capability.merge.priority + (primaryRegistration ? 11 : 20),
        ["module:services-directory"],
        ["Prompt asks for an offer or services directory flow."]
      )
    );
  }

  const editorialHub = getBlueprintCapabilityRegistration("editorial-content-hub");
  if (
    editorialHub &&
    signals.wantsEditorialHub &&
    editorialHub.capability.id !== primaryRegistration?.capability.id
  ) {
    addCandidate(
      candidates,
      createCandidate(
        editorialHub,
        primaryRegistration ? "adjunct" : "primary",
        editorialHub.capability.merge.priority + (primaryRegistration ? 10 : 18),
        ["module:editorial-hub"],
        ["Prompt asks for blog, posts, or editorial content."]
      )
    );
  }

  const booking = getBlueprintCapabilityRegistration("booking-service");
  if (booking && signals.wantsBooking) {
    addCandidate(
      candidates,
      createCandidate(
        booking,
        primaryRegistration ? "gated" : "gated",
        booking.capability.merge.priority + 6,
        ["module:booking"],
        ["Booking setup is recognized but still gated."]
      )
    );
  }

  const checkout = getBlueprintCapabilityRegistration("checkout-payment");
  if (checkout && signals.wantsCheckout) {
    addCandidate(
      candidates,
      createCandidate(
        checkout,
        "gated",
        checkout.capability.merge.priority + 6,
        ["module:checkout-payment"],
        ["Checkout and payment are recognized but still gated."]
      )
    );
  }

  if (!primaryRegistration && candidates.length === 0) {
    for (const registration of listBlueprintCapabilityRegistrations()) {
      const aliases = [
        ...(registration.capability.aliases ?? []),
        ...registration.capability.provides.flatMap((entry) => entry.aliases ?? []),
      ];
      if (!aliases.some((alias) => signals.normalizedPrompt.includes(alias.toLowerCase())))
        continue;
      addCandidate(
        candidates,
        createCandidate(
          registration,
          registration.capability.merge.role,
          registration.capability.merge.priority,
          ["alias-match"],
          [`Prompt matched ${registration.capability.label} aliases.`]
        )
      );
    }
  }

  return candidates.sort((left, right) => {
    if (candidateRoleOrder[left.role] !== candidateRoleOrder[right.role]) {
      return candidateRoleOrder[left.role] - candidateRoleOrder[right.role];
    }
    if (right.score !== left.score) return right.score - left.score;
    return left.capabilityId.localeCompare(right.capabilityId);
  });
};
