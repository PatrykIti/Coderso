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
  bookingCalendarEditorContract,
  bookingCalendarDefaults,
  createBookingCalendarWidget,
  normalizeBookingCalendarData,
  type BookingCalendarData,
} from "../../../core/widgets/core/bookingCalendar";
import { validateWidgetEditorContract } from "../../../core/widgets/editorContract";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<BookingCalendarData>> = () => null;

test("booking calendar exposes a strict v2 editor contract", () => {
  const widget = createBookingCalendarWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  const validation = validateWidgetEditorContract(widget, { requireContract: true });

  expect(widget.editorContract).toBe(bookingCalendarEditorContract);
  expect(validation.valid).toBe(true);
  expect(widget.editorContract?.sections.map((section) => section.id)).toEqual([
    "booking-calendar.wizard.flow-setup",
    "booking-calendar.wizard.availability-setup",
    "booking-calendar.wizard.date-policy",
    "booking-calendar.visual.variant-layout",
    "booking-calendar.visual.copy",
    "booking-calendar.visual.status-messages",
    "booking-calendar.visual.service-context",
    "booking-calendar.visual.date-picker",
    "booking-calendar.visual.surface",
    "booking-calendar.advanced.runtime-endpoint",
    "booking-calendar.advanced.runtime-diagnostics",
  ]);
  expect(
    widget.editorContract?.sections
      .filter((section) => section.mode === "wizard")
      .flatMap((section) => section.writablePaths)
      .some((path) => path.startsWith("style."))
  ).toBe(false);
});

test("booking calendar normalizes slots endpoint to a same-origin relative path", () => {
  expect(
    normalizeBookingCalendarData({
      slotsEndpoint: "https://example.test/api/booking/slots",
    }).slotsEndpoint
  ).toBe(bookingCalendarDefaults.slotsEndpoint);
  expect(
    normalizeBookingCalendarData({
      slotsEndpoint: "/api/proxy/booking/slots?tenant=demo",
    }).slotsEndpoint
  ).toBe("/api/proxy/booking/slots?tenant=demo");
});

test("booking calendar renders empty-state when resolver payload is missing", () => {
  const html = renderToString(
    <BookingCalendarBlock data={bookingCalendarDefaults} variant="default" />
  );

  expect(html).toContain(
    "Booking is currently unavailable. Please try another service or contact us."
  );
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
  expect(html).toContain("data-booking-service");
  expect(html).toContain("data-booking-resource");
  expect(html).toContain('data-slots-token="slots-token"');
});

test("booking calendar renders accessibility labels and slot-region semantics", () => {
  const html = renderToString(
    <BookingCalendarBlock
      variant="default"
      data={normalizeBookingCalendarData({
        ...bookingCalendarDefaults,
        flowId: "booking-flow",
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

  expect(html).toContain('role="region"');
  expect(html).toContain('aria-labelledby="booking-flow-booking-calendar-title"');
  expect(html).toContain('id="booking-flow-booking-calendar-title"');
  expect(html).toContain('role="status"');
  expect(html).toContain('aria-live="polite"');
  expect(html).toContain('aria-atomic="true"');
  expect(html).toContain('role="list"');
  expect(html).toContain('aria-labelledby="booking-flow-booking-calendar-slots-label"');
  expect(html).toContain('id="booking-flow-booking-calendar-slots-label"');
  expect(html).toContain("Available time slots");
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

test("booking calendar normalizes date policy and renders clamped date attributes", () => {
  const normalized = normalizeBookingCalendarData({
    ...bookingCalendarDefaults,
    defaultDate: " 2030-01-05 ",
    minDate: "2030-01-10",
    maxDate: "2030-01-20",
  });

  expect(normalized.defaultDate).toBe("2030-01-05");
  expect(normalized.minDate).toBe("2030-01-10");
  expect(normalized.maxDate).toBe("2030-01-20");

  const html = renderToString(
    <BookingCalendarBlock
      variant="default"
      data={normalizeBookingCalendarData({
        ...bookingCalendarDefaults,
        defaultDate: "2030-01-05",
        minDate: "2030-01-10",
        maxDate: "2030-01-20",
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

  expect(html).toContain('data-default-date="2030-01-05"');
  expect(html).toContain('data-min-date="2030-01-10"');
  expect(html).toContain('data-max-date="2030-01-20"');
  expect(html).toContain('min="2030-01-10"');
  expect(html).toContain('max="2030-01-20"');
  expect(html).toContain('value="2030-01-10"');
});

test("booking calendar cleared frame style omits decorative background", () => {
  const html = renderToString(
    <BookingCalendarBlock
      data={normalizeBookingCalendarData({ ...bookingCalendarDefaults, style: {} })}
      variant="default"
    />
  );

  expect(html).not.toContain("bg-[var(--color-bg)]/95");
  expect(html).not.toContain("background-color:transparent");
});

test("booking calendar supports compact and horizontal variants", () => {
  const compactHtml = renderToString(
    <BookingCalendarBlock
      data={normalizeBookingCalendarData({
        ...bookingCalendarDefaults,
        resolved: {
          slotsToken: "token",
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
      variant="compact"
    />
  );

  const horizontalHtml = renderToString(
    <BookingCalendarBlock
      data={normalizeBookingCalendarData({
        ...bookingCalendarDefaults,
        resolved: {
          slotsToken: "token",
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
      variant="horizontal"
    />
  );

  expect(compactHtml).toContain("rounded-lg border p-4");
  expect(horizontalHtml).toContain("lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]");
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
        defaultDate: "2030-01-15",
        minDate: "2030-01-10",
        maxDate: "2030-01-20",
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
  expect(advanced).toContain("Runtime endpoint");
});
