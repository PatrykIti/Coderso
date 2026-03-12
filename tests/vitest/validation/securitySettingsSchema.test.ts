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
