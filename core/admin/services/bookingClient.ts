import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { clearLocalCache, readLocalCache, writeLocalCache } from "@/utils/storageCache";

export type BookingResourceType = "staff" | "bay" | "tool" | "vehicle" | "other";
export type BookingResourceStatus = "active" | "inactive";
export type BookingServiceStatus = "active" | "inactive";
export type BookingSubmissionAccessMode = "public" | "internal";
export type BookingReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export type BookingResourceRecord = {
  id: string;
  name: string;
  slug: string;
  type: BookingResourceType;
  status: BookingResourceStatus;
  timezone: string;
  capacity: number;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type BookingServiceRecord = {
  id: string;
  name: string;
  slug: string;
  status: BookingServiceStatus;
  description: string | null;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  priceCents: number | null;
  currency: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type BookingServiceResourceRecord = {
  serviceId: string;
  resourceId: string;
  isRequired: boolean;
  createdAt: string;
};

export type BookingScheduleRecord = {
  id: string;
  resourceId: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  timezone: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BookingBlackoutRecord = {
  id: string;
  resourceId: string | null;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  createdAt: string;
};

export type BookingReservationRecord = {
  id: string;
  serviceId: string;
  resourceId: string;
  formSubmissionId: string | null;
  status: BookingReservationStatus;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  notes: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type BookingSlotRecord = {
  startsAt: string;
  endsAt: string;
  timezone: string;
};

export type BookingResourceInput = {
  name: string;
  slug?: string | null;
  type?: BookingResourceType;
  status?: BookingResourceStatus;
  timezone?: string;
  capacity?: number;
  settings?: Record<string, unknown>;
};

export type BookingServiceInput = {
  name: string;
  slug?: string | null;
  status?: BookingServiceStatus;
  description?: string | null;
  durationMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  priceCents?: number | null;
  currency?: string | null;
  settings?: Record<string, unknown>;
};

export type BookingServiceResourceInput = {
  resourceId: string;
  isRequired?: boolean;
};

export type BookingScheduleInput = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  timezone?: string;
  isAvailable?: boolean;
};

export type BookingBlackoutInput = {
  resourceId?: string | null;
  startsAt: string;
  endsAt: string;
  reason?: string | null;
};

export type BookingSlotPreviewInput = {
  serviceId: string;
  resourceId: string;
  date: string;
  timezone?: string;
  intervalMinutes?: number;
};

export type BookingReservationInput = {
  serviceId: string;
  resourceId: string;
  startsAt: string;
  endsAt: string;
  timezone?: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const resolveBookingSubmissionAccess = (
  settings: unknown,
  fallback: BookingSubmissionAccessMode = "public"
): BookingSubmissionAccessMode => {
  if (!isRecord(settings)) return fallback;
  const value = settings.submissionAccess;
  if (value === "public" || value === "internal") return value;
  return fallback;
};

export const withBookingSubmissionAccess = (
  settings: unknown,
  mode: BookingSubmissionAccessMode
): Record<string, unknown> => {
  const base = isRecord(settings) ? settings : {};
  return {
    ...base,
    submissionAccess: mode,
  };
};

let cachedResources: BookingResourceRecord[] | null = null;
let cachedResourcesPromise: Promise<BookingResourceRecord[]> | null = null;
let cachedServices: BookingServiceRecord[] | null = null;
let cachedServicesPromise: Promise<BookingServiceRecord[]> | null = null;
let cachedReservations: BookingReservationRecord[] | null = null;
let cachedReservationsPromise: Promise<BookingReservationRecord[]> | null = null;
let cachedBlackouts: BookingBlackoutRecord[] | null = null;
let cachedBlackoutsPromise: Promise<BookingBlackoutRecord[]> | null = null;

export const clearBookingCache = () => {
  cachedResources = null;
  cachedResourcesPromise = null;
  cachedServices = null;
  cachedServicesPromise = null;
  cachedReservations = null;
  cachedReservationsPromise = null;
  cachedBlackouts = null;
  cachedBlackoutsPromise = null;
  clearLocalCache(cacheKeys.bookingResourcesList);
  clearLocalCache(cacheKeys.bookingServicesList);
  clearLocalCache(cacheKeys.bookingReservationsList);
  clearLocalCache(cacheKeys.bookingBlackoutsList);
};

const isList = <T>(value: unknown): value is T[] => Array.isArray(value);

const readResourcesCache = () =>
  readLocalCache(cacheKeys.bookingResourcesList, cacheTtlMs.list, (value) =>
    isList<BookingResourceRecord>(value)
  );

const readServicesCache = () =>
  readLocalCache(cacheKeys.bookingServicesList, cacheTtlMs.list, (value) =>
    isList<BookingServiceRecord>(value)
  );

const readReservationsCache = () =>
  readLocalCache(cacheKeys.bookingReservationsList, cacheTtlMs.list, (value) =>
    isList<BookingReservationRecord>(value)
  );

const readBlackoutsCache = () =>
  readLocalCache(cacheKeys.bookingBlackoutsList, cacheTtlMs.list, (value) =>
    isList<BookingBlackoutRecord>(value)
  );

const primeResourcesCache = (items: BookingResourceRecord[]) => {
  cachedResources = items;
  cachedResourcesPromise = null;
  writeLocalCache(cacheKeys.bookingResourcesList, items);
};

const primeServicesCache = (items: BookingServiceRecord[]) => {
  cachedServices = items;
  cachedServicesPromise = null;
  writeLocalCache(cacheKeys.bookingServicesList, items);
};

const primeReservationsCache = (items: BookingReservationRecord[]) => {
  cachedReservations = items;
  cachedReservationsPromise = null;
  writeLocalCache(cacheKeys.bookingReservationsList, items);
};

const primeBlackoutsCache = (items: BookingBlackoutRecord[]) => {
  cachedBlackouts = items;
  cachedBlackoutsPromise = null;
  writeLocalCache(cacheKeys.bookingBlackoutsList, items);
};

const upsertResource = (item: BookingResourceRecord) => {
  const current = cachedResources ?? readResourcesCache() ?? [];
  const index = current.findIndex((entry) => entry.id === item.id);
  const next = [...current];
  if (index === -1) next.unshift(item);
  else next[index] = { ...next[index], ...item };
  primeResourcesCache(next);
};

const upsertService = (item: BookingServiceRecord) => {
  const current = cachedServices ?? readServicesCache() ?? [];
  const index = current.findIndex((entry) => entry.id === item.id);
  const next = [...current];
  if (index === -1) next.unshift(item);
  else next[index] = { ...next[index], ...item };
  primeServicesCache(next);
};

const upsertReservation = (item: BookingReservationRecord) => {
  const current = cachedReservations ?? readReservationsCache() ?? [];
  const index = current.findIndex((entry) => entry.id === item.id);
  const next = [...current];
  if (index === -1) next.unshift(item);
  else next[index] = { ...next[index], ...item };
  primeReservationsCache(next);
};

const removeResource = (id: string) => {
  const current = cachedResources ?? readResourcesCache();
  if (current) primeResourcesCache(current.filter((entry) => entry.id !== id));
  clearLocalCache(cacheKeys.bookingResourceSchedules(id));
};

const removeService = (id: string) => {
  const current = cachedServices ?? readServicesCache();
  if (current) primeServicesCache(current.filter((entry) => entry.id !== id));
  clearLocalCache(cacheKeys.bookingServiceResources(id));
};

export const getCachedBookingResources = () => {
  if (cachedResources) return cachedResources;
  const cached = readResourcesCache();
  if (cached) cachedResources = cached;
  return cachedResources;
};

export const getCachedBookingServices = () => {
  if (cachedServices) return cachedServices;
  const cached = readServicesCache();
  if (cached) cachedServices = cached;
  return cachedServices;
};

export const getCachedBookingReservations = () => {
  if (cachedReservations) return cachedReservations;
  const cached = readReservationsCache();
  if (cached) cachedReservations = cached;
  return cachedReservations;
};

export const getCachedBookingBlackouts = () => {
  if (cachedBlackouts) return cachedBlackouts;
  const cached = readBlackoutsCache();
  if (cached) cachedBlackouts = cached;
  return cachedBlackouts;
};

export async function listBookingResources() {
  const payload = await apiRequest<{ items: BookingResourceRecord[] }>("/booking/resources", {
    method: "GET",
  });
  return payload.items ?? [];
}

export async function listBookingResourcesCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedBookingResources();
    if (cached) return cached;
    if (cachedResourcesPromise) return cachedResourcesPromise;
  }
  const request = listBookingResources();
  cachedResourcesPromise = request;
  const items = await request;
  primeResourcesCache(items);
  return items;
}

export async function createBookingResource(input: BookingResourceInput) {
  const created = await apiRequest<BookingResourceRecord>(
    "/booking/resources",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  if (created) {
    upsertResource(created);
    broadcastCacheEvent({ key: cacheKeys.bookingResourcesList, action: "update" });
  }
  return created;
}

export async function updateBookingResource(id: string, input: Partial<BookingResourceInput>) {
  const updated = await apiRequest<BookingResourceRecord>(
    `/booking/resources/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  if (updated) {
    upsertResource(updated);
    broadcastCacheEvent({ key: cacheKeys.bookingResourcesList, action: "update" });
  }
  return updated;
}

export async function deleteBookingResource(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/booking/resources/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  if (result?.ok) {
    removeResource(id);
    broadcastCacheEvent({ key: cacheKeys.bookingResourcesList, action: "invalidate" });
  }
  return result;
}

export async function listBookingServices() {
  const payload = await apiRequest<{ items: BookingServiceRecord[] }>("/booking/services", {
    method: "GET",
  });
  return payload.items ?? [];
}

export async function listBookingServicesCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedBookingServices();
    if (cached) return cached;
    if (cachedServicesPromise) return cachedServicesPromise;
  }
  const request = listBookingServices();
  cachedServicesPromise = request;
  const items = await request;
  primeServicesCache(items);
  return items;
}

export async function createBookingService(input: BookingServiceInput) {
  const created = await apiRequest<BookingServiceRecord>(
    "/booking/services",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  if (created) {
    upsertService(created);
    broadcastCacheEvent({ key: cacheKeys.bookingServicesList, action: "update" });
  }
  return created;
}

export async function updateBookingService(id: string, input: Partial<BookingServiceInput>) {
  const updated = await apiRequest<BookingServiceRecord>(
    `/booking/services/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  if (updated) {
    upsertService(updated);
    broadcastCacheEvent({ key: cacheKeys.bookingServicesList, action: "update" });
  }
  return updated;
}

export async function deleteBookingService(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/booking/services/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  if (result?.ok) {
    removeService(id);
    broadcastCacheEvent({ key: cacheKeys.bookingServicesList, action: "invalidate" });
  }
  return result;
}

export async function listBookingServiceResources(serviceId: string) {
  const payload = await apiRequest<{ items: BookingServiceResourceRecord[] }>(
    `/booking/services/${serviceId}/resources`,
    { method: "GET" }
  );
  const items = payload.items ?? [];
  writeLocalCache(cacheKeys.bookingServiceResources(serviceId), items);
  return items;
}

export async function listBookingServiceResourcesCached(
  serviceId: string,
  options?: { force?: boolean }
) {
  if (!options?.force) {
    const cached = readLocalCache(
      cacheKeys.bookingServiceResources(serviceId),
      cacheTtlMs.detail,
      (value): value is BookingServiceResourceRecord[] =>
        isList<BookingServiceResourceRecord>(value)
    );
    if (cached) return cached;
  }
  return listBookingServiceResources(serviceId);
}

export async function setBookingServiceResources(
  serviceId: string,
  input: BookingServiceResourceInput[]
) {
  const payload = await apiRequest<{ items: BookingServiceResourceRecord[] }>(
    `/booking/services/${serviceId}/resources`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  const items = payload.items ?? [];
  writeLocalCache(cacheKeys.bookingServiceResources(serviceId), items);
  broadcastCacheEvent({ key: cacheKeys.bookingServiceResources(serviceId), action: "update" });
  return items;
}

export async function listBookingSchedules(resourceId: string) {
  const payload = await apiRequest<{ items: BookingScheduleRecord[] }>(
    `/booking/resources/${resourceId}/schedules`,
    {
      method: "GET",
    }
  );
  const items = payload.items ?? [];
  writeLocalCache(cacheKeys.bookingResourceSchedules(resourceId), items);
  return items;
}

export async function listBookingSchedulesCached(
  resourceId: string,
  options?: { force?: boolean }
) {
  if (!options?.force) {
    const cached = readLocalCache(
      cacheKeys.bookingResourceSchedules(resourceId),
      cacheTtlMs.detail,
      (value): value is BookingScheduleRecord[] => isList<BookingScheduleRecord>(value)
    );
    if (cached) return cached;
  }
  return listBookingSchedules(resourceId);
}

export async function setBookingSchedules(resourceId: string, input: BookingScheduleInput[]) {
  const payload = await apiRequest<{ items: BookingScheduleRecord[] }>(
    `/booking/resources/${resourceId}/schedules`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  const items = payload.items ?? [];
  writeLocalCache(cacheKeys.bookingResourceSchedules(resourceId), items);
  return items;
}

export async function listBookingBlackouts(input?: { resourceId?: string }) {
  const params = new URLSearchParams();
  if (input?.resourceId) params.set("resourceId", input.resourceId);
  const query = params.toString();
  const route = query ? `/booking/blackouts?${query}` : "/booking/blackouts";
  const payload = await apiRequest<{ items: BookingBlackoutRecord[] }>(route, {
    method: "GET",
  });
  return payload.items ?? [];
}

export async function listBookingBlackoutsCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedBookingBlackouts();
    if (cached) return cached;
    if (cachedBlackoutsPromise) return cachedBlackoutsPromise;
  }
  const request = listBookingBlackouts();
  cachedBlackoutsPromise = request;
  const items = await request;
  primeBlackoutsCache(items);
  return items;
}

export async function createBookingBlackout(input: BookingBlackoutInput) {
  const created = await apiRequest<BookingBlackoutRecord>(
    "/booking/blackouts",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  if (created) {
    const current = cachedBlackouts ?? readBlackoutsCache() ?? [];
    primeBlackoutsCache([created, ...current]);
    broadcastCacheEvent({ key: cacheKeys.bookingBlackoutsList, action: "update" });
  }
  return created;
}

export async function deleteBookingBlackout(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/booking/blackouts/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  if (result?.ok) {
    const current = cachedBlackouts ?? readBlackoutsCache();
    if (current) primeBlackoutsCache(current.filter((entry) => entry.id !== id));
    broadcastCacheEvent({ key: cacheKeys.bookingBlackoutsList, action: "invalidate" });
  }
  return result;
}

export async function previewBookingSlots(input: BookingSlotPreviewInput) {
  const payload = await apiRequest<{ items: BookingSlotRecord[] }>(
    "/booking/slots/preview",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  return payload.items ?? [];
}

export async function listBookingReservations(input?: {
  resourceId?: string;
  serviceId?: string;
  status?: BookingReservationStatus;
  from?: string;
  to?: string;
}) {
  const params = new URLSearchParams();
  if (input?.resourceId) params.set("resourceId", input.resourceId);
  if (input?.serviceId) params.set("serviceId", input.serviceId);
  if (input?.status) params.set("status", input.status);
  if (input?.from) params.set("from", input.from);
  if (input?.to) params.set("to", input.to);
  const query = params.toString();
  const route = query ? `/booking/reservations?${query}` : "/booking/reservations";
  const payload = await apiRequest<{ items: BookingReservationRecord[] }>(route, {
    method: "GET",
  });
  return payload.items ?? [];
}

export async function listBookingReservationsCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedBookingReservations();
    if (cached) return cached;
    if (cachedReservationsPromise) return cachedReservationsPromise;
  }
  const request = listBookingReservations();
  cachedReservationsPromise = request;
  const items = await request;
  primeReservationsCache(items);
  return items;
}

export async function createBookingReservation(input: BookingReservationInput) {
  const created = await apiRequest<BookingReservationRecord>(
    "/booking/reservations",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
  if (created) {
    upsertReservation(created);
    broadcastCacheEvent({ key: cacheKeys.bookingReservationsList, action: "update" });
  }
  return created;
}

export async function updateBookingReservationStatus(id: string, status: BookingReservationStatus) {
  const updated = await apiRequest<BookingReservationRecord>(
    `/booking/reservations/${id}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
    { withCsrf: true }
  );
  if (updated) {
    upsertReservation(updated);
    broadcastCacheEvent({ key: cacheKeys.bookingReservationsList, action: "update" });
  }
  return updated;
}
