// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";

vi.mock("../../../core/admin/ui/booking/components/AvailabilityTab", () => ({
  BookingAvailabilityTab: ({
    scheduleRows,
    hasUnsavedScheduleDraft,
    scheduleDraftGuidance,
    scheduleLoading,
    scheduleSaving,
    blackouts,
    blackoutsLoading,
    onScheduleDraftChange,
    onAddScheduleRow,
    onRemoveScheduleRow,
    onResetScheduleDraft,
    onSaveSchedules,
    onBlackoutFormChange,
    onCreateBlackout,
    onDeleteBlackout,
  }: {
    scheduleRows: unknown[];
    hasUnsavedScheduleDraft: boolean;
    scheduleDraftGuidance: string | null;
    scheduleLoading: boolean;
    scheduleSaving: boolean;
    blackouts: Array<{ id: string }>;
    blackoutsLoading: boolean;
    onScheduleDraftChange: (patch: Record<string, unknown>) => void;
    onAddScheduleRow: () => void;
    onRemoveScheduleRow: (index: number) => void;
    onResetScheduleDraft: () => void;
    onSaveSchedules: () => void;
    onBlackoutFormChange: (patch: Record<string, unknown>) => void;
    onCreateBlackout: () => void;
    onDeleteBlackout: (id: string) => void;
  }) => (
    <div>
      <span>{`schedules:${scheduleRows.length}`}</span>
      <span>{`schedule-draft-unsaved:${String(hasUnsavedScheduleDraft)}`}</span>
      <span>{`schedule-draft-guidance:${scheduleDraftGuidance ?? "none"}`}</span>
      <span>{`schedule-loading:${String(scheduleLoading)}`}</span>
      <span>{`schedule-saving:${String(scheduleSaving)}`}</span>
      <span>{`blackouts:${blackouts.length}`}</span>
      <span>{`blackouts-loading:${String(blackoutsLoading)}`}</span>
      <button
        type="button"
        onClick={() =>
          onScheduleDraftChange({
            dayOfWeek: "1",
            startTime: "09:00",
            endTime: "17:00",
            timezone: "Europe/Warsaw",
            isAvailable: true,
          })
        }
      >
        fill-schedule
      </button>
      <button
        type="button"
        onClick={() =>
          onScheduleDraftChange({
            dayOfWeek: "1",
            startTime: "09:00",
            endTime: "17:00",
            timezone: "",
            isAvailable: true,
          })
        }
      >
        fill-schedule-no-timezone
      </button>
      <button
        type="button"
        onClick={() =>
          onScheduleDraftChange({
            dayOfWeek: "1",
            startTime: "17:00",
            endTime: "09:00",
            timezone: "Europe/Warsaw",
            isAvailable: true,
          })
        }
      >
        fill-invalid-schedule
      </button>
      <button type="button" onClick={onAddScheduleRow}>
        add-schedule
      </button>
      <button type="button" onClick={() => onRemoveScheduleRow(0)}>
        remove-schedule
      </button>
      <button type="button" onClick={onResetScheduleDraft}>
        reset-schedule-draft
      </button>
      <button type="button" onClick={onSaveSchedules}>
        save-schedules
      </button>
      <button
        type="button"
        onClick={() =>
          onBlackoutFormChange({
            resourceId: "resource-1",
            startsAt: "2026-03-10T09:00",
            endsAt: "2026-03-10T11:00",
            reason: "Maintenance",
          })
        }
      >
        fill-blackout
      </button>
      <button
        type="button"
        onClick={() =>
          onBlackoutFormChange({
            resourceId: "all",
            startsAt: "2026-03-10T09:00",
            endsAt: "2026-03-10T11:00",
            reason: "Maintenance",
          })
        }
      >
        fill-blackout-all
      </button>
      <button
        type="button"
        onClick={() =>
          onBlackoutFormChange({
            resourceId: "resource-1",
            startsAt: "2026-03-10T11:00",
            endsAt: "2026-03-10T09:00",
            reason: "Broken",
          })
        }
      >
        fill-invalid-blackout
      </button>
      <button type="button" onClick={onCreateBlackout}>
        create-blackout
      </button>
      <button type="button" onClick={() => onDeleteBlackout(blackouts[0]?.id ?? "")}>
        delete-blackout
      </button>
    </div>
  ),
}));
