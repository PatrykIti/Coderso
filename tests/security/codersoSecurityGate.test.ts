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
import { resolveRateLimitBucket } from "../../core/server/httpServer";

const NONCE_SECRET = "coderso_release_gate_nonce_secret_32";
const NONCE_TTL_MINUTES = "10";

const tamperNonce = (nonce: string) => {
  const [timestamp, signature] = nonce.split(".");
  if (!timestamp || !signature) return `${nonce}-tampered`;
  const first = signature[0] === "a" ? "b" : "a";
  return `${timestamp}.${first}${signature.slice(1)}`;
};

const withNonceSecret = (fn: () => void) => {
  const previous = process.env.FORM_SUBMIT_NONCE_SECRET;
  const previousTtl = process.env.FORM_SUBMIT_NONCE_TTL_MINUTES;
  process.env.FORM_SUBMIT_NONCE_SECRET = NONCE_SECRET;
  process.env.FORM_SUBMIT_NONCE_TTL_MINUTES = NONCE_TTL_MINUTES;
  try {
    fn();
  } finally {
    if (previous === undefined) {
      delete process.env.FORM_SUBMIT_NONCE_SECRET;
    } else {
      process.env.FORM_SUBMIT_NONCE_SECRET = previous;
    }

    if (previousTtl === undefined) {
      delete process.env.FORM_SUBMIT_NONCE_TTL_MINUTES;
    } else {
      process.env.FORM_SUBMIT_NONCE_TTL_MINUTES = previousTtl;
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

  expect(forms.allow).toBe(true);
  expect(forms.requireCaptcha).toBe(true);
  expect(booking.allow).toBe(true);
  expect(booking.requireCaptcha).toBe(true);
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

  expect(formWithoutAuth.allow).toBe(false);
  expect(formWithoutAuth.reason).toBe("auth_required");
  expect(bookingWithoutAuth.allow).toBe(false);
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

  expect(formWithApiKey.allow).toBe(true);
  expect(formWithApiKey.requireCaptcha).toBe(false);
  expect(bookingWithApiKey.allow).toBe(true);
  expect(bookingWithApiKey.requireCaptcha).toBe(false);
});

test("security gate: admin dashboard endpoints use admin rate-limit buckets", () => {
  expect(resolveRateLimitBucket("GET", "/dashboard/layout")).toBe("admin_read");
  expect(resolveRateLimitBucket("GET", "/dashboard/widget-data")).toBe("admin_read");
  expect(resolveRateLimitBucket("PUT", "/dashboard/layout")).toBe("admin_write");
  expect(resolveRateLimitBucket("POST", "/dashboard/layout/reset")).toBe("admin_write");
  expect(resolveRateLimitBucket("POST", "/dashboard/widget-data")).toBe("admin_write");
});

test("security gate: form and booking nonce contracts reject missing and tampered tokens", () => {
  withNonceSecret(() => {
    const now = Date.now();

    expect(() => assertFormSubmissionNonce("contact-form", null, now)).toThrow(
      "Form submission nonce is required"
    );

    const validFormNonce = createFormSubmissionNonce("contact-form", now);
    expect(() =>
      assertFormSubmissionNonce("contact-form", validFormNonce, now + 1_000)
    ).not.toThrow();

    const tamperedFormNonce = tamperNonce(validFormNonce);
    expect(() => assertFormSubmissionNonce("contact-form", tamperedFormNonce, now + 1_000)).toThrow(
      "Form submission nonce is invalid"
    );

    expect(() => assertBookingSubmissionNonce(undefined, now)).toThrow(
      "Form submission nonce is required"
    );

    const validBookingNonce = createBookingSubmissionNonce(now);
    expect(() => assertBookingSubmissionNonce(validBookingNonce, now + 1_000)).not.toThrow();

    const tamperedBookingNonce = tamperNonce(validBookingNonce);
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
