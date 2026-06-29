import type {
  BookingReservationRecord,
  BookingReservationStatus,
  BookingResourceType,
} from "@/services/bookingClient";
import { isApiClientError } from "@/services/apiClient";

import { DAY_OPTIONS } from "./bookingTypes";

export const readClientError = (error: unknown, fallback: string) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export const parseNumberInRange = (
  value: string,
  field: string,
  options: { min: number; max: number }
) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} must be a number.`);
  }
  const normalized = Math.floor(parsed);
  if (normalized < options.min || normalized > options.max) {
    throw new Error(`${field} must be between ${options.min} and ${options.max}.`);
  }
  return normalized;
};

export const parseOptionalNumber = (value: string, field: string, min = 0, max = 1_000_000_000) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} must be a number.`);
  }
  const normalized = Math.floor(parsed);
  if (normalized < min || normalized > max) {
    throw new Error(`${field} must be between ${min} and ${max}.`);
  }
  return normalized;
};

export const normalizeOptionalText = (value: string) => {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const toTimeInput = (minute: number) => {
  const hours = Math.floor(minute / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (minute % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

export const parseTimeInput = (value: string, field: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) throw new Error(`${field} must use HH:MM format.`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    throw new Error(`${field} must use HH:MM format.`);
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`${field} must use HH:MM format.`);
  }
  return hours * 60 + minutes;
};

export const toIsoFromLocal = (value: string, field: string) => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) throw new Error(`${field} is invalid.`);
  return date.toISOString();
};

export const formatDateTime = (value: string, timezone?: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone || "UTC",
    }).format(date);
  } catch {
    return value;
  }
};

export const formatReservationStatus = (status: BookingReservationStatus) =>
  status
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");

export const formatResourceType = (type: BookingResourceType) =>
  type.slice(0, 1).toUpperCase() + type.slice(1);

export const dayLabel = (day: number) =>
  DAY_OPTIONS.find((item) => item.value === day)?.label ?? `Day ${day}`;

// ---------------------------------------------------------------------------
// TASK-479-17-L01: pure, timezone-explicit derivations for the weekly calendar
// overview. NO data fetching, NO fabrication — these only reshape REAL loaded
// reservations into Mon..Sun buckets and derive the current-week columns. All
// calendar-day math is UTC-based so columns are deterministic regardless of the
// admin viewer's machine timezone; each reservation is bucketed/labelled in its
// OWN timezone (mirroring `formatDateTime`'s `Intl.DateTimeFormat` pattern).
// ---------------------------------------------------------------------------

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const RESOURCE_TONES = [
  "bg-primary-soft text-primary-soft-foreground",
  "bg-info-soft text-info",
  "bg-success-soft text-success",
  "bg-warning-soft text-warning",
] as const;

const pad2 = (value: number) => String(value).padStart(2, "0");

const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * 86_400_000);

// UTC-based YYYY-MM-DD so a fixed instant maps to the same column on any host.
const toIsoDate = (date: Date): string =>
  `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;

/**
 * Monday-anchored start of the week (UTC midnight) for a reference instant.
 * UTC-based so the seven derived columns are deterministic across host zones.
 */
export const startOfWeek = (reference: Date): Date => {
  const date = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate())
  );
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday … 6 = Saturday
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date;
};

/** Calendar date (YYYY-MM-DD) of an instant in the given timezone; "" if unparseable. */
export const isoDateInTimeZone = (value: string, timezone?: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: timezone || "UTC",
    }).formatToParts(date);
    const lookup = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    const year = lookup("year");
    const month = lookup("month");
    const day = lookup("day");
    if (!year || !month || !day) return "";
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
};

/** HH:MM (24h) of an instant in the given timezone; "" if unparseable. */
export const formatTime = (value: string, timezone?: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone || "UTC",
    }).format(date);
  } catch {
    return "";
  }
};

/** True when the reservation's own-timezone calendar day equals "now" in that timezone. */
export const isReservationToday = (
  reservation: Pick<BookingReservationRecord, "startsAt" | "timezone">,
  now: Date
): boolean => {
  const reservationDay = isoDateInTimeZone(reservation.startsAt, reservation.timezone);
  if (!reservationDay) return false;
  return reservationDay === isoDateInTimeZone(now.toISOString(), reservation.timezone);
};

/** "Jun 22 – Jun 28, 2026" label for the Mon..Sun span starting at weekStart (UTC). */
export const weekRangeLabel = (weekStart: Date): string => {
  const weekEnd = addDays(weekStart, 6);
  const formatDay = (date: Date) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(date);
  return `${formatDay(weekStart)} – ${formatDay(weekEnd)}, ${weekStart.getUTCFullYear()}`;
};

/** Stable token tone for a resource based on its position in the loaded order. */
export const resourceTone = (resourceId: string, resourceOrder: string[]): string => {
  const index = resourceOrder.indexOf(resourceId);
  return RESOURCE_TONES[(index >= 0 ? index : 0) % RESOURCE_TONES.length];
};

export type WeekColumn = {
  label: string; // "Mon"
  date: string; // "22"
  isoDate: string; // "2026-06-22"
  blocks: Array<{
    id: string;
    time: string; // "09:00" — startsAt rendered in the reservation's OWN timezone
    name: string; // reservation.customerName
    tone: string; // resourceTone(resourceId) token classes
  }>;
};

/**
 * Group REAL reservations into the seven Mon..Sun columns of `weekStart`'s week.
 * A reservation lands in the column whose calendar day equals its own-timezone
 * day; an unparseable `startsAt` yields "" (matches no column) so malformed
 * records are skipped, never thrown. Blocks are sorted ascending by `startsAt`.
 */
export const groupReservationsByWeek = (
  reservations: BookingReservationRecord[],
  weekStart: Date,
  resourceOrder: string[]
): WeekColumn[] =>
  Array.from({ length: 7 }, (_unused, dayIndex) => {
    const day = addDays(weekStart, dayIndex);
    const isoDate = toIsoDate(day);
    return {
      label: WEEKDAY_LABELS[dayIndex],
      date: String(day.getUTCDate()),
      isoDate,
      blocks: reservations
        .filter(
          (reservation) => isoDateInTimeZone(reservation.startsAt, reservation.timezone) === isoDate
        )
        .slice()
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .map((reservation) => ({
          id: reservation.id,
          time: formatTime(reservation.startsAt, reservation.timezone),
          name: reservation.customerName,
          tone: resourceTone(reservation.resourceId, resourceOrder),
        })),
    };
  });
