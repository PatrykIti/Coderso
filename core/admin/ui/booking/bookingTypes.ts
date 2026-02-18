import type {
  BookingReservationStatus,
  BookingResourceStatus,
  BookingResourceType,
  BookingServiceStatus,
} from "@/services/bookingClient";

export type FeedbackState = {
  tone: "error" | "success";
  title: string;
  message: string;
} | null;

export type ResourceFormState = {
  name: string;
  slug: string;
  type: BookingResourceType;
  status: BookingResourceStatus;
  timezone: string;
  capacity: string;
};

export type ServiceFormState = {
  name: string;
  slug: string;
  status: BookingServiceStatus;
  description: string;
  durationMinutes: string;
  bufferBeforeMinutes: string;
  bufferAfterMinutes: string;
  priceCents: string;
  currency: string;
};

export type ScheduleDraftState = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  timezone: string;
  isAvailable: boolean;
};

export type BlackoutFormState = {
  resourceId: string;
  startsAt: string;
  endsAt: string;
  reason: string;
};

export type ReservationFormState = {
  serviceId: string;
  resourceId: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
};

export type SlotPreviewFormState = {
  serviceId: string;
  resourceId: string;
  date: string;
  timezone: string;
  intervalMinutes: string;
};

export const DAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

export const RESOURCE_TYPE_OPTIONS: BookingResourceType[] = [
  "staff",
  "bay",
  "tool",
  "vehicle",
  "other",
];
export const RESOURCE_STATUS_OPTIONS: BookingResourceStatus[] = ["active", "inactive"];
export const SERVICE_STATUS_OPTIONS: BookingServiceStatus[] = ["active", "inactive"];
export const RESERVATION_STATUS_OPTIONS: BookingReservationStatus[] = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
];

export const defaultResourceFormState = (): ResourceFormState => ({
  name: "",
  slug: "",
  type: "staff",
  status: "active",
  timezone: "UTC",
  capacity: "1",
});

export const defaultServiceFormState = (): ServiceFormState => ({
  name: "",
  slug: "",
  status: "active",
  description: "",
  durationMinutes: "60",
  bufferBeforeMinutes: "0",
  bufferAfterMinutes: "0",
  priceCents: "",
  currency: "",
});

export const defaultScheduleDraftState = (): ScheduleDraftState => ({
  dayOfWeek: "1",
  startTime: "09:00",
  endTime: "17:00",
  timezone: "UTC",
  isAvailable: true,
});

export const defaultBlackoutFormState = (): BlackoutFormState => ({
  resourceId: "all",
  startsAt: "",
  endsAt: "",
  reason: "",
});

export const defaultReservationFormState = (): ReservationFormState => ({
  serviceId: "",
  resourceId: "",
  startsAt: "",
  endsAt: "",
  timezone: "UTC",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  notes: "",
});

export const defaultSlotPreviewFormState = (): SlotPreviewFormState => ({
  serviceId: "",
  resourceId: "",
  date: "",
  timezone: "UTC",
  intervalMinutes: "30",
});
