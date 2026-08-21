// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";

vi.mock("../../../core/admin/ui/booking/components/ReservationsTab", () => ({
  BookingReservationsTab: ({
    reservations,
    reservationsLoading,
    onReservationFormChange,
    onReservationStatusDraftChange,
    onCreateReservation,
    onUpdateReservationStatus,
  }: {
    reservations: Array<{ id: string }>;
    reservationsLoading: boolean;
    onReservationFormChange: (patch: Record<string, unknown>) => void;
    onReservationStatusDraftChange: (id: string, status: string) => void;
    onCreateReservation: () => void;
    onUpdateReservationStatus: (id: string) => void;
  }) => (
    <div>
      <span>{`reservations:${reservations.length}`}</span>
      <span>{`reservations-loading:${String(reservationsLoading)}`}</span>
      <button
        type="button"
        onClick={() =>
          onReservationFormChange({
            serviceId: "service-1",
            resourceId: "resource-1",
            startsAt: "2026-03-10T10:00",
            endsAt: "2026-03-10T11:00",
            timezone: "Europe/Warsaw",
            customerName: "Grace Hopper",
            customerEmail: "grace@example.com",
            customerPhone: "+48111222333",
            notes: "Needs projector",
          })
        }
      >
        fill-reservation
      </button>
      <button
        type="button"
        onClick={() =>
          onReservationFormChange({
            serviceId: "",
            resourceId: "",
            startsAt: "",
            endsAt: "",
            timezone: "Europe/Warsaw",
            customerName: "",
            customerEmail: "",
            customerPhone: "",
            notes: "",
          })
        }
      >
        fill-invalid-reservation
      </button>
      <button
        type="button"
        onClick={() =>
          onReservationFormChange({
            serviceId: "service-1",
            resourceId: "resource-1",
            startsAt: "2026-03-10T10:00",
            endsAt: "2026-03-10T11:00",
            timezone: "Europe/Warsaw",
            customerName: "",
            customerEmail: "grace@example.com",
            customerPhone: "+48111222333",
            notes: "",
          })
        }
      >
        fill-reservation-missing-name
      </button>
      <button
        type="button"
        onClick={() =>
          onReservationFormChange({
            serviceId: "service-1",
            resourceId: "",
            startsAt: "2026-03-10T10:00",
            endsAt: "2026-03-10T11:00",
            timezone: "Europe/Warsaw",
            customerName: "Grace Hopper",
            customerEmail: "grace@example.com",
            customerPhone: "+48111222333",
            notes: "",
          })
        }
      >
        fill-reservation-missing-resource
      </button>
      <button
        type="button"
        onClick={() =>
          onReservationFormChange({
            serviceId: "service-1",
            resourceId: "resource-1",
            startsAt: "2026-03-10T11:00",
            endsAt: "2026-03-10T10:00",
            timezone: "Europe/Warsaw",
            customerName: "Grace Hopper",
            customerEmail: "grace@example.com",
            customerPhone: "+48111222333",
            notes: "",
          })
        }
      >
        fill-reservation-invalid-range
      </button>
      <button
        type="button"
        onClick={() =>
          onReservationFormChange({
            serviceId: "service-1",
            resourceId: "resource-1",
            startsAt: "2026-03-10T10:00",
            endsAt: "2026-03-10T11:00",
            timezone: "",
            customerName: "Grace Hopper",
            customerEmail: "grace@example.com",
            customerPhone: "+48111222333",
            notes: "",
          })
        }
      >
        fill-reservation-no-timezone
      </button>
      <button type="button" onClick={onCreateReservation}>
        create-reservation
      </button>
      <button
        type="button"
        onClick={() => onReservationStatusDraftChange("reservation-1", "cancelled")}
      >
        draft-reservation-status
      </button>
      <button type="button" onClick={() => onUpdateReservationStatus("reservation-1")}>
        update-reservation-status
      </button>
      <button type="button" onClick={() => onUpdateReservationStatus("reservation-999")}>
        update-reservation-status-missing
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/booking/components/SlotPreviewTab", () => ({
  BookingSlotPreviewTab: ({
    previewSlots,
    previewLoading,
    onSlotPreviewFormChange,
    onPreviewSlots,
  }: {
    previewSlots: unknown[];
    previewLoading: boolean;
    onSlotPreviewFormChange: (patch: Record<string, unknown>) => void;
    onPreviewSlots: () => void;
  }) => (
    <div>
      <span>{`preview-slots:${previewSlots.length}`}</span>
      <span>{`preview-loading:${String(previewLoading)}`}</span>
      <button
        type="button"
        onClick={() =>
          onSlotPreviewFormChange({
            serviceId: "service-1",
            resourceId: "resource-1",
            date: "2026-03-10",
            timezone: "Europe/Warsaw",
            intervalMinutes: "15",
          })
        }
      >
        fill-slot-preview
      </button>
      <button
        type="button"
        onClick={() =>
          onSlotPreviewFormChange({
            serviceId: "",
            resourceId: "",
            date: "",
            timezone: "Europe/Warsaw",
            intervalMinutes: "15",
          })
        }
      >
        fill-invalid-slot-preview
      </button>
      <button
        type="button"
        onClick={() =>
          onSlotPreviewFormChange({
            serviceId: "service-1",
            resourceId: "",
            date: "2026-03-10",
            timezone: "Europe/Warsaw",
            intervalMinutes: "15",
          })
        }
      >
        fill-slot-preview-missing-resource
      </button>
      <button
        type="button"
        onClick={() =>
          onSlotPreviewFormChange({
            serviceId: "service-1",
            resourceId: "resource-1",
            date: "",
            timezone: "Europe/Warsaw",
            intervalMinutes: "15",
          })
        }
      >
        fill-slot-preview-missing-date
      </button>
      <button
        type="button"
        onClick={() =>
          onSlotPreviewFormChange({
            serviceId: "service-1",
            resourceId: "resource-1",
            date: "2026-03-10",
            timezone: "",
            intervalMinutes: "15",
          })
        }
      >
        fill-slot-preview-no-timezone
      </button>
      <button type="button" onClick={onPreviewSlots}>
        preview-slots
      </button>
    </div>
  ),
}));
