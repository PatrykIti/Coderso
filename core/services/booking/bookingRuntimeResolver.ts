import {
  listBookingResources,
  listBookingServiceResources,
  listBookingServices,
} from "./bookingService";
import { createBookingSubmissionNonce } from "./bookingSubmissionNonce";
import { createBookingSlotsToken, type BookingSlotsPolicyClaims } from "./bookingSlotsToken";
import { resolveBookingAccessModeFromSettings } from "./bookingAccess";
import {
  getSecuritySettingsPublic,
  type SecuritySettingsPublic,
} from "../settings/securitySettings";
import {
  buildBookingRuntimeCatalog,
  type BookingRuntimeCatalogResource,
  type BookingRuntimeCatalogService,
} from "./bookingRuntimeCatalog";

export type BookingRuntimeResource = BookingRuntimeCatalogResource;
export type BookingRuntimeService = BookingRuntimeCatalogService;

export type BookingRuntimeCaptcha = {
  provider: "recaptcha_v3";
  siteKey: string;
  action: "public_write";
};

export type BookingRuntimeResolution = {
  services: BookingRuntimeService[];
  resources: BookingRuntimeResource[];
  submissionNonce: string | null;
  slotsToken: string | null;
  captcha: BookingRuntimeCaptcha | null;
  error?: string;
};

const resolveRuntimeCaptcha = (
  settings: SecuritySettingsPublic["botProtection"]
): BookingRuntimeCaptcha | null => {
  if (!settings.enabled) return null;
  const siteKey = settings.siteKey?.trim();
  if (!siteKey) return null;
  return {
    provider: "recaptcha_v3",
    siteKey,
    action: "public_write",
  };
};

export async function resolveBookingRuntimeData(options: {
  preview: boolean;
  slotPolicy?: BookingSlotsPolicyClaims;
}) {
  const [serviceRows, resourceRows] = await Promise.all([
    listBookingServices(),
    listBookingResources(),
  ]);

  const serviceResourcePairs = await Promise.all(
    serviceRows.map(async (service) => {
      const rows = await listBookingServiceResources(service.id);
      return [service.id, rows.map((row) => ({ resourceId: row.resourceId }))] as const;
    })
  );

  const catalog = buildBookingRuntimeCatalog({
    services: serviceRows,
    resources: resourceRows,
    serviceResourcesByServiceId: Object.fromEntries(serviceResourcePairs),
    resolveSubmissionAccess: resolveBookingAccessModeFromSettings,
  });
  const runtimeServices = catalog.services;
  const runtimeResources = catalog.resources;

  let submissionNonce: string | null = null;
  let slotsToken: string | null = null;
  const errorFlags: string[] = [];
  const hasPublicService = runtimeServices.some((service) => service.submissionAccess === "public");
  const securitySettings = hasPublicService ? await getSecuritySettingsPublic() : null;
  const captcha = securitySettings ? resolveRuntimeCaptcha(securitySettings.botProtection) : null;

  if (hasPublicService) {
    try {
      submissionNonce = createBookingSubmissionNonce();
    } catch {
      submissionNonce = null;
      errorFlags.push("booking_nonce_unavailable");
    }
  }

  if (runtimeServices.length > 0) {
    try {
      slotsToken = createBookingSlotsToken(options.slotPolicy);
    } catch {
      slotsToken = null;
      errorFlags.push("booking_slots_token_unavailable");
    }
  }

  return {
    services: runtimeServices,
    resources: runtimeResources,
    submissionNonce,
    slotsToken,
    captcha,
    ...(errorFlags.length > 0 ? { error: errorFlags.join("|") } : {}),
  } satisfies BookingRuntimeResolution;
}
