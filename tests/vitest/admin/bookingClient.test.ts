import { expect, test } from "vitest";

import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import {
  clearBookingCache,
  createBookingResource,
  listBookingResources,
  listBookingResourcesCached,
  previewBookingSlots,
  setBookingSchedules,
  updateBookingReservationStatus,
} from "../../../core/admin/services/bookingClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const createLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

test("listBookingResources hits GET /booking/resources", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  clearBookingCache();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };

  try {
    await listBookingResources();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/booking/resources");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
    clearBookingCache();
  }
});

test("createBookingResource uses CSRF and posts payload", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  clearBookingCache();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
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
    });
  };

  try {
    resetCsrfToken();
    await createBookingResource({
      name: "Main Bay",
      type: "bay",
      timezone: "UTC",
      capacity: 1,
    });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/booking/resources");
    expect(calls[1]?.init?.method).toBe("POST");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
    const body = JSON.parse(calls[1]?.init?.body as string);
    expect(body.name).toBe("Main Bay");
    expect(body.type).toBe("bay");
  } finally {
    globalThis.fetch = originalFetch;
    clearBookingCache();
  }
});

test("listBookingResourcesCached reads from local storage", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createLocalStorage();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  clearBookingCache();

  try {
    storage.setItem(
      cacheKeys.bookingResourcesList,
      JSON.stringify({
        value: [
          {
            id: "resource-1",
            name: "Cached Resource",
            slug: "cached-resource",
            type: "staff",
            status: "active",
            timezone: "UTC",
            capacity: 1,
            settings: {},
            createdAt: "2026-02-18T00:00:00.000Z",
            updatedAt: "2026-02-18T00:00:00.000Z",
          },
        ],
        savedAt: Date.now(),
      })
    );

    const items = await listBookingResourcesCached();
    expect(items).toHaveLength(1);
    expect(items[0]?.name).toBe("Cached Resource");
    expect(calls.length).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    clearBookingCache();
  }
});

test("setBookingSchedules sends PUT payload", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  clearBookingCache();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ items: [] });
  };

  try {
    resetCsrfToken();
    await setBookingSchedules("resource-1", [
      {
        dayOfWeek: 1,
        startMinute: 480,
        endMinute: 1020,
        timezone: "UTC",
        isAvailable: true,
      },
    ]);

    expect(calls[1]?.input).toBe("/admin/api/booking/resources/resource-1/schedules");
    expect(calls[1]?.init?.method).toBe("PUT");
    const body = JSON.parse(calls[1]?.init?.body as string);
    expect(body[0]?.dayOfWeek).toBe(1);
  } finally {
    globalThis.fetch = originalFetch;
    clearBookingCache();
  }
});

test("previewBookingSlots posts preview payload", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  clearBookingCache();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ items: [] });
  };

  try {
    resetCsrfToken();
    await previewBookingSlots({
      serviceId: "service-1",
      resourceId: "resource-1",
      date: "2026-02-20",
      timezone: "UTC",
      intervalMinutes: 30,
    });

    expect(calls[1]?.input).toBe("/admin/api/booking/slots/preview");
    expect(calls[1]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[1]?.init?.body as string);
    expect(body.serviceId).toBe("service-1");
    expect(body.intervalMinutes).toBe(30);
  } finally {
    globalThis.fetch = originalFetch;
    clearBookingCache();
  }
});

test("updateBookingReservationStatus sends PATCH request", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  clearBookingCache();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      id: "reservation-1",
      serviceId: "service-1",
      resourceId: "resource-1",
      formSubmissionId: null,
      status: "confirmed",
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
    });
  };

  try {
    resetCsrfToken();
    await updateBookingReservationStatus("reservation-1", "confirmed");
    expect(calls[1]?.input).toBe("/admin/api/booking/reservations/reservation-1/status");
    expect(calls[1]?.init?.method).toBe("PATCH");
    const body = JSON.parse(calls[1]?.init?.body as string);
    expect(body.status).toBe("confirmed");
  } finally {
    globalThis.fetch = originalFetch;
    clearBookingCache();
  }
});
