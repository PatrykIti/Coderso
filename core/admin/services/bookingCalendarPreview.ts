import type { BookingCalendarData } from "../../widgets/core/bookingCalendar";
import {
  resolveBookingSubmissionAccess,
  type BookingResourceRecord,
  type BookingServiceRecord,
  type BookingServiceResourceRecord,
} from "./bookingClient";

export type BookingCalendarPreviewResolved = NonNullable<BookingCalendarData["resolved"]>;

export type BookingCalendarPreviewInput = {
  services: BookingServiceRecord[];
  resources: BookingResourceRecord[];
  serviceResourcesByServiceId: Record<string, BookingServiceResourceRecord[]>;
  error?: string;
};

export function buildBookingCalendarPreviewResolved(
  input: BookingCalendarPreviewInput
): BookingCalendarPreviewResolved {
  const activeResources = input.resources.filter((resource) => resource.status === "active");
  const activeResourceIds = new Set(activeResources.map((resource) => resource.id));

  const services = input.services
    .filter((service) => service.status === "active")
    .map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      bufferBeforeMinutes: service.bufferBeforeMinutes,
      bufferAfterMinutes: service.bufferAfterMinutes,
      priceCents: service.priceCents,
      currency: service.currency,
      status: service.status,
      submissionAccess: resolveBookingSubmissionAccess(service.settings, "public"),
      resourceIds: (input.serviceResourcesByServiceId[service.id] ?? [])
        .map((item) => item.resourceId)
        .filter((resourceId) => activeResourceIds.has(resourceId)),
    }))
    .filter((service) => service.resourceIds.length > 0);

  return {
    services,
    resources: activeResources.map((resource) => ({
      id: resource.id,
      name: resource.name,
      type: resource.type,
      timezone: resource.timezone,
      capacity: resource.capacity,
      status: resource.status,
    })),
    slotsToken: null,
    ...(input.error ? { error: input.error } : {}),
  };
}
