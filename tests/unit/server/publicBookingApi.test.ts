import { afterAll, beforeEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  apiKeys,
  bookingBlackouts,
  bookings,
  bookingResources,
  bookingSchedules,
  bookingServiceResources,
  bookingServices,
} from "../../../core/db/schema";
import { handlePublicBookingApi } from "../../../core/server/publicBookingApi";
import {
  createBookingResource,
  createBookingService,
  previewBookingSlots,
  setBookingSchedules,
  setBookingServiceResources,
} from "../../../core/services/booking/bookingService";
import { createBookingSubmissionNonce } from "../../../core/services/booking/bookingSubmissionNonce";
import { createBookingSlotsToken } from "../../../core/services/booking/bookingSlotsToken";
import { createApiKey } from "../../../core/services/security/apiKeysService";
import {
  SECURITY_SETTINGS_DEFAULTS,
  type SecuritySettings,
} from "../../../core/services/settings/securitySettings";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test.serial : test.skip;
const DB_TEST_TIMEOUT_MS = 30_000;

const originalNonceSecret = process.env.FORM_SUBMIT_NONCE_SECRET;
const createdApiKeyIds: string[] = [];

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const cleanup = async () => {
  if (!hasDb) return;
  await db.delete(bookings);
  await db.delete(bookingBlackouts);
  await db.delete(bookingSchedules);
  await db.delete(bookingServiceResources);
  await db.delete(bookingServices);
  await db.delete(bookingResources);
  if (createdApiKeyIds.length > 0) {
    await db.delete(apiKeys).where(inArray(apiKeys.id, [...new Set(createdApiKeyIds)]));
    createdApiKeyIds.length = 0;
  }
};

const toDateString = (date: Date) => {
  const y = String(date.getUTCFullYear()).padStart(4, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getSecurity = (): SecuritySettings => ({
  ...SECURITY_SETTINGS_DEFAULTS,
  rateLimit: {
    ...SECURITY_SETTINGS_DEFAULTS.rateLimit,
    enabled: false,
  },
  botProtection: {
    ...SECURITY_SETTINGS_DEFAULTS.botProtection,
    enabled: false,
  },
});

beforeEach(async () => {
  await cleanup();
  process.env.FORM_SUBMIT_NONCE_SECRET =
    originalNonceSecret && originalNonceSecret.trim().length > 0
      ? originalNonceSecret
      : "coderso_public_booking_nonce_test_secret_32";
});

afterAll(async () => {
  await cleanup();
  if (originalNonceSecret === undefined) {
    delete process.env.FORM_SUBMIT_NONCE_SECRET;
  } else {
    process.env.FORM_SUBMIT_NONCE_SECRET = originalNonceSecret;
  }
});

test("public booking handler returns null for non-booking paths", async () => {
  const url = new URL("http://localhost/api/search?q=test");
  const response = await handlePublicBookingApi(new Request(url.toString()), {
    url,
    security: getSecurity(),
    ip: "127.0.0.1",
    userAgent: "test",
  });
  expect(response).toBeNull();
});

testIfDb("public booking slots endpoint returns available slots", async () => {
  const resource = await createBookingResource({
    name: `Bay ${randomUUID()}`,
    type: "bay",
    timezone: "UTC",
    capacity: 1,
  });
  const service = await createBookingService({
    name: `Inspection ${randomUUID()}`,
    durationMinutes: 30,
  });

  await setBookingServiceResources(service.id, [{ resourceId: resource.id }]);

  const day = new Date(Date.UTC(2030, 0, 18, 0, 0, 0));
  const date = toDateString(day);

  await setBookingSchedules(resource.id, [
    {
      dayOfWeek: day.getUTCDay(),
      startMinute: 9 * 60,
      endMinute: 11 * 60,
      timezone: "UTC",
    },
  ]);

  const url = new URL("http://localhost/api/booking/slots");
  url.searchParams.set("serviceId", service.id);
  url.searchParams.set("resourceId", resource.id);
  url.searchParams.set("date", date);
  url.searchParams.set("runtimeToken", createBookingSlotsToken());
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("intervalMinutes", "30");

  const response = await handlePublicBookingApi(new Request(url.toString()), {
    url,
    security: getSecurity(),
    ip: "127.0.0.1",
    userAgent: "test",
  });

  expect(response).not.toBeNull();
  expect(response?.status).toBe(200);
  const payload = (await response?.json()) as { items: Array<{ startsAt: string }> };
  expect(payload.items.length).toBeGreaterThan(0);
  expect(payload.items[0]?.startsAt).toContain("2030-01-18T09:00:00.000Z");
}, DB_TEST_TIMEOUT_MS);

testIfDb("public booking slots endpoint requires runtime token", async () => {
  const resource = await createBookingResource({
    name: `Bay ${randomUUID()}`,
    type: "bay",
    timezone: "UTC",
    capacity: 1,
  });
  const service = await createBookingService({
    name: `Inspection ${randomUUID()}`,
    durationMinutes: 30,
  });

  await setBookingServiceResources(service.id, [{ resourceId: resource.id }]);

  const day = new Date(Date.UTC(2030, 0, 21, 0, 0, 0));
  const date = toDateString(day);

  await setBookingSchedules(resource.id, [
    {
      dayOfWeek: day.getUTCDay(),
      startMinute: 9 * 60,
      endMinute: 11 * 60,
      timezone: "UTC",
    },
  ]);

  const url = new URL("http://localhost/api/booking/slots");
  url.searchParams.set("serviceId", service.id);
  url.searchParams.set("resourceId", resource.id);
  url.searchParams.set("date", date);

  const response = await handlePublicBookingApi(new Request(url.toString()), {
    url,
    security: getSecurity(),
    ip: "127.0.0.1",
    userAgent: "test",
  });

  expect(response).not.toBeNull();
  expect(response?.status).toBe(400);
  const payload = (await response?.json()) as { error: { code: string } };
  expect(payload.error.code).toBe("form_nonce_required");
}, DB_TEST_TIMEOUT_MS);

testIfDb("internal booking slots endpoint requires auth or API key", async () => {
  const resource = await createBookingResource({
    name: `Private bay ${randomUUID()}`,
    type: "bay",
    timezone: "UTC",
    capacity: 1,
  });
  const service = await createBookingService({
    name: `Members slot ${randomUUID()}`,
    durationMinutes: 30,
    settings: {
      submissionAccess: "internal",
    },
  });

  await setBookingServiceResources(service.id, [{ resourceId: resource.id }]);

  const day = new Date(Date.UTC(2030, 0, 22, 0, 0, 0));
  const date = toDateString(day);

  await setBookingSchedules(resource.id, [
    {
      dayOfWeek: day.getUTCDay(),
      startMinute: 9 * 60,
      endMinute: 11 * 60,
      timezone: "UTC",
    },
  ]);

  const url = new URL("http://localhost/api/booking/slots");
  url.searchParams.set("serviceId", service.id);
  url.searchParams.set("resourceId", resource.id);
  url.searchParams.set("date", date);

  const response = await handlePublicBookingApi(new Request(url.toString()), {
    url,
    security: getSecurity(),
    ip: "127.0.0.1",
    userAgent: "test",
  });

  expect(response).not.toBeNull();
  expect(response?.status).toBe(401);
  const payload = (await response?.json()) as { error: { code: string } };
  expect(payload.error.code).toBe("auth_required");
}, DB_TEST_TIMEOUT_MS);

testIfDb("internal booking slots endpoint allows API key with booking.submit", async () => {
  const resource = await createBookingResource({
    name: `Private bay ${randomUUID()}`,
    type: "bay",
    timezone: "UTC",
    capacity: 1,
  });
  const service = await createBookingService({
    name: `Members slot ${randomUUID()}`,
    durationMinutes: 30,
    settings: {
      submissionAccess: "internal",
    },
  });

  await setBookingServiceResources(service.id, [{ resourceId: resource.id }]);

  const day = new Date(Date.UTC(2030, 0, 23, 0, 0, 0));
  const date = toDateString(day);

  await setBookingSchedules(resource.id, [
    {
      dayOfWeek: day.getUTCDay(),
      startMinute: 9 * 60,
      endMinute: 11 * 60,
      timezone: "UTC",
    },
  ]);

  const apiKey = await createApiKey({
    name: `Booking key ${Date.now()}`,
    scopes: ["booking.submit"],
  });
  createdApiKeyIds.push(apiKey.apiKey.id);

  const url = new URL("http://localhost/api/booking/slots");
  url.searchParams.set("serviceId", service.id);
  url.searchParams.set("resourceId", resource.id);
  url.searchParams.set("date", date);

  const response = await handlePublicBookingApi(
    new Request(url.toString(), {
      headers: {
        authorization: `Bearer ${apiKey.secret}`,
      },
    }),
    {
      url,
      security: getSecurity(),
      ip: "127.0.0.1",
      userAgent: "test",
    }
  );

  expect(response).not.toBeNull();
  expect(response?.status).toBe(200);
}, DB_TEST_TIMEOUT_MS);

testIfDb("internal booking reservation endpoint requires auth or API key", async () => {
  const resource = await createBookingResource({
    name: `Private tech ${randomUUID()}`,
    type: "staff",
    timezone: "UTC",
    capacity: 1,
  });
  const service = await createBookingService({
    name: `Private repair ${randomUUID()}`,
    durationMinutes: 60,
    settings: {
      submissionAccess: "internal",
    },
  });

  await setBookingServiceResources(service.id, [{ resourceId: resource.id }]);

  const day = new Date(Date.UTC(2030, 0, 24, 0, 0, 0));
  const date = toDateString(day);
  await setBookingSchedules(resource.id, [
    {
      dayOfWeek: day.getUTCDay(),
      startMinute: 8 * 60,
      endMinute: 10 * 60,
      timezone: "UTC",
    },
  ]);

  const slots = await previewBookingSlots({
    serviceId: service.id,
    resourceId: resource.id,
    date,
    timezone: "UTC",
    intervalMinutes: 60,
  });

  const url = new URL("http://localhost/api/booking/reservations");
  const response = await handlePublicBookingApi(
    new Request(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        serviceId: service.id,
        resourceId: resource.id,
        startsAt: slots[0]!.startsAt,
        endsAt: slots[0]!.endsAt,
        timezone: "UTC",
        customerName: "Member",
      }),
    }),
    {
      url,
      security: getSecurity(),
      ip: "127.0.0.1",
      userAgent: "test",
    }
  );

  expect(response).not.toBeNull();
  expect(response?.status).toBe(401);
  const payload = (await response?.json()) as { error: { code: string } };
  expect(payload.error.code).toBe("auth_required");
}, DB_TEST_TIMEOUT_MS);

testIfDb("internal booking reservation endpoint allows API key without nonce", async () => {
  const resource = await createBookingResource({
    name: `Private tech ${randomUUID()}`,
    type: "staff",
    timezone: "UTC",
    capacity: 1,
  });
  const service = await createBookingService({
    name: `Private repair ${randomUUID()}`,
    durationMinutes: 60,
    settings: {
      submissionAccess: "internal",
    },
  });

  await setBookingServiceResources(service.id, [{ resourceId: resource.id }]);

  const day = new Date(Date.UTC(2030, 0, 25, 0, 0, 0));
  const date = toDateString(day);
  await setBookingSchedules(resource.id, [
    {
      dayOfWeek: day.getUTCDay(),
      startMinute: 8 * 60,
      endMinute: 10 * 60,
      timezone: "UTC",
    },
  ]);

  const slots = await previewBookingSlots({
    serviceId: service.id,
    resourceId: resource.id,
    date,
    timezone: "UTC",
    intervalMinutes: 60,
  });

  const apiKey = await createApiKey({
    name: `Booking key ${Date.now()}`,
    scopes: ["booking.submit"],
  });
  createdApiKeyIds.push(apiKey.apiKey.id);

  const url = new URL("http://localhost/api/booking/reservations");
  const response = await handlePublicBookingApi(
    new Request(url.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey.secret}`,
      },
      body: JSON.stringify({
        serviceId: service.id,
        resourceId: resource.id,
        startsAt: slots[0]!.startsAt,
        endsAt: slots[0]!.endsAt,
        timezone: "UTC",
        customerName: "Member",
        customerEmail: "member@example.com",
      }),
    }),
    {
      url,
      security: getSecurity(),
      ip: "127.0.0.1",
      userAgent: "test",
    }
  );

  expect(response).not.toBeNull();
  expect(response?.status).toBe(200);
  const payload = (await response?.json()) as { id: string };
  expect(payload.id).toBeTruthy();
}, DB_TEST_TIMEOUT_MS);

testIfDb("public booking reservation endpoint rejects invalid nonce", async () => {
  const resource = await createBookingResource({
    name: `Tech ${randomUUID()}`,
    type: "staff",
    timezone: "UTC",
    capacity: 1,
  });
  const service = await createBookingService({
    name: `Repair ${randomUUID()}`,
    durationMinutes: 60,
  });

  await setBookingServiceResources(service.id, [{ resourceId: resource.id }]);

  const day = new Date(Date.UTC(2030, 0, 19, 0, 0, 0));
  const date = toDateString(day);
  await setBookingSchedules(resource.id, [
    {
      dayOfWeek: day.getUTCDay(),
      startMinute: 8 * 60,
      endMinute: 10 * 60,
      timezone: "UTC",
    },
  ]);

  const slots = await previewBookingSlots({
    serviceId: service.id,
    resourceId: resource.id,
    date,
    timezone: "UTC",
    intervalMinutes: 60,
  });

  const body = {
    serviceId: service.id,
    resourceId: resource.id,
    startsAt: slots[0]!.startsAt,
    endsAt: slots[0]!.endsAt,
    timezone: "UTC",
    customerName: "John Doe",
    customerEmail: "john@example.com",
    formNonce: "invalid",
  };

  const url = new URL("http://localhost/api/booking/reservations");
  const response = await handlePublicBookingApi(
    new Request(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    {
      url,
      security: getSecurity(),
      ip: "127.0.0.1",
      userAgent: "test",
    }
  );

  expect(response).not.toBeNull();
  expect(response?.status).toBe(400);
  const payload = (await response?.json()) as { error: { code: string } };
  expect(payload.error.code).toBe("form_nonce_invalid");
}, DB_TEST_TIMEOUT_MS);

testIfDb("public booking reservation endpoint creates reservation with valid nonce", async () => {
  const resource = await createBookingResource({
    name: `Bay ${randomUUID()}`,
    type: "bay",
    timezone: "UTC",
    capacity: 1,
  });
  const service = await createBookingService({
    name: `Wash ${randomUUID()}`,
    durationMinutes: 30,
  });

  await setBookingServiceResources(service.id, [{ resourceId: resource.id }]);

  const day = new Date(Date.UTC(2030, 0, 20, 0, 0, 0));
  const date = toDateString(day);
  await setBookingSchedules(resource.id, [
    {
      dayOfWeek: day.getUTCDay(),
      startMinute: 9 * 60,
      endMinute: 11 * 60,
      timezone: "UTC",
    },
  ]);

  const slots = await previewBookingSlots({
    serviceId: service.id,
    resourceId: resource.id,
    date,
    timezone: "UTC",
    intervalMinutes: 30,
  });

  const nonce = createBookingSubmissionNonce();

  const url = new URL("http://localhost/api/booking/reservations");
  const response = await handlePublicBookingApi(
    new Request(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        serviceId: service.id,
        resourceId: resource.id,
        startsAt: slots[0]!.startsAt,
        endsAt: slots[0]!.endsAt,
        timezone: "UTC",
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        formNonce: nonce,
      }),
    }),
    {
      url,
      security: getSecurity(),
      ip: "127.0.0.1",
      userAgent: "test",
    }
  );

  expect(response).not.toBeNull();
  expect(response?.status).toBe(200);
  const payload = (await response?.json()) as {
    id: string;
    customerName: string;
    runtime: { successMessage: string };
  };
  expect(payload.id).toBeTruthy();
  expect(payload.customerName).toBe("Jane Doe");
  expect(payload.runtime.successMessage).toBe("Appointment booked successfully.");
}, DB_TEST_TIMEOUT_MS);
