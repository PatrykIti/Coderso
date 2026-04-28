import { afterAll, beforeEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

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
  createBookingBlackout,
  createBookingReservation,
  createBookingResource,
  createBookingService,
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
};

const toDateString = (date: Date) => {
  const y = String(date.getUTCFullYear()).padStart(4, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

beforeEach(async () => {
  await cleanup();
});

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
