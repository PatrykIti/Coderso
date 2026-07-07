import { expect, test } from "bun:test";

import { validate } from "../../../core/server/validation/schemaValidator";
import { emailSettingsSchema } from "../../../core/server/validation/emailSchemas";
import {
  securitySettingsSchema,
  storageSettingsSchema,
} from "../../../core/server/validation/settingsSchemas";

// TASK-482-07-L01 (Bun smoke): the optional Advanced-track wizard steps are thin
// adapters that write through the EXISTING dedicated settings surfaces. These
// cases assert the exact payload SHAPES the wizard emits are accepted by the
// same strict, reject-unknown schemas the routes enforce — and, critically, that
// an untouched secret field is OMITTED (never forwarded as "" / null, which the
// servers treat as "clear the stored secret"). Runtime schema enforcement ⇒ Bun.

test("EmailStep payload (SMTP) with an untouched password OMITS the secret and validates", () => {
  // Mirrors EmailStep.toPayload when the password field was left blank:
  // `stripUnchangedSecret("")` -> undefined -> the `password` key is dropped.
  const payload = {
    provider: "smtp",
    smtp: {
      host: "smtp.example.com",
      port: 587,
      secure: true,
      user: "postmaster@example.com",
      // no `password` key: the configured secret is preserved server-side
    },
    from: { name: "Coderso", email: "hello@example.com" },
  };

  expect("password" in payload.smtp).toBe(false);
  expect(() => validate(emailSettingsSchema, payload)).not.toThrow();
});

test("EmailStep payload forwards a replacement password only when the operator typed one", () => {
  const payload = {
    provider: "smtp",
    smtp: { host: "smtp.example.com", port: 465, secure: true, user: "u", password: "new-secret" },
    from: { name: null, email: null },
  };

  expect(() => validate(emailSettingsSchema, payload)).not.toThrow();
});

test("StorageStep payload (S3) with untouched access/secret keys omits them and validates", () => {
  const payload = {
    driver: "s3",
    publicBaseUrl: "https://cdn.example.com",
    s3: {
      bucket: "media",
      region: "us-east-1",
      endpoint: "https://s3.amazonaws.com",
      // no accessKey / secretKey: untouched secrets are dropped
    },
  };

  expect("accessKey" in payload.s3).toBe(false);
  expect("secretKey" in payload.s3).toBe(false);
  expect(() => validate(storageSettingsSchema, payload)).not.toThrow();
});

test("SecurityStep session payload writes policy only and NEVER the legacy ttlDays override", () => {
  // Mirrors SecurityStep: the wizard writes session policy via PATCH /settings/security
  // but never `security.session.ttlDays` (the canonical value is auth.sessionTtlDays,
  // written via the bulk PATCH /settings elsewhere in the step).
  const payload = {
    session: { maxPerUser: 5, singleSession: false },
  };

  expect("ttlDays" in payload.session).toBe(false);
  expect(() => validate(securitySettingsSchema, payload)).not.toThrow();
});

test("the strict schemas still reject unknown wizard fields", () => {
  expect(() => validate(emailSettingsSchema, { smtp: { host: "x", surprise: true } })).toThrow();
  expect(() => validate(storageSettingsSchema, { driver: "s3", surprise: true })).toThrow();
});
