import type {
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
