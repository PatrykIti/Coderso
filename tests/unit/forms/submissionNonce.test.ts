import { expect, test } from "bun:test";

import {
  assertFormSubmissionNonce,
  createFormSubmissionNonce,
} from "../../../core/services/forms/submissionNonce";

const FORM_ID = "form-123";

const withEnv = (values: Record<string, string | undefined>, fn: () => void) => {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    const next = values[key];
    if (next === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = next;
    }
  }

  try {
    fn();
  } finally {
    for (const key of Object.keys(values)) {
      const value = previous[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
};

test("createFormSubmissionNonce requires secret", () => {
  withEnv({ FORM_SUBMIT_NONCE_SECRET: undefined }, () => {
    expect(() => createFormSubmissionNonce(FORM_ID)).toThrow("Form submission nonce secret is missing");
  });
});

test("assertFormSubmissionNonce accepts a valid nonce", () => {
  withEnv({ FORM_SUBMIT_NONCE_SECRET: "test-secret" }, () => {
    const now = 1_700_000_000_000;
    const nonce = createFormSubmissionNonce(FORM_ID, now);
    expect(() => assertFormSubmissionNonce(FORM_ID, nonce, now + 1_000)).not.toThrow();
  });
});

test("assertFormSubmissionNonce rejects expired nonce", () => {
  withEnv(
    { FORM_SUBMIT_NONCE_SECRET: "test-secret", FORM_SUBMIT_NONCE_TTL_MINUTES: "1" },
    () => {
      const now = 1_700_000_000_000;
      const nonce = createFormSubmissionNonce(FORM_ID, now);
      expect(() =>
        assertFormSubmissionNonce(FORM_ID, nonce, now + 2 * 60 * 1000)
      ).toThrow("Form submission nonce expired");
    }
  );
});

test("assertFormSubmissionNonce rejects future nonce", () => {
  withEnv({ FORM_SUBMIT_NONCE_SECRET: "test-secret" }, () => {
    const now = 1_700_000_000_000;
    const nonce = createFormSubmissionNonce(FORM_ID, now + 10 * 60 * 1000);
    expect(() => assertFormSubmissionNonce(FORM_ID, nonce, now)).toThrow("Form submission nonce is invalid");
  });
});

test("assertFormSubmissionNonce rejects invalid signature", () => {
  withEnv({ FORM_SUBMIT_NONCE_SECRET: "test-secret" }, () => {
    const now = 1_700_000_000_000;
    const nonce = createFormSubmissionNonce(FORM_ID, now);
    const tampered = nonce.replace(/.$/, "0");
    expect(() => assertFormSubmissionNonce(FORM_ID, tampered, now)).toThrow("Form submission nonce is invalid");
  });
});
