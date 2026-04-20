import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  BookingCalendarAdvancedEditor,
  BookingCalendarVisualEditor,
  BookingCalendarWizardEditor,
} from "../../../core/admin/ui/widgets/editors/BookingCalendarEditors";
import {
  BookingCalendarBlock,
  bookingCalendarDefaults,
  createBookingCalendarWidget,
  normalizeBookingCalendarData,
  type BookingCalendarData,
} from "../../../core/widgets/core/bookingCalendar";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<BookingCalendarData>> = () => null;

test("booking calendar renders empty-state when resolver payload is missing", () => {
  const html = renderToString(
    <BookingCalendarBlock data={bookingCalendarDefaults} variant="default" />
  );

  expect(html).toContain("No active booking services/resources configured yet");
  expect(html).toContain('data-nextless-booking-calendar="1"');
});

test("booking calendar renders selectors from resolved payload", () => {
  const html = renderToString(
    <BookingCalendarBlock
      variant="default"
      data={normalizeBookingCalendarData({
        ...bookingCalendarDefaults,
        resolved: {
          slotsToken: "slots-token",
          services: [
            {
              id: "service-1",
              name: "Oil change",
              description: null,
              durationMinutes: 30,
              bufferBeforeMinutes: 0,
              bufferAfterMinutes: 0,
              priceCents: null,
              currency: null,
              resourceIds: ["resource-1"],
            },
          ],
          resources: [
            {
              id: "resource-1",
              name: "Bay A",
              type: "bay",
              timezone: "UTC",
              capacity: 1,
            },
          ],
        },
      })}
    />
  );

  expect(html).toContain("Oil change");
  expect(html).toContain("Bay A");
  expect(html).toContain('data-booking-service');
  expect(html).toContain('data-booking-resource');
  expect(html).toContain('data-slots-token="slots-token"');
});

test("booking calendar normalization clamps runtime interval", () => {
  const normalized = normalizeBookingCalendarData({
    ...bookingCalendarDefaults,
    intervalMinutes: 1,
  });
  expect(normalized.intervalMinutes).toBe(5);

  const normalizedHigh = normalizeBookingCalendarData({
    ...bookingCalendarDefaults,
    intervalMinutes: 999,
  });
  expect(normalizedHigh.intervalMinutes).toBe(180);
});

test("booking calendar validator accepts resolved runtime payload", () => {
  clearWidgets();
  registerWidget(
    createBookingCalendarWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "booking-calendar-1",
      type: "booking-calendar",
      variant: "default",
      data: {
        ...bookingCalendarDefaults,
        resolved: {
          slotsToken: "runtime-token",
          services: [
            {
              id: "service-1",
              name: "Inspection",
              durationMinutes: 45,
              bufferBeforeMinutes: 0,
              bufferAfterMinutes: 0,
              resourceIds: ["resource-1"],
            },
          ],
          resources: [
            {
              id: "resource-1",
              name: "Tech #1",
              type: "staff",
              timezone: "UTC",
              capacity: 1,
            },
          ],
        },
      },
    })
  ).not.toThrow();

  clearWidgets();
});

test("booking calendar editors render expected sections", () => {
  const wizard = renderToString(
    <BookingCalendarWizardEditor
      value={bookingCalendarDefaults}
      onChange={() => undefined}
      variant="default"
    />
  );
  expect(wizard).toContain("Flow");

  const visual = renderToString(
    <BookingCalendarVisualEditor
      value={bookingCalendarDefaults}
      onChange={() => undefined}
      variant="default"
    />
  );
  expect(visual).toContain("Status messages");

  const advanced = renderToString(
    <BookingCalendarAdvancedEditor
      value={bookingCalendarDefaults}
      onChange={() => undefined}
      variant="default"
    />
  );
  expect(advanced).toContain("Runtime endpoints");
});
