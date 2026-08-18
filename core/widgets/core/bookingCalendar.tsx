import type { ComponentType, CSSProperties } from "react";

import type { WidgetDefinition, WidgetEditorContract, WidgetEditorBundle } from "../types";
import { getBookingRuntimeClientScript } from "./bookingRuntimeScript";
import { compactObject, compactStyle, resolveClearableStyleValue } from "./clearableStyle";

export type BookingCalendarVariantId = "default" | "compact" | "inline" | "horizontal";

export type BookingCalendarResolvedResource = {
  id: string;
  name: string;
  type: string;
  timezone: string;
  capacity: number;
  status?: "active" | "inactive";
};

export type BookingCalendarResolvedService = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  priceCents: number | null;
  currency: string | null;
  status?: "active" | "inactive";
  resourceIds: string[];
  submissionAccess?: "public" | "internal";
};

export type BookingCalendarData = {
  flowId?: string;
  title?: string;
  description?: string;
  serviceLabel?: string;
  resourceLabel?: string;
  dateLabel?: string;
  refreshLabel?: string;
  missingSelectionMessage?: string;
  emptySlotsMessage?: string;
  loadingMessage?: string;
  errorMessage?: string;
  selectedSlotEmptyMessage?: string;
  intervalMinutes?: number;
  defaultDate?: string;
  minDate?: string;
  maxDate?: string;
  showServicePrice?: boolean;
  showServiceDuration?: boolean;
  showServiceDescription?: boolean;
  showTimezone?: boolean;
  summaryLocale?: string;
  summaryDateStyle?: "short" | "medium" | "long";
  emptyStateMessage?: string;
  datePickerMode?: "native" | "week";
  slotIntervalMode?: "fixed" | "service-duration" | "non-overlapping";
  defaultServiceId?: string;
  defaultResourceId?: string;
  slotsEndpoint?: string;
  style?: {
    frameBackground?: string;
    frameBorderColor?: string;
    selectedSlotBackground?: string;
    selectedSlotBorderColor?: string;
    slotHoverBorderColor?: string;
  };
  resolved?: {
    services?: BookingCalendarResolvedService[];
    resources?: BookingCalendarResolvedResource[];
    slotsToken?: string | null;
    error?: string;
  };
};

export const bookingCalendarEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "booking-calendar.wizard.flow-setup",
      title: "Flow",
      role: "setup",
      writablePaths: ["flowId"],
    },
    {
      mode: "wizard",
      id: "booking-calendar.wizard.availability-setup",
      title: "Availability setup",
      role: "setup",
      writablePaths: ["intervalMinutes", "defaultServiceId", "defaultResourceId"],
    },
    {
      mode: "wizard",
      id: "booking-calendar.wizard.date-policy",
      title: "Date policy",
      role: "setup",
      writablePaths: ["defaultDate", "minDate", "maxDate"],
    },
    {
      mode: "visual",
      id: "booking-calendar.visual.variant-layout",
      title: "Variant",
      role: "layout",
      writablePaths: ["variant"],
    },
    {
      mode: "visual",
      id: "booking-calendar.visual.copy",
      title: "Copy",
      role: "content",
      writablePaths: [
        "title",
        "description",
        "serviceLabel",
        "resourceLabel",
        "dateLabel",
        "refreshLabel",
      ],
    },
    {
      mode: "visual",
      id: "booking-calendar.visual.status-messages",
      title: "Status messages",
      role: "content",
      writablePaths: [
        "loadingMessage",
        "emptySlotsMessage",
        "missingSelectionMessage",
        "errorMessage",
        "selectedSlotEmptyMessage",
        "emptyStateMessage",
      ],
    },
    {
      mode: "visual",
      id: "booking-calendar.visual.service-context",
      title: "Service context",
      role: "content",
      writablePaths: [
        "showServicePrice",
        "showServiceDuration",
        "showServiceDescription",
        "showTimezone",
        "summaryLocale",
        "summaryDateStyle",
      ],
    },
    {
      mode: "visual",
      id: "booking-calendar.visual.date-picker",
      title: "Date picker",
      role: "content",
      writablePaths: ["datePickerMode", "slotIntervalMode"],
    },
    {
      mode: "visual",
      id: "booking-calendar.visual.surface",
      title: "Surface",
      role: "visual",
      writablePaths: [
        "style.frameBackground",
        "style.frameBorderColor",
        "style.selectedSlotBackground",
        "style.selectedSlotBorderColor",
        "style.slotHoverBorderColor",
      ],
    },
    {
      mode: "advanced",
      id: "booking-calendar.advanced.runtime-endpoint",
      title: "Runtime route",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["slotsEndpoint"],
    },
    {
      mode: "advanced",
      id: "booking-calendar.advanced.runtime-diagnostics",
      title: "Resolved runtime payload",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "flowId",
        "defaultServiceId",
        "defaultResourceId",
        "resolved.services",
        "resolved.resources",
        "resolved.slotsToken",
        "resolved.error",
      ],
    },
  ],
};

type BookingCalendarResolved = NonNullable<BookingCalendarData["resolved"]>;

export const bookingCalendarDefaults: BookingCalendarData = {
  flowId: "booking-flow",
  title: "Choose appointment slot",
  description: "Pick service, resource, and date to see available time slots.",
  serviceLabel: "Service",
  resourceLabel: "Resource",
  dateLabel: "Date",
  refreshLabel: "Refresh slots",
  missingSelectionMessage: "Choose service, resource, and date first.",
  emptySlotsMessage: "No available slots for selected date.",
  loadingMessage: "Loading slots...",
  errorMessage: "Unable to load slots right now.",
  selectedSlotEmptyMessage: "No slot selected yet.",
  intervalMinutes: 15,
  showServicePrice: true,
  showServiceDuration: true,
  showServiceDescription: false,
  showTimezone: true,
  summaryDateStyle: "short",
  emptyStateMessage: "Booking is currently unavailable. Please try another service or contact us.",
  datePickerMode: "native",
  slotIntervalMode: "fixed",
  slotsEndpoint: "/api/booking/slots",
};

const text = (value: string | undefined, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const optionalText = (value: string | undefined) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const safeRelativeEndpoint = (value: string | undefined, fallback: string) => {
  const normalized = optionalText(value) ?? fallback;
  if (!normalized.startsWith("/") || normalized.startsWith("//")) return fallback;
  try {
    const url = new URL(normalized, "https://coderso.local");
    if (url.origin !== "https://coderso.local") return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
};

const normalizeInterval = (value: unknown, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const normalized = Math.floor(value);
  if (normalized < 5) return 5;
  if (normalized > 180) return 180;
  return normalized;
};

const normalizeDateOnly = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return undefined;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  return trimmed;
};

const resolveInitialDateValue = (
  data: Pick<BookingCalendarData, "defaultDate" | "minDate" | "maxDate">
) => {
  const requested = normalizeDateOnly(data.defaultDate);
  if (!requested) return undefined;
  const minDate = normalizeDateOnly(data.minDate);
  const maxDate = normalizeDateOnly(data.maxDate);

  if (minDate && requested < minDate) return minDate;
  if (maxDate && requested > maxDate) return maxDate;
  return requested;
};

const normalizeBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const normalizeSummaryDateStyle = (
  value: unknown
): NonNullable<BookingCalendarData["summaryDateStyle"]> => {
  return value === "medium" || value === "long" ? value : "short";
};

const normalizeDatePickerMode = (
  value: unknown
): NonNullable<BookingCalendarData["datePickerMode"]> => {
  return value === "week" ? value : "native";
};

const normalizeSlotIntervalMode = (
  value: unknown
): NonNullable<BookingCalendarData["slotIntervalMode"]> => {
  if (value === "service-duration" || value === "non-overlapping") {
    return value;
  }
  return "fixed";
};

const normalizeResolvedResources = (
  items: BookingCalendarResolved["resources"]
): BookingCalendarResolvedResource[] => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const id = optionalText(item?.id);
      const name = optionalText(item?.name);
      const timezone = optionalText(item?.timezone);
      if (!id || !name || !timezone) return null;
      const capacity =
        typeof item?.capacity === "number" && Number.isFinite(item.capacity)
          ? Math.max(1, Math.floor(item.capacity))
          : 1;
      return {
        id,
        name,
        timezone,
        capacity,
        type: optionalText(item?.type) ?? "other",
        ...(item?.status === "active" || item?.status === "inactive"
          ? { status: item.status }
          : {}),
      } satisfies BookingCalendarResolvedResource;
    })
    .filter((item): item is BookingCalendarResolvedResource => item !== null);
};

const normalizeResolvedServices = (
  items: BookingCalendarResolved["services"]
): BookingCalendarResolvedService[] => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const id = optionalText(item?.id);
      const name = optionalText(item?.name);
      if (!id || !name) return null;
      const resourceIds = Array.isArray(item?.resourceIds)
        ? Array.from(
            new Set(
              item.resourceIds
                .map((value) => optionalText(value))
                .filter((value): value is string => Boolean(value))
            )
          )
        : [];
      const durationMinutes =
        typeof item?.durationMinutes === "number" && Number.isFinite(item.durationMinutes)
          ? Math.max(5, Math.floor(item.durationMinutes))
          : 30;
      const bufferBeforeMinutes =
        typeof item?.bufferBeforeMinutes === "number" && Number.isFinite(item.bufferBeforeMinutes)
          ? Math.max(0, Math.floor(item.bufferBeforeMinutes))
          : 0;
      const bufferAfterMinutes =
        typeof item?.bufferAfterMinutes === "number" && Number.isFinite(item.bufferAfterMinutes)
          ? Math.max(0, Math.floor(item.bufferAfterMinutes))
          : 0;
      const priceCents =
        typeof item?.priceCents === "number" && Number.isFinite(item.priceCents)
          ? Math.max(0, Math.floor(item.priceCents))
          : null;
      return {
        id,
        name,
        description: optionalText(item?.description ?? undefined) ?? null,
        durationMinutes,
        bufferBeforeMinutes,
        bufferAfterMinutes,
        priceCents,
        currency: optionalText(item?.currency ?? undefined) ?? null,
        resourceIds,
        ...(item?.submissionAccess === "public" || item?.submissionAccess === "internal"
          ? { submissionAccess: item.submissionAccess }
          : {}),
        ...(item?.status === "active" || item?.status === "inactive"
          ? { status: item.status }
          : {}),
      } satisfies BookingCalendarResolvedService;
    })
    .filter((item): item is BookingCalendarResolvedService => item !== null);
};

export const bookingCalendarSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    flowId: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    serviceLabel: { type: "string" },
    resourceLabel: { type: "string" },
    dateLabel: { type: "string" },
    refreshLabel: { type: "string" },
    missingSelectionMessage: { type: "string" },
    emptySlotsMessage: { type: "string" },
    loadingMessage: { type: "string" },
    errorMessage: { type: "string" },
    selectedSlotEmptyMessage: { type: "string" },
    intervalMinutes: { type: "integer", minimum: 5, maximum: 180 },
    defaultDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    minDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    maxDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    showServicePrice: { type: "boolean" },
    showServiceDuration: { type: "boolean" },
    showServiceDescription: { type: "boolean" },
    showTimezone: { type: "boolean" },
    summaryLocale: { type: "string" },
    summaryDateStyle: { enum: ["short", "medium", "long"] },
    emptyStateMessage: { type: "string" },
    datePickerMode: { enum: ["native", "week"] },
    slotIntervalMode: { enum: ["fixed", "service-duration", "non-overlapping"] },
    defaultServiceId: { type: "string" },
    defaultResourceId: { type: "string" },
    slotsEndpoint: { type: "string" },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        frameBackground: { type: "string" },
        frameBorderColor: { type: "string" },
        selectedSlotBackground: { type: "string" },
        selectedSlotBorderColor: { type: "string" },
        slotHoverBorderColor: { type: "string" },
      },
    },
    resolved: {
      type: "object",
      additionalProperties: false,
      properties: {
        services: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: ["string", "null"] },
              durationMinutes: { type: "number" },
              bufferBeforeMinutes: { type: "number" },
              bufferAfterMinutes: { type: "number" },
              priceCents: { type: ["number", "null"] },
              currency: { type: ["string", "null"] },
              status: { enum: ["active", "inactive"] },
              submissionAccess: { enum: ["public", "internal"] },
              resourceIds: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
        },
        resources: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              type: { type: "string" },
              timezone: { type: "string" },
              capacity: { type: "number" },
              status: { enum: ["active", "inactive"] },
            },
          },
        },
        slotsToken: { type: ["string", "null"] },
        error: { type: "string" },
      },
    },
  },
} as const;

export function normalizeBookingCalendarData(data: BookingCalendarData): BookingCalendarData {
  const services = normalizeResolvedServices(data.resolved?.services);
  const resources = normalizeResolvedResources(data.resolved?.resources);
  const hasStyleObject = data.style !== undefined;
  const style = hasStyleObject
    ? (compactObject({
        frameBackground: resolveClearableStyleValue(data.style?.frameBackground),
        frameBorderColor: resolveClearableStyleValue(data.style?.frameBorderColor),
        selectedSlotBackground: resolveClearableStyleValue(data.style?.selectedSlotBackground),
        selectedSlotBorderColor: resolveClearableStyleValue(data.style?.selectedSlotBorderColor),
        slotHoverBorderColor: resolveClearableStyleValue(data.style?.slotHoverBorderColor),
      }) ?? {})
    : undefined;

  return {
    flowId: text(data.flowId, bookingCalendarDefaults.flowId ?? "booking-flow"),
    title: text(data.title, bookingCalendarDefaults.title ?? "Choose appointment slot"),
    description: text(
      data.description,
      bookingCalendarDefaults.description ??
        "Pick service, resource, and date to see available time slots."
    ),
    serviceLabel: text(data.serviceLabel, bookingCalendarDefaults.serviceLabel ?? "Service"),
    resourceLabel: text(data.resourceLabel, bookingCalendarDefaults.resourceLabel ?? "Resource"),
    dateLabel: text(data.dateLabel, bookingCalendarDefaults.dateLabel ?? "Date"),
    refreshLabel: text(data.refreshLabel, bookingCalendarDefaults.refreshLabel ?? "Refresh slots"),
    missingSelectionMessage: text(
      data.missingSelectionMessage,
      bookingCalendarDefaults.missingSelectionMessage ?? "Choose service, resource, and date first."
    ),
    emptySlotsMessage: text(
      data.emptySlotsMessage,
      bookingCalendarDefaults.emptySlotsMessage ?? "No available slots for selected date."
    ),
    loadingMessage: text(
      data.loadingMessage,
      bookingCalendarDefaults.loadingMessage ?? "Loading slots..."
    ),
    errorMessage: text(
      data.errorMessage,
      bookingCalendarDefaults.errorMessage ?? "Unable to load slots right now."
    ),
    selectedSlotEmptyMessage: text(
      data.selectedSlotEmptyMessage,
      bookingCalendarDefaults.selectedSlotEmptyMessage ?? "No slot selected yet."
    ),
    intervalMinutes: normalizeInterval(
      data.intervalMinutes,
      bookingCalendarDefaults.intervalMinutes ?? 15
    ),
    defaultDate: normalizeDateOnly(data.defaultDate),
    minDate: normalizeDateOnly(data.minDate),
    maxDate: normalizeDateOnly(data.maxDate),
    showServicePrice: normalizeBoolean(
      data.showServicePrice,
      bookingCalendarDefaults.showServicePrice ?? true
    ),
    showServiceDuration: normalizeBoolean(
      data.showServiceDuration,
      bookingCalendarDefaults.showServiceDuration ?? true
    ),
    showServiceDescription: normalizeBoolean(
      data.showServiceDescription,
      bookingCalendarDefaults.showServiceDescription ?? false
    ),
    showTimezone: normalizeBoolean(data.showTimezone, bookingCalendarDefaults.showTimezone ?? true),
    summaryLocale: optionalText(data.summaryLocale),
    summaryDateStyle: normalizeSummaryDateStyle(data.summaryDateStyle),
    emptyStateMessage: text(
      data.emptyStateMessage,
      bookingCalendarDefaults.emptyStateMessage ??
        "Booking is currently unavailable. Please try another service or contact us."
    ),
    datePickerMode: normalizeDatePickerMode(data.datePickerMode),
    slotIntervalMode: normalizeSlotIntervalMode(data.slotIntervalMode),
    defaultServiceId: optionalText(data.defaultServiceId),
    defaultResourceId: optionalText(data.defaultResourceId),
    slotsEndpoint: safeRelativeEndpoint(
      data.slotsEndpoint,
      bookingCalendarDefaults.slotsEndpoint ?? "/api/booking/slots"
    ),
    ...(hasStyleObject ? { style } : {}),
    resolved: {
      services,
      resources,
      slotsToken: optionalText(data.resolved?.slotsToken ?? undefined) ?? null,
      ...(optionalText(data.resolved?.error) ? { error: text(data.resolved?.error, "") } : {}),
    },
  };
}

const pickInitialServiceId = (services: BookingCalendarResolvedService[], requested?: string) => {
  if (requested && services.some((service) => service.id === requested)) return requested;
  return services[0]?.id ?? "";
};

const pickInitialResourceId = (
  resources: BookingCalendarResolvedResource[],
  service: BookingCalendarResolvedService | null,
  requested?: string
) => {
  if (requested && resources.some((resource) => resource.id === requested)) {
    if (!service || service.resourceIds.length === 0 || service.resourceIds.includes(requested)) {
      return requested;
    }
  }

  if (service && service.resourceIds.length > 0) {
    const firstAllowed = service.resourceIds.find((resourceId) =>
      resources.some((resource) => resource.id === resourceId)
    );
    if (firstAllowed) return firstAllowed;
  }

  return resources[0]?.id ?? "";
};

const variantClassMap: Record<BookingCalendarVariantId, string> = {
  default: "space-y-4 rounded-xl border p-5",
  compact: "space-y-3 rounded-lg border p-4",
  inline: "space-y-4 border-0 p-0",
  horizontal:
    "space-y-4 rounded-xl border p-5 lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:gap-5 lg:space-y-0",
};

const resolveBookingCalendarVariant = (value: string | undefined): BookingCalendarVariantId => {
  return value === "compact" || value === "inline" || value === "horizontal" ? value : "default";
};

const formatServicePrice = (
  service: BookingCalendarResolvedService,
  locale: string | undefined
) => {
  if (service.priceCents === null || !service.currency) return null;
  const currency = service.currency.toUpperCase();
  try {
    return new Intl.NumberFormat(locale || undefined, {
      style: "currency",
      currency,
    }).format(service.priceCents / 100);
  } catch {
    return `${(service.priceCents / 100).toFixed(2)} ${currency}`;
  }
};

const buildDurationCopy = (service: BookingCalendarResolvedService) => {
  const bufferTotal = service.bufferBeforeMinutes + service.bufferAfterMinutes;
  if (bufferTotal <= 0) return `${service.durationMinutes} min`;
  return `${service.durationMinutes} min + ${bufferTotal} min buffer`;
};

const joinMeta = (items: Array<string | null>) => items.filter(Boolean).join(" · ");

export function BookingCalendarBlock({
  data,
  variant,
}: {
  data: BookingCalendarData;
  variant: string;
}) {
  const normalized = normalizeBookingCalendarData(data);
  const services = normalized.resolved?.services ?? [];
  const resources = normalized.resolved?.resources ?? [];
  const hasCatalog = services.length > 0 && resources.length > 0;
  const hasSlotsToken = Boolean(normalized.resolved?.slotsToken);
  const variantId = resolveBookingCalendarVariant(variant);
  const frameBackground = resolveClearableStyleValue(normalized.style?.frameBackground);
  const frameBorderColor = resolveClearableStyleValue(normalized.style?.frameBorderColor);
  const frameStyle: CSSProperties | undefined = compactStyle({
    backgroundColor: frameBackground,
    borderColor: frameBorderColor,
    "--booking-slot-selected-bg": resolveClearableStyleValue(
      normalized.style?.selectedSlotBackground
    ),
    "--booking-slot-selected-border": resolveClearableStyleValue(
      normalized.style?.selectedSlotBorderColor
    ),
    "--booking-slot-hover-border": resolveClearableStyleValue(
      normalized.style?.slotHoverBorderColor
    ),
  } as Record<string, string | undefined>);
  const legacyFrameBorderClass =
    frameBorderColor === undefined ? "border-[var(--color-border)]" : "";
  const legacyFrameBackgroundClass = frameBackground === undefined ? "bg-[var(--color-bg)]/95" : "";

  const initialServiceId = pickInitialServiceId(services, normalized.defaultServiceId);
  const initialService = services.find((service) => service.id === initialServiceId) ?? null;
  const initialResourceId = pickInitialResourceId(
    resources,
    initialService,
    normalized.defaultResourceId
  );
  const initialResource = resources.find((resource) => resource.id === initialResourceId) ?? null;
  const initialDateValue = resolveInitialDateValue(normalized);
  const initialServiceMeta = initialService
    ? joinMeta([
        normalized.showServiceDuration ? buildDurationCopy(initialService) : null,
        normalized.showServicePrice
          ? formatServicePrice(initialService, normalized.summaryLocale)
          : null,
      ])
    : "";
  const controlsGridClass =
    variantId === "horizontal"
      ? "grid grid-cols-2 gap-3 xl:grid-cols-2"
      : "grid grid-cols-2 gap-3 lg:grid-cols-4";
  const slotGridClass =
    variantId === "compact"
      ? "grid grid-cols-2 gap-2 sm:grid-cols-3"
      : "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4";
  const rootClass =
    `${variantClassMap[variantId]} ${legacyFrameBorderClass} ${legacyFrameBackgroundClass}`.trim();
  const flowIdSlug = (normalized.flowId ?? "booking-flow").replace(/[^a-zA-Z0-9_-]+/g, "-");
  const titleId = `${flowIdSlug}-booking-calendar-title`;
  const slotsRegionLabelId = `${flowIdSlug}-booking-calendar-slots-label`;

  return (
    <section
      role="region"
      aria-labelledby={titleId}
      className={rootClass}
      style={frameStyle}
      data-nextless-booking-calendar="1"
      data-flow-id={normalized.flowId}
      data-slots-endpoint={normalized.slotsEndpoint}
      data-slot-interval={normalized.intervalMinutes}
      data-slots-token={normalized.resolved?.slotsToken ?? ""}
      data-default-date={normalized.defaultDate ?? ""}
      data-min-date={normalized.minDate ?? ""}
      data-max-date={normalized.maxDate ?? ""}
      data-summary-locale={normalized.summaryLocale ?? ""}
      data-summary-date-style={normalized.summaryDateStyle ?? "short"}
      data-date-picker-mode={normalized.datePickerMode ?? "native"}
      data-slot-interval-mode={normalized.slotIntervalMode ?? "fixed"}
      data-show-service-price={normalized.showServicePrice ? "true" : "false"}
      data-show-service-duration={normalized.showServiceDuration ? "true" : "false"}
      data-show-service-description={normalized.showServiceDescription ? "true" : "false"}
      data-show-timezone={normalized.showTimezone ? "true" : "false"}
      data-widget="booking-calendar"
    >
      <div className={variantId === "horizontal" ? "space-y-4" : "space-y-4"}>
        <div className="space-y-1">
          <h3 id={titleId} className="text-lg font-semibold text-[var(--color-text)]">
            {normalized.title}
          </h3>
          <p className="text-sm text-[var(--color-text)]/70">{normalized.description}</p>
        </div>

        {normalized.resolved?.error ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Booking runtime warning: {normalized.resolved.error}
          </div>
        ) : null}

        {hasCatalog ? (
          <>
            <div className="space-y-3">
              {normalized.datePickerMode === "week" ? (
                <div
                  className="rounded-lg border border-[var(--color-border)]/70 bg-background/50 p-3"
                  data-booking-week-picker
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      data-booking-week-prev
                      className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs font-medium text-[var(--color-text)]"
                    >
                      Previous
                    </button>
                    <p
                      className="text-xs font-medium uppercase tracking-wide text-[var(--color-text)]/70"
                      data-booking-week-label
                    />
                    <button
                      type="button"
                      data-booking-week-next
                      className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs font-medium text-[var(--color-text)]"
                    >
                      Next
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-7 gap-2" data-booking-week-days />
                  {!hasSlotsToken ? (
                    <p
                      className="mt-3 rounded-md border border-dashed border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text)]/70"
                      data-booking-week-runtime-boundary
                    >
                      Runtime interactions are available in public preview after saving.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className={controlsGridClass}>
                <label className="space-y-1 text-xs font-medium text-[var(--color-text)]/80">
                  <span>{normalized.serviceLabel}</span>
                  <select
                    data-booking-service
                    defaultValue={initialServiceId}
                    className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
                  >
                    {services.map((service) => (
                      <option
                        key={service.id}
                        value={service.id}
                        data-resource-ids={service.resourceIds.join(",")}
                        data-description={service.description ?? ""}
                        data-duration-minutes={service.durationMinutes}
                        data-buffer-before-minutes={service.bufferBeforeMinutes}
                        data-buffer-after-minutes={service.bufferAfterMinutes}
                        data-price-cents={service.priceCents ?? ""}
                        data-currency={service.currency ?? ""}
                        data-submission-access={service.submissionAccess ?? "public"}
                      >
                        {service.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-xs font-medium text-[var(--color-text)]/80">
                  <span>{normalized.resourceLabel}</span>
                  <select
                    data-booking-resource
                    defaultValue={initialResourceId}
                    className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
                  >
                    {resources.map((resource) => (
                      <option
                        key={resource.id}
                        value={resource.id}
                        data-timezone={resource.timezone}
                      >
                        {resource.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-xs font-medium text-[var(--color-text)]/80">
                  <span>{normalized.dateLabel}</span>
                  <input
                    data-booking-date
                    type="date"
                    defaultValue={initialDateValue}
                    min={normalized.minDate}
                    max={normalized.maxDate}
                    className={
                      normalized.datePickerMode === "week"
                        ? "sr-only"
                        : "w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
                    }
                  />
                </label>

                <div className="flex items-end">
                  <button
                    type="button"
                    data-booking-refresh
                    className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)]"
                  >
                    {normalized.refreshLabel}
                  </button>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-[var(--color-border)]/60 bg-background/50 p-3">
                <div className="space-y-1" data-booking-service-context>
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    {initialService?.name ?? "No service selected"}
                  </p>
                  {initialServiceMeta ? (
                    <p className="text-xs text-[var(--color-text)]/70">{initialServiceMeta}</p>
                  ) : null}
                  {normalized.showServiceDescription && initialService?.description ? (
                    <p className="text-xs text-[var(--color-text)]/70">
                      {initialService.description}
                    </p>
                  ) : null}
                </div>
                {normalized.showTimezone ? (
                  <p className="text-xs text-[var(--color-text)]/70" data-booking-resource-timezone>
                    {initialResource ? `Timezone: ${initialResource.timezone}` : ""}
                  </p>
                ) : null}
              </div>
            </div>

            <p
              className="text-xs text-[var(--color-text)]/65"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              data-booking-slots-status
              data-loading={normalized.loadingMessage}
            />

            <div className="grid gap-2" data-booking-loading-skeleton hidden aria-hidden="true">
              <div className="h-10 rounded-md border border-dashed border-[var(--color-border)]/50 bg-[var(--color-bg)]/50" />
              <div className="h-10 rounded-md border border-dashed border-[var(--color-border)]/40 bg-[var(--color-bg)]/40" />
            </div>

            <div className="flex items-center justify-between gap-3">
              <p
                className="text-xs text-[var(--color-text)]/65"
                data-booking-selected-summary
                data-empty={normalized.selectedSlotEmptyMessage}
              >
                {normalized.selectedSlotEmptyMessage}
              </p>
              <button
                type="button"
                data-booking-clear-selection
                className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs font-medium text-[var(--color-text)]"
              >
                Clear selection
              </button>
            </div>

            <div
              className={slotGridClass}
              role="list"
              aria-labelledby={slotsRegionLabelId}
              data-booking-slots
              data-empty={normalized.emptySlotsMessage}
              data-missing={normalized.missingSelectionMessage}
              data-error={normalized.errorMessage}
            />
            <span id={slotsRegionLabelId} className="sr-only">
              Available time slots
            </span>
          </>
        ) : (
          <div className="rounded-md border border-dashed border-[var(--color-border)] px-3 py-4 text-sm text-[var(--color-text)]/70">
            {normalized.emptyStateMessage}
          </div>
        )}
      </div>

      {variantId === "horizontal" && hasCatalog ? (
        <div className="rounded-lg border border-[var(--color-border)]/70 bg-background/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]/60">
            Selection summary
          </p>
          <p
            className="mt-2 text-sm text-[var(--color-text)]/75"
            data-booking-selected-summary-sidebar
          >
            {normalized.selectedSlotEmptyMessage}
          </p>
        </div>
      ) : null}

      <script dangerouslySetInnerHTML={{ __html: getBookingRuntimeClientScript() }} />
    </section>
  );
}

export function createBookingCalendarWidget(
  editors: WidgetEditorBundle<BookingCalendarData>
): WidgetDefinition<BookingCalendarData> {
  return {
    type: "booking-calendar",
    title: "Booking Calendar",
    description: "Interactive slot picker for booking services/resources.",
    category: "forms",
    variants: [
      {
        id: "default",
        label: "Default",
        description: "Service/resource/date selector with runtime slot list.",
      },
      {
        id: "compact",
        label: "Compact",
        description: "Denser presentation for tighter sidebars and shorter forms.",
      },
      {
        id: "inline",
        label: "Inline",
        description: "Minimal surface styling for embedding into broader page sections.",
      },
      {
        id: "horizontal",
        label: "Horizontal",
        description: "Controls and selection summary sit side by side on larger screens.",
      },
    ],
    schema: bookingCalendarSchema,
    defaults: bookingCalendarDefaults,
    editor: {
      wizard: editors.wizard,
      visual: editors.visual,
      advanced: editors.advanced,
    },
    editorContract: bookingCalendarEditorContract,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: BookingCalendarBlock,
  };
}
