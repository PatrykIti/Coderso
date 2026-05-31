import {
  normalizeBookingCalendarData,
  type BookingCalendarData,
} from "../../../../widgets/core/bookingCalendar";
import type {
  WidgetEditorBookingFlows,
  WidgetEditorBookingFlowSummary,
} from "../../../../widgets/types";

import { flattenBlocks } from "./blockUtils";
import type { Block } from "./types";

const fallbackBookingCalendarLabel = "Booking Calendar";

const toBookingCalendarSummary = (block: Block): WidgetEditorBookingFlowSummary => {
  const normalized = normalizeBookingCalendarData((block.data ?? {}) as BookingCalendarData);
  return {
    blockId: block.id,
    flowId: normalized.flowId ?? "booking-flow",
    label: normalized.title?.trim() || fallbackBookingCalendarLabel,
  };
};

export function collectBookingFlowSummaries(blocks: Block[]): WidgetEditorBookingFlows {
  return {
    calendars: flattenBlocks(blocks)
      .filter((block) => block.type === "booking-calendar")
      .map(toBookingCalendarSummary),
  };
}
