import { expect, test } from "bun:test";

import {
  evaluateSubmissionAccess,
  submissionAccessDefaults,
} from "../../core/services/forms/submissionAccess";
import {
  evaluateBookingAccess,
  bookingAccessDefaults,
} from "../../core/services/booking/bookingAccess";
import {
  assertFormSubmissionNonce,
  createFormSubmissionNonce,
} from "../../core/services/forms/submissionNonce";
import {
  assertBookingSubmissionNonce,
  createBookingSubmissionNonce,
} from "../../core/services/booking/bookingSubmissionNonce";
import { SECURITY_SETTINGS_DEFAULTS } from "../../core/services/settings/securitySettings";

const NONCE_SECRET = "nextless_release_gate_nonce_secret_32";

const withNonceSecret = (fn: () => void) => {
  const previous = process.env.FORM_SUBMIT_NONCE_SECRET;
  process.env.FORM_SUBMIT_NONCE_SECRET = NONCE_SECRET;
  try {
    fn();
  } finally {
    if (previous === undefined) {
      delete process.env.FORM_SUBMIT_NONCE_SECRET;
    } else {
      process.env.FORM_SUBMIT_NONCE_SECRET = previous;
    }
  }
};

test("security gate: public submissions require captcha for forms and booking", () => {
  const forms = evaluateSubmissionAccess({
    mode: "public",
    isAuthenticated: false,
  });
  const booking = evaluateBookingAccess({
    mode: "public",
    isAuthenticated: false,
  });

  expect(forms.allow).toBeTrue();
  expect(forms.requireCaptcha).toBeTrue();
  expect(booking.allow).toBeTrue();
  expect(booking.requireCaptcha).toBeTrue();
});

test("security gate: internal submissions require session or scoped API key", () => {
  const formWithoutAuth = evaluateSubmissionAccess({
    mode: "internal",
    isAuthenticated: false,
  });
  const bookingWithoutAuth = evaluateBookingAccess({
    mode: "internal",
    isAuthenticated: false,
  });

  expect(formWithoutAuth.allow).toBeFalse();
  expect(formWithoutAuth.reason).toBe("auth_required");
  expect(bookingWithoutAuth.allow).toBeFalse();
  expect(bookingWithoutAuth.reason).toBe("auth_required");

  const formWithApiKey = evaluateSubmissionAccess({
    mode: "internal",
    isAuthenticated: false,
    apiKeyScopes: [submissionAccessDefaults.requiredApiKeyScope],
  });
  const bookingWithApiKey = evaluateBookingAccess({
    mode: "internal",
    isAuthenticated: false,
    apiKeyScopes: [bookingAccessDefaults.requiredApiKeyScope],
  });

  expect(formWithApiKey.allow).toBeTrue();
  expect(formWithApiKey.requireCaptcha).toBeFalse();
  expect(bookingWithApiKey.allow).toBeTrue();
  expect(bookingWithApiKey.requireCaptcha).toBeFalse();
});

test("security gate: form and booking nonce contracts reject missing and tampered tokens", () => {
  withNonceSecret(() => {
    const now = Date.now();

    expect(() => assertFormSubmissionNonce("contact-form", null, now)).toThrow(
      "Form submission nonce is required"
    );

    const validFormNonce = createFormSubmissionNonce("contact-form", now);
    expect(() => assertFormSubmissionNonce("contact-form", validFormNonce, now + 1_000)).not.toThrow();

    const tamperedFormNonce = `${validFormNonce.slice(0, -1)}0`;
    expect(() => assertFormSubmissionNonce("contact-form", tamperedFormNonce, now + 1_000)).toThrow(
      "Form submission nonce is invalid"
    );

    expect(() => assertBookingSubmissionNonce(undefined, now)).toThrow(
      "Form submission nonce is required"
    );

    const validBookingNonce = createBookingSubmissionNonce(now);
    expect(() => assertBookingSubmissionNonce(validBookingNonce, now + 1_000)).not.toThrow();

    const tamperedBookingNonce = `${validBookingNonce.slice(0, -1)}0`;
    expect(() => assertBookingSubmissionNonce(tamperedBookingNonce, now + 1_000)).toThrow(
      "Form submission nonce is invalid"
    );
  });
});

test("security gate: default rate-limit and bot-protection baselines are hardened", () => {
  const rate = SECURITY_SETTINGS_DEFAULTS.rateLimit.buckets;

  expect(rate.public_write.maxRequests).toBeLessThan(rate.public_read.maxRequests);
  expect(rate.admin_write.maxRequests).toBeLessThan(rate.admin_read.maxRequests);

  const bot = SECURITY_SETTINGS_DEFAULTS.botProtection;
  expect(bot.provider).toBe("recaptcha_v3");
  expect(bot.thresholds.publicWrite).toBeGreaterThan(0);
  expect(bot.thresholds.publicWrite).toBeLessThanOrEqual(1);
});
