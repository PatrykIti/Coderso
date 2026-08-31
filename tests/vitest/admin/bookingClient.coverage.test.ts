import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  apiRequest,
  readLocalCache,
  writeLocalCache,
  clearLocalCache,
  broadcastCacheEvent,
  resetLocalCache,
  primeLocalCache,
  readLocalCacheValue,
} = vi.hoisted(() => {
  const localCacheStore = new Map<string, unknown>();
  return {
    apiRequest: vi.fn(),
    readLocalCache: vi.fn(),
    writeLocalCache: vi.fn(),
    clearLocalCache: vi.fn(),
    broadcastCacheEvent: vi.fn(),
    resetLocalCache: () => {
      localCacheStore.clear();
    },
    primeLocalCache: (key: string, value: unknown) => {
      localCacheStore.set(key, value);
    },
    readLocalCacheValue: (key: string) => localCacheStore.get(key) ?? null,
  };
});

vi.mock("@/services/apiClient", () => ({
  apiRequest,
  ApiClientError: class ApiClientError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status: number) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
  getCsrfToken: vi.fn(() => Promise.resolve("csrf-token")),
  isApiClientError: (error: unknown) => error instanceof Error && error.name === "ApiClientError",
}));

vi.mock("@/utils/storageCache", () => ({
  readLocalCache,
  writeLocalCache,
  clearLocalCache,
  createMemoryBackedLocalCache: () => ({
    read: readLocalCache,
    write: writeLocalCache,
    clear: clearLocalCache,
  }),
}));

vi.mock("@/utils/cacheBus", () => ({ broadcastCacheEvent }));

import {
  clearBookingCache,
  createBookingBlackout,
  createBookingReservation,
  createBookingResource,
  createBookingService,
  deleteBookingBlackout,
  deleteBookingResource,
  deleteBookingService,
  getCachedBookingBlackouts,
  getCachedBookingReservations,
  getCachedBookingResources,
  getCachedBookingServices,
  listBookingBlackouts,
  listBookingBlackoutsCached,
  listBookingReservations,
  listBookingReservationsCached,
  listBookingResources,
  listBookingResourcesCached,
  listBookingSchedules,
  listBookingSchedulesCached,
  listBookingServiceResources,
  listBookingServiceResourcesCached,
  listBookingServices,
  listBookingServicesCached,
  previewBookingSlots,
  resolveBookingSubmissionAccess,
  setBookingSchedules,
  setBookingServiceResources,
  updateBookingResource,
  updateBookingReservationStatus,
  updateBookingService,
  withBookingSubmissionAccess,
} from "../../../core/admin/services/bookingClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";

const resource = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "resource-1",
  name: "Main Bay",
  slug: "main-bay",
  type: "bay",
  status: "active",
  timezone: "UTC",
  capacity: 1,
  settings: {},
  createdAt: "2026-02-18T00:00:00.000Z",
  updatedAt: "2026-02-18T00:00:00.000Z",
  ...overrides,
});

const service = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "service-1",
  name: "Oil Change",
  slug: "oil-change",
  status: "active",
  description: null,
  durationMinutes: 30,
  bufferBeforeMinutes: 5,
  bufferAfterMinutes: 5,
  priceCents: null,
  currency: null,
  settings: {},
  createdAt: "2026-02-18T00:00:00.000Z",
  updatedAt: "2026-02-18T00:00:00.000Z",
  ...overrides,
});

const schedule = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "schedule-1",
  resourceId: "resource-1",
  dayOfWeek: 1,
  startMinute: 480,
  endMinute: 1020,
  timezone: "UTC",
  isAvailable: true,
  createdAt: "2026-02-18T00:00:00.000Z",
  updatedAt: "2026-02-18T00:00:00.000Z",
  ...overrides,
});

const blackout = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "blackout-1",
  resourceId: null,
  startsAt: "2026-03-01T00:00:00.000Z",
  endsAt: "2026-03-01T23:59:59.000Z",
  reason: null,
  createdAt: "2026-02-18T00:00:00.000Z",
  ...overrides,
});

const reservation = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "reservation-1",
  serviceId: "service-1",
  resourceId: "resource-1",
  formSubmissionId: null,
  status: "pending",
  customerName: "Patryk",
  customerEmail: "test@example.com",
  customerPhone: null,
  notes: null,
  startsAt: "2026-02-20T10:00:00.000Z",
  endsAt: "2026-02-20T11:00:00.000Z",
  timezone: "UTC",
  metadata: {},
  createdAt: "2026-02-18T00:00:00.000Z",
  updatedAt: "2026-02-18T00:00:00.000Z",
  ...overrides,
});

const json = (init: Record<string, unknown>) => ({
  headers: { "Content-Type": "application/json" },
  ...init,
});

beforeEach(() => {
  vi.resetAllMocks();
  resetLocalCache();
  readLocalCache.mockImplementation(
    (key: string, _ttlMs: number, validate?: (value: unknown) => boolean) => {
      const value = readLocalCacheValue(key);
      if (value === null) return null;
      if (validate && !validate(value)) return null;
      return value;
    }
  );
  writeLocalCache.mockImplementation((key: string, value: unknown) => {
    primeLocalCache(key, value);
  });
  clearLocalCache.mockImplementation((key: string) => {
    primeLocalCache(key, undefined);
  });
  clearBookingCache();
});

describe("resolveBookingSubmissionAccess", () => {
  test("falls back for non-record settings and unknown modes", () => {
    expect(resolveBookingSubmissionAccess(null)).toBe("public");
    expect(resolveBookingSubmissionAccess([])).toBe("public");
    expect(resolveBookingSubmissionAccess("public")).toBe("public");
    expect(resolveBookingSubmissionAccess({ submissionAccess: "unknown" })).toBe("public");
    expect(resolveBookingSubmissionAccess({ submissionAccess: "public" })).toBe("public");
    expect(resolveBookingSubmissionAccess({ submissionAccess: "internal" })).toBe("internal");
    expect(resolveBookingSubmissionAccess({}, "internal")).toBe("internal");
  });

  test("withBookingSubmissionAccess preserves records and handles non-records", () => {
    expect(withBookingSubmissionAccess({ color: "red" }, "internal")).toEqual({
      color: "red",
      submissionAccess: "internal",
    });
    expect(withBookingSubmissionAccess(null, "internal")).toEqual({
      submissionAccess: "internal",
    });
  });
});

describe("getCachedBooking* read paths", () => {
  test("hydrates each family from its own local cache key", () => {
    const items = [resource()];
    writeLocalCache(cacheKeys.bookingResourcesList, items);
    expect(getCachedBookingResources()).toEqual(items);
    expect(getCachedBookingServices()).toBeNull();
    expect(getCachedBookingReservations()).toBeNull();
    expect(getCachedBookingBlackouts()).toBeNull();
    expect(getCachedBookingResources()).toEqual(items);
  });

  test("returns null when no local cache exists", () => {
    expect(getCachedBookingResources()).toBeNull();
    expect(getCachedBookingServices()).toBeNull();
    expect(getCachedBookingReservations()).toBeNull();
    expect(getCachedBookingBlackouts()).toBeNull();
  });
});

describe("booking resources", () => {
  test("listBookingResources issues GET without CSRF and defaults missing items", async () => {
    apiRequest.mockResolvedValueOnce({});
    await expect(listBookingResources()).resolves.toEqual([]);
    expect(apiRequest).toHaveBeenCalledWith("/booking/resources", { method: "GET" });

    apiRequest.mockResolvedValueOnce({ items: [resource()] });
    await expect(listBookingResources()).resolves.toEqual([resource()]);
  });

  test("listBookingResourcesCached short-circuits on cache hit and in-flight promise", async () => {
    const items = [resource()];
    writeLocalCache(cacheKeys.bookingResourcesList, items);
    await expect(listBookingResourcesCached()).resolves.toEqual(items);
    expect(apiRequest).not.toHaveBeenCalled();
    clearBookingCache();

    apiRequest.mockResolvedValueOnce({ items });
    const first = listBookingResourcesCached();
    const second = listBookingResourcesCached();
    await expect(Promise.all([first, second])).resolves.toEqual([items, items]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  test("listBookingResourcesCached fetches, primes and honors force", async () => {
    apiRequest.mockResolvedValueOnce({ items: [resource({ name: "A" })] });
    await expect(listBookingResourcesCached()).resolves.toEqual([resource({ name: "A" })]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.bookingResourcesList, [
      resource({ name: "A" }),
    ]);

    apiRequest.mockResolvedValueOnce({ items: [resource({ name: "B" })] });
    await expect(listBookingResourcesCached({ force: true })).resolves.toEqual([
      resource({ name: "B" }),
    ]);
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });

  test("createBookingResource posts with CSRF, upserts and broadcasts", async () => {
    const created = resource();
    apiRequest.mockResolvedValueOnce(created);
    await expect(
      createBookingResource({ name: "Main Bay", type: "bay", timezone: "UTC", capacity: 1 })
    ).resolves.toEqual(created);
    expect(apiRequest).toHaveBeenCalledWith(
      "/booking/resources",
      json({
        method: "POST",
        body: JSON.stringify({ name: "Main Bay", type: "bay", timezone: "UTC", capacity: 1 }),
      }),
      { withCsrf: true }
    );
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.bookingResourcesList, [created]);
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.bookingResourcesList,
      action: "update",
    });
    expect(getCachedBookingResources()).toEqual([created]);
  });

  test("createBookingResource with falsy response skips cache writes", async () => {
    apiRequest.mockResolvedValueOnce(null);
    await expect(createBookingResource({ name: "X" })).resolves.toBeNull();
    expect(writeLocalCache).not.toHaveBeenCalled();
    expect(broadcastCacheEvent).not.toHaveBeenCalled();
  });

  test("createBookingResource replaces an existing cache entry in place", async () => {
    writeLocalCache(cacheKeys.bookingResourcesList, [resource({ name: "Old" })]);
    const updated = resource({ name: "New" });
    apiRequest.mockResolvedValueOnce(updated);
    await createBookingResource({ name: "New" });
    expect(getCachedBookingResources()).toEqual([updated]);
  });

  test("updateBookingResource patches and merges the cached record", async () => {
    const updated = resource({ name: "Renamed" });
    apiRequest.mockResolvedValueOnce(updated);
    await updateBookingResource("resource-1", { name: "Renamed" });
    expect(apiRequest).toHaveBeenCalledWith(
      "/booking/resources/resource-1",
      json({ method: "PATCH", body: JSON.stringify({ name: "Renamed" }) }),
      { withCsrf: true }
    );
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.bookingResourcesList,
      action: "update",
    });
  });

  test("deleteBookingResource removes the entry and invalidates schedules", async () => {
    writeLocalCache(cacheKeys.bookingResourcesList, [resource(), resource({ id: "resource-2" })]);
    apiRequest.mockResolvedValueOnce({ ok: true });
    await deleteBookingResource("resource-1");
    expect(apiRequest).toHaveBeenCalledWith(
      "/booking/resources/resource-1",
      { method: "DELETE" },
      { withCsrf: true }
    );
    expect(getCachedBookingResources()).toEqual([resource({ id: "resource-2" })]);
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.bookingResourceSchedules("resource-1"));
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.bookingResourcesList,
      action: "invalidate",
    });
  });

  test("deleteBookingResource with falsy response keeps cache and skips broadcast", async () => {
    apiRequest.mockResolvedValueOnce(undefined);
    await deleteBookingResource("resource-1");
    expect(broadcastCacheEvent).not.toHaveBeenCalled();
  });

  test("propagates api client rejections with the machine code intact", async () => {
    apiRequest.mockRejectedValueOnce({
      name: "ApiClientError",
      code: "booking_invalid",
      status: 400,
    });
    await expect(deleteBookingResource("resource-1")).rejects.toMatchObject({
      code: "booking_invalid",
    });
  });
});

describe("booking services", () => {
  test("listBookingServices issues GET and defaults missing items", async () => {
    apiRequest.mockResolvedValueOnce({});
    await expect(listBookingServices()).resolves.toEqual([]);
    expect(apiRequest).toHaveBeenCalledWith("/booking/services", { method: "GET" });
  });

  test("listBookingServicesCached hits cache, in-flight promise and force", async () => {
    const items = [service()];
    writeLocalCache(cacheKeys.bookingServicesList, items);
    await expect(listBookingServicesCached()).resolves.toEqual(items);
    expect(apiRequest).not.toHaveBeenCalled();
    clearBookingCache();

    apiRequest.mockResolvedValueOnce({ items });
    const first = listBookingServicesCached();
    const second = listBookingServicesCached();
    await expect(Promise.all([first, second])).resolves.toEqual([items, items]);
    expect(apiRequest).toHaveBeenCalledTimes(1);

    apiRequest.mockResolvedValueOnce({ items: [service({ name: "Brakes" })] });
    await expect(listBookingServicesCached({ force: true })).resolves.toEqual([
      service({ name: "Brakes" }),
    ]);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.bookingServicesList, [
      service({ name: "Brakes" }),
    ]);
  });

  test("createBookingService upserts and broadcasts", async () => {
    const created = service();
    apiRequest.mockResolvedValueOnce(created);
    await createBookingService({ name: "Oil Change", durationMinutes: 30 });
    expect(apiRequest).toHaveBeenCalledWith(
      "/booking/services",
      json({
        method: "POST",
        body: JSON.stringify({ name: "Oil Change", durationMinutes: 30 }),
      }),
      { withCsrf: true }
    );
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.bookingServicesList,
      action: "update",
    });
  });

  test("updateBookingService merges into an existing cached service", async () => {
    writeLocalCache(cacheKeys.bookingServicesList, [service({ name: "Old" })]);
    apiRequest.mockResolvedValueOnce(service({ name: "New" }));
    await updateBookingService("service-1", { name: "New" });
    expect(apiRequest).toHaveBeenCalledWith(
      "/booking/services/service-1",
      json({ method: "PATCH", body: JSON.stringify({ name: "New" }) }),
      { withCsrf: true }
    );
    expect(getCachedBookingServices()).toEqual([service({ name: "New" })]);
  });

  test("deleteBookingService removes entry and clears service-resources cache", async () => {
    writeLocalCache(cacheKeys.bookingServicesList, [service(), service({ id: "service-2" })]);
    apiRequest.mockResolvedValueOnce({ ok: true });
    await deleteBookingService("service-1");
    expect(getCachedBookingServices()).toEqual([service({ id: "service-2" })]);
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.bookingServiceResources("service-1"));
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.bookingServicesList,
      action: "invalidate",
    });
  });
});

describe("booking service resources", () => {
  const link = (overrides: Partial<Record<string, unknown>> = {}) => ({
    serviceId: "service-1",
    resourceId: "resource-1",
    isRequired: true,
    createdAt: "2026-02-18T00:00:00.000Z",
    ...overrides,
  });

  test("listBookingServiceResources fetches and writes the detail cache", async () => {
    const links = [link()];
    apiRequest.mockResolvedValueOnce({ items: links });
    await expect(listBookingServiceResources("service-1")).resolves.toEqual(links);
    expect(apiRequest).toHaveBeenCalledWith("/booking/services/service-1/resources", {
      method: "GET",
    });
    expect(writeLocalCache).toHaveBeenCalledWith(
      cacheKeys.bookingServiceResources("service-1"),
      links
    );
  });

  test("listBookingServiceResourcesCached short-circuits apiRequest on hit", async () => {
    const links = [link({ isRequired: false })];
    writeLocalCache(cacheKeys.bookingServiceResources("service-1"), links);
    await expect(listBookingServiceResourcesCached("service-1")).resolves.toEqual(links);
    expect(apiRequest).not.toHaveBeenCalled();

    clearLocalCache(cacheKeys.bookingServiceResources("service-1"));
    apiRequest.mockResolvedValueOnce({ items: [] });
    await expect(listBookingServiceResourcesCached("service-1")).resolves.toEqual([]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  test("setBookingServiceResources puts with CSRF, writes cache and broadcasts", async () => {
    const links = [link()];
    apiRequest.mockResolvedValueOnce({ items: links });
    await setBookingServiceResources("service-1", [{ resourceId: "resource-1", isRequired: true }]);
    expect(apiRequest).toHaveBeenCalledWith(
      "/booking/services/service-1/resources",
      json({
        method: "PUT",
        body: JSON.stringify([{ resourceId: "resource-1", isRequired: true }]),
      }),
      { withCsrf: true }
    );
    expect(writeLocalCache).toHaveBeenCalledWith(
      cacheKeys.bookingServiceResources("service-1"),
      links
    );
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.bookingServiceResources("service-1"),
      action: "update",
    });
  });
});

describe("booking schedules", () => {
  test("listBookingSchedules fetches and writes the schedule cache", async () => {
    const schedules = [schedule()];
    apiRequest.mockResolvedValueOnce({ items: schedules });
    await expect(listBookingSchedules("resource-1")).resolves.toEqual(schedules);
    expect(apiRequest).toHaveBeenCalledWith("/booking/resources/resource-1/schedules", {
      method: "GET",
    });
    expect(writeLocalCache).toHaveBeenCalledWith(
      cacheKeys.bookingResourceSchedules("resource-1"),
      schedules
    );
  });

  test("listBookingSchedulesCached reads from cache and falls back to fetch", async () => {
    const schedules = [schedule()];
    writeLocalCache(cacheKeys.bookingResourceSchedules("resource-1"), schedules);
    await expect(listBookingSchedulesCached("resource-1")).resolves.toEqual(schedules);
    expect(apiRequest).not.toHaveBeenCalled();

    clearLocalCache(cacheKeys.bookingResourceSchedules("resource-1"));
    apiRequest.mockResolvedValueOnce({ items: schedules });
    await expect(listBookingSchedulesCached("resource-1")).resolves.toEqual(schedules);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  test("setBookingSchedules puts with CSRF and writes the cache", async () => {
    const schedules = [schedule()];
    apiRequest.mockResolvedValueOnce({ items: schedules });
    await setBookingSchedules("resource-1", [
      { dayOfWeek: 1, startMinute: 480, endMinute: 1020, timezone: "UTC", isAvailable: true },
    ]);
    expect(apiRequest).toHaveBeenCalledWith(
      "/booking/resources/resource-1/schedules",
      json({
        method: "PUT",
        body: JSON.stringify([
          { dayOfWeek: 1, startMinute: 480, endMinute: 1020, timezone: "UTC", isAvailable: true },
        ]),
      }),
      { withCsrf: true }
    );
    expect(writeLocalCache).toHaveBeenCalledWith(
      cacheKeys.bookingResourceSchedules("resource-1"),
      schedules
    );
  });
});

describe("booking blackouts", () => {
  test("listBookingBlackouts builds the query string from optional filters", async () => {
    apiRequest.mockResolvedValueOnce({ items: [] });
    await expect(listBookingBlackouts()).resolves.toEqual([]);
    expect(apiRequest).toHaveBeenCalledWith("/booking/blackouts", { method: "GET" });

    apiRequest.mockResolvedValueOnce({ items: [blackout()] });
    await expect(listBookingBlackouts({ resourceId: "resource-1" })).resolves.toEqual([blackout()]);
    expect(apiRequest).toHaveBeenCalledWith("/booking/blackouts?resourceId=resource-1", {
      method: "GET",
    });
  });

  test("listBookingBlackoutsCached hits cache, in-flight and force paths", async () => {
    const items = [blackout()];
    writeLocalCache(cacheKeys.bookingBlackoutsList, items);
    await expect(listBookingBlackoutsCached()).resolves.toEqual(items);
    expect(apiRequest).not.toHaveBeenCalled();
    clearBookingCache();

    apiRequest.mockResolvedValueOnce({ items });
    const first = listBookingBlackoutsCached();
    const second = listBookingBlackoutsCached();
    await expect(Promise.all([first, second])).resolves.toEqual([items, items]);
    expect(apiRequest).toHaveBeenCalledTimes(1);

    apiRequest.mockResolvedValueOnce({ items: [blackout({ id: "blackout-2" })] });
    await expect(listBookingBlackoutsCached({ force: true })).resolves.toEqual([
      blackout({ id: "blackout-2" }),
    ]);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.bookingBlackoutsList, [
      blackout({ id: "blackout-2" }),
    ]);
  });

  test("createBookingBlackout prepends to the blackout cache and broadcasts", async () => {
    writeLocalCache(cacheKeys.bookingBlackoutsList, [blackout({ id: "blackout-2" })]);
    const created = blackout();
    apiRequest.mockResolvedValueOnce(created);
    await createBookingBlackout({
      startsAt: "2026-03-01T00:00:00.000Z",
      endsAt: "2026-03-01T23:59:59.000Z",
    });
    expect(apiRequest).toHaveBeenCalledWith(
      "/booking/blackouts",
      json({
        method: "POST",
        body: JSON.stringify({
          startsAt: "2026-03-01T00:00:00.000Z",
          endsAt: "2026-03-01T23:59:59.000Z",
        }),
      }),
      { withCsrf: true }
    );
    expect(getCachedBookingBlackouts()).toEqual([created, blackout({ id: "blackout-2" })]);
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.bookingBlackoutsList,
      action: "update",
    });
  });

  test("deleteBookingBlackout filters the cache and broadcasts", async () => {
    writeLocalCache(cacheKeys.bookingBlackoutsList, [blackout(), blackout({ id: "blackout-2" })]);
    apiRequest.mockResolvedValueOnce({ ok: true });
    await deleteBookingBlackout("blackout-1");
    expect(apiRequest).toHaveBeenCalledWith(
      "/booking/blackouts/blackout-1",
      { method: "DELETE" },
      { withCsrf: true }
    );
    expect(getCachedBookingBlackouts()).toEqual([blackout({ id: "blackout-2" })]);
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.bookingBlackoutsList,
      action: "invalidate",
    });
  });

  test("deleteBookingBlackout without cached blackouts skips the filter", async () => {
    apiRequest.mockResolvedValueOnce({ ok: true });
    await deleteBookingBlackout("blackout-1");
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.bookingBlackoutsList,
      action: "invalidate",
    });
  });
});

describe("booking slots and reservations", () => {
  test("previewBookingSlots posts with CSRF and returns slot items", async () => {
    const slots = [
      { startsAt: "2026-02-20T10:00:00.000Z", endsAt: "2026-02-20T10:30:00.000Z", timezone: "UTC" },
    ];
    apiRequest.mockResolvedValueOnce({ items: slots });
    await expect(
      previewBookingSlots({
        serviceId: "service-1",
        resourceId: "resource-1",
        date: "2026-02-20",
        timezone: "UTC",
        intervalMinutes: 30,
      })
    ).resolves.toEqual(slots);
    expect(apiRequest).toHaveBeenCalledWith(
      "/booking/slots/preview",
      json({
        method: "POST",
        body: JSON.stringify({
          serviceId: "service-1",
          resourceId: "resource-1",
          date: "2026-02-20",
          timezone: "UTC",
          intervalMinutes: 30,
        }),
      }),
      { withCsrf: true }
    );
  });

  test("listBookingReservations builds query params and defaults items", async () => {
    apiRequest.mockResolvedValueOnce({});
    await expect(listBookingReservations()).resolves.toEqual([]);
    expect(apiRequest).toHaveBeenCalledWith("/booking/reservations", { method: "GET" });

    apiRequest.mockResolvedValueOnce({ items: [reservation()] });
    await listBookingReservations({
      resourceId: "resource-1",
      serviceId: "service-1",
      status: "confirmed",
      from: "2026-02-01",
      to: "2026-02-28",
    });
    expect(apiRequest).toHaveBeenCalledWith(
      "/booking/reservations?resourceId=resource-1&serviceId=service-1&status=confirmed&from=2026-02-01&to=2026-02-28",
      { method: "GET" }
    );
  });

  test("listBookingReservationsCached hits cache, in-flight and force paths", async () => {
    const items = [reservation()];
    writeLocalCache(cacheKeys.bookingReservationsList, items);
    await expect(listBookingReservationsCached()).resolves.toEqual(items);
    expect(apiRequest).not.toHaveBeenCalled();
    clearBookingCache();

    apiRequest.mockResolvedValueOnce({ items });
    const first = listBookingReservationsCached();
    const second = listBookingReservationsCached();
    await expect(Promise.all([first, second])).resolves.toEqual([items, items]);
    expect(apiRequest).toHaveBeenCalledTimes(1);

    apiRequest.mockResolvedValueOnce({ items: [reservation({ status: "confirmed" })] });
    await expect(listBookingReservationsCached({ force: true })).resolves.toEqual([
      reservation({ status: "confirmed" }),
    ]);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.bookingReservationsList, [
      reservation({ status: "confirmed" }),
    ]);
  });

  test("createBookingReservation upserts and broadcasts", async () => {
    const created = reservation();
    apiRequest.mockResolvedValueOnce(created);
    await createBookingReservation({
      serviceId: "service-1",
      resourceId: "resource-1",
      startsAt: "2026-02-20T10:00:00.000Z",
      endsAt: "2026-02-20T11:00:00.000Z",
      customerName: "Patryk",
    });
    expect(apiRequest).toHaveBeenCalledWith(
      "/booking/reservations",
      json({
        method: "POST",
        body: JSON.stringify({
          serviceId: "service-1",
          resourceId: "resource-1",
          startsAt: "2026-02-20T10:00:00.000Z",
          endsAt: "2026-02-20T11:00:00.000Z",
          customerName: "Patryk",
        }),
      }),
      { withCsrf: true }
    );
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.bookingReservationsList,
      action: "update",
    });
  });

  test("updateBookingReservationStatus patches and merges the cached reservation", async () => {
    writeLocalCache(cacheKeys.bookingReservationsList, [reservation()]);
    apiRequest.mockResolvedValueOnce(reservation({ status: "confirmed" }));
    await updateBookingReservationStatus("reservation-1", "confirmed");
    expect(apiRequest).toHaveBeenCalledWith(
      "/booking/reservations/reservation-1/status",
      json({ method: "PATCH", body: JSON.stringify({ status: "confirmed" }) }),
      { withCsrf: true }
    );
    expect(getCachedBookingReservations()).toEqual([reservation({ status: "confirmed" })]);
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.bookingReservationsList,
      action: "update",
    });
  });
});
