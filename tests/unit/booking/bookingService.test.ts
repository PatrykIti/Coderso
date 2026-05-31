import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  bookingBlackouts,
  bookings,
  bookingResources,
  bookingSchedules,
  bookingServiceResources,
  bookingServices,
} from "../../../core/db/schema";
import {
  createBookingBlackout as createBookingBlackoutBase,
  createBookingReservation as createBookingReservationBase,
  createBookingResource as createBookingResourceBase,
  createBookingService as createBookingServiceBase,
  previewBookingSlots,
  setBookingSchedules,
  setBookingServiceResources,
  updateBookingReservationStatus,
  updateBookingService,
} from "../../../core/services/booking/bookingService";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;

const createdResourceIds: string[] = [];
const createdServiceIds: string[] = [];
const createdBookingIds: string[] = [];
const createdBlackoutIds: string[] = [];

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
  const bookingIds = [...new Set(createdBookingIds)];
  const blackoutIds = [...new Set(createdBlackoutIds)];
  const resourceIds = [...new Set(createdResourceIds)];
  const serviceIds = [...new Set(createdServiceIds)];

  if (bookingIds.length > 0) {
    await db.delete(bookings).where(inArray(bookings.id, bookingIds));
    createdBookingIds.length = 0;
  }

  if (resourceIds.length > 0) {
    await db.delete(bookings).where(inArray(bookings.resourceId, resourceIds));
  }

  if (serviceIds.length > 0) {
    await db.delete(bookings).where(inArray(bookings.serviceId, serviceIds));
  }

  if (blackoutIds.length > 0) {
    await db.delete(bookingBlackouts).where(inArray(bookingBlackouts.id, blackoutIds));
    createdBlackoutIds.length = 0;
  }

  if (resourceIds.length > 0) {
    await db.delete(bookingBlackouts).where(inArray(bookingBlackouts.resourceId, resourceIds));
    await db.delete(bookingSchedules).where(inArray(bookingSchedules.resourceId, resourceIds));
    await db
      .delete(bookingServiceResources)
      .where(inArray(bookingServiceResources.resourceId, resourceIds));
    await db.delete(bookingResources).where(inArray(bookingResources.id, resourceIds));
    createdResourceIds.length = 0;
  }

  if (serviceIds.length > 0) {
    await db
      .delete(bookingServiceResources)
      .where(inArray(bookingServiceResources.serviceId, serviceIds));
    await db.delete(bookingServices).where(inArray(bookingServices.id, serviceIds));
    createdServiceIds.length = 0;
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

const createBookingReservation = async (
  input: Parameters<typeof createBookingReservationBase>[0]
) => {
  const booking = await createBookingReservationBase(input);
  if (booking) createdBookingIds.push(booking.id);
  return booking;
};

const createBookingBlackout = async (input: Parameters<typeof createBookingBlackoutBase>[0]) => {
  const blackout = await createBookingBlackoutBase(input);
  if (blackout) createdBlackoutIds.push(blackout.id);
  return blackout;
};

const toDateString = (date: Date) => {
  const y = String(date.getUTCFullYear()).padStart(4, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

afterAll(async () => {
  await cleanup();
});

testIfDb("booking resource/service setup and slot preview", async () => {
  const resource = await createBookingResource({
    name: `Bay ${randomUUID()}`,
    type: "bay",
    timezone: "UTC",
    capacity: 1,
  });
  expect(resource).toBeTruthy();

  const service = await createBookingService({
    name: `Inspection ${randomUUID()}`,
    durationMinutes: 30,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
  });
  expect(service).toBeTruthy();
  expect((service.settings as Record<string, unknown>).submissionAccess).toBe("public");

  await setBookingServiceResources(service.id, [{ resourceId: resource.id }]);

  const day = new Date(Date.UTC(2030, 0, 15, 0, 0, 0));
  const date = toDateString(day);
  const dayOfWeek = day.getUTCDay();

  await setBookingSchedules(resource.id, [
    {
      dayOfWeek,
      startMinute: 9 * 60,
      endMinute: 11 * 60,
      timezone: "UTC",
      isAvailable: true,
    },
  ]);

  const slots = await previewBookingSlots({
    serviceId: service.id,
    resourceId: resource.id,
    date,
    timezone: "UTC",
    intervalMinutes: 30,
  });

  expect(slots.length).toBe(4);
  expect(slots[0]?.startsAt).toBe("2030-01-15T09:00:00.000Z");
  expect(slots[3]?.startsAt).toBe("2030-01-15T10:30:00.000Z");
});

testIfDb("booking slot preview rejects past dates and signed out-of-range policy", async () => {
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

  await expect(
    previewBookingSlots({
      serviceId: service.id,
      resourceId: resource.id,
      date: "2020-01-06",
      timezone: "UTC",
      intervalMinutes: 30,
    })
  ).rejects.toThrow("booking_slot_date_in_past");

  await expect(
    previewBookingSlots(
      {
        serviceId: service.id,
        resourceId: resource.id,
        date: "2030-01-18",
        timezone: "UTC",
        intervalMinutes: 30,
      },
      {
        minDate: "2030-01-19",
        maxDate: "2030-01-20",
      }
    )
  ).rejects.toThrow("booking_slot_date_out_of_range");
});

testIfDbWithOptions(
  "booking reservation blocks overlapping slots",
  async () => {
    const resource = await createBookingResource({
      name: `Staff ${randomUUID()}`,
      type: "staff",
      timezone: "UTC",
    });
    const service = await createBookingService({
      name: `Repair ${randomUUID()}`,
      durationMinutes: 60,
    });

    await setBookingServiceResources(service.id, [{ resourceId: resource.id }]);

    const day = new Date(Date.UTC(2030, 0, 16, 0, 0, 0));
    const date = toDateString(day);
    const dayOfWeek = day.getUTCDay();

    await setBookingSchedules(resource.id, [
      {
        dayOfWeek,
        startMinute: 8 * 60,
        endMinute: 12 * 60,
        timezone: "UTC",
      },
    ]);

    const before = await previewBookingSlots({
      serviceId: service.id,
      resourceId: resource.id,
      date,
      timezone: "UTC",
      intervalMinutes: 60,
    });
    expect(before.length).toBe(4);

    const reservation = await createBookingReservation({
      serviceId: service.id,
      resourceId: resource.id,
      startsAt: before[0]!.startsAt,
      endsAt: before[0]!.endsAt,
      timezone: "UTC",
      customerName: "Jan Kowalski",
    });
    expect(reservation).toBeTruthy();

    await expect(
      createBookingReservation({
        serviceId: service.id,
        resourceId: resource.id,
        startsAt: before[0]!.startsAt,
        endsAt: before[0]!.endsAt,
        timezone: "UTC",
        customerName: "Conflict",
      })
    ).rejects.toThrow("booking_slot_unavailable");

    const after = await previewBookingSlots({
      serviceId: service.id,
      resourceId: resource.id,
      date,
      timezone: "UTC",
      intervalMinutes: 60,
    });

    expect(after.length).toBe(3);
    expect(after.some((slot) => slot.startsAt === before[0]!.startsAt)).toBe(false);

    const cancelled = await updateBookingReservationStatus(reservation.id, "cancelled");
    expect(cancelled?.status).toBe("cancelled");
  },
  { timeout: 10_000 }
);

testIfDb("booking service submission access can be set to internal", async () => {
  const service = await createBookingService({
    name: `Private booking ${randomUUID()}`,
    durationMinutes: 45,
    settings: {
      submissionAccess: "internal",
      audience: "members",
    },
  });

  expect(service).toBeTruthy();
  expect((service.settings as Record<string, unknown>).submissionAccess).toBe("internal");
  expect((service.settings as Record<string, unknown>).audience).toBe("members");

  const updated = await updateBookingService(service.id, {
    settings: {
      submissionAccess: "public",
      audience: "public",
    },
  });

  expect(updated).not.toBeNull();
  expect((updated?.settings as Record<string, unknown>).submissionAccess).toBe("public");
  expect((updated?.settings as Record<string, unknown>).audience).toBe("public");
});

testIfDb("blackout windows block slot preview", async () => {
  const resource = await createBookingResource({
    name: `Tool ${randomUUID()}`,
    type: "tool",
    timezone: "UTC",
  });
  const service = await createBookingService({
    name: `Quick check ${randomUUID()}`,
    durationMinutes: 30,
  });

  await setBookingServiceResources(service.id, [{ resourceId: resource.id }]);

  const day = new Date(Date.UTC(2030, 0, 17, 0, 0, 0));
  const date = toDateString(day);
  const dayOfWeek = day.getUTCDay();

  await setBookingSchedules(resource.id, [
    {
      dayOfWeek,
      startMinute: 9 * 60,
      endMinute: 10 * 60,
      timezone: "UTC",
    },
  ]);

  await createBookingBlackout({
    resourceId: resource.id,
    startsAt: "2030-01-17T09:30:00.000Z",
    endsAt: "2030-01-17T10:00:00.000Z",
    reason: "Maintenance",
  });

  const slots = await previewBookingSlots({
    serviceId: service.id,
    resourceId: resource.id,
    date,
    timezone: "UTC",
    intervalMinutes: 30,
  });

  expect(slots.length).toBe(1);
  expect(slots[0]?.startsAt).toBe("2030-01-17T09:00:00.000Z");
});
