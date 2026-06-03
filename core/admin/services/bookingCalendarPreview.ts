import type { BookingCalendarData } from "../../widgets/core/bookingCalendar";
import {
  resolveBookingSubmissionAccess,
  type BookingResourceRecord,
  type BookingServiceRecord,
  type BookingServiceResourceRecord,
} from "./bookingClient";
import { buildBookingRuntimeCatalog } from "../../services/booking/bookingRuntimeCatalog";

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
  const catalog = buildBookingRuntimeCatalog({
    services: input.services,
    resources: input.resources,
    serviceResourcesByServiceId: input.serviceResourcesByServiceId,
    resolveSubmissionAccess: resolveBookingSubmissionAccess,
  });

  return {
    services: catalog.services,
    resources: catalog.resources,
    slotsToken: null,
    ...(input.error ? { error: input.error } : {}),
  };
}
