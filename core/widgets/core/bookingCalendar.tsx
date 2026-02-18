import type { ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorProps } from "../types";
import { getBookingRuntimeClientScript } from "./bookingRuntimeScript";

export type BookingCalendarVariantId = "default";

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
  defaultServiceId?: string;
  defaultResourceId?: string;
  slotsEndpoint?: string;
  resolved?: {
    services?: BookingCalendarResolvedService[];
    resources?: BookingCalendarResolvedResource[];
    slotsToken?: string | null;
    error?: string;
  };
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

const normalizeInterval = (value: unknown, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const normalized = Math.floor(value);
  if (normalized < 5) return 5;
  if (normalized > 180) return 180;
  return normalized;
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
    defaultServiceId: { type: "string" },
    defaultResourceId: { type: "string" },
    slotsEndpoint: { type: "string" },
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
      bookingCalendarDefaults.missingSelectionMessage ??
        "Choose service, resource, and date first."
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
    defaultServiceId: optionalText(data.defaultServiceId),
    defaultResourceId: optionalText(data.defaultResourceId),
    slotsEndpoint: text(
      data.slotsEndpoint,
      bookingCalendarDefaults.slotsEndpoint ?? "/api/booking/slots"
    ),
    resolved: {
      services,
      resources,
      slotsToken: optionalText(data.resolved?.slotsToken ?? undefined) ?? null,
      ...(optionalText(data.resolved?.error) ? { error: text(data.resolved?.error, "") } : {}),
    },
  };
}

const pickInitialServiceId = (
  services: BookingCalendarResolvedService[],
  requested?: string
) => {
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

export function BookingCalendarBlock({ data }: { data: BookingCalendarData; variant: string }) {
  const normalized = normalizeBookingCalendarData(data);
  const services = normalized.resolved?.services ?? [];
  const resources = normalized.resolved?.resources ?? [];
  const hasCatalog = services.length > 0 && resources.length > 0;

  const initialServiceId = pickInitialServiceId(services, normalized.defaultServiceId);
  const initialService = services.find((service) => service.id === initialServiceId) ?? null;
  const initialResourceId = pickInitialResourceId(
    resources,
    initialService,
    normalized.defaultResourceId
  );

  return (
    <section
      className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/95 p-5"
      data-nextless-booking-calendar="1"
      data-flow-id={normalized.flowId}
      data-slots-endpoint={normalized.slotsEndpoint}
      data-slot-interval={normalized.intervalMinutes}
      data-slots-token={normalized.resolved?.slotsToken ?? ""}
      data-widget="booking-calendar"
    >
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-[var(--color-text)]">{normalized.title}</h3>
        <p className="text-sm text-[var(--color-text)]/70">{normalized.description}</p>
      </div>

      {normalized.resolved?.error ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Booking runtime warning: {normalized.resolved.error}
        </div>
      ) : null}

      {hasCatalog ? (
        <>
          <div className="grid gap-3 md:grid-cols-4">
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
                className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
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

          <p
            className="text-xs text-[var(--color-text)]/65"
            data-booking-slots-status
            data-loading={normalized.loadingMessage}
          />

          <p
            className="text-xs text-[var(--color-text)]/65"
            data-booking-selected-summary
            data-empty={normalized.selectedSlotEmptyMessage}
          >
            {normalized.selectedSlotEmptyMessage}
          </p>

          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
            data-booking-slots
            data-empty={normalized.emptySlotsMessage}
            data-missing={normalized.missingSelectionMessage}
            data-error={normalized.errorMessage}
          />
        </>
      ) : (
        <div className="rounded-md border border-dashed border-[var(--color-border)] px-3 py-4 text-sm text-[var(--color-text)]/70">
          No active booking services/resources configured yet.
        </div>
      )}

      <script
        dangerouslySetInnerHTML={{ __html: getBookingRuntimeClientScript() }}
      />
    </section>
  );
}

export function createBookingCalendarWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<BookingCalendarData>>;
  visual: ComponentType<WidgetEditorProps<BookingCalendarData>>;
  advanced: ComponentType<WidgetEditorProps<BookingCalendarData>>;
}): WidgetDefinition<BookingCalendarData> {
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
    ],
    schema: bookingCalendarSchema,
    defaults: bookingCalendarDefaults,
    editor: {
      wizard: editors.wizard,
      visual: editors.visual,
      advanced: editors.advanced,
    },
    render: BookingCalendarBlock,
  };
}
