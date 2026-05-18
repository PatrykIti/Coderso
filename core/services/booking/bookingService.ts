import { and, asc, desc, eq, gt, gte, inArray, isNull, lt, lte, or } from "drizzle-orm";

import { db } from "../../db/client";
import {
  bookingBlackouts,
  bookings,
  bookingResources,
  bookingSchedules,
  bookingServiceResources,
  bookingServices,
} from "../../db/schema";
import {
  applyBookingAccessModeToSettings,
  bookingAccessDefaults,
  resolveBookingAccessModeFromSettings,
  type BookingAccessMode,
} from "./bookingAccess";

export type BookingResourceType = "staff" | "bay" | "tool" | "vehicle" | "other";
export type BookingResourceStatus = "active" | "inactive";
export type BookingServiceStatus = "active" | "inactive";
export type BookingReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

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

export type BookingSlotPreviewInput = {
  serviceId: string;
  resourceId: string;
  date: string;
  timezone?: string;
  intervalMinutes?: number;
};

export type BookingSlotPreviewPolicy = {
  minDate?: string;
  maxDate?: string;
  now?: Date;
};

export type BookingSlot = {
  startsAt: string;
  endsAt: string;
  timezone: string;
};

const resourceTypes = new Set<BookingResourceType>(["staff", "bay", "tool", "vehicle", "other"]);
const resourceStatuses = new Set<BookingResourceStatus>(["active", "inactive"]);
const serviceStatuses = new Set<BookingServiceStatus>(["active", "inactive"]);
const reservationStatuses = new Set<BookingReservationStatus>([
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]);
const blockingReservationStatuses: BookingReservationStatus[] = ["pending", "confirmed"];

const normalizeText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

const assertTimezone = (value: string | null): string => {
  const timezone = value ?? "UTC";
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    throw new Error("booking_timezone_invalid");
  }
};

const normalizeSlugOrThrow = (name: string, slugInput?: string | null) => {
  const candidate = normalizeText(slugInput) ?? slugify(name);
  if (!candidate) throw new Error("booking_slug_invalid");
  return candidate;
};

const normalizeStatus = <T extends string>(
  value: unknown,
  allowed: Set<T>,
  fallback: T,
  errorCode: string
): T => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" && allowed.has(value as T)) return value as T;
  throw new Error(errorCode);
};

const normalizePositiveInteger = (
  value: unknown,
  field: string,
  fallback?: number,
  min = 0,
  max = 1_000_000
) => {
  if (value === undefined || value === null) {
    if (fallback !== undefined) return fallback;
    throw new Error(`${field}_required`);
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${field}_invalid`);
  }
  const normalized = Math.floor(value);
  if (normalized < min || normalized > max) throw new Error(`${field}_invalid`);
  return normalized;
};

const normalizeNullableText = (value: unknown) => {
  if (value === undefined || value === null) return null;
  const normalized = normalizeText(value);
  return normalized ?? null;
};

const normalizeServiceSettings = (
  value: unknown,
  fallbackAccessMode: BookingAccessMode = bookingAccessDefaults.mode
): Record<string, unknown> => {
  if (
    value !== undefined &&
    (typeof value !== "object" || value === null || Array.isArray(value))
  ) {
    throw new Error("booking_service_settings_invalid");
  }

  const base =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const accessMode = resolveBookingAccessModeFromSettings(base, fallbackAccessMode);
  return applyBookingAccessModeToSettings(base, accessMode);
};

const parseIsoDateTime = (value: unknown, errorCode: string) => {
  if (typeof value !== "string") throw new Error(errorCode);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(errorCode);
  return date;
};

const hasOverlap = (leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date) =>
  leftStart < rightEnd && leftEnd > rightStart;

const parseDateOnly = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) throw new Error("booking_slot_date_invalid");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new Error("booking_slot_date_invalid");
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) throw new Error("booking_slot_date_invalid");
  return { year, month, day };
};

const nextDateString = (value: string) => {
  const { year, month, day } = parseDateOnly(value);
  const utc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  utc.setUTCDate(utc.getUTCDate() + 1);
  const yyyy = String(utc.getUTCFullYear()).padStart(4, "0");
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const zonedFormatterCache = new Map<string, Intl.DateTimeFormat>();

const getZonedFormatter = (timezone: string) => {
  const cached = zonedFormatterCache.get(timezone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  zonedFormatterCache.set(timezone, formatter);
  return formatter;
};

const getZonedParts = (date: Date, timezone: string) => {
  const formatter = getZonedFormatter(timezone);
  const parts = formatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((entry) => entry.type === type)?.value ?? "0");
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
};

const toDateOnlyInTimezone = (date: Date, timezone: string) => {
  const parts = getZonedParts(date, timezone);
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
};

const assertBookingSlotDateAllowed = (params: {
  date: string;
  timezone: string;
  minDate?: string;
  maxDate?: string;
  now?: Date;
}) => {
  parseDateOnly(params.date);
  const today = toDateOnlyInTimezone(params.now ?? new Date(), params.timezone);
  if (params.date < today) throw new Error("booking_slot_date_in_past");
  if (params.minDate && params.date < params.minDate) {
    throw new Error("booking_slot_date_out_of_range");
  }
  if (params.maxDate && params.date > params.maxDate) {
    throw new Error("booking_slot_date_out_of_range");
  }
};

const resolveUtcFromLocal = (dateValue: string, minuteOfDay: number, timezone: string): Date => {
  const { year, month, day } = parseDateOnly(dateValue);
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;

  let timestamp = Date.UTC(year, month - 1, day, hour, minute, 0);
  const desired = Date.UTC(year, month - 1, day, hour, minute, 0);

  for (let index = 0; index < 5; index += 1) {
    const parts = getZonedParts(new Date(timestamp), timezone);
    const current = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
    const delta = desired - current;
    if (delta === 0) break;
    timestamp += delta;
  }

  return new Date(timestamp);
};

const ensureResourceExists = async (resourceId: string) => {
  const [resource] = await db
    .select({ id: bookingResources.id })
    .from(bookingResources)
    .where(eq(bookingResources.id, resourceId));
  if (!resource) throw new Error("booking_resource_not_found");
};

const ensureServiceExists = async (serviceId: string) => {
  const [service] = await db
    .select({ id: bookingServices.id })
    .from(bookingServices)
    .where(eq(bookingServices.id, serviceId));
  if (!service) throw new Error("booking_service_not_found");
};

export async function listBookingResources() {
  return db.select().from(bookingResources).orderBy(asc(bookingResources.name));
}

export async function getBookingResource(id: string) {
  const [resource] = await db.select().from(bookingResources).where(eq(bookingResources.id, id));
  return resource ?? null;
}

export async function createBookingResource(input: BookingResourceInput) {
  const name = normalizeText(input.name);
  if (!name) throw new Error("booking_resource_name_required");
  const slug = normalizeSlugOrThrow(name, input.slug);
  const type = normalizeStatus(input.type, resourceTypes, "staff", "booking_resource_type_invalid");
  const status = normalizeStatus(
    input.status,
    resourceStatuses,
    "active",
    "booking_resource_status_invalid"
  );
  const timezone = assertTimezone(normalizeText(input.timezone));
  const capacity = normalizePositiveInteger(
    input.capacity,
    "booking_resource_capacity",
    1,
    1,
    10000
  );
  const settings =
    input.settings && typeof input.settings === "object" && !Array.isArray(input.settings)
      ? input.settings
      : {};

  const existing = await db
    .select({ id: bookingResources.id })
    .from(bookingResources)
    .where(eq(bookingResources.slug, slug));
  if (existing.length > 0) throw new Error("booking_resource_slug_exists");

  const now = new Date();
  const [created] = await db
    .insert(bookingResources)
    .values({
      name,
      slug,
      type,
      status,
      timezone,
      capacity,
      settings,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return created ?? null;
}

export async function updateBookingResource(id: string, input: Partial<BookingResourceInput>) {
  const existing = await getBookingResource(id);
  if (!existing) return null;

  const update: Partial<typeof bookingResources.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    const normalized = normalizeText(input.name);
    if (!normalized) throw new Error("booking_resource_name_required");
    update.name = normalized;
  }

  if (input.slug !== undefined) {
    const baseName = (update.name as string | undefined) ?? existing.name;
    const nextSlug = normalizeSlugOrThrow(baseName, input.slug);
    const collision = await db
      .select({ id: bookingResources.id })
      .from(bookingResources)
      .where(eq(bookingResources.slug, nextSlug));
    if (collision.length > 0 && collision[0]?.id !== id) {
      throw new Error("booking_resource_slug_exists");
    }
    update.slug = nextSlug;
  }

  if (input.type !== undefined) {
    update.type = normalizeStatus(
      input.type,
      resourceTypes,
      existing.type as BookingResourceType,
      "booking_resource_type_invalid"
    );
  }

  if (input.status !== undefined) {
    update.status = normalizeStatus(
      input.status,
      resourceStatuses,
      existing.status as BookingResourceStatus,
      "booking_resource_status_invalid"
    );
  }

  if (input.timezone !== undefined) {
    update.timezone = assertTimezone(normalizeText(input.timezone));
  }

  if (input.capacity !== undefined) {
    update.capacity = normalizePositiveInteger(
      input.capacity,
      "booking_resource_capacity",
      1,
      1,
      10000
    );
  }

  if (input.settings !== undefined) {
    if (
      typeof input.settings !== "object" ||
      input.settings === null ||
      Array.isArray(input.settings)
    ) {
      throw new Error("booking_resource_settings_invalid");
    }
    update.settings = input.settings;
  }

  const [updated] = await db
    .update(bookingResources)
    .set(update)
    .where(eq(bookingResources.id, id))
    .returning();

  return updated ?? null;
}

export async function deleteBookingResource(id: string) {
  const [deleted] = await db
    .delete(bookingResources)
    .where(eq(bookingResources.id, id))
    .returning();
  return deleted ?? null;
}

export async function listBookingServices() {
  return db.select().from(bookingServices).orderBy(asc(bookingServices.name));
}

export async function getBookingService(id: string) {
  const [service] = await db.select().from(bookingServices).where(eq(bookingServices.id, id));
  return service ?? null;
}

export async function createBookingService(input: BookingServiceInput) {
  const name = normalizeText(input.name);
  if (!name) throw new Error("booking_service_name_required");
  const slug = normalizeSlugOrThrow(name, input.slug);
  const status = normalizeStatus(
    input.status,
    serviceStatuses,
    "active",
    "booking_service_status_invalid"
  );
  const durationMinutes = normalizePositiveInteger(
    input.durationMinutes,
    "booking_service_duration_minutes",
    undefined,
    5,
    24 * 60
  );
  const bufferBeforeMinutes = normalizePositiveInteger(
    input.bufferBeforeMinutes,
    "booking_service_buffer_before_minutes",
    0,
    0,
    24 * 60
  );
  const bufferAfterMinutes = normalizePositiveInteger(
    input.bufferAfterMinutes,
    "booking_service_buffer_after_minutes",
    0,
    0,
    24 * 60
  );
  const description = normalizeNullableText(input.description);
  const priceCents =
    input.priceCents === undefined || input.priceCents === null
      ? null
      : normalizePositiveInteger(
          input.priceCents,
          "booking_service_price_cents",
          0,
          0,
          1_000_000_000
        );
  const currency = normalizeNullableText(input.currency);
  const settings = normalizeServiceSettings(input.settings, bookingAccessDefaults.mode);

  const existing = await db
    .select({ id: bookingServices.id })
    .from(bookingServices)
    .where(eq(bookingServices.slug, slug));
  if (existing.length > 0) throw new Error("booking_service_slug_exists");

  const now = new Date();
  const [created] = await db
    .insert(bookingServices)
    .values({
      name,
      slug,
      status,
      description,
      durationMinutes,
      bufferBeforeMinutes,
      bufferAfterMinutes,
      priceCents,
      currency,
      settings,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return created ?? null;
}

export async function updateBookingService(id: string, input: Partial<BookingServiceInput>) {
  const existing = await getBookingService(id);
  if (!existing) return null;

  const update: Partial<typeof bookingServices.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    const normalized = normalizeText(input.name);
    if (!normalized) throw new Error("booking_service_name_required");
    update.name = normalized;
  }

  if (input.slug !== undefined) {
    const baseName = (update.name as string | undefined) ?? existing.name;
    const nextSlug = normalizeSlugOrThrow(baseName, input.slug);
    const collision = await db
      .select({ id: bookingServices.id })
      .from(bookingServices)
      .where(eq(bookingServices.slug, nextSlug));
    if (collision.length > 0 && collision[0]?.id !== id) {
      throw new Error("booking_service_slug_exists");
    }
    update.slug = nextSlug;
  }

  if (input.status !== undefined) {
    update.status = normalizeStatus(
      input.status,
      serviceStatuses,
      existing.status as BookingServiceStatus,
      "booking_service_status_invalid"
    );
  }

  if (input.description !== undefined) {
    update.description = normalizeNullableText(input.description);
  }

  if (input.durationMinutes !== undefined) {
    update.durationMinutes = normalizePositiveInteger(
      input.durationMinutes,
      "booking_service_duration_minutes",
      undefined,
      5,
      24 * 60
    );
  }

  if (input.bufferBeforeMinutes !== undefined) {
    update.bufferBeforeMinutes = normalizePositiveInteger(
      input.bufferBeforeMinutes,
      "booking_service_buffer_before_minutes",
      0,
      0,
      24 * 60
    );
  }

  if (input.bufferAfterMinutes !== undefined) {
    update.bufferAfterMinutes = normalizePositiveInteger(
      input.bufferAfterMinutes,
      "booking_service_buffer_after_minutes",
      0,
      0,
      24 * 60
    );
  }

  if (input.priceCents !== undefined) {
    update.priceCents =
      input.priceCents === null
        ? null
        : normalizePositiveInteger(
            input.priceCents,
            "booking_service_price_cents",
            0,
            0,
            1_000_000_000
          );
  }

  if (input.currency !== undefined) {
    update.currency = normalizeNullableText(input.currency);
  }

  if (input.settings !== undefined) {
    const existingAccessMode = resolveBookingAccessModeFromSettings(
      existing.settings,
      bookingAccessDefaults.mode
    );
    update.settings = normalizeServiceSettings(input.settings, existingAccessMode);
  }

  const [updated] = await db
    .update(bookingServices)
    .set(update)
    .where(eq(bookingServices.id, id))
    .returning();

  return updated ?? null;
}

export async function deleteBookingService(id: string) {
  const [deleted] = await db.delete(bookingServices).where(eq(bookingServices.id, id)).returning();
  return deleted ?? null;
}

export async function listBookingServiceResources(serviceId: string) {
  return db
    .select()
    .from(bookingServiceResources)
    .where(eq(bookingServiceResources.serviceId, serviceId))
    .orderBy(asc(bookingServiceResources.resourceId));
}

export async function setBookingServiceResources(
  serviceId: string,
  resources: BookingServiceResourceInput[]
) {
  await ensureServiceExists(serviceId);

  const normalized = resources.map((entry) => {
    const resourceId = normalizeText(entry.resourceId);
    if (!resourceId) throw new Error("booking_service_resource_invalid");
    return {
      resourceId,
      isRequired: entry.isRequired !== false,
    };
  });

  const deduplicated = Array.from(
    new Map(normalized.map((entry) => [entry.resourceId, entry])).values()
  );

  if (deduplicated.length > 0) {
    const existing = await db
      .select({ id: bookingResources.id })
      .from(bookingResources)
      .where(
        inArray(
          bookingResources.id,
          deduplicated.map((entry) => entry.resourceId)
        )
      );
    if (existing.length !== deduplicated.length) {
      throw new Error("booking_resource_not_found");
    }
  }

  const now = new Date();
  const inserted = await db.transaction(async (tx) => {
    await tx
      .delete(bookingServiceResources)
      .where(eq(bookingServiceResources.serviceId, serviceId));
    if (deduplicated.length === 0) return [] as (typeof bookingServiceResources.$inferSelect)[];
    return tx
      .insert(bookingServiceResources)
      .values(
        deduplicated.map((entry) => ({
          serviceId,
          resourceId: entry.resourceId,
          isRequired: entry.isRequired,
          createdAt: now,
        }))
      )
      .returning();
  });

  await db.update(bookingServices).set({ updatedAt: now }).where(eq(bookingServices.id, serviceId));

  return inserted;
}

const validateScheduleTimezone = (value: unknown, resourceTimezone: string) => {
  const normalized = normalizeText(value);
  return assertTimezone(normalized ?? resourceTimezone);
};

export async function listBookingSchedules(resourceId: string) {
  return db
    .select()
    .from(bookingSchedules)
    .where(eq(bookingSchedules.resourceId, resourceId))
    .orderBy(asc(bookingSchedules.dayOfWeek), asc(bookingSchedules.startMinute));
}

export async function setBookingSchedules(resourceId: string, schedules: BookingScheduleInput[]) {
  const resource = await getBookingResource(resourceId);
  if (!resource) throw new Error("booking_resource_not_found");

  const normalized = schedules.map((entry) => {
    const dayOfWeek = normalizePositiveInteger(
      entry.dayOfWeek,
      "booking_schedule_day_of_week",
      undefined,
      0,
      6
    );
    const startMinute = normalizePositiveInteger(
      entry.startMinute,
      "booking_schedule_start_minute",
      undefined,
      0,
      1439
    );
    const endMinute = normalizePositiveInteger(
      entry.endMinute,
      "booking_schedule_end_minute",
      undefined,
      1,
      1440
    );
    if (endMinute <= startMinute) throw new Error("booking_schedule_window_invalid");
    const timezone = validateScheduleTimezone(entry.timezone, resource.timezone);
    return {
      dayOfWeek,
      startMinute,
      endMinute,
      timezone,
      isAvailable: entry.isAvailable !== false,
    };
  });

  const grouped = new Map<number, Array<{ startMinute: number; endMinute: number }>>();
  for (const entry of normalized) {
    const list = grouped.get(entry.dayOfWeek) ?? [];
    list.push({ startMinute: entry.startMinute, endMinute: entry.endMinute });
    grouped.set(entry.dayOfWeek, list);
  }

  for (const [, windows] of grouped) {
    windows.sort((left, right) => left.startMinute - right.startMinute);
    for (let index = 1; index < windows.length; index += 1) {
      const previous = windows[index - 1];
      const current = windows[index];
      if (!previous || !current) continue;
      if (current.startMinute < previous.endMinute) {
        throw new Error("booking_schedule_overlap");
      }
    }
  }

  const now = new Date();
  const inserted = await db.transaction(async (tx) => {
    await tx.delete(bookingSchedules).where(eq(bookingSchedules.resourceId, resourceId));
    if (normalized.length === 0) return [] as (typeof bookingSchedules.$inferSelect)[];
    return tx
      .insert(bookingSchedules)
      .values(
        normalized.map((entry) => ({
          resourceId,
          dayOfWeek: entry.dayOfWeek,
          startMinute: entry.startMinute,
          endMinute: entry.endMinute,
          timezone: entry.timezone,
          isAvailable: entry.isAvailable,
          createdAt: now,
          updatedAt: now,
        }))
      )
      .returning();
  });

  await db
    .update(bookingResources)
    .set({ updatedAt: now })
    .where(eq(bookingResources.id, resourceId));

  return inserted;
}

export async function listBookingBlackouts(input?: { resourceId?: string }) {
  const resourceId = normalizeText(input?.resourceId);
  return db
    .select()
    .from(bookingBlackouts)
    .where(resourceId ? eq(bookingBlackouts.resourceId, resourceId) : undefined)
    .orderBy(desc(bookingBlackouts.startsAt));
}

export async function createBookingBlackout(input: BookingBlackoutInput) {
  const resourceId = normalizeText(input.resourceId ?? null);
  if (resourceId) {
    await ensureResourceExists(resourceId);
  }

  const startsAt = parseIsoDateTime(input.startsAt, "booking_blackout_starts_at_invalid");
  const endsAt = parseIsoDateTime(input.endsAt, "booking_blackout_ends_at_invalid");
  if (endsAt <= startsAt) throw new Error("booking_blackout_window_invalid");

  const reason = normalizeNullableText(input.reason);

  const [created] = await db
    .insert(bookingBlackouts)
    .values({
      resourceId,
      startsAt,
      endsAt,
      reason,
      createdAt: new Date(),
    })
    .returning();

  return created ?? null;
}

export async function deleteBookingBlackout(id: string) {
  const [deleted] = await db
    .delete(bookingBlackouts)
    .where(eq(bookingBlackouts.id, id))
    .returning();
  return deleted ?? null;
}

export async function listBookings(input?: {
  resourceId?: string;
  serviceId?: string;
  status?: BookingReservationStatus;
  from?: string;
  to?: string;
}) {
  const resourceId = normalizeText(input?.resourceId);
  const serviceId = normalizeText(input?.serviceId);
  const status =
    input?.status !== undefined
      ? normalizeStatus(
          input.status,
          reservationStatuses,
          "pending",
          "booking_reservation_status_invalid"
        )
      : null;
  const from = input?.from
    ? parseIsoDateTime(input.from, "booking_reservation_from_invalid")
    : null;
  const to = input?.to ? parseIsoDateTime(input.to, "booking_reservation_to_invalid") : null;

  return db
    .select()
    .from(bookings)
    .where(
      and(
        resourceId ? eq(bookings.resourceId, resourceId) : undefined,
        serviceId ? eq(bookings.serviceId, serviceId) : undefined,
        status ? eq(bookings.status, status) : undefined,
        from ? gte(bookings.startsAt, from) : undefined,
        to ? lte(bookings.startsAt, to) : undefined
      )
    )
    .orderBy(desc(bookings.startsAt));
}

const ensureBookingWindowAvailable = async (
  resourceId: string,
  startsAt: Date,
  endsAt: Date,
  ignoreBookingId?: string
) => {
  const reservations = await db
    .select({
      id: bookings.id,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      status: bookings.status,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.resourceId, resourceId),
        inArray(bookings.status, blockingReservationStatuses),
        lt(bookings.startsAt, endsAt),
        gt(bookings.endsAt, startsAt)
      )
    );

  const reservationConflict = reservations.some((row) =>
    ignoreBookingId ? row.id !== ignoreBookingId : true
  );
  if (reservationConflict) throw new Error("booking_slot_unavailable");

  const blockedByBlackout = await db
    .select({
      id: bookingBlackouts.id,
      startsAt: bookingBlackouts.startsAt,
      endsAt: bookingBlackouts.endsAt,
    })
    .from(bookingBlackouts)
    .where(
      and(
        lt(bookingBlackouts.startsAt, endsAt),
        gt(bookingBlackouts.endsAt, startsAt),
        or(eq(bookingBlackouts.resourceId, resourceId), isNull(bookingBlackouts.resourceId))
      )
    );

  if (blockedByBlackout.length > 0) throw new Error("booking_blackout_conflict");
};

const ensureServiceResourceBinding = async (serviceId: string, resourceId: string) => {
  const bindings = await db
    .select({ resourceId: bookingServiceResources.resourceId })
    .from(bookingServiceResources)
    .where(eq(bookingServiceResources.serviceId, serviceId));

  if (bindings.length === 0) return;
  if (!bindings.some((entry) => entry.resourceId === resourceId)) {
    throw new Error("booking_service_resource_not_allowed");
  }
};

export async function createBookingReservation(input: BookingReservationInput) {
  const serviceId = normalizeText(input.serviceId);
  if (!serviceId) throw new Error("booking_service_required");
  const resourceId = normalizeText(input.resourceId);
  if (!resourceId) throw new Error("booking_resource_required");

  const service = await getBookingService(serviceId);
  if (!service) throw new Error("booking_service_not_found");
  const resource = await getBookingResource(resourceId);
  if (!resource) throw new Error("booking_resource_not_found");

  if (service.status !== "active") throw new Error("booking_service_inactive");
  if (resource.status !== "active") throw new Error("booking_resource_inactive");

  const startsAt = parseIsoDateTime(input.startsAt, "booking_reservation_starts_at_invalid");
  const endsAt = parseIsoDateTime(input.endsAt, "booking_reservation_ends_at_invalid");
  if (endsAt <= startsAt) throw new Error("booking_reservation_window_invalid");

  await ensureServiceResourceBinding(service.id, resource.id);
  await ensureBookingWindowAvailable(resource.id, startsAt, endsAt);

  const timezone = assertTimezone(normalizeText(input.timezone) ?? resource.timezone ?? "UTC");
  const customerName = normalizeText(input.customerName);
  if (!customerName) throw new Error("booking_customer_name_required");

  const customerEmail = normalizeNullableText(input.customerEmail);
  const customerPhone = normalizeNullableText(input.customerPhone);
  const notes = normalizeNullableText(input.notes);
  const metadata =
    input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
      ? input.metadata
      : {};

  const now = new Date();
  const [created] = await db
    .insert(bookings)
    .values({
      serviceId: service.id,
      resourceId: resource.id,
      status: "pending",
      customerName,
      customerEmail,
      customerPhone,
      notes,
      startsAt,
      endsAt,
      timezone,
      metadata,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return created ?? null;
}

export async function updateBookingReservationStatus(id: string, status: BookingReservationStatus) {
  const normalized = normalizeStatus(
    status,
    reservationStatuses,
    "pending",
    "booking_reservation_status_invalid"
  );
  const [updated] = await db
    .update(bookings)
    .set({ status: normalized, updatedAt: new Date() })
    .where(eq(bookings.id, id))
    .returning();

  return updated ?? null;
}

export async function previewBookingSlots(
  input: BookingSlotPreviewInput,
  policy: BookingSlotPreviewPolicy = {}
): Promise<BookingSlot[]> {
  const serviceId = normalizeText(input.serviceId);
  if (!serviceId) throw new Error("booking_service_required");
  const resourceId = normalizeText(input.resourceId);
  if (!resourceId) throw new Error("booking_resource_required");

  const service = await getBookingService(serviceId);
  if (!service) throw new Error("booking_service_not_found");
  const resource = await getBookingResource(resourceId);
  if (!resource) throw new Error("booking_resource_not_found");

  const timezone = assertTimezone(normalizeText(input.timezone) ?? resource.timezone ?? "UTC");
  const intervalMinutes = normalizePositiveInteger(
    input.intervalMinutes,
    "booking_slot_interval_minutes",
    15,
    5,
    180
  );

  const date = input.date;
  assertBookingSlotDateAllowed({
    date,
    timezone,
    minDate: policy.minDate,
    maxDate: policy.maxDate,
    now: policy.now,
  });
  const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();

  const schedules = await db
    .select()
    .from(bookingSchedules)
    .where(
      and(
        eq(bookingSchedules.resourceId, resource.id),
        eq(bookingSchedules.dayOfWeek, dayOfWeek),
        eq(bookingSchedules.isAvailable, true)
      )
    )
    .orderBy(asc(bookingSchedules.startMinute));

  if (schedules.length === 0) return [];

  const startOfDay = resolveUtcFromLocal(date, 0, timezone);
  const endOfDay = resolveUtcFromLocal(nextDateString(date), 0, timezone);

  const blackoutRows = await db
    .select({
      startsAt: bookingBlackouts.startsAt,
      endsAt: bookingBlackouts.endsAt,
    })
    .from(bookingBlackouts)
    .where(
      and(
        lt(bookingBlackouts.startsAt, endOfDay),
        gt(bookingBlackouts.endsAt, startOfDay),
        or(eq(bookingBlackouts.resourceId, resource.id), isNull(bookingBlackouts.resourceId))
      )
    );

  const reservationRows = await db
    .select({
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.resourceId, resource.id),
        inArray(bookings.status, blockingReservationStatuses),
        lt(bookings.startsAt, endOfDay),
        gt(bookings.endsAt, startOfDay)
      )
    );

  const slots: BookingSlot[] = [];
  const durationMs = service.durationMinutes * 60_000;
  const beforeBufferMs = service.bufferBeforeMinutes * 60_000;
  const afterBufferMs = service.bufferAfterMinutes * 60_000;

  for (const schedule of schedules) {
    const firstStartMinute = schedule.startMinute + service.bufferBeforeMinutes;
    const lastStartMinute =
      schedule.endMinute - service.durationMinutes - service.bufferAfterMinutes;

    if (lastStartMinute < firstStartMinute) continue;

    for (
      let startMinute = firstStartMinute;
      startMinute <= lastStartMinute;
      startMinute += intervalMinutes
    ) {
      const startsAt = resolveUtcFromLocal(date, startMinute, timezone);
      const endsAt = new Date(startsAt.getTime() + durationMs);
      const reservedStart = new Date(startsAt.getTime() - beforeBufferMs);
      const reservedEnd = new Date(endsAt.getTime() + afterBufferMs);

      const blackoutConflict = blackoutRows.some((item) =>
        hasOverlap(reservedStart, reservedEnd, item.startsAt, item.endsAt)
      );
      if (blackoutConflict) continue;

      const reservationConflict = reservationRows.some((item) =>
        hasOverlap(reservedStart, reservedEnd, item.startsAt, item.endsAt)
      );
      if (reservationConflict) continue;

      slots.push({
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        timezone,
      });
    }
  }

  return slots;
}
