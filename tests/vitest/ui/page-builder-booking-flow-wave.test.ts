import { describe, expect, test } from "vitest";

import { collectBookingFlowSummaries } from "../../../core/admin/ui/pages/builder/bookingFlowContext";
import type { Block } from "../../../core/admin/ui/pages/builder/types";

const bookingBlock = (overrides: Partial<Block> = {}): Block => ({
  type: "booking-calendar",
  id: "blk-booking",
  data: {},
  ...overrides,
});

const textBlock = (id: string): Block => ({
  type: "text",
  id,
  data: {},
});

describe("collectBookingFlowSummaries", () => {
  test("maps a booking calendar with authored flow and title into a summary", () => {
    const summaries = collectBookingFlowSummaries([
      bookingBlock({
        id: "blk-a",
        data: { flowId: "  flow-main  ", title: "  Reserve a visit  " },
      }),
    ]);

    expect(summaries).toEqual({
      calendars: [{ blockId: "blk-a", flowId: "flow-main", label: "Reserve a visit" }],
    });
  });

  test("falls back to the default flow id and label when data is missing", () => {
    const summaries = collectBookingFlowSummaries([bookingBlock({ id: "blk-b", data: undefined })]);

    expect(summaries).toEqual({
      calendars: [{ blockId: "blk-b", flowId: "booking-flow", label: "Choose appointment slot" }],
    });
  });

  test("falls back when flow id and title are empty or whitespace only", () => {
    const summaries = collectBookingFlowSummaries([
      bookingBlock({ id: "blk-c", data: { flowId: "   ", title: "" } }),
    ]);

    expect(summaries).toEqual({
      calendars: [{ blockId: "blk-c", flowId: "booking-flow", label: "Choose appointment slot" }],
    });
  });

  test("keeps authored flow id but falls back for a blank title", () => {
    const summaries = collectBookingFlowSummaries([
      bookingBlock({ id: "blk-d", data: { flowId: "flow-d", title: "\n" } }),
    ]);

    expect(summaries).toEqual({
      calendars: [{ blockId: "blk-d", flowId: "flow-d", label: "Choose appointment slot" }],
    });
  });

  test("ignores non booking-calendar blocks entirely", () => {
    const summaries = collectBookingFlowSummaries([
      textBlock("blk-text"),
      bookingBlock({ id: "blk-e", data: { flowId: "flow-e" } }),
      { type: "hero", id: "blk-hero", data: {} },
    ]);

    expect(summaries.calendars).toEqual([
      { blockId: "blk-e", flowId: "flow-e", label: "Choose appointment slot" },
    ]);
  });

  test("finds booking calendars nested inside repeatable slots", () => {
    const summaries = collectBookingFlowSummaries([
      {
        type: "container",
        id: "blk-container",
        data: {},
        slots: {
          main: [
            textBlock("blk-nested-text"),
            bookingBlock({ id: "blk-nested", data: { flowId: "flow-nested", title: "Nested" } }),
          ],
        },
      },
    ]);

    expect(summaries.calendars).toEqual([
      { blockId: "blk-nested", flowId: "flow-nested", label: "Nested" },
    ]);
  });
});
