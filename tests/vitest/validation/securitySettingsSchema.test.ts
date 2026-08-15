import { expect, test } from "vitest";

import { validate } from "../../../core/server/validation/schemaValidator";
import { securitySettingsSchema } from "../../../core/server/validation/settingsSchemas";

test("security settings schema accepts loginAlerts payload", () => {
  expect(() =>
    validate(securitySettingsSchema, {
      loginAlerts: {
        enabled: true,
        notifyOnNewDevice: true,
        notifyOnNewLocation: false,
      },
    })
  ).not.toThrow();
});

test("security settings schema accepts loginAlerts recipients/webhookUrl/webhookSecret", () => {
  expect(() =>
    validate(securitySettingsSchema, {
      loginAlerts: {
        enabled: true,
        notifyOnNewDevice: true,
        notifyOnNewLocation: false,
        recipients: ["security@example.com", "ops@example.com"],
        webhookUrl: "https://example.com/login-hook",
        webhookSecret: "set-once-write-only",
      },
    })
  ).not.toThrow();
});

test("security settings schema rejects unknown loginAlerts keys including deliveryError", () => {
  // deliveryError is service-writable only; the route boundary must reject it
  // from client payloads via additionalProperties: false.
  expect(() =>
    validate(securitySettingsSchema, {
      loginAlerts: { deliveryError: "failed" },
    })
  ).toThrow();

  expect(() =>
    validate(securitySettingsSchema, {
      loginAlerts: { typoField: true },
    })
  ).toThrow();
});

test("security settings schema rejects non-array recipients", () => {
  expect(() =>
    validate(securitySettingsSchema, {
      loginAlerts: { recipients: "security@example.com" },
    })
  ).toThrow();
});
