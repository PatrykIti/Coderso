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
  createBookingResource as createBookingResourceBase,
  createBookingService as createBookingServiceBase,
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
const testIfDb = hasDb ? test : test.skip;
const DB_TEST_TIMEOUT_MS = 30_000;

const originalNonceSecret = process.env.FORM_SUBMIT_NONCE_SECRET;
const createdApiKeyIds: string[] = [];
const createdResourceIds: string[] = [];
const createdServiceIds: string[] = [];

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
  const resourceIds = [...new Set(createdResourceIds)];
  const serviceIds = [...new Set(createdServiceIds)];

  if (resourceIds.length > 0) {
    await db.delete(bookings).where(inArray(bookings.resourceId, resourceIds));
    await db.delete(bookingBlackouts).where(inArray(bookingBlackouts.resourceId, resourceIds));
    await db.delete(bookingSchedules).where(inArray(bookingSchedules.resourceId, resourceIds));
    await db
      .delete(bookingServiceResources)
      .where(inArray(bookingServiceResources.resourceId, resourceIds));
    await db.delete(bookingResources).where(inArray(bookingResources.id, resourceIds));
    createdResourceIds.length = 0;
  }

  if (serviceIds.length > 0) {
    await db.delete(bookings).where(inArray(bookings.serviceId, serviceIds));
    await db
      .delete(bookingServiceResources)
      .where(inArray(bookingServiceResources.serviceId, serviceIds));
    await db.delete(bookingServices).where(inArray(bookingServices.id, serviceIds));
    createdServiceIds.length = 0;
  }

  if (createdApiKeyIds.length > 0) {
    await db.delete(apiKeys).where(inArray(apiKeys.id, [...new Set(createdApiKeyIds)]));
    createdApiKeyIds.length = 0;
  }
};

const createBookingResource = async (input: Parameters<typeof createBookingResourceBase>[0]) => {
  const resource = await createBookingResourceBase(input);
  createdResourceIds.push(resource.id);
  return resource;
};

const createBookingService = async (input: Parameters<typeof createBookingServiceBase>[0]) => {
  const service = await createBookingServiceBase(input);
  createdServiceIds.push(service.id);
  return service;
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

const getSecurityWithBotProtection = (): SecuritySettings => ({
  ...getSecurity(),
  botProtection: {
    ...SECURITY_SETTINGS_DEFAULTS.botProtection,
    enabled: true,
    siteKey: "public-site-key",
    secretKey: "server-secret",
  },
});

beforeEach(async () => {
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

test("public booking reservation endpoint rejects unknown metadata keys before service lookup", async () => {
  const url = new URL("http://localhost/api/booking/reservations");
  const response = await handlePublicBookingApi(
    new Request(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        serviceId: "8ce0fc8b-b900-4f6f-b1f8-fb8ad9b4d3c8",
        resourceId: "908d55fc-cd23-4f7f-b09f-8164b9cb0f5f",
        startsAt: "2030-01-15T09:00:00.000Z",
        endsAt: "2030-01-15T10:00:00.000Z",
        customerName: "Jamie Doe",
        metadata: {
          flowId: "booking-flow",
          consent: {
            accepted: true,
            label: "I agree",
            secret: "should-reject",
          },
        },
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
  expect(response?.status).toBe(400);
  const payload = (await response?.json()) as { error: { code: string } };
  expect(payload.error.code).toBe("validation_error");
});

testIfDb(
  "public booking slots endpoint returns available slots",
  async () => {
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
  },
  DB_TEST_TIMEOUT_MS
);

testIfDb(
  "public booking slots endpoint requires runtime token",
  async () => {
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
  },
  DB_TEST_TIMEOUT_MS
);

testIfDb(
  "public booking slots endpoint rejects past dates and signed out-of-range claims",
  async () => {
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

    const pastUrl = new URL("http://localhost/api/booking/slots");
    pastUrl.searchParams.set("serviceId", service.id);
    pastUrl.searchParams.set("resourceId", resource.id);
    pastUrl.searchParams.set("date", "2020-01-06");
    pastUrl.searchParams.set("runtimeToken", createBookingSlotsToken());

    const pastResponse = await handlePublicBookingApi(new Request(pastUrl.toString()), {
      url: pastUrl,
      security: getSecurity(),
      ip: "127.0.0.1",
      userAgent: "test",
    });

    expect(pastResponse).not.toBeNull();
    expect(pastResponse?.status).toBe(400);
    expect(((await pastResponse?.json()) as { error: { code: string } }).error.code).toBe(
      "booking_slot_date_in_past"
    );

    const outOfRangeUrl = new URL("http://localhost/api/booking/slots");
    outOfRangeUrl.searchParams.set("serviceId", service.id);
    outOfRangeUrl.searchParams.set("resourceId", resource.id);
    outOfRangeUrl.searchParams.set("date", "2030-01-18");
    outOfRangeUrl.searchParams.set(
      "runtimeToken",
      createBookingSlotsToken({
        minDate: "2030-01-19",
        maxDate: "2030-01-20",
      })
    );

    const outOfRangeResponse = await handlePublicBookingApi(new Request(outOfRangeUrl.toString()), {
      url: outOfRangeUrl,
      security: getSecurity(),
      ip: "127.0.0.1",
      userAgent: "test",
    });

    expect(outOfRangeResponse).not.toBeNull();
    expect(outOfRangeResponse?.status).toBe(400);
    expect(((await outOfRangeResponse?.json()) as { error: { code: string } }).error.code).toBe(
      "booking_slot_date_out_of_range"
    );
  },
  DB_TEST_TIMEOUT_MS
);

testIfDb(
  "internal booking slots endpoint requires auth or API key",
  async () => {
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
  },
  DB_TEST_TIMEOUT_MS
);

testIfDb(
  "internal booking slots endpoint allows API key with booking.submit",
  async () => {
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
  },
  DB_TEST_TIMEOUT_MS
);

testIfDb(
  "internal booking reservation endpoint requires auth or API key",
  async () => {
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
  },
  DB_TEST_TIMEOUT_MS
);

testIfDb(
  "internal booking reservation endpoint allows API key without nonce",
  async () => {
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
  },
  DB_TEST_TIMEOUT_MS
);

testIfDb(
  "public booking reservation endpoint rejects invalid nonce",
  async () => {
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
  },
  DB_TEST_TIMEOUT_MS
);

testIfDb(
  "public booking reservation endpoint requires captcha token when bot protection is enabled",
  async () => {
    const resource = await createBookingResource({
      name: `Protected tech ${randomUUID()}`,
      type: "staff",
      timezone: "UTC",
      capacity: 1,
    });
    const service = await createBookingService({
      name: `Protected repair ${randomUUID()}`,
      durationMinutes: 60,
    });

    await setBookingServiceResources(service.id, [{ resourceId: resource.id }]);

    const day = new Date(Date.UTC(2030, 0, 26, 0, 0, 0));
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
          customerName: "Jamie Doe",
          formNonce: createBookingSubmissionNonce(),
        }),
      }),
      {
        url,
        security: getSecurityWithBotProtection(),
        ip: "127.0.0.1",
        userAgent: "test",
      }
    );

    expect(response).not.toBeNull();
    expect(response?.status).toBe(400);
    const payload = (await response?.json()) as { error: { code: string } };
    expect(payload.error.code).toBe("bot_protection_required");
  },
  DB_TEST_TIMEOUT_MS
);

testIfDb(
  "public booking reservation endpoint creates reservation with valid nonce",
  async () => {
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
  },
  DB_TEST_TIMEOUT_MS
);

testIfDb(
  "public booking reservation endpoint maps slot conflicts before persistence leaks",
  async () => {
    const resource = await createBookingResource({
      name: `Conflict bay ${randomUUID()}`,
      type: "bay",
      timezone: "UTC",
      capacity: 1,
    });
    const service = await createBookingService({
      name: `Conflict wash ${randomUUID()}`,
      durationMinutes: 30,
    });

    await setBookingServiceResources(service.id, [{ resourceId: resource.id }]);

    const day = new Date(Date.UTC(2030, 0, 27, 0, 0, 0));
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

    const url = new URL("http://localhost/api/booking/reservations");
    const firstResponse = await handlePublicBookingApi(
      new Request(url.toString(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          resourceId: resource.id,
          startsAt: slots[0]!.startsAt,
          endsAt: slots[0]!.endsAt,
          timezone: "UTC",
          customerName: "Jamie Doe",
          formNonce: createBookingSubmissionNonce(),
        }),
      }),
      {
        url,
        security: getSecurity(),
        ip: "127.0.0.1",
        userAgent: "test",
      }
    );

    expect(firstResponse?.status).toBe(200);

    const secondResponse = await handlePublicBookingApi(
      new Request(url.toString(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          resourceId: resource.id,
          startsAt: slots[0]!.startsAt,
          endsAt: slots[0]!.endsAt,
          timezone: "UTC",
          customerName: "Second Customer",
          formNonce: createBookingSubmissionNonce(),
        }),
      }),
      {
        url,
        security: getSecurity(),
        ip: "127.0.0.1",
        userAgent: "test",
      }
    );

    expect(secondResponse).not.toBeNull();
    expect(secondResponse?.status).toBe(409);
    const payload = (await secondResponse?.json()) as { error: { code: string } };
    expect(payload.error.code).toBe("booking_slot_unavailable");
  },
  DB_TEST_TIMEOUT_MS
);
