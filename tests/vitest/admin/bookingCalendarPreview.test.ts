import { expect, test } from "vitest";

import { buildBookingCalendarPreviewResolved } from "../../../core/admin/services/bookingCalendarPreview";

test("buildBookingCalendarPreviewResolved keeps only active catalog rows with allowed resource links", () => {
  const resolved = buildBookingCalendarPreviewResolved({
    services: [
      {
        id: "service-1",
        name: "Oil Change",
        slug: "oil-change",
        status: "active",
        description: "Standard service",
        durationMinutes: 30,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 5,
        priceCents: 5000,
        currency: "PLN",
        settings: { submissionAccess: "internal" },
        createdAt: "2026-05-17T00:00:00.000Z",
        updatedAt: "2026-05-17T00:00:00.000Z",
      },
      {
        id: "service-2",
        name: "Inactive",
        slug: "inactive",
        status: "inactive",
        description: null,
        durationMinutes: 45,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        priceCents: null,
        currency: null,
        settings: {},
        createdAt: "2026-05-17T00:00:00.000Z",
        updatedAt: "2026-05-17T00:00:00.000Z",
      },
    ],
    resources: [
      {
        id: "resource-1",
        name: "Mechanic",
        slug: "mechanic",
        type: "staff",
        status: "active",
        timezone: "Europe/Warsaw",
        capacity: 1,
        settings: {},
        createdAt: "2026-05-17T00:00:00.000Z",
        updatedAt: "2026-05-17T00:00:00.000Z",
      },
      {
        id: "resource-2",
        name: "Hidden bay",
        slug: "hidden-bay",
        type: "bay",
        status: "inactive",
        timezone: "UTC",
        capacity: 1,
        settings: {},
        createdAt: "2026-05-17T00:00:00.000Z",
        updatedAt: "2026-05-17T00:00:00.000Z",
      },
    ],
    serviceResourcesByServiceId: {
      "service-1": [
        {
          serviceId: "service-1",
          resourceId: "resource-1",
          isRequired: false,
          createdAt: "2026-05-17T00:00:00.000Z",
        },
        {
          serviceId: "service-1",
          resourceId: "resource-2",
          isRequired: false,
          createdAt: "2026-05-17T00:00:00.000Z",
        },
      ],
    },
    error: "booking_preview_catalog_unavailable",
  });

  expect(resolved).toEqual({
    services: [
      {
        id: "service-1",
        name: "Oil Change",
        description: "Standard service",
        durationMinutes: 30,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 5,
        priceCents: 5000,
        currency: "PLN",
        status: "active",
        submissionAccess: "internal",
        resourceIds: ["resource-1"],
      },
    ],
    resources: [
      {
        id: "resource-1",
        name: "Mechanic",
        type: "staff",
        timezone: "Europe/Warsaw",
        capacity: 1,
        status: "active",
      },
    ],
    slotsToken: null,
    error: "booking_preview_catalog_unavailable",
  });
});
