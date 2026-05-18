import { expect, test } from "vitest";

import { validate } from "../../../core/server/validation/schemaValidator";
import {
  bookingPublicReservationSchema,
  bookingPublicSlotQuerySchema,
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

test("bookingPublicSlotQuerySchema accepts strict public slot query payload", () => {
  expect(() =>
    validate(bookingPublicSlotQuerySchema, {
      serviceId: "8ce0fc8b-b900-4f6f-b1f8-fb8ad9b4d3c8",
      resourceId: "908d55fc-cd23-4f7f-b09f-8164b9cb0f5f",
      date: "2030-01-15",
      runtimeToken: "token",
      timezone: "UTC",
      intervalMinutes: 15,
    })
  ).not.toThrow();
});

test("bookingPublicSlotQuerySchema rejects unknown fields", () => {
  expect(() =>
    validate(bookingPublicSlotQuerySchema, {
      serviceId: "8ce0fc8b-b900-4f6f-b1f8-fb8ad9b4d3c8",
      resourceId: "908d55fc-cd23-4f7f-b09f-8164b9cb0f5f",
      date: "2030-01-15",
      debug: true,
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

test("bookingPublicReservationSchema accepts bounded consent and custom-field metadata", () => {
  expect(() =>
    validate(bookingPublicReservationSchema, {
      serviceId: "8ce0fc8b-b900-4f6f-b1f8-fb8ad9b4d3c8",
      resourceId: "908d55fc-cd23-4f7f-b09f-8164b9cb0f5f",
      startsAt: "2030-01-15T09:00:00.000Z",
      endsAt: "2030-01-15T10:00:00.000Z",
      customerName: "Jamie Doe",
      formNonce: "nonce-token",
      captchaToken: "captcha-token",
      metadata: {
        flowId: "booking-flow",
        pathname: "/book/service",
        consent: {
          accepted: true,
          label: "I accept the booking privacy policy.",
        },
        customFields: [
          {
            id: "vehicle-email",
            label: "Contact email",
            type: "email",
            value: "jamie@example.com",
          },
          {
            id: "loaner-needed",
            label: "Need a loaner car",
            type: "checkbox",
            checked: true,
          },
        ],
      },
    })
  ).not.toThrow();
});

test("bookingPublicReservationSchema rejects unknown metadata keys", () => {
  expect(() =>
    validate(bookingPublicReservationSchema, {
      serviceId: "8ce0fc8b-b900-4f6f-b1f8-fb8ad9b4d3c8",
      resourceId: "908d55fc-cd23-4f7f-b09f-8164b9cb0f5f",
      startsAt: "2030-01-15T09:00:00.000Z",
      endsAt: "2030-01-15T10:00:00.000Z",
      customerName: "Jamie Doe",
      formNonce: "nonce-token",
      metadata: {
        flowId: "booking-flow",
        consent: {
          accepted: true,
          label: "I agree",
          secret: "nope",
        },
      },
    })
  ).toThrow("Invalid payload");
});

test("bookingPublicReservationSchema accepts bounded consent and custom-field metadata", () => {
  expect(() =>
    validate(bookingPublicReservationSchema, {
      serviceId: "8ce0fc8b-b900-4f6f-b1f8-fb8ad9b4d3c8",
      resourceId: "908d55fc-cd23-4f7f-b09f-8164b9cb0f5f",
      startsAt: "2030-01-15T09:00:00.000Z",
      endsAt: "2030-01-15T10:00:00.000Z",
      customerName: "Jamie Doe",
      formNonce: "nonce-token",
      captchaToken: "captcha-token",
      metadata: {
        flowId: "booking-flow",
        pathname: "/book/service",
        consent: {
          accepted: true,
          label: "I accept the booking privacy policy.",
        },
        customFields: [
          {
            id: "vehicle-email",
            label: "Contact email",
            type: "email",
            value: "jamie@example.com",
          },
          {
            id: "loaner-needed",
            label: "Need a loaner car",
            type: "checkbox",
            checked: true,
          },
        ],
      },
    })
  ).not.toThrow();
});

test("bookingPublicReservationSchema rejects unknown metadata keys", () => {
  expect(() =>
    validate(bookingPublicReservationSchema, {
      serviceId: "8ce0fc8b-b900-4f6f-b1f8-fb8ad9b4d3c8",
      resourceId: "908d55fc-cd23-4f7f-b09f-8164b9cb0f5f",
      startsAt: "2030-01-15T09:00:00.000Z",
      endsAt: "2030-01-15T10:00:00.000Z",
      customerName: "Jamie Doe",
      formNonce: "nonce-token",
      metadata: {
        flowId: "booking-flow",
        consent: {
          accepted: true,
          label: "I agree",
          secret: "nope",
        },
      },
    })
  ).toThrow("Invalid payload");
});
