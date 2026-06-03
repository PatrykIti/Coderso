export type BookingRuntimeResourceType = "staff" | "bay" | "tool" | "vehicle" | "other";
export type BookingRuntimeCatalogStatus = "active" | "inactive";
export type BookingRuntimeSubmissionAccess = "public" | "internal";

export type BookingRuntimeCatalogResourceInput = {
  id: string;
  name: string;
  type: string;
  status: string;
  timezone: string;
  capacity: number;
};

export type BookingRuntimeCatalogServiceInput = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  priceCents: number | null;
  currency: string | null;
  status: string;
  settings: unknown;
};

export type BookingRuntimeCatalogServiceResourceInput = {
  resourceId: string;
};

export type BookingRuntimeCatalogResource = {
  id: string;
  name: string;
  type: BookingRuntimeResourceType;
  timezone: string;
  capacity: number;
  status: BookingRuntimeCatalogStatus;
};

export type BookingRuntimeCatalogService = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  priceCents: number | null;
  currency: string | null;
  status: BookingRuntimeCatalogStatus;
  resourceIds: string[];
  submissionAccess: BookingRuntimeSubmissionAccess;
};

export type BookingRuntimeCatalog = {
  services: BookingRuntimeCatalogService[];
  resources: BookingRuntimeCatalogResource[];
};

const unique = <T>(items: T[]) => Array.from(new Set(items));

const normalizeResourceType = (value: string): BookingRuntimeResourceType => {
  if (value === "staff" || value === "bay" || value === "tool" || value === "vehicle") {
    return value;
  }
  return "other";
};

export function buildBookingRuntimeCatalog(input: {
  services: BookingRuntimeCatalogServiceInput[];
  resources: BookingRuntimeCatalogResourceInput[];
  serviceResourcesByServiceId: Record<string, BookingRuntimeCatalogServiceResourceInput[]>;
  resolveSubmissionAccess: (
    settings: unknown,
    fallback: BookingRuntimeSubmissionAccess
  ) => BookingRuntimeSubmissionAccess;
}): BookingRuntimeCatalog {
  const activeResources = input.resources.filter((resource) => resource.status === "active");
  const activeResourceIds = new Set(activeResources.map((resource) => resource.id));

  const resources = activeResources.map<BookingRuntimeCatalogResource>((resource) => ({
    id: resource.id,
    name: resource.name,
    type: normalizeResourceType(resource.type),
    timezone: resource.timezone,
    capacity: resource.capacity,
    status: "active",
  }));

  const services = input.services
    .filter((service) => service.status === "active")
    .map<BookingRuntimeCatalogService>((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      bufferBeforeMinutes: service.bufferBeforeMinutes,
      bufferAfterMinutes: service.bufferAfterMinutes,
      priceCents: service.priceCents,
      currency: service.currency,
      status: "active",
      resourceIds: unique(
        (input.serviceResourcesByServiceId[service.id] ?? [])
          .map((item) => item.resourceId)
          .filter((resourceId) => activeResourceIds.has(resourceId))
      ),
      submissionAccess: input.resolveSubmissionAccess(service.settings, "public"),
    }))
    .filter((service) => service.resourceIds.length > 0);

  return {
    services,
    resources,
  };
}
