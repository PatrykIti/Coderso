import { expect, test } from "bun:test";

import { validate } from "../../../core/server/validation/schemaValidator";
import {
  bookingReservationCreateSchema,
  bookingSlotPreviewSchema,
} from "../../../core/server/validation/bookingSchemas";

test("bookingSlotPreviewSchema accepts valid UUID payload", () => {
  expect(() =>
    validate(bookingSlotPreviewSchema, {
      serviceId: "8ce0fc8b-b900-4f6f-b1f8-fb8ad9b4d3c8",
      resourceId: "908d55fc-cd23-4f7f-b09f-8164b9cb0f5f",
      date: "2030-01-15",
      timezone: "UTC",
      intervalMinutes: 15,
    })
  ).not.toThrow();
});

test("bookingSlotPreviewSchema rejects invalid UUID values", () => {
  expect(() =>
    validate(bookingSlotPreviewSchema, {
      serviceId: "service-1",
      resourceId: "resource-1",
      date: "2030-01-15",
    })
  ).toThrow("Invalid payload");
});

test("bookingReservationCreateSchema requires customerName", () => {
  expect(() =>
    validate(bookingReservationCreateSchema, {
      serviceId: "8ce0fc8b-b900-4f6f-b1f8-fb8ad9b4d3c8",
      resourceId: "908d55fc-cd23-4f7f-b09f-8164b9cb0f5f",
      startsAt: "2030-01-15T09:00:00.000Z",
      endsAt: "2030-01-15T10:00:00.000Z",
    })
  ).toThrow("Invalid payload");
});
