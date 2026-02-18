import {
  listBookingResources,
  listBookingServiceResources,
  listBookingServices,
} from "./bookingService";
import { createBookingSubmissionNonce } from "./bookingSubmissionNonce";
import { createBookingSlotsToken } from "./bookingSlotsToken";

export type BookingRuntimeResource = {
  id: string;
  name: string;
  type: "staff" | "bay" | "tool" | "vehicle" | "other";
  timezone: string;
  capacity: number;
  status: "active" | "inactive";
};

export type BookingRuntimeService = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  priceCents: number | null;
  currency: string | null;
  status: "active" | "inactive";
  resourceIds: string[];
};

export type BookingRuntimeResolution = {
  services: BookingRuntimeService[];
  resources: BookingRuntimeResource[];
  submissionNonce: string | null;
  slotsToken: string | null;
  error?: string;
};

const unique = <T>(items: T[]) => Array.from(new Set(items));

export async function resolveBookingRuntimeData(options: { preview: boolean }) {
  const [serviceRows, resourceRows] = await Promise.all([
    listBookingServices(),
    listBookingResources(),
  ]);

  const services = options.preview
    ? serviceRows
    : serviceRows.filter((item) => item.status === "active");
  const resources = options.preview
    ? resourceRows
    : resourceRows.filter((item) => item.status === "active");

  const activeResourceIds = new Set(resources.map((resource) => resource.id));

  const serviceResourcePairs = await Promise.all(
    services.map(async (service) => {
      const rows = await listBookingServiceResources(service.id);
      return [
        service.id,
        unique(
          rows
            .map((row) => row.resourceId)
            .filter((resourceId) => activeResourceIds.has(resourceId))
        ),
      ] as const;
    })
  );

  const resourceMap = new Map<string, string[]>(serviceResourcePairs);

  const runtimeServices: BookingRuntimeService[] = services
    .map<BookingRuntimeService>((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      bufferBeforeMinutes: service.bufferBeforeMinutes,
      bufferAfterMinutes: service.bufferAfterMinutes,
      priceCents: service.priceCents,
      currency: service.currency,
      status: service.status === "inactive" ? "inactive" : "active",
      resourceIds: resourceMap.get(service.id) ?? [],
    }))
    .filter((service) => options.preview || service.resourceIds.length > 0);

  const runtimeResources: BookingRuntimeResource[] = resources.map<BookingRuntimeResource>(
    (resource) => ({
    id: resource.id,
    name: resource.name,
    type:
      resource.type === "staff" ||
      resource.type === "bay" ||
      resource.type === "tool" ||
      resource.type === "vehicle"
        ? resource.type
        : "other",
    timezone: resource.timezone,
    capacity: resource.capacity,
    status: resource.status === "inactive" ? "inactive" : "active",
  })
  );

  let submissionNonce: string | null = null;
  let slotsToken: string | null = null;
  const errorFlags: string[] = [];
  try {
    submissionNonce = createBookingSubmissionNonce();
  } catch {
    submissionNonce = null;
    errorFlags.push("booking_nonce_unavailable");
  }

  try {
    slotsToken = createBookingSlotsToken();
  } catch {
    slotsToken = null;
    errorFlags.push("booking_slots_token_unavailable");
  }

  return {
    services: runtimeServices,
    resources: runtimeResources,
    submissionNonce,
    slotsToken,
    ...(errorFlags.length > 0 ? { error: errorFlags.join("|") } : {}),
  } satisfies BookingRuntimeResolution;
}
